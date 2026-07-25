// ============================================================
// migrations.js — Ilova allaqachon o'rnatilgan (bo'sh bo'lmagan) qurilmalarga
// bir martalik ma'lumot qo'shish uchun. seedIfEmpty() faqat DB bo'sh bo'lsa ishlaydi,
// shu bois yangi taom/ingredient partiyalarini shu yerdan qo'shamiz.
// ============================================================
import * as db from './db.js';
import { getSetting, setSetting } from './repo.js';

function slug(name) {
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-');
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
