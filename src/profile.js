const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl ?? '';
const PROFILE_ENDPOINT = window.__APP_CONFIG__?.profileEndpoint ?? '/api/profile';

const fallbackProfile = {
  id: 'demo-profile',
  name: 'Raider Jaaa',
  username: 'raiderjaaa',
  email: 'raiderjaaa@example.com',
  role: 'Community Creator',
  location: 'Bangkok, Thailand',
  bio: 'พร้อมสร้างคอนเทนต์ แบ่งปันไอเดีย และติดตามความคืบหน้าของทีมในที่เดียว',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
  phone: '+66 80 000 0000',
  joinedAt: '2024-08-16',
  stats: {
    posts: 128,
    followers: 3420,
    following: 284,
  },
  skills: ['Tailwind CSS', 'JavaScript', 'Content Strategy', 'Community'],
  recentActivities: [
    {
      id: 'activity-1',
      title: 'อัปเดตโปรไฟล์',
      description: 'เพิ่มรายละเอียดการติดต่อและทักษะล่าสุด',
      createdAt: 'วันนี้',
    },
    {
      id: 'activity-2',
      title: 'เผยแพร่โพสต์ใหม่',
      description: 'แชร์แนวทางการออกแบบหน้า Dashboard',
      createdAt: 'เมื่อวาน',
    },
    {
      id: 'activity-3',
      title: 'เข้าร่วมทีมใหม่',
      description: 'ได้รับสิทธิ์เป็น Community Creator',
      createdAt: '3 วันที่แล้ว',
    },
  ],
};

const icon = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.99 5.7a2 2 0 0 1-2.02 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.11 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.56a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
};

function normalizeProfile(profile = {}) {
  return {
    ...fallbackProfile,
    ...profile,
    id: profile.id ?? profile._id ?? fallbackProfile.id,
    name: profile.name ?? profile.displayName ?? profile.fullName ?? fallbackProfile.name,
    username: profile.username ?? fallbackProfile.username,
    avatarUrl: profile.avatarUrl ?? profile.avatar ?? profile.image ?? fallbackProfile.avatarUrl,
    stats: {
      ...fallbackProfile.stats,
      ...(profile.stats ?? {}),
    },
    skills: profile.skills?.length ? profile.skills : fallbackProfile.skills,
    recentActivities: profile.recentActivities?.length ? profile.recentActivities : fallbackProfile.recentActivities,
  };
}

async function fetchProfile() {
  const response = await fetch(`${API_BASE_URL}${PROFILE_ENDPOINT}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Profile API responded with ${response.status}`);
  }

  const payload = await response.json();
  return normalizeProfile(payload.data ?? payload.profile ?? payload.user ?? payload);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatStat(value) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function infoItem(iconName, label, value) {
  return `
    <div class="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm [&>svg]:h-5 [&>svg]:w-5">${icon[iconName]}</span>
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400">${label}</p>
        <p class="font-semibold text-slate-700">${escapeHtml(value ?? '-')}</p>
      </div>
    </div>`;
}

function statCard(label, value) {
  return `
    <div class="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
      <p class="text-2xl font-bold text-slate-950">${formatStat(value)}</p>
      <p class="mt-1 text-sm font-medium text-slate-500">${label}</p>
    </div>`;
}

function renderProfile(profile, state) {
  const statusLabel = state === 'success' ? 'เชื่อมต่อ API แล้ว' : state === 'loading' ? 'กำลังโหลดจาก API' : 'แสดงข้อมูลสำรอง';
  const statusIcon = state === 'loading' ? icon.refresh : icon.check;
  const statusIconClass = state === 'loading' ? 'animate-spin text-cyan-600' : 'text-emerald-500';

  document.querySelector('#root').innerHTML = `
    <main class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section class="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-2xl shadow-cyan-950/10 backdrop-blur">
        <div class="relative h-56 bg-slate-900 sm:h-72">
          <img class="h-full w-full object-cover opacity-80" src="${escapeHtml(profile.coverUrl)}" alt="Profile cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
          <div class="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
            <span class="h-4 w-4 ${statusIconClass}">${statusIcon}</span>
            ${statusLabel}
          </div>
        </div>

        <div class="relative px-6 pb-8 sm:px-10">
          <div class="-mt-20 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-end">
              <img class="h-36 w-36 rounded-3xl border-4 border-white object-cover shadow-xl" src="${escapeHtml(profile.avatarUrl)}" alt="${escapeHtml(profile.name)} avatar" />
              <div class="pb-2">
                <div class="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-700">
                  <span class="h-4 w-4">${icon.user}</span>
                  @${escapeHtml(profile.username)}
                </div>
                <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">${escapeHtml(profile.name)}</h1>
                <p class="mt-2 text-lg font-semibold text-cyan-700">${escapeHtml(profile.role)}</p>
              </div>
            </div>
            <button class="rounded-2xl bg-slate-950 px-6 py-3 font-bold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-700">
              แก้ไขโปรไฟล์
            </button>
          </div>

          <div class="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div class="space-y-6">
              <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-xl font-bold text-slate-950">เกี่ยวกับฉัน</h2>
                <p class="mt-3 leading-8 text-slate-600">${escapeHtml(profile.bio)}</p>
                <div class="mt-6 grid gap-3 sm:grid-cols-2">
                  ${infoItem('mail', 'Email', profile.email)}
                  ${infoItem('phone', 'Phone', profile.phone)}
                  ${infoItem('map', 'Location', profile.location)}
                  ${infoItem('calendar', 'Joined', profile.joinedAt)}
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                ${statCard('Posts', profile.stats.posts)}
                ${statCard('Followers', profile.stats.followers)}
                ${statCard('Following', profile.stats.following)}
              </div>
            </div>

            <aside class="space-y-6">
              <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-xl font-bold text-slate-950">ทักษะ</h2>
                <div class="mt-4 flex flex-wrap gap-2">
                  ${profile.skills.map((skill) => `<span class="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">${escapeHtml(skill)}</span>`).join('')}
                </div>
              </div>

              <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-xl font-bold text-slate-950">กิจกรรมล่าสุด</h2>
                <div class="mt-5 space-y-4">
                  ${profile.recentActivities.map((activity) => `
                    <article class="rounded-2xl bg-slate-50 p-4">
                      <div class="flex items-start justify-between gap-3">
                        <h3 class="font-bold text-slate-900">${escapeHtml(activity.title)}</h3>
                        <span class="shrink-0 text-xs font-semibold text-slate-400">${escapeHtml(activity.createdAt)}</span>
                      </div>
                      <p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(activity.description)}</p>
                    </article>`).join('')}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>`;
}

renderProfile(fallbackProfile, 'loading');

fetchProfile()
  .then((profile) => renderProfile(profile, 'success'))
  .catch(() => renderProfile(fallbackProfile, 'fallback'));
