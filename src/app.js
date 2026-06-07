const STORAGE_KEY = 'raiderjaaa.jobs.v1';
const SETTINGS_KEY = 'raiderjaaa.settings.v1';
const FUEL_API = 'https://api.chnwt.dev/thai-oil-api/latest';
const DEFAULT_FUELS = [
  { type: 'Gasohol 91', price: 37.98 },
  { type: 'Gasohol 95', price: 38.35 },
  { type: 'E20', price: 36.14 },
  { type: 'Diesel', price: 31.94 }
];

let jobs = loadJson(STORAGE_KEY, []);
let settings = loadJson(SETTINGS_KEY, {
  theme: 'light',
  fuelType: 'Gasohol 95',
  fuelPrice: 38.35,
  efficiency: 40,
  fuels: DEFAULT_FUELS,
  lastFuelUpdate: null
});

const $ = (id) => document.getElementById(id);
const money = (value) => `฿${Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const number = (value, digits = 2) => Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: digits });
const today = () => new Date().toISOString().slice(0, 10);

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
}

function init() {
  applyTheme();
  $('jobDate').value = today();
  $('efficiency').value = settings.efficiency;
  $('jobFuelPrice').value = settings.fuelPrice;
  renderFuelOptions();
  bindEvents();
  updatePreview();
  render();
  fetchFuelPrice();
}

function bindEvents() {
  $('themeToggle').addEventListener('click', toggleTheme);
  $('refreshFuelBtn').addEventListener('click', fetchFuelPrice);
  $('fuelType').addEventListener('change', handleFuelTypeChange);
  $('saveFuelPriceBtn').addEventListener('click', saveManualFuelPrice);
  $('jobForm').addEventListener('submit', addJob);
  $('resetFormBtn').addEventListener('click', resetForm);
  $('clearAllBtn').addEventListener('click', clearAllJobs);
  $('exportExcelBtn').addEventListener('click', exportExcel);
  $('exportPdfBtn').addEventListener('click', exportPdf);
  $('searchInput').addEventListener('input', renderJobsTable);
  ['jobFee', 'jobKm', 'efficiency', 'jobFuelPrice'].forEach((id) => $(id).addEventListener('input', updatePreview));
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  $('themeToggle').textContent = settings.theme === 'dark' ? '☀️ White' : '🌙 Dark';
}

function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
}

async function fetchFuelPrice() {
  $('fuelStatus').textContent = 'กำลังโหลด';
  $('fuelStatus').className = 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
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
    renderFuelOptions();
    setFuelStatus('Live', true);
  } catch (error) {
    console.warn(error);
    setFuelStatus('โหมดสำรอง', false);
  }
  renderFuelCards();
  updatePreview();
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
  $('fuelType').innerHTML = fuels.map((fuel) => `<option value="${fuel.type}">${fuel.type} • ${money(fuel.price)}/ลิตร</option>`).join('');
  $('fuelType').value = settings.fuelType;
  $('manualFuelPrice').value = settings.fuelPrice;
  renderFuelCards();
}

function renderFuelCards() {
  const fuels = settings.fuels.length ? settings.fuels : DEFAULT_FUELS;
  $('fuelCards').innerHTML = fuels.slice(0, 4).map((fuel) => `
    <button class="fuel-card text-left transition hover:border-emerald-400 ${fuel.type === settings.fuelType ? 'ring-2 ring-emerald-400' : ''}" data-fuel="${fuel.type}">
      <p class="text-xs font-bold text-slate-500 dark:text-slate-400">${fuel.type}</p>
      <strong class="text-lg font-black">${money(fuel.price)}</strong>
      <p class="text-xs text-slate-400">/ ลิตร</p>
    </button>`).join('');
  document.querySelectorAll('[data-fuel]').forEach((button) => {
    button.addEventListener('click', () => {
      $('fuelType').value = button.dataset.fuel;
      handleFuelTypeChange();
    });
  });
}

function handleFuelTypeChange() {
  const fuel = settings.fuels.find((item) => item.type === $('fuelType').value) || DEFAULT_FUELS.find((item) => item.type === $('fuelType').value);
  if (!fuel) return;
  settings.fuelType = fuel.type;
  settings.fuelPrice = fuel.price;
  $('manualFuelPrice').value = fuel.price;
  $('jobFuelPrice').value = fuel.price;
  saveState();
  renderFuelCards();
  updatePreview();
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
  renderJobsTable();
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
    return { key, label: date.toLocaleDateString('th-TH', { weekday: 'short' }), profit: summarize(jobs.filter((job) => job.date === key)).profit };
  });
  const max = Math.max(...days.map((day) => Math.abs(day.profit)), 1);
  $('profitBars').innerHTML = days.map((day) => `
    <div class="flex h-full flex-1 flex-col items-center justify-end gap-2">
      <span class="text-xs font-bold ${day.profit < 0 ? 'text-rose-500' : 'text-emerald-600'}">${money(day.profit)}</span>
      <div class="bar w-full ${day.profit < 0 ? '!bg-rose-400' : ''}" style="height:${Math.max(8, Math.abs(day.profit) / max * 120)}px"></div>
      <span class="text-xs text-slate-500">${day.label}</span>
    </div>`).join('');
}

function renderJobsTable() {
  const keyword = $('searchInput').value.trim().toLowerCase();
  const filtered = jobs.filter((job) => job.note.toLowerCase().includes(keyword));
  $('emptyState').classList.toggle('hidden', filtered.length > 0);
  $('jobsTable').innerHTML = filtered.map((job) => `
    <tr class="border-b border-slate-100 dark:border-slate-800">
      <td class="py-4 pr-4 font-bold">${job.date}</td>
      <td class="py-4 pr-4">${job.note}<br><span class="text-xs text-slate-400">${job.fuelType} • ${money(job.fuelPrice)}/ลิตร</span></td>
      <td class="py-4 pr-4 font-bold">${money(job.fee)}</td>
      <td class="py-4 pr-4">${number(job.km)} กม.</td>
      <td class="py-4 pr-4 text-rose-500">${money(job.fuelCost)}</td>
      <td class="py-4 pr-4 font-black ${job.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}">${money(job.profit)}</td>
      <td class="py-4 text-right"><button class="font-bold text-rose-500 hover:underline" data-delete="${job.id}">ลบ</button></td>
    </tr>`).join('');
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteJob(button.dataset.delete)));
}

function exportRows() {
  return jobs.map((job) => ({
    วันที่: job.date,
    หมายเหตุ: job.note,
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
    head: [['Date', 'Note', 'Fee', 'KM', 'Fuel Cost', 'Profit']],
    body: jobs.map((job) => [job.date, job.note, job.fee.toFixed(2), job.km.toFixed(2), job.fuelCost.toFixed(2), job.profit.toFixed(2)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] }
  });
  doc.save(`raiderjaaa-${today()}.pdf`);
}

init();
