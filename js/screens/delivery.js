// ============================================================
// delivery.js — Dostavka (Egasi/Ishchi)
// Kassada yaratilgan "Dostavka" buyurtmalarini ko'rish, kuryer biriktirish, holatini yuritish.
// ============================================================
import * as db from '../db.js';
import { el, money, toast } from '../util.js';

const STATUS = { new: 'Yangi', cooking: 'Tayyorlanmoqda', on_way: "Yo'lda", delivered: 'Yetkazildi' };

export async function renderDelivery(root) {
  root.innerHTML = '';
  const couriers = (await db.getAll('users')).filter(u => u.role === 'courier' && u.is_active);
  const orders = (await db.where('orders', o => o.type === 'delivery'))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const active = orders.filter(o => o.status !== 'delivered');
  const done = orders.filter(o => o.status === 'delivered').slice(0, 15);

  const itemsByOrder = {};
  (await db.getAll('order_items')).forEach(it => {
    (itemsByOrder[it.order_id] || (itemsByOrder[it.order_id] = [])).push(it);
  });

  root.appendChild(el('div', { class: 'screen-head' }, [el('h2', {}, '🛵 Dostavka')]));

  if (couriers.length === 0) {
    root.appendChild(el('div', { class: 'alert-box' }, "⚠️ Hali kuryer qo'shilmagan — Sozlama bo'limidan kuryer (rol: Kuryer) qo'shing"));
  }

  if (active.length === 0) {
    root.appendChild(el('div', { class: 'empty-screen' }, [
      el('div', { html: '🛵' }),
      el('p', {}, "Faol dostavka yo'q"),
      el('small', {}, "Kassadan \"Dostavka\" turida buyurtma yaratsangiz shu yerda chiqadi"),
    ]));
  } else {
    active.forEach(o => root.appendChild(card(o)));
  }

  if (done.length > 0) {
    root.appendChild(el('div', { class: 'panel-title', style: 'margin:14px 16px 8px' }, "✅ So'nggi yetkazilganlar"));
    done.forEach(o => root.appendChild(card(o, true)));
  }

  function card(o, isDone) {
    const courierSel = el('select', { class: 'fld-input mini' }, [
      el('option', { value: '' }, "— kuryer tanlang —"),
      ...couriers.map(c => el('option', { value: c.id, ...(c.id === o.courier_id ? { selected: 'true' } : {}) }, c.name)),
    ]);
    courierSel.addEventListener('change', () => assignCourier(o, courierSel.value));

    const actions = el('div', { class: 'dc-actions' });
    if (!isDone) {
      if (o.status === 'new') actions.appendChild(el('button', { class: 'dc-btn way', onClick: () => setStatus(o, 'cooking') }, "👨‍🍳 Tayyorlanmoqda"));
      if (o.status === 'new' || o.status === 'cooking') actions.appendChild(el('button', { class: 'dc-btn way', onClick: () => setStatus(o, 'on_way') }, "🛵 Yo'lda"));
      if (o.status === 'on_way') actions.appendChild(el('button', { class: 'dc-btn done', onClick: () => setStatus(o, 'delivered') }, '✅ Yetkazildi'));
    }

    return el('div', { class: 'delivery-card' }, [
      el('div', { class: 'dc-head' }, [
        el('span', { class: 'dc-no' }, '#' + o.order_no),
        el('span', { class: 'dc-status' }, STATUS[o.status] || o.status),
      ]),
      el('div', { class: 'dc-addr' }, '📍 ' + (o.address || "Manzil ko'rsatilmagan")),
      el('div', { class: 'dc-items' }, (itemsByOrder[o.id] || []).map(it => `${it.product_name} ×${it.qty}`).join(', ')),
      el('div', { class: 'dc-total' }, money(o.total) + ' · ' + (o.payment_method === 'cash' ? '💵 Naqd' : '📱 Click')),
      ...(isDone ? [] : [el('label', { class: 'fld-label' }, 'Kuryer'), courierSel]),
      actions,
    ]);
  }

  async function assignCourier(o, courierId) {
    o.courier_id = courierId || null;
    await db.put('orders', o);
    toast(courierId ? '🛵 Kuryer biriktirildi' : 'Kuryer olib tashlandi');
  }

  async function setStatus(o, status) {
    if (status === 'on_way' && !o.courier_id) { toast('Avval kuryer tanlang', 'error'); return; }
    o.status = status;
    await db.put('orders', o);
    toast(status === 'delivered' ? '✅ Yetkazildi' : status === 'on_way' ? "🛵 Yo'lda" : '👨‍🍳 Tayyorlanmoqda');
    renderDelivery(root);
  }
}
