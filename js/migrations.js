// ============================================================
// migrations.js — Ilova allaqachon o'rnatilgan (bo'sh bo'lmagan) qurilmalarga
// bir martalik ma'lumot qo'shish uchun. seedIfEmpty() faqat DB bo'sh bo'lsa ishlaydi,
// shu bois yangi taom/ingredient partiyalarini shu yerdan qo'shamiz.
// ============================================================
import * as db from './db.js';
import { getSetting, setSetting } from './repo.js';

function slug(name) {
  return name.toLowerCase().replace(/[().]/g, '').replace(/\s+/g, '-');
}

// Ichimliklar: har biriga ombor ingredienti + menyu mahsuloti + 1:1 retsept yaratadi.
// Narx/qoldiq vaqtincha 0 — Egasi keyin Ombor/Menyu bo'limidan to'ldiradi.
// Narx kiritilmaguncha xato sotuvning oldini olish uchun mahsulot "to'xtatilgan" holatda qo'shiladi.
async function addDrinkBatch(names) {
  for (const name of names) {
    const id = 'i-' + slug(name);
    const pid = 'p-' + slug(name);
    if (await db.get('ingredients', id)) continue; // allaqachon qo'shilgan
    await db.put('ingredients', { id, name, unit: 'dona', stock_qty: 0, min_qty: 0, avg_cost: 0, category: 'drinks' });
    await db.put('products', { id: pid, category_id: 'c-drink', name, price: 0, emoji: '🥤', is_available: false });
    await db.put('recipes', { product_id: pid, ingredient_id: id, qty: 1 });
  }
}

// Haqiqiy taomlar menyusi rasmidan: eski sinov taomlarini o'chirib, shular bilan almashtiradi.
// Ichimliklar (c-drink) tegilmaydi. Narxi ikki xil ko'rsatilgan taomlar (kichik/katta o'lcham)
// ikkita alohida mahsulot qilib kiritildi. Texnologik karta (retsept) hozircha yo'q — tannarx 0,
// Egasi keyin Menyu bo'limidan retsept qo'shishi mumkin.
async function replaceFoodMenu() {
  await db.put('categories', { id: 'c-hotdog', name: 'Xot-dog / Longer', sort_order: 1 });
  await db.put('categories', { id: 'c-burger', name: 'Burger',           sort_order: 2 });
  await db.put('categories', { id: 'c-lavash', name: 'Lavash / Shaurma', sort_order: 3 });
  await db.put('categories', { id: 'c-box',    name: 'Box va KFC',       sort_order: 4 });
  await db.put('categories', { id: 'c-drink',  name: 'Ichimlik',         sort_order: 5 });
  await db.remove('categories', 'c-garnir'); // "Fri" endi Box va KFC bo'limiga tushadi

  const oldProducts = await db.where('products', p => p.category_id !== 'c-drink');
  for (const p of oldProducts) {
    await db.remove('products', p.id);
    for (const r of await db.where('recipes', r => r.product_id === p.id)) await db.remove('recipes', r.id);
  }

  const items = [
    ['Xot-dog oddiy (kichik)',        8000,  'c-hotdog', '🌭'],
    ['Xot-dog oddiy (katta)',         10000, 'c-hotdog', '🌭'],
    ['Xot-dog Canada 2x (kichik)',    12000, 'c-hotdog', '🌭'],
    ['Xot-dog Canada 2x (katta)',     15000, 'c-hotdog', '🌭'],
    ['Xot-dog Koroleyskiy',           20000, 'c-hotdog', '🌭'],
    ['Xot-dog Cheese',                15000, 'c-hotdog', '🌭'],
    ['Xot-dog Gushtli',               25000, 'c-hotdog', '🌭'],
    ['Longer',                        20000, 'c-hotdog', '🌭'],
    ['Chese Longer',                  25000, 'c-hotdog', '🌭'],
    ['KFC Burger',                    20000, 'c-burger', '🍔'],
    ['KFC Cheese',                    25000, 'c-burger', '🍔'],
    ['Gamburger',                     25000, 'c-burger', '🍔'],
    ['Chizburger',                    30000, 'c-burger', '🍔'],
    ['Big Burger',                    35000, 'c-burger', '🍔'],
    ['Big Burger Cheese',             40000, 'c-burger', '🍔'],
    ['Non kabob Tushonkali',          35000, 'c-burger', '🥙'],
    ['Twister (kichik)',              25000, 'c-lavash', '🌯'],
    ['Twister (katta)',               30000, 'c-lavash', '🌯'],
    ['Lavash Tovuqli (kichik)',       25000, 'c-lavash', '🌯'],
    ['Lavash Tovuqli (katta)',        30000, 'c-lavash', '🌯'],
    ['Lavash Mol gushti (kichik)',    30000, 'c-lavash', '🌯'],
    ['Lavash Mol gushti (katta)',     35000, 'c-lavash', '🌯'],
    ['Lavash Sir',                    35000, 'c-lavash', '🌯'],
    ['Shaurma Tovuqli',               25000, 'c-lavash', '🌯'],
    ['Shaurma Mol gushti (kichik)',   30000, 'c-lavash', '🌯'],
    ['Shaurma Mol gushti (katta)',    40000, 'c-lavash', '🌯'],
    ['Club Sandwich',                 40000, 'c-lavash', '🥪'],
    ['Beef Box',                      50000, 'c-box',    '🥡'],
    ['Chicken Box',                   45000, 'c-box',    '🥡'],
    ['Sausage Box',                   45000, 'c-box',    '🥡'],
    ['Bifstroganov',                  50000, 'c-box',    '🥡'],
    ['KFC',                           25000, 'c-box',    '🍗'],
    ['KFC 1 kg',                      90000, 'c-box',    '🍗'],
    ['Fri 110 gr',                    15000, 'c-box',    '🍟'],
  ];
  for (const [name, price, category_id, emoji] of items) {
    const id = 'p-' + slug(name);
    if (await db.get('products', id)) continue;
    await db.put('products', { id, name, price, category_id, emoji, is_available: true });
  }
}

// Ichimliklarga haqiqiy tannarx/sotish narxini qo'yadi (Kiosk Hisob ma'lumotlaridan).
// Sotish narxi 0 bo'lganlar (hali sotib olinmagan/sotilmayotgan) "to'xtatilgan" holatda qoladi.
async function setDrinkPrices(prices) {
  for (const [name, cost, price] of prices) {
    const ing = await db.get('ingredients', 'i-' + slug(name));
    if (ing) { ing.avg_cost = cost; await db.put('ingredients', ing); }
    const prod = await db.get('products', 'p-' + slug(name));
    if (prod) { prod.price = price; prod.is_available = price > 0; await db.put('products', prod); }
  }
}

// Har bir mahsulotga qisqa raqamli kod beradi (masalan Beef Box = 11) — kassada tez
// tanlash va ovozli buyurtmada nom o'rniga raqam aytish uchun ("beef box" o'rniga "o'n bir").
// Faqat kod hali yo'q mahsulotlarga beriladi, mavjudlarga tegilmaydi.
async function assignProductCodes() {
  const cats = (await db.getAll('categories')).sort((a, b) => a.sort_order - b.sort_order);
  const catOrder = {};
  cats.forEach((c, i) => catOrder[c.id] = i);

  const products = await db.getAll('products');
  const withoutCode = products.filter(p => !p.code);
  if (withoutCode.length === 0) return;

  const maxExisting = products.reduce((m, p) => p.code ? Math.max(m, p.code) : m, 0);
  withoutCode.sort((a, b) => {
    const ca = catOrder[a.category_id] ?? 999, cb = catOrder[b.category_id] ?? 999;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  let next = maxExisting + 1;
  for (const p of withoutCode) {
    await db.put('products', { ...p, code: next });
    next++;
  }
}

const MIGRATIONS = [
  {
    id: 1,
    run: () => addDrinkBatch([
      'Kola 0.5', 'Kola 1.0', 'Kola 1.5', 'Kola 2.0',
      'Fanta 0.5', 'Fanta 1.0', 'Fanta 1.5', 'Fanta 2.0',
      'Sprite 0.5', 'Sprite 1.0', 'Sprite 1.5',
      'Shisha fanta', 'Shisha kola',
      'Fanta balnichni', 'Kola balnichni',
      'Adrenalin kotta', 'Adrenalin kichkina',
      'Flesh rus', 'Flesh uzb',
      'Gorilla', 'Ananas', 'Moxito', 'Royal', 'Sok',
      'Dinay 1.0', 'Dinay 0.5',
      'Garden kotta', 'Garden kichkina',
      'Arktea kotta', 'Arktea kichkina',
      'Fyus tea 0.5', 'Fyus tea 1.0',
      'Bonaqua 0.5', 'Bonaqua 1.0', 'Bonaqua 1.5',
      'Pepsi 0.5', 'Pepsi 1.0', 'Pepsi 1.5', 'Pepsi 1.75', 'Pepsi 2.0',
      'Gidrolayf 0.5', 'Gidrolayf 1.0', 'Gidrolayf 1.5',
    ]),
  },
  { id: 2, run: replaceFoodMenu },
  {
    id: 3,
    // [nom, tannarx, sotish narxi]
    run: () => setDrinkPrices([
      ['Kola 0.5', 5900, 8000], ['Kola 1.0', 9200, 12000], ['Kola 1.5', 12500, 15000], ['Kola 2.0', 0, 0],
      ['Fanta 0.5', 5900, 8000], ['Fanta 1.0', 9200, 12000], ['Fanta 1.5', 12500, 15000], ['Fanta 2.0', 0, 0],
      ['Sprite 0.5', 5900, 8000], ['Sprite 1.0', 9200, 12000], ['Sprite 1.5', 12500, 15000],
      ['Shisha fanta', 3000, 5000], ['Shisha kola', 3000, 5000],
      ['Fanta balnichni', 0, 0], ['Kola balnichni', 0, 0],
      ['Adrenalin kotta', 14000, 17000], ['Adrenalin kichkina', 0, 0],
      ['Flesh rus', 11700, 15000], ['Flesh uzb', 9400, 13000],
      ['Gorilla', 10300, 13000], ['Ananas', 0, 0], ['Moxito', 10300, 13000], ['Royal', 5000, 8000], ['Sok', 0, 0],
      ['Dinay 1.0', 10500, 12000], ['Dinay 0.5', 7000, 8000],
      ['Garden kotta', 0, 0], ['Garden kichkina', 0, 0],
      ['Arktea kotta', 8700, 12000], ['Arktea kichkina', 5200, 6000],
      ['Fyus tea 0.5', 5900, 8000], ['Fyus tea 1.0', 9200, 12000],
      ['Bonaqua 0.5', 2550, 4000], ['Bonaqua 1.0', 0, 0], ['Bonaqua 1.5', 0, 0],
      ['Pepsi 0.5', 6100, 8000], ['Pepsi 1.0', 9500, 12000], ['Pepsi 1.5', 13000, 15000], ['Pepsi 1.75', 0, 0], ['Pepsi 2.0', 16500, 20000],
      ['Gidrolayf 0.5', 0, 0], ['Gidrolayf 1.0', 0, 0], ['Gidrolayf 1.5', 0, 0],
    ]),
  },
  { id: 4, run: assignProductCodes },
];

export async function runMigrations() {
  const cur = +(await getSetting('migration_version', '0'));
  for (const m of MIGRATIONS) {
    if (m.id > cur) {
      await m.run();
      await setSetting('migration_version', String(m.id));
    }
  }
}
