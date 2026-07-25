// ============================================================
// app.js — Ilovani ishga tushirish, router va qobiq (shell)
// ============================================================
import { openDB } from './db.js';
import { seedIfEmpty } from './seed.js';
import { runMigrations } from './migrations.js';
import { loadSession, logout, state, allowedScreens, canAccess } from './state.js';
import { getSetting } from './repo.js';
import { $, el, timeStr } from './util.js';

import { renderLogin } from './screens/login.js';
import { renderKassa } from './screens/kassa.js';
import { renderMenu } from './screens/menu.js';
import { renderWarehouse } from './screens/warehouse.js';
import { renderExpenses } from './screens/expenses.js';
import { renderReports } from './screens/reports.js';
import { renderSettings } from './screens/settings.js';
import { renderCourier } from './screens/courier.js';
import { renderDelivery } from './screens/delivery.js';

const SCREENS = {
  kassa:     { label: 'Kassa',    icon: '🧾', render: renderKassa },
  menu:      { label: 'Menyu',    icon: '🍔', render: renderMenu },
  warehouse: { label: 'Ombor',    icon: '📦', render: renderWarehouse },
  expenses:  { label: 'Xarajat',  icon: '💸', render: renderExpenses },
  reports:   { label: 'Hisobot',  icon: '📊', render: renderReports },
  delivery:  { label: 'Dostavka', icon: '🛵', render: renderDelivery },
  courier:   { label: 'Buyurtmalar', icon: '🛵', render: renderCourier },
  settings:  { label: 'Sozlama',  icon: '⚙️', render: renderSettings },
};

let currentScreen = null;

export async function navigate(screen) {
  if (!canAccess(screen)) return;
  currentScreen = screen;
  const content = $('#content');
  content.innerHTML = '';
  // pastki menyu faol holatini yangilash
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.screen === screen));
  await SCREENS[screen].render(content);
}

// --- Qobiqni chizish (login bo'lgandan keyin) ---
async function renderShell() {
  const root = $('#root');
  root.innerHTML = '';

  const brandName = await getSetting('brand_name', 'FayzFood');
  const logoType = await getSetting('brand_logo_type', 'emoji');
  const logoVal = await getSetting('brand_logo_value', '🍔');
  const logoHtml = logoType === 'image' ? `<img src="${logoVal}" alt="">` : logoVal;

  const roleLabel = { owner: 'Egasi', staff: 'Ishchi', courier: 'Kuryer' }[state.user.role];

  // Yuqori panel
  const topbar = el('header', { class: 'topbar' }, [
    el('div', { class: 'brand', html: `<span class="logo">${logoHtml}</span><span class="brand-name">${brandName}</span>` }),
    el('div', { class: 'topbar-right' }, [
      el('span', { id: 'sync', class: 'sync' }),
      el('span', { class: 'clock', id: 'clock' }),
      el('span', { class: 'user', html: `👤 ${state.user.name} <small>(${roleLabel})</small>` }),
      el('button', { class: 'logout-btn', title: 'Chiqish', onClick: doLogout }, '⏻'),
    ]),
  ]);

  const content = el('main', { id: 'content', class: 'content' });

  // Pastki navigatsiya (rolga qarab)
  const nav = el('nav', { class: 'bottom-nav' });
  allowedScreens().forEach(s => {
    const sc = SCREENS[s];
    nav.appendChild(el('button', {
      class: 'nav-item', 'data-screen': s, onClick: () => navigate(s),
      html: `<span class="nav-ic">${sc.icon}</span><span class="nav-lb">${sc.label}</span>`,
    }));
  });

  root.appendChild(topbar);
  root.appendChild(content);
  root.appendChild(nav);

  updateClock(); setInterval(updateClock, 10000);
  updateSync(); window.addEventListener('online', updateSync); window.addEventListener('offline', updateSync);

  // birinchi ruxsat etilgan ekran
  navigate(allowedScreens()[0]);
}

function updateClock() { const c = $('#clock'); if (c) c.textContent = timeStr(); }
function updateSync() {
  const s = $('#sync'); if (!s) return;
  if (navigator.onLine) { s.className = 'sync online'; s.textContent = '● Onlayn'; }
  else { s.className = 'sync offline'; s.textContent = '● Offline'; }
}

function doLogout() {
  logout();
  start();
}

// --- Login ekrani ---
function showLogin() {
  const root = $('#root');
  root.innerHTML = '';
  const wrap = el('div', { id: 'content', class: 'content-full' });
  root.appendChild(wrap);
  renderLogin(wrap, onLoginSuccess);
}
function onLoginSuccess() { renderShell(); }

// --- Boshlash ---
export async function start() {
  if (state.user) renderShell();
  else if (loadSession()) renderShell();
  else showLogin();
}

async function boot() {
  await openDB();
  await seedIfEmpty();
  await runMigrations();
  loadSession();
  await start();

  // Service worker (offline)
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('SW xato:', e); }
  }
}

boot();
