// ============================================================
// repo.js — Biznes-logika (domain operatsiyalari)
// Bazaga to'g'ridan-to'g'ri murojaat o'rniga shu yerdagi funksiyalar ishlatiladi.
// ============================================================
import * as db from './db.js';
import { isoToDayKey, isoToMonthKey, todayKey, monthKey } from './util.js';

// --- Taom tannarxini retsept bo'yicha hisoblash ---
export async function productCost(productId) {
  const recipes = await db.where('recipes', r => r.product_id === productId);
  let cost = 0;
  for (const r of recipes) {
    const ing = await db.get('ingredients', r.ingredient_id);
    if (ing) cost += (ing.avg_cost || 0) * (r.qty || 0);
  }
  return cost;
}

// --- Sotuvni yakunlash: buyurtma + tarkib yoziladi, ombordan ingredient chiqim ---
// cart: [{ product, qty }],  opts: { type, payment_method, given, discount, delivery_fee, created_by }
export async function checkout(cart, opts = {}) {
  const orderId = db.uuid();
  let total = 0, totalCost = 0;

  // Buyurtma tarkibi + tannarx
  for (const item of cart) {
    const cost = await productCost(item.product.id);
    const lineTotal = item.product.price * item.qty;
    total += lineTotal;
    totalCost += cost * item.qty;

    await db.put('order_items', {
      id: db.uuid(),
      order_id: orderId,
      product_id: item.product.id,
      product_name: item.product.name,
      qty: item.qty,
      price: item.product.price,
      cost: cost,
    });

    // Ombordan ingredient chiqim (retsept bo'yicha)
    const recipes = await db.where('recipes', r => r.product_id === item.product.id);
    for (const r of recipes) {
      const ing = await db.get('ingredients', r.ingredient_id);
      if (!ing) continue;
      const used = (r.qty || 0) * item.qty;
      ing.stock_qty = Math.max(0, (ing.stock_qty || 0) - used);
      await db.put('ingredients', ing);
      await db.put('stock_movements', {
        id: db.uuid(),
        ingredient_id: ing.id,
        type: 'out_sale',
        qty: -used,
        cost: 0,
        order_id: orderId,
        note: 'Sotuv: ' + item.product.name,
      });
    }
  }

  const discount = opts.discount || 0;
  const deliveryFee = opts.delivery_fee || 0;
  const finalTotal = total - discount + deliveryFee;

  const order = {
    id: orderId,
    order_no: await nextOrderNo(),
    type: opts.type || 'dine_in',
    status: opts.type === 'delivery' ? 'new' : 'done',
    payment_method: opts.payment_method || 'cash',
    payment_status: 'paid',
    total: finalTotal,
    subtotal: total,
    cost: totalCost,
    profit: finalTotal - totalCost,
    discount,
    delivery_fee: deliveryFee,
    given: opts.given || finalTotal,
    customer_id: opts.customer_id || null,
    courier_id: opts.courier_id || null,
    created_by: opts.created_by || null,
  };
  await db.put('orders', order);
  return order;
}

let _lastNo = null;
async function nextOrderNo() {
  if (_lastNo === null) {
    const orders = await db.getAll('orders');
    _lastNo = orders.reduce((m, o) => Math.max(m, o.order_no || 0), 0);
  }
  _lastNo += 1;
  return _lastNo;
}

// --- Ombor: kirim qo'shish ---
// Kirim = naqd xarajat: sotib olingan zahoti "expenses" ga ham yoziladi,
// shu bois taom sotilganda uning tannarxi hisobotdagi Xarajat/Sof foydaga qayta qo'shilmaydi.
export async function stockIn(ingredientId, qty, costPerUnit, note = '', createdBy = null) {
  const ing = await db.get('ingredients', ingredientId);
  if (!ing) return;
  // O'rtacha narxni yangilash (weighted average)
  const oldQty = ing.stock_qty || 0;
  const oldCost = ing.avg_cost || 0;
  const newQty = oldQty + qty;
  ing.avg_cost = newQty > 0 ? ((oldQty * oldCost) + (qty * costPerUnit)) / newQty : costPerUnit;
  ing.stock_qty = newQty;
  await db.put('ingredients', ing);
  await db.put('stock_movements', {
    id: db.uuid(), ingredient_id: ingredientId, type: 'in',
    qty: qty, cost: costPerUnit, order_id: null, note: note || 'Kirim',
  });
  await db.put('expenses', {
    id: db.uuid(), category: 'supplies', amount: qty * costPerUnit,
    note: 'Ombor kirim: ' + ing.name + (note ? ' — ' + note : ''),
    created_by: createdBy,
  });
  return ing;
}

// --- Ombor: qo'lda chiqim (buzildi/yo'qoldi) ---
export async function stockWaste(ingredientId, qty, note = '') {
  const ing = await db.get('ingredients', ingredientId);
  if (!ing) return;
  ing.stock_qty = Math.max(0, (ing.stock_qty || 0) - qty);
  await db.put('ingredients', ing);
  await db.put('stock_movements', {
    id: db.uuid(), ingredient_id: ingredientId, type: 'out_waste',
    qty: -qty, cost: 0, order_id: null, note: note || 'Chiqim',
  });
  return ing;
}

// --- Kam qolgan ingredientlar ---
export async function lowStock() {
  const ings = await db.getAll('ingredients');
  return ings.filter(i => (i.stock_qty || 0) <= (i.min_qty || 0));
}

// --- Hisobot: sana oralig'idagi savdo statistikasi ---
// filter: 'today' | 'month' | 'all'
export async function salesSummary(filter = 'today') {
  const orders = await db.getAll('orders');
  const tKey = todayKey(), mKey = monthKey();
  const filtered = orders.filter(o => {
    if (o.payment_status !== 'paid') return false;
    if (filter === 'today') return isoToDayKey(o.created_at) === tKey;
    if (filter === 'month') return isoToMonthKey(o.created_at) === mKey;
    return true;
  });

  const revenue = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const cost = filtered.reduce((s, o) => s + (o.cost || 0), 0);
  const count = filtered.length;

  // Xarajatlar (shu davr)
  const expenses = await db.getAll('expenses');
  const exp = expenses.filter(e => {
    if (filter === 'today') return isoToDayKey(e.created_at) === tKey;
    if (filter === 'month') return isoToMonthKey(e.created_at) === mKey;
    return true;
  }).reduce((s, e) => s + (e.amount || 0), 0);

  const grossProfit = revenue - cost;       // tannarxdan keyingi foyda (margin uchun, ma'lumot xarakterida)
  const netProfit = revenue - exp;          // naqd asosida sof foyda: ombor kirimlari "exp" ichida, shu bois "cost" qayta ayirilmaydi

  // To'lov turi taqsimoti
  const byMethod = { cash: 0, click: 0 };
  filtered.forEach(o => { byMethod[o.payment_method] = (byMethod[o.payment_method] || 0) + (o.total || 0); });

  return { revenue, cost, expenses: exp, grossProfit, netProfit, count, byMethod, orders: filtered };
}

// --- Top sotilgan taomlar ---
export async function topProducts(filter = 'today', limit = 10) {
  const { orders } = await salesSummary(filter);
  const ids = new Set(orders.map(o => o.id));
  const items = (await db.getAll('order_items')).filter(it => ids.has(it.order_id));
  const map = {};
  items.forEach(it => {
    if (!map[it.product_id]) map[it.product_id] = { name: it.product_name, qty: 0, sum: 0 };
    map[it.product_id].qty += it.qty;
    map[it.product_id].sum += it.price * it.qty;
  });
  return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit);
}

// --- Sozlama olish/saqlash ---
export async function getSetting(key, def = '') {
  const s = await db.get('settings', key);
  return s ? s.value : def;
}
export async function setSetting(key, value) {
  return db.put('settings', { id: key, value });
}
