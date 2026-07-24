// ============================================================
// menu.js — Menyu boshqaruvi + texnologik karta (faqat Egasi)
// Taom qo'shish/tahrirlash/o'chirish, retsept, avtomatik tannarx.
// ============================================================
import * as db from '../db.js';
import { productCost } from '../repo.js';
import { el, $, money, toast, confirmBox } from '../util.js';

const EMOJIS = ['🌯','🍔','🌭','🍟','🍗','🍕','🥙','🥪','🍱','🥤','💧','🥛','☕','🍵','🧃'];

export async function renderMenu(root) {
  root.innerHTML = '';
  const cats = (await db.getAll('categories')).sort((a, b) => a.sort_order - b.sort_order);
  const products = await db.getAll('products');

  const header = el('div', { class: 'screen-head' }, [
    el('h2', {}, '🍔 Menyu'),
    el('button', { class: 'add-btn', onClick: () => editProduct(null) }, '+ Taom'),
  ]);

  const list = el('div', { class: 'prod-manage-list' });
  for (const cat of cats) {
    const inCat = products.filter(p => p.category_id === cat.id);
    if (inCat.length === 0 && products.length > 0) { /* baribir ko'rsatamiz sarlavhani */ }
    list.appendChild(el('div', { class: 'cat-head' }, cat.name));
    for (const p of inCat) {
      const cost = await productCost(p.id);
      const profit = p.price - cost;
      const margin = p.price > 0 ? Math.round(profit / p.price * 100) : 0;
      list.appendChild(el('div', { class: 'prod-row' + (p.is_available ? '' : ' off'), onClick: () => editProduct(p) }, [
        el('div', { class: 'pr-emoji', html: p.emoji || '🍽️' }),
        el('div', { class: 'pr-info' }, [
          el('div', { class: 'pr-name' }, p.name + (p.is_available ? '' : ' (to\'xtatilgan)')),
          el('div', { class: 'pr-sub' }, `Narx: ${money(p.price)} · Tannarx: ${money(cost)} · Foyda: ${money(profit)} (${margin}%)`),
        ]),
        el('div', { class: 'pr-arrow' }, '›'),
      ]));
    }
  }

  root.appendChild(header);
  root.appendChild(list);

  // --- Taom tahrirlash oynasi ---
  async function editProduct(p) {
    const isNew = !p;
    p = p || { name: '', price: 0, category_id: cats[0]?.id, emoji: '🍔', is_available: true };
    const ingredients = await db.getAll('ingredients');
    let recipe = isNew ? [] : (await db.where('recipes', r => r.product_id === p.id));

    const nameI = el('input', { class: 'fld-input', value: p.name, placeholder: 'Taom nomi' });
    const priceI = el('input', { class: 'fld-input', type: 'number', value: p.price, placeholder: 'Narx' });
    const catSel = el('select', { class: 'fld-input' }, cats.map(c => el('option', { value: c.id, ...(c.id === p.category_id ? { selected: 'true' } : {}) }, c.name)));
    const availSel = el('select', { class: 'fld-input' }, [
      el('option', { value: '1', ...(p.is_available ? { selected: 'true' } : {}) }, 'Sotuvda'),
      el('option', { value: '0', ...(!p.is_available ? { selected: 'true' } : {}) }, "To'xtatilgan"),
    ]);

    const emojiRow = el('div', { class: 'emoji-pick' });
    let chosenEmoji = p.emoji || '🍔';
    EMOJIS.forEach(e => emojiRow.appendChild(el('button', {
      type: 'button', class: 'emoji-btn' + (e === chosenEmoji ? ' sel' : ''),
      onClick: () => { chosenEmoji = e; [...emojiRow.children].forEach(b => b.classList.remove('sel')); event.target.classList.add('sel'); }
    }, e)));

    // Retsept (texnologik karta)
    const recipeBox = el('div', { class: 'recipe-box' });
    const costLabel = el('div', { class: 'recipe-cost' });
    function renderRecipe() {
      recipeBox.innerHTML = '';
      let cost = 0;
      recipe.forEach((r, idx) => {
        const ing = ingredients.find(i => i.id === r.ingredient_id);
        if (ing) cost += (ing.avg_cost || 0) * (r.qty || 0);
        const ingSel = el('select', { class: 'fld-input mini' }, ingredients.map(i =>
          el('option', { value: i.id, ...(i.id === r.ingredient_id ? { selected: 'true' } : {}) }, `${i.name} (${i.unit})`)));
        ingSel.onchange = () => { r.ingredient_id = ingSel.value; renderRecipe(); };
        const qtyI = el('input', { class: 'fld-input mini', type: 'number', step: '0.001', value: r.qty });
        qtyI.oninput = () => { r.qty = +qtyI.value || 0; renderRecipe(); };
        recipeBox.appendChild(el('div', { class: 'recipe-row' }, [
          ingSel, qtyI,
          el('button', { class: 'rm-btn', onClick: () => { recipe.splice(idx, 1); renderRecipe(); } }, '✕'),
        ]));
      });
      costLabel.innerHTML = `Tannarx: <b>${money(cost)}</b> · Foyda: <b>${money((+priceI.value || 0) - cost)}</b>`;
    }
    priceI.addEventListener('input', renderRecipe);
    const addIngBtn = el('button', { class: 'add-ing-btn', onClick: () => { recipe.push({ ingredient_id: ingredients[0]?.id, qty: 0 }); renderRecipe(); } }, '+ Ingredient');

    const actions = el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Bekor'),
      isNew ? null : el('button', { class: 'btn-delete', onClick: () => del(p, bg) }, '🗑'),
      el('button', { class: 'btn-confirm', onClick: () => save(p, bg) }, '💾 Saqlash'),
    ]);

    const modal = el('div', { class: 'modal scroll' }, [
      el('h3', {}, isNew ? 'Yangi taom' : 'Taomni tahrirlash'),
      el('label', { class: 'fld-label' }, 'Nomi'), nameI,
      el('label', { class: 'fld-label' }, 'Narx (so\'m)'), priceI,
      el('label', { class: 'fld-label' }, 'Kategoriya'), catSel,
      el('label', { class: 'fld-label' }, 'Holati'), availSel,
      el('label', { class: 'fld-label' }, 'Belgi (emoji)'), emojiRow,
      el('label', { class: 'fld-label' }, 'Texnologik karta (ingredientlar)'),
      recipeBox, addIngBtn, costLabel,
      actions,
    ]);
    const bg = el('div', { class: 'modal-bg' }, modal);
    document.body.appendChild(bg);
    renderRecipe();

    async function save(prod, bg) {
      const name = nameI.value.trim();
      if (!name) { toast('Nom kiriting', 'error'); return; }
      const saved = await db.put('products', {
        ...prod, name, price: +priceI.value || 0,
        category_id: catSel.value, emoji: chosenEmoji, is_available: availSel.value === '1',
      });
      // Retseptni qayta yozish: eskilarni o'chirib, yangilarini saqlash
      const old = await db.where('recipes', r => r.product_id === saved.id);
      for (const o of old) await db.remove('recipes', o.id);
      for (const r of recipe) if (r.ingredient_id && r.qty > 0)
        await db.put('recipes', { id: db.uuid(), product_id: saved.id, ingredient_id: r.ingredient_id, qty: r.qty });
      bg.remove();
      toast('💾 Saqlandi');
      renderMenu(root);
    }
    async function del(prod, bg) {
      if (!await confirmBox(`"${prod.name}" o'chirilsinmi?`)) return;
      await db.remove('products', prod.id);
      bg.remove();
      toast('🗑 O\'chirildi');
      renderMenu(root);
    }
  }
}
