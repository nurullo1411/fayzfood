// ============================================================
// util.js — Umumiy yordamchilar
// ============================================================

// Pul formatlash: 28000 -> "28 000 so'm"
export function money(n, withUnit = true) {
  const s = Math.round(n || 0).toLocaleString('ru-RU').replace(/[ ,]/g, ' ');
  return withUnit ? s + " so'm" : s;
}

// Sana formatlash
export function dateStr(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('ru-RU');
}
export function timeStr(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toTimeString().slice(0, 5);
}

// Bugungi kun (YYYY-MM-DD, lokal)
export function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// Oy kaliti (YYYY-MM)
export function monthKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ISO sanani lokal kun kalitiga
export function isoToDayKey(iso) { return todayKey(new Date(iso)); }
export function isoToMonthKey(iso) { return monthKey(new Date(iso)); }

// DOM yordamchi
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

// Toast xabar
export function toast(msg, type = 'success') {
  let t = $('#toast');
  if (!t) { t = el('div', { id: 'toast', class: 'toast' }); document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.hidden = true, 2400);
}

// Tasdiqlash oynasi (oddiy)
export function confirmBox(msg) {
  return Promise.resolve(window.confirm(msg));
}
