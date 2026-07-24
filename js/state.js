// ============================================================
// state.js — Ilova holati (joriy foydalanuvchi, rol)
// ============================================================

const KEY = 'fayzfood_session';

export const state = {
  user: null,   // { id, name, role }
};

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.id) state.user = s;
  } catch (e) {}
  return state.user;
}

export function setSession(user) {
  state.user = user ? { id: user.id, name: user.name, role: user.role } : null;
  if (user) localStorage.setItem(KEY, JSON.stringify(state.user));
  else localStorage.removeItem(KEY);
}

export function logout() { setSession(null); }

export function role() { return state.user ? state.user.role : null; }
export function isOwner() { return role() === 'owner'; }
export function isStaff() { return role() === 'staff'; }
export function isCourier() { return role() === 'courier'; }

// Rol ekranga kira oladimi?
const ACCESS = {
  owner:   ['kassa', 'menu', 'warehouse', 'expenses', 'reports', 'settings', 'delivery'],
  staff:   ['kassa', 'delivery'],
  courier: ['courier'],
};
export function canAccess(screen) {
  const r = role();
  return r ? ACCESS[r].includes(screen) : false;
}
export function allowedScreens() {
  const r = role();
  return r ? ACCESS[r] : [];
}
