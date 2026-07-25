// ============================================================
// seed.js — Birinchi ishga tushganda boshlang'ich ma'lumotlar
// (Egasi keyinchalik bularni ilovada o'zgartiradi)
// ============================================================
import { openDB, getAll, put, get } from './db.js';

// Boshlang'ich ombor qoldig'i — seedIfEmpty() va repo.js'dagi resetTestData() ikkisi ham shundan foydalanadi
export const INGREDIENTS_SEED = [
  { id: 'i-lavash-non', name: 'Lavash noni',   unit: 'dona', stock_qty: 100, min_qty: 20, avg_cost: 2000,  category: 'bakery' },
  { id: 'i-bulka',      name: 'Bulka (non)',    unit: 'dona', stock_qty: 80,  min_qty: 20, avg_cost: 2500,  category: 'bakery' },
  { id: 'i-tovuq',      name: "Tovuq go'shti",  unit: 'kg',   stock_qty: 15,  min_qty: 3,  avg_cost: 45000, category: 'meat' },
  { id: 'i-mol',        name: "Mol go'shti",    unit: 'kg',   stock_qty: 12,  min_qty: 3,  avg_cost: 75000, category: 'meat' },
  { id: 'i-pishloq',    name: 'Pishloq',        unit: 'kg',   stock_qty: 5,   min_qty: 1,  avg_cost: 60000, category: 'veg' },
  { id: 'i-kartoshka',  name: 'Kartoshka fri',  unit: 'kg',   stock_qty: 20,  min_qty: 5,  avg_cost: 18000, category: 'veg' },
  { id: 'i-sous',       name: 'Souslar',        unit: 'litr', stock_qty: 8,   min_qty: 2,  avg_cost: 25000, category: 'bakery' },
  { id: 'i-sabzavot',   name: 'Sabzavot',       unit: 'kg',   stock_qty: 10,  min_qty: 2,  avg_cost: 12000, category: 'veg' },
  { id: 'i-sosiska',    name: 'Sosiska',        unit: 'dona', stock_qty: 60,  min_qty: 15, avg_cost: 4000,  category: 'meat' },
  { id: 'i-cola',       name: 'Cola 0.5',       unit: 'dona', stock_qty: 50,  min_qty: 12, avg_cost: 5000,  category: 'drinks' },
  { id: 'i-suv',        name: 'Suv 0.5',        unit: 'dona', stock_qty: 60,  min_qty: 12, avg_cost: 2000,  category: 'drinks' },
  { id: 'i-ayron',      name: 'Ayron',          unit: 'dona', stock_qty: 40,  min_qty: 10, avg_cost: 4000,  category: 'drinks' },
];

export async function seedIfEmpty() {
  await openDB();
  const users = await getAll('users');
  if (users.length > 0) return; // allaqachon to'ldirilgan

  // --- Foydalanuvchilar (PIN-kod bilan) ---
  await put('users', { id: 'u-owner',   name: 'Egasi',  role: 'owner',   pin: '1111', is_active: true });
  await put('users', { id: 'u-staff',   name: 'Aziz',   role: 'staff',   pin: '2222', is_active: true });
  await put('users', { id: 'u-courier', name: 'Bekzod', role: 'courier', pin: '3333', is_active: true });

  // --- Sozlamalar ---
  await put('settings', { id: 'currency', value: "so'm" });
  await put('settings', { id: 'brand_name', value: 'FayzFood' });
  await put('settings', { id: 'brand_logo_type', value: 'emoji' });
  await put('settings', { id: 'brand_logo_value', value: '🍔' });
  await put('settings', { id: 'telegram_chat_id', value: '' });

  // --- Kategoriyalar ---
  const cats = [
    { id: 'c-lavash', name: 'Lavash', sort_order: 1 },
    { id: 'c-burger', name: 'Burger', sort_order: 2 },
    { id: 'c-hotdog', name: 'Hot-dog', sort_order: 3 },
    { id: 'c-garnir', name: 'Garnir', sort_order: 4 },
    { id: 'c-drink',  name: 'Ichimlik', sort_order: 5 },
  ];
  for (const c of cats) await put('categories', c);

  // --- Ingredientlar (ombor) --- avg_cost = 1 birlik narxi (so'm)
  for (const i of INGREDIENTS_SEED) await put('ingredients', i);

  // --- Taomlar ---
  const prods = [
    { id: 'p-1', category_id: 'c-lavash', name: 'Tovuqli lavash',  price: 28000, emoji: '🌯', is_available: true },
    { id: 'p-2', category_id: 'c-lavash', name: "Go'shtli lavash", price: 32000, emoji: '🌯', is_available: true },
    { id: 'p-3', category_id: 'c-burger', name: 'Chizburger',      price: 30000, emoji: '🍔', is_available: true },
    { id: 'p-4', category_id: 'c-burger', name: 'Tovuq burger',    price: 27000, emoji: '🍔', is_available: true },
    { id: 'p-5', category_id: 'c-hotdog', name: 'Klassik hot-dog', price: 18000, emoji: '🌭', is_available: true },
    { id: 'p-6', category_id: 'c-garnir', name: 'Fri kartoshka',   price: 15000, emoji: '🍟', is_available: true },
    { id: 'p-7', category_id: 'c-drink',  name: 'Cola 0.5',        price: 9000,  emoji: '🥤', is_available: true },
    { id: 'p-8', category_id: 'c-drink',  name: 'Suv 0.5',         price: 4000,  emoji: '💧', is_available: true },
    { id: 'p-9', category_id: 'c-drink',  name: 'Ayron',           price: 8000,  emoji: '🥛', is_available: true },
  ];
  for (const p of prods) await put('products', p);

  // --- Texnologik karta (retseptlar): product_id + ingredient_id + qty ---
  const recipes = [
    // Tovuqli lavash
    { product_id: 'p-1', ingredient_id: 'i-lavash-non', qty: 1 },
    { product_id: 'p-1', ingredient_id: 'i-tovuq',      qty: 0.15 },
    { product_id: 'p-1', ingredient_id: 'i-sabzavot',   qty: 0.05 },
    { product_id: 'p-1', ingredient_id: 'i-sous',       qty: 0.03 },
    // Go'shtli lavash
    { product_id: 'p-2', ingredient_id: 'i-lavash-non', qty: 1 },
    { product_id: 'p-2', ingredient_id: 'i-mol',        qty: 0.15 },
    { product_id: 'p-2', ingredient_id: 'i-sabzavot',   qty: 0.05 },
    { product_id: 'p-2', ingredient_id: 'i-sous',       qty: 0.03 },
    // Chizburger
    { product_id: 'p-3', ingredient_id: 'i-bulka',      qty: 1 },
    { product_id: 'p-3', ingredient_id: 'i-mol',        qty: 0.12 },
    { product_id: 'p-3', ingredient_id: 'i-pishloq',    qty: 0.03 },
    { product_id: 'p-3', ingredient_id: 'i-sabzavot',   qty: 0.03 },
    // Tovuq burger
    { product_id: 'p-4', ingredient_id: 'i-bulka',      qty: 1 },
    { product_id: 'p-4', ingredient_id: 'i-tovuq',      qty: 0.12 },
    { product_id: 'p-4', ingredient_id: 'i-sabzavot',   qty: 0.03 },
    // Hot-dog
    { product_id: 'p-5', ingredient_id: 'i-bulka',      qty: 1 },
    { product_id: 'p-5', ingredient_id: 'i-sosiska',    qty: 1 },
    { product_id: 'p-5', ingredient_id: 'i-sous',       qty: 0.02 },
    // Fri kartoshka
    { product_id: 'p-6', ingredient_id: 'i-kartoshka',  qty: 0.2 },
    // Ichimliklar (1 dona = 1 dona)
    { product_id: 'p-7', ingredient_id: 'i-cola',       qty: 1 },
    { product_id: 'p-8', ingredient_id: 'i-suv',        qty: 1 },
    { product_id: 'p-9', ingredient_id: 'i-ayron',      qty: 1 },
  ];
  for (const r of recipes) await put('recipes', r);

  console.log('✅ Boshlang\'ich ma\'lumotlar yuklandi');
}
