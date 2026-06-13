const STORAGE_KEY = 'raiderjaaa.jobs.v1';
const SETTINGS_KEY = 'raiderjaaa.settings.v1';
const PROFILE_KEY = 'raiderjaaa.profile.v1';
const PRESENCE_KEY = 'raiderjaaa.presence.v1';
const PRESENCE_TTL = 15000;
const PRESENCE_INTERVAL = 5000;
const FUEL_API = 'https://api.chnwt.dev/thai-oil-api/latest';
const DEFAULT_FUELS = [
  { type: 'Gasohol 91', price: 37.98 },
  { type: 'Gasohol 95', price: 38.35 },
  { type: 'E20', price: 36.14 },
  { type: 'Diesel', price: 31.94 }
];
const DEFAULT_PROFILE = {
  name: 'ไรเดอร์ Raiderjaaa',
  phone: '',
  vehicle: '',
  plate: '',
  city: '',
  avatar: '🛵',
  fuelType: 'Gasohol 95',
  efficiency: 40,
  bio: ''
};
const BADGES = [
  { id: 'first-job', icon: '🚀', title: 'เริ่มออกตัว', description: 'บันทึกงานแรก', unlocked: (total) => total.count >= 1 },
  { id: 'ten-jobs', icon: '🔥', title: 'ขยันรับงาน', description: 'ครบ 10 งาน', unlocked: (total) => total.count >= 10 },
  { id: 'profit-1k', icon: '💎', title: 'กำไรพันแรก', description: 'กำไรรวมถึง ฿1,000', unlocked: (total) => total.profit >= 1000 },
  { id: 'km-100', icon: '🛣️', title: 'นักลุย 100 กม.', description: 'ระยะทางรวม 100 กม.', unlocked: (total) => total.km >= 100 },
  { id: 'zone-master', icon: '📍', title: 'เจ้าแห่งโซน', description: 'บันทึกโซนอย่างน้อย 3 โซน', unlocked: (_total, _daily, zoneStats) => zoneStats.filter((item) => item.zone !== 'ไม่ระบุโซน').length >= 3 },
  { id: 'monthly-goal', icon: '🏆', title: 'พิชิตเป้าเดือน', description: 'กำไรเดือนนี้ถึงเป้า', unlocked: (_total, _daily, _zoneStats, monthly, appSettings) => monthly.profit >= appSettings.monthlyGoal }
];

let jobs = loadJson(STORAGE_KEY, []);
let settings = loadJson(SETTINGS_KEY, {
  theme: 'light',
  accent: 'emerald',
  dailyGoal: 700,
  monthlyGoal: 18000,
  fuelType: 'Gasohol 95',
  fuelPrice: 38.35,
  efficiency: 40,
  fuels: DEFAULT_FUELS,
  lastFuelUpdate: null
});
settings = {
  theme: 'light',
  accent: 'emerald',
  dailyGoal: 700,
  monthlyGoal: 18000,
  fuelType: 'Gasohol 95',
  fuelPrice: 38.35,
  efficiency: 40,
  fuels: DEFAULT_FUELS,
  lastFuelUpdate: null,
  ...settings
};
let profile = { ...DEFAULT_PROFILE, ...loadJson(PROFILE_KEY, {}) };
let riderSessionId = crypto.randomUUID();
let presenceTimer = null;

const $ = (id) => document.getElementById(id);
const money = (value) => `฿${Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const number = (value, digits = 2) => Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: digits });
const today = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[char]);

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function cleanupPresence() {
  const now = Date.now();
  return loadJson(PRESENCE_KEY, []).filter((session) => session?.id && now - session.lastSeen < PRESENCE_TTL);
}

function heartbeatPresence() {
  const others = cleanupPresence().filter((session) => session.id !== riderSessionId);
  localStorage.setItem(PRESENCE_KEY, JSON.stringify([...others, { id: riderSessionId, lastSeen: Date.now() }]));
  renderRealtimePresence();
}

function removePresence() {
  const activeSessions = cleanupPresence().filter((session) => session.id !== riderSessionId);
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(activeSessions));
}

function renderRealtimePresence() {
  const activeCount = cleanupPresence().length;
  $('liveRiders').textContent = activeCount;
  $('liveRidersSub').textContent = `ออนไลน์ตอนนี้ • อัปเดต ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function startRealtimePresence() {
  heartbeatPresence();
  presenceTimer = setInterval(heartbeatPresence, PRESENCE_INTERVAL);
  window.addEventListener('storage', (event) => {
    if (event.key === PRESENCE_KEY) renderRealtimePresence();
  });
  window.addEventListener('pagehide', () => {
    clearInterval(presenceTimer);
    removePresence();
  });
}

function init() {
  applyTheme();
  $('jobDate').value = today();
  $('efficiency').value = settings.efficiency;
  $('jobFuelPrice').value = settings.fuelPrice;
  $('dailyGoalInput').value = settings.dailyGoal;
  $('monthlyGoalInput').value = settings.monthlyGoal;
  syncProfileWithSettings();
  renderFuelOptions();
  bindEvents();
  updatePreview();
  render();
  startRealtimePresence();
  fetchFuelPrice();
}

function bindEvents() {
  $('themeToggle').addEventListener('click', toggleTheme);
  $('refreshFuelBtn').addEventListener('click', fetchFuelPrice);
  $('fuelType').addEventListener('change', handleFuelTypeChange);
  $('saveFuelPriceBtn').addEventListener('click', saveManualFuelPrice);
  $('jobForm').addEventListener('submit', addJob);
  $('resetFormBtn').addEventListener('click', resetForm);
  $('saveGoalBtn').addEventListener('click', saveGoals);
  $('clearAllBtn').addEventListener('click', clearAllJobs);
  $('exportExcelBtn').addEventListener('click', exportExcel);
  $('exportPdfBtn').addEventListener('click', exportPdf);
  $('searchInput').addEventListener('input', renderJobsTable);
  $('profileForm').addEventListener('submit', saveProfile);
  $('resetProfileBtn').addEventListener('click', resetProfile);
  $('profileRefreshFuelBtn').addEventListener('click', fetchFuelPrice);
  window.addEventListener('hashchange', renderRoute);
  ['jobFee', 'jobKm', 'efficiency', 'jobFuelPrice'].forEach((id) => $(id).addEventListener('input', updatePreview));
  ['profileFuelType', 'profileEfficiency'].forEach((id) => $(id).addEventListener('change', previewProfileDefaults));
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  document.documentElement.dataset.accent = settings.accent || 'emerald';
  $('themeToggle').textContent = settings.theme === 'dark' ? '☀️ White' : '🌙 Dark';
}

function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  settings.accent = settings.theme === 'dark' ? 'violet' : 'emerald';
  saveState();
  applyTheme();
}

async function fetchFuelPrice() {
  $('fuelStatus').textContent = 'กำลังโหลด';
  $('fuelStatus').className = 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  $('profileApiStatus').textContent = 'กำลังโหลด';
  $('profileApiStatus').className = 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  try {
    const response = await fetch(FUEL_API, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fuel API ${response.status}`);
    const data = await response.json();
    const fuels = normalizeFuelData(data);
    if (!fuels.length) throw new Error('No fuel prices found');
    settings.fuels = fuels;
    settings.lastFuelUpdate = new Date().toISOString();
    const selected = fuels.find((fuel) => fuel.type === settings.fuelType) || fuels[0];
    settings.fuelType = selected.type;
    settings.fuelPrice = selected.price;
    $('jobFuelPrice').value = selected.price;
    saveState();
    syncProfileFuelPrice();
    renderFuelOptions();
    setFuelStatus('Live', true);
  } catch (error) {
    console.warn(error);
    setFuelStatus('โหมดสำรอง', false);
  }
  renderFuelCards();
  updatePreview();
  renderProfile();
}

function normalizeFuelData(payload) {
  const stationPrices = payload?.response?.stations?.ptt || Object.values(payload?.response?.stations || {})[0];
  if (stationPrices && !Array.isArray(stationPrices)) {
    return Object.values(stationPrices)
      .map((item) => ({ type: item.name, price: Number.parseFloat(item.price) }))
      .filter((item) => item.type && Number.isFinite(item.price))
      .slice(0, 8);
  }

  const candidates = Array.isArray(payload) ? payload : payload?.data || payload?.prices || payload?.response || [];
  return candidates
    .map((item) => ({
      type: item.type || item.name || item.oil || item.product || item.fuelType,
      price: Number.parseFloat(item.price || item.value || item.today || item.current)
    }))
    .filter((item) => item.type && Number.isFinite(item.price))
    .slice(0, 8);
}

function setFuelStatus(text, live) {
  $('fuelStatus').textContent = text;
  $('fuelStatus').className = live
    ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
    : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function renderFuelOptions() {
  const fuels = settings.fuels.length ? settings.fuels : DEFAULT_FUELS;
  const options = fuels.map((fuel) => `<option value="${escapeHtml(fuel.type)}">${escapeHtml(fuel.type)} • ${money(fuel.price)}/ลิตร</option>`).join('');
  $('fuelType').innerHTML = options;
  $('profileFuelType').innerHTML = options;
  $('fuelType').value = settings.fuelType;
  $('profileFuelType').value = profile.fuelType;
  $('manualFuelPrice').value = settings.fuelPrice;
  renderFuelCards();
  renderProfile();
}

function renderFuelCards() {
  const fuels = settings.fuels.length ? settings.fuels : DEFAULT_FUELS;
  $('fuelCards').innerHTML = fuels.slice(0, 4).map((fuel, index) => `
    <button class="fuel-card text-left transition hover:border-emerald-400 ${fuel.type === settings.fuelType ? 'ring-2 ring-emerald-400' : ''}" data-fuel-index="${index}">
      <p class="text-xs font-bold text-slate-500 dark:text-slate-400">${escapeHtml(fuel.type)}</p>
      <strong class="text-lg font-black">${money(fuel.price)}</strong>
      <p class="text-xs text-slate-400">/ ลิตร</p>
    </button>`).join('');
  document.querySelectorAll('[data-fuel-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const fuel = fuels[Number(button.dataset.fuelIndex)];
      if (!fuel) return;
      $('fuelType').value = fuel.type;
      handleFuelTypeChange();
    });
  });
}

function handleFuelTypeChange() {
  const fuel = settings.fuels.find((item) => item.type === $('fuelType').value) || DEFAULT_FUELS.find((item) => item.type === $('fuelType').value);
  if (!fuel) return;
  settings.fuelType = fuel.type;
  settings.fuelPrice = fuel.price;
  profile.fuelType = fuel.type;
  $('manualFuelPrice').value = fuel.price;
  $('jobFuelPrice').value = fuel.price;
  saveState();
  renderFuelCards();
  updatePreview();
  renderProfile();
}

function saveManualFuelPrice() {
  const price = Number.parseFloat($('manualFuelPrice').value);
  if (!Number.isFinite(price) || price <= 0) return alert('กรุณาใส่ราคาน้ำมันให้ถูกต้อง');
  settings.fuelPrice = price;
  settings.fuelType = $('fuelType').value || settings.fuelType;
  const index = settings.fuels.findIndex((fuel) => fuel.type === settings.fuelType);
  if (index >= 0) settings.fuels[index].price = price;
  $('jobFuelPrice').value = price;
  saveState();
  renderFuelOptions();
  updatePreview();
}

function saveGoals() {
  const dailyGoal = Number.parseFloat($('dailyGoalInput').value);
  const monthlyGoal = Number.parseFloat($('monthlyGoalInput').value);
  if ([dailyGoal, monthlyGoal].some((value) => !Number.isFinite(value) || value <= 0)) {
    return alert('กรุณาใส่เป้าหมายรายได้ให้ถูกต้อง');
  }
  settings.dailyGoal = dailyGoal;
  settings.monthlyGoal = monthlyGoal;
  saveState();
  render();
}

function calculate({ fee, km, efficiency, fuelPrice }) {
  const liters = km / efficiency;
  const fuelCost = liters * fuelPrice;
  return { liters, fuelCost, profit: fee - fuelCost };
}

function updatePreview() {
  const fee = Number.parseFloat($('jobFee').value) || 0;
  const km = Number.parseFloat($('jobKm').value) || 0;
  const efficiency = Number.parseFloat($('efficiency').value) || settings.efficiency;
  const fuelPrice = Number.parseFloat($('jobFuelPrice').value) || settings.fuelPrice;
  const result = calculate({ fee, km, efficiency, fuelPrice });
  $('previewLiters').textContent = number(result.liters, 3);
  $('previewFuelCost').textContent = money(result.fuelCost);
  $('previewProfit').textContent = money(result.profit);
  $('previewProfit').className = result.profit >= 0 ? 'text-emerald-600' : 'text-rose-500';
}

function addJob(event) {
  event.preventDefault();
  const fee = Number.parseFloat($('jobFee').value);
  const km = Number.parseFloat($('jobKm').value);
  const efficiency = Number.parseFloat($('efficiency').value);
  const fuelPrice = Number.parseFloat($('jobFuelPrice').value);
  if ([fee, km, efficiency, fuelPrice].some((value) => !Number.isFinite(value) || value < 0) || efficiency <= 0) {
    return alert('กรุณากรอกตัวเลขให้ถูกต้อง');
  }
  const totals = calculate({ fee, km, efficiency, fuelPrice });
  jobs.unshift({
    id: crypto.randomUUID(),
    date: $('jobDate').value || today(),
    note: $('jobNote').value.trim() || 'งานส่งของ',
    zone: $('jobZone').value.trim(),
    route: $('jobRoute').value.trim(),
    fee,
    km,
    efficiency,
    fuelType: settings.fuelType,
    fuelPrice,
    ...totals,
    createdAt: new Date().toISOString()
  });
  settings.efficiency = efficiency;
  settings.fuelPrice = fuelPrice;
  saveState();
  resetForm(false);
  render();
}

function resetForm(clearDate = true) {
  $('jobForm').reset();
  $('jobDate').value = clearDate ? today() : $('jobDate').value || today();
  $('efficiency').value = settings.efficiency;
  $('jobFuelPrice').value = settings.fuelPrice;
  updatePreview();
}

function clearAllJobs() {
  if (!jobs.length || !confirm('ต้องการลบรายการงานทั้งหมดใช่ไหม?')) return;
  jobs = [];
  saveState();
  render();
}

function deleteJob(id) {
  jobs = jobs.filter((job) => job.id !== id);
  saveState();
  render();
}

function render() {
  const total = summarize(jobs);
  const daily = summarize(filterByPeriod('day'));
  const weekly = summarize(filterByPeriod('week'));
  const monthly = summarize(filterByPeriod('month'));
  const zoneStats = summarizeZones(jobs);

  $('heroFee').textContent = money(daily.fee);
  $('heroFuel').textContent = money(daily.fuelCost);
  $('heroProfit').textContent = money(daily.profit);
  $('totalJobs').textContent = total.count;
  $('totalKm').textContent = `${number(total.km)} กม.`;
  $('totalLiters').textContent = `${number(total.liters, 3)} ลิตร`;
  $('totalProfit').textContent = money(total.profit);
  $('dailyProfit').textContent = money(daily.profit);
  $('dailySub').textContent = `${daily.count} งาน • ${number(daily.km)} กม.`;
  $('weeklyProfit').textContent = money(weekly.profit);
  $('weeklySub').textContent = `${weekly.count} งาน • ${number(weekly.km)} กม.`;
  $('monthlyProfit').textContent = money(monthly.profit);
  $('monthlySub').textContent = `${monthly.count} งาน • ${number(monthly.km)} กม.`;

  renderProfitBars();
  renderGoalPanel(daily, monthly);
  renderBadges(total, daily, zoneStats, monthly);
  renderCalendar();
  renderZonePanel(zoneStats);
  renderJobsTable();
  renderProfile();
  renderRoute();
}

function summarize(items) {
  return items.reduce((acc, job) => ({
    count: acc.count + 1,
    fee: acc.fee + job.fee,
    km: acc.km + job.km,
    liters: acc.liters + job.liters,
    fuelCost: acc.fuelCost + job.fuelCost,
    profit: acc.profit + job.profit
  }), { count: 0, fee: 0, km: 0, liters: 0, fuelCost: 0, profit: 0 });
}

function filterByPeriod(period) {
  const now = new Date();
  return jobs.filter((job) => {
    const date = new Date(`${job.date}T00:00:00`);
    if (period === 'day') return job.date === today();
    if (period === 'week') return (now - date) / 86400000 <= 6;
    if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  });
}

function renderProfitBars() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const summary = summarize(jobs.filter((job) => job.date === key));
    return { key, label: date.toLocaleDateString('th-TH', { weekday: 'short' }), ...summary };
  });
  const max = Math.max(...days.map((day) => Math.max(day.fee, day.fuelCost, Math.abs(day.profit))), 1);
  $('profitBars').innerHTML = days.map((day) => `
    <div class="chart-day">
      <div class="chart-tooltip">
        <strong>${day.label}</strong>
        <span>ค่ารอบ ${money(day.fee)}</span>
        <span>น้ำมัน ${money(day.fuelCost)}</span>
        <span>กำไร ${money(day.profit)}</span>
      </div>
      <div class="chart-stack">
        <div class="chart-bar fee" style="height:${Math.max(7, day.fee / max * 130)}px"></div>
        <div class="chart-bar fuel" style="height:${Math.max(7, day.fuelCost / max * 130)}px"></div>
        <div class="chart-bar profit ${day.profit < 0 ? 'loss' : ''}" style="height:${Math.max(7, Math.abs(day.profit) / max * 130)}px"></div>
      </div>
      <span class="text-xs font-bold text-slate-500 dark:text-slate-400">${day.label}</span>
    </div>`).join('');
}

function renderGoalPanel(daily, monthly) {
  const dailyPercent = Math.min(100, daily.profit / settings.dailyGoal * 100);
  const monthlyPercent = Math.min(100, monthly.profit / settings.monthlyGoal * 100);
  $('dailyGoalProgress').style.width = `${Math.max(0, dailyPercent)}%`;
  $('monthlyGoalProgress').style.width = `${Math.max(0, monthlyPercent)}%`;
  $('dailyGoalText').textContent = `${money(daily.profit)} / ${money(settings.dailyGoal)} (${number(dailyPercent, 0)}%)`;
  $('monthlyGoalText').textContent = `${money(monthly.profit)} / ${money(settings.monthlyGoal)} (${number(monthlyPercent, 0)}%)`;
  const remaining = Math.max(0, settings.dailyGoal - daily.profit);
  $('goalNotice').innerHTML = daily.profit >= settings.dailyGoal
    ? '🎉 วันนี้ถึงเป้ารายได้แล้ว! เก็บแรงไว้รับโบนัสรอบถัดไปได้เลย'
    : `🔔 เหลืออีก <strong>${money(remaining)}</strong> จะถึงเป้าวันนี้ ลองรับงานโซนที่กำไรดีขึ้นอีกนิด`;
}

function renderBadges(total, daily, zoneStats, monthly) {
  const unlocked = BADGES.filter((badge) => badge.unlocked(total, daily, zoneStats, monthly, settings)).length;
  $('badgeCount').textContent = `${unlocked}/${BADGES.length}`;
  $('badgeGrid').innerHTML = BADGES.map((badge) => {
    const isUnlocked = badge.unlocked(total, daily, zoneStats, monthly, settings);
    return `
      <div class="badge-card ${isUnlocked ? 'unlocked' : ''}">
        <span>${badge.icon}</span>
        <strong>${badge.title}</strong>
        <p>${badge.description}</p>
      </div>`;
  }).join('');
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const blanks = firstDay.getDay();
  const monthJobs = jobs.filter((job) => {
    const date = new Date(`${job.date}T00:00:00`);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const byDate = monthJobs.reduce((acc, job) => {
    acc[job.date] = acc[job.date] || [];
    acc[job.date].push(job);
    return acc;
  }, {});
  $('calendarTitle').textContent = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const cells = [
    ...Array.from({ length: blanks }, () => '<div class="calendar-cell muted"></div>'),
    ...Array.from({ length: lastDay.getDate() }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month, day);
      const key = date.toISOString().slice(0, 10);
      const summary = summarize(byDate[key] || []);
      const active = summary.count > 0;
      return `
        <div class="calendar-cell ${active ? 'active' : ''}">
          <strong>${day}</strong>
          <span>${active ? `${summary.count} งาน` : 'ว่าง'}</span>
          <small>${active ? money(summary.profit) : ''}</small>
        </div>`;
    })
  ];
  $('calendarGrid').innerHTML = cells.join('');
}

function summarizeZones(items) {
  const grouped = items.reduce((acc, job) => {
    const zone = job.zone || 'ไม่ระบุโซน';
    acc[zone] = acc[zone] || [];
    acc[zone].push(job);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([zone, zoneJobs]) => ({ zone, ...summarize(zoneJobs), routes: [...new Set(zoneJobs.map((job) => job.route).filter(Boolean))] }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
}

function renderZonePanel(zoneStats) {
  $('topZone').textContent = zoneStats[0]?.zone || '-';
  $('topZoneProfit').textContent = zoneStats[0] ? money(zoneStats[0].profit) : 'ยังไม่มีข้อมูลโซน';
  $('zoneList').innerHTML = zoneStats.length ? zoneStats.map((item) => `
    <div class="zone-row">
      <div>
        <strong>📍 ${escapeHtml(item.zone)}</strong>
        <p>${item.count} งาน • ${number(item.km)} กม. ${item.routes.length ? `• ${escapeHtml(item.routes.slice(0, 2).join(', '))}` : ''}</p>
      </div>
      <span>${money(item.profit)}</span>
    </div>`).join('') : '<p class="text-sm text-slate-500">เพิ่มโซน/เส้นทางในฟอร์มเพื่อดูพื้นที่ทำเงิน</p>';
}

function renderJobsTable() {
  const keyword = $('searchInput').value.trim().toLowerCase();
  const filtered = jobs.filter((job) => [job.note, job.zone, job.route].some((value) => String(value || '').toLowerCase().includes(keyword)));
  $('emptyState').classList.toggle('hidden', filtered.length > 0);
  $('jobsTable').innerHTML = filtered.map((job) => `
    <tr class="border-b border-slate-100 dark:border-slate-800">
      <td class="py-4 pr-4 font-bold">${escapeHtml(job.date)}</td>
      <td class="py-4 pr-4">${escapeHtml(job.note)}<br><span class="text-xs text-slate-400">${escapeHtml(job.fuelType)} • ${money(job.fuelPrice)}/ลิตร</span></td>
      <td class="py-4 pr-4"><span class="font-bold">${escapeHtml(job.zone || '-')}</span><br><span class="text-xs text-slate-400">${escapeHtml(job.route || 'ไม่ระบุเส้นทาง')}</span></td>
      <td class="py-4 pr-4 font-bold">${money(job.fee)}</td>
      <td class="py-4 pr-4">${number(job.km)} กม.</td>
      <td class="py-4 pr-4 text-rose-500">${money(job.fuelCost)}</td>
      <td class="py-4 pr-4 font-black ${job.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}">${money(job.profit)}</td>
      <td class="py-4 text-right"><button class="font-bold text-rose-500 hover:underline" data-delete="${job.id}">ลบ</button></td>
    </tr>`).join('');
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteJob(button.dataset.delete)));
}

function syncProfileWithSettings() {
  profile.fuelType = profile.fuelType || settings.fuelType;
  profile.efficiency = Number(profile.efficiency) || settings.efficiency;
  syncProfileFuelPrice();
}

function syncProfileFuelPrice() {
  const fuels = settings.fuels.length ? settings.fuels : DEFAULT_FUELS;
  const fuel = fuels.find((item) => item.type === profile.fuelType) || fuels.find((item) => item.type === settings.fuelType) || fuels[0];
  if (!fuel) return;
  profile.fuelType = fuel.type;
}

function renderRoute() {
  const isProfile = window.location.hash === '#profile';
  $('dashboardPage').classList.toggle('hidden', isProfile);
  $('profilePage').classList.toggle('hidden', !isProfile);
  $('dashboardNav').classList.toggle('nav-pill-active', !isProfile);
  $('profileNav').classList.toggle('nav-pill-active', isProfile);
}

function previewProfileDefaults() {
  const efficiency = Number.parseFloat($('profileEfficiency').value) || profile.efficiency || settings.efficiency;
  const fuelType = $('profileFuelType').value || profile.fuelType;
  $('profileEfficiencyPreview').textContent = `${number(efficiency, 1)} กม./ลิตร`;
  const fuels = settings.fuels.length ? settings.fuels : DEFAULT_FUELS;
  const fuel = fuels.find((item) => item.type === fuelType) || fuels[0];
  $('profileFuelName').textContent = fuel?.type || '-';
  $('profileFuelPrice').textContent = `${money(fuel?.price || settings.fuelPrice)}/ลิตร`;
}

function renderProfile() {
  const total = summarize(jobs);
  const fuels = settings.fuels.length ? settings.fuels : DEFAULT_FUELS;
  const fuel = fuels.find((item) => item.type === profile.fuelType) || fuels.find((item) => item.type === settings.fuelType) || fuels[0];
  const updatedText = settings.lastFuelUpdate
    ? new Date(settings.lastFuelUpdate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : 'ยังไม่มีข้อมูลจาก API';

  $('profileName').value = profile.name;
  $('profilePhone').value = profile.phone;
  $('profileVehicle').value = profile.vehicle;
  $('profilePlate').value = profile.plate;
  $('profileCity').value = profile.city;
  $('profileAvatar').value = profile.avatar;
  $('profileEfficiency').value = profile.efficiency;
  $('profileBio').value = profile.bio;
  if ([...$('profileFuelType').options].some((option) => option.value === profile.fuelType)) {
    $('profileFuelType').value = profile.fuelType;
  }

  $('profileAvatarPreview').textContent = profile.avatar || DEFAULT_PROFILE.avatar;
  $('profileNamePreview').textContent = profile.name || DEFAULT_PROFILE.name;
  $('profileVehiclePreview').textContent = [profile.vehicle, profile.plate].filter(Boolean).join(' • ') || 'ยังไม่ได้ระบุรถ';
  $('profileCityPreview').textContent = `พื้นที่วิ่งงาน: ${profile.city || '-'}`;
  $('profileFuelName').textContent = fuel?.type || '-';
  $('profileFuelPrice').textContent = `${money(fuel?.price || settings.fuelPrice)}/ลิตร`;
  $('profileFuelUpdated').textContent = updatedText;
  $('profileApiStatus').textContent = settings.lastFuelUpdate ? 'เชื่อมต่อแล้ว' : 'รอข้อมูล';
  $('profileApiStatus').className = settings.lastFuelUpdate
    ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
    : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  $('profileJobs').textContent = total.count;
  $('profileKm').textContent = `${number(total.km)} กม.`;
  $('profileProfit').textContent = money(total.profit);
  $('profileEfficiencyPreview').textContent = `${number(profile.efficiency, 1)} กม./ลิตร`;
}

function saveProfile(event) {
  event.preventDefault();
  const efficiency = Number.parseFloat($('profileEfficiency').value);
  if (!Number.isFinite(efficiency) || efficiency <= 0) return alert('กรุณากรอกอัตราสิ้นเปลืองให้ถูกต้อง');
  profile = {
    name: $('profileName').value.trim() || DEFAULT_PROFILE.name,
    phone: $('profilePhone').value.trim(),
    vehicle: $('profileVehicle').value.trim(),
    plate: $('profilePlate').value.trim(),
    city: $('profileCity').value.trim(),
    avatar: $('profileAvatar').value.trim() || DEFAULT_PROFILE.avatar,
    fuelType: $('profileFuelType').value || settings.fuelType,
    efficiency,
    bio: $('profileBio').value.trim()
  };
  const fuel = (settings.fuels.length ? settings.fuels : DEFAULT_FUELS).find((item) => item.type === profile.fuelType);
  settings.fuelType = profile.fuelType;
  settings.efficiency = profile.efficiency;
  if (fuel) settings.fuelPrice = fuel.price;
  $('efficiency').value = settings.efficiency;
  $('jobFuelPrice').value = settings.fuelPrice;
  saveState();
  renderFuelOptions();
  updatePreview();
  alert('บันทึก Profile เรียบร้อยแล้ว');
}

function resetProfile() {
  if (!confirm('ต้องการคืนค่า Profile เป็นค่าเริ่มต้นใช่ไหม?')) return;
  profile = { ...DEFAULT_PROFILE, fuelType: settings.fuelType, efficiency: settings.efficiency };
  saveState();
  renderProfile();
}

function exportRows() {
  return jobs.map((job) => ({
    วันที่: job.date,
    หมายเหตุ: job.note,
    โซน: job.zone || '',
    เส้นทาง: job.route || '',
    ค่ารอบ: job.fee,
    ระยะทางกม: job.km,
    อัตราสิ้นเปลืองกมต่อลิตร: job.efficiency,
    ชนิดน้ำมัน: job.fuelType,
    ราคาน้ำมันบาทต่อลิตร: job.fuelPrice,
    ลิตรที่ใช้: Number(job.liters.toFixed(3)),
    ค่าน้ำมัน: Number(job.fuelCost.toFixed(2)),
    กำไรสุทธิ: Number(job.profit.toFixed(2))
  }));
}

function exportExcel() {
  if (!jobs.length) return alert('ยังไม่มีข้อมูลสำหรับ Export');
  const worksheet = XLSX.utils.json_to_sheet(exportRows());
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Raiderjaaa Jobs');
  XLSX.writeFile(workbook, `raiderjaaa-${today()}.xlsx`);
}

function exportPdf() {
  if (!jobs.length) return alert('ยังไม่มีข้อมูลสำหรับ Export');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(18);
  doc.text('Raiderjaaa Rider Report', 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, 14, 24);
  doc.autoTable({
    startY: 30,
    head: [['Date', 'Note', 'Zone', 'Route', 'Fee', 'KM', 'Fuel Cost', 'Profit']],
    body: jobs.map((job) => [job.date, job.note, job.zone || '-', job.route || '-', job.fee.toFixed(2), job.km.toFixed(2), job.fuelCost.toFixed(2), job.profit.toFixed(2)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] }
  });
  doc.save(`raiderjaaa-${today()}.pdf`);
}

init();
