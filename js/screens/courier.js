// ============================================================
// courier.js — Kuryer ekrani
// Kuryer faqat o'ziga biriktirilgan dostavka buyurtmalarini ko'radi.
// To'liq dostavka oqimi 2-bosqichda. Hozir asosiy ko'rinish tayyor.
// ============================================================
import * as db from '../db.js';
import { state } from '../state.js';
import { el, money, toast } from '../util.js';

export async function renderCourier(root) {
  root.innerHTML = '';
  root.appendChild(el('div', { class: 'screen-head' }, [el('h2', {}, '🛵 Mening buyurtmalarim')]));

  const orders = (await db.where('orders', o =>
    o.type === 'delivery' && o.courier_id === state.user.id && o.status !== 'delivered'))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  if (orders.length === 0) {
    root.appendChild(el('div', { class: 'empty-screen' }, [
      el('div', { html: '🛵' }),
      el('p', {}, 'Hozircha sizga biriktirilgan buyurtma yo\'q'),
      el('small', {}, 'To\'liq dostavka oqimi 2-bosqichda ulanadi'),
    ]));
    return;
  }

  const STATUS = { new: 'Yangi', cooking: 'Tayyorlanmoqda', on_way: 'Yo\'lda', delivered: 'Yetkazildi' };
  for (const o of orders) {
    const items = await db.where('order_items', it => it.order_id === o.id);
    root.appendChild(el('div', { class: 'delivery-card' }, [
      el('div', { class: 'dc-head' }, [
        el('span', { class: 'dc-no' }, '#' + o.order_no),
        el('span', { class: 'dc-status' }, STATUS[o.status] || o.status),
      ]),
      el('div', { class: 'dc-addr' }, '📍 ' + (o.address || 'Manzil ko\'rsatilmagan')),
      el('div', { class: 'dc-items' }, items.map(it => `${it.product_name} ×${it.qty}`).join(', ')),
      el('div', { class: 'dc-total' }, money(o.total) + ' · ' + (o.payment_method === 'cash' ? '💵 Naqd' : '📱 Click')),
      el('div', { class: 'dc-actions' }, [
        el('button', { class: 'dc-btn way', onClick: () => setStatus(o, 'on_way') }, '🛵 Yo\'lda'),
        el('button', { class: 'dc-btn done', onClick: () => setStatus(o, 'delivered') }, '✅ Yetkazildi'),
      ]),
    ]));
  }

  async function setStatus(o, status) {
    o.status = status;
    await db.put('orders', o);
    toast(status === 'delivered' ? '✅ Yetkazildi' : '🛵 Yo\'lda');
    renderCourier(root);
  }
}
