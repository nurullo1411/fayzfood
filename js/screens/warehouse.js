// ============================================================
// warehouse.js — Ombor (faqat Egasi)
// Ingredient qoldig'i, kirim, qo'lda chiqim, kam qolganda ogohlantirish.
// ============================================================
import * as db from '../db.js';
import { stockIn, stockWaste, deleteStockMovement } from '../repo.js';
import { state } from '../state.js';
import { el, $, money, toast, dateStr, timeStr, confirmBox } from '../util.js';

const CATS = [
  { id: 'meat',   label: "Go'sht mahsulotlari", icon: '🥩' },
  { id: 'drinks', label: 'Ichimliklar',          icon: '🥤' },
  { id: 'bakery', label: 'Non, xamir va sous',   icon: '🍞' },
  { id: 'veg',    label: 'Sabzavot va garnir',   icon: '🥬' },
];
const catInfo = id => CATS.find(c => c.id === id) || CATS[0];

// Eski (kategoriyasiz) ingredientlar uchun — dastlabki 12 ta namuna qaysi bo'limga tegishli ekanini bilamiz
const LEGACY_CAT = {
  'i-tovuq': 'meat', 'i-mol': 'meat', 'i-sosiska': 'meat',
  'i-cola': 'drinks', 'i-suv': 'drinks', 'i-ayron': 'drinks',
  'i-lavash-non': 'bakery', 'i-bulka': 'bakery', 'i-sous': 'bakery',
  'i-pishloq': 'veg', 'i-kartoshka': 'veg', 'i-sabzavot': 'veg',
};
const catOf = ing => ing.category || LEGACY_CAT[ing.id] || CATS[0].id;

export async function renderWarehouse(root) {
  root.innerHTML = '';
  const ings = (await db.getAll('ingredients')).sort((a, b) => a.name.localeCompare(b.name));
  const low = ings.filter(i => (i.min_qty || 0) > 0 && (i.stock_qty || 0) <= i.min_qty);

  const header = el('div', { class: 'screen-head' }, [
    el('h2', {}, '📦 Ombor'),
    el('button', { class: 'add-btn', onClick: () => editIngredient(null) }, '+ Ingredient'),
  ]);
  root.appendChild(header);

  if (low.length > 0) {
    root.appendChild(el('div', { class: 'alert-box' },
      `⚠️ ${low.length} ta ingredient kam qoldi: ` + low.map(i => i.name).join(', ')));
  }

  CATS.forEach(cat => {
    const items = ings.filter(i => catOf(i) === cat.id);
    if (items.length === 0) return;
    root.appendChild(el('div', { class: 'panel-title', style: 'margin:14px 16px 8px' }, `${cat.icon} ${cat.label}`));
    const list = el('div', { class: 'stock-list' });
    items.forEach(i => {
      const isLow = (i.min_qty || 0) > 0 && (i.stock_qty || 0) <= i.min_qty;
      const ratio = i.min_qty > 0 ? Math.min(1, (i.stock_qty || 0) / (i.min_qty * 3)) : 1;
      const color = isLow ? 'var(--red)' : ratio < 0.5 ? 'var(--yellow)' : 'var(--green)';
      list.appendChild(el('div', { class: 'stock-row' }, [
        el('div', { class: 'st-dot', style: `background:${color}` }),
        el('div', { class: 'st-info', onClick: () => history(i) }, [
          el('div', { class: 'st-name' }, i.name),
          el('div', { class: 'st-sub' }, `Qoldiq: ${fmtQty(i.stock_qty)} ${i.unit} · min: ${fmtQty(i.min_qty)} · narx: ${money(i.avg_cost)}/${i.unit}`),
        ]),
        el('div', { class: 'st-actions' }, [
          el('button', { class: 'st-btn in', onClick: () => moveDialog(i, 'in') }, '+ Kirim'),
          el('button', { class: 'st-btn out', onClick: () => moveDialog(i, 'out') }, '− Chiqim'),
        ]),
      ]));
    });
    root.appendChild(list);
  });

  // --- Kirim / chiqim oynasi ---
  function moveDialog(ing, kind) {
    const qtyI = el('input', { class: 'fld-input', type: 'number', step: '0.001', placeholder: 'Miqdor (' + ing.unit + ')' });
    const costI = el('input', { class: 'fld-input', type: 'number', value: ing.avg_cost, placeholder: '1 ' + ing.unit + ' narxi' });
    const noteI = el('input', { class: 'fld-input', placeholder: 'Izoh (ixtiyoriy)' });

    const fields = kind === 'in'
      ? [el('label', { class: 'fld-label' }, 'Miqdor'), qtyI, el('label', { class: 'fld-label' }, 'Narx (1 ' + ing.unit + ')'), costI, el('label', { class: 'fld-label' }, 'Izoh'), noteI]
      : [el('label', { class: 'fld-label' }, 'Chiqim miqdori'), qtyI, el('label', { class: 'fld-label' }, 'Sabab'), noteI];

    const modal = el('div', { class: 'modal' }, [
      el('h3', {}, (kind === 'in' ? '➕ Kirim: ' : '➖ Chiqim: ') + ing.name),
      ...fields,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Bekor'),
        el('button', { class: 'btn-confirm', onClick: save }, '💾 Saqlash'),
      ]),
    ]);
    const bg = el('div', { class: 'modal-bg' }, modal);
    document.body.appendChild(bg);

    async function save() {
      const qty = +qtyI.value;
      if (!qty || qty <= 0) { toast('Miqdor kiriting', 'error'); return; }
      if (kind === 'in') {
        await stockIn(ing.id, qty, +costI.value || ing.avg_cost, noteI.value, state.user.id);
        toast('➕ Kirim qo\'shildi');
      } else {
        const overshoot = qty > (ing.stock_qty || 0);
        await stockWaste(ing.id, qty, noteI.value);
        toast(overshoot ? '⚠️ Kiritilgan miqdor qoldiqdan ko\'p edi — qoldiq 0 ga tushirildi' : '➖ Chiqim yozildi', overshoot ? 'error' : 'success');
      }
      bg.remove();
      renderWarehouse(root);
    }
  }

  // --- Ingredient qo'shish/tahrirlash ---
  function editIngredient(ing) {
    const isNew = !ing;
    ing = ing || { name: '', unit: 'dona', stock_qty: 0, min_qty: 0, avg_cost: 0, category: CATS[0].id };
    const nameI = el('input', { class: 'fld-input', value: ing.name, placeholder: 'Ingredient nomi' });
    const catSel = el('select', { class: 'fld-input' }, CATS.map(c =>
      el('option', { value: c.id, ...(c.id === catOf(ing) ? { selected: 'true' } : {}) }, `${c.icon} ${c.label}`)));
    const unitSel = el('select', { class: 'fld-input' }, ['dona','kg','litr','gramm'].map(u =>
      el('option', { value: u, ...(u === ing.unit ? { selected: 'true' } : {}) }, u)));
    const minI = el('input', { class: 'fld-input', type: 'number', value: ing.min_qty, placeholder: 'Minimal chegara' });
    const costI = el('input', { class: 'fld-input', type: 'number', value: ing.avg_cost, placeholder: 'Narx (1 birlik)' });
    const stockI = el('input', { class: 'fld-input', type: 'number', value: ing.stock_qty, placeholder: 'Boshlang\'ich qoldiq' });

    const modal = el('div', { class: 'modal scroll' }, [
      el('h3', {}, isNew ? 'Yangi ingredient' : 'Ingredientni tahrirlash'),
      el('label', { class: 'fld-label' }, 'Nomi'), nameI,
      el('label', { class: 'fld-label' }, 'Bo\'lim'), catSel,
      el('label', { class: 'fld-label' }, 'O\'lchov birligi'), unitSel,
      el('label', { class: 'fld-label' }, 'Joriy qoldiq'), stockI,
      el('label', { class: 'fld-label' }, 'Minimal chegara (kam qolish ogohlantirishi)'), minI,
      el('label', { class: 'fld-label' }, 'Narx (1 birlik, so\'m)'), costI,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Bekor'),
        el('button', { class: 'btn-confirm', onClick: save }, '💾 Saqlash'),
      ]),
    ]);
    const bg = el('div', { class: 'modal-bg' }, modal);
    document.body.appendChild(bg);

    async function save() {
      if (!nameI.value.trim()) { toast('Nom kiriting', 'error'); return; }
      await db.put('ingredients', {
        ...ing, name: nameI.value.trim(), unit: unitSel.value, category: catSel.value,
        stock_qty: +stockI.value || 0, min_qty: +minI.value || 0, avg_cost: +costI.value || 0,
      });
      bg.remove();
      toast('💾 Saqlandi');
      renderWarehouse(root);
    }
  }

  // --- Harakatlar tarixi ---
  async function history(ing) {
    const moves = (await db.where('stock_movements', m => m.ingredient_id === ing.id))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 50);
    const TYPE = { in: '➕ Kirim', out_sale: '🧾 Sotuv', out_waste: '➖ Chiqim', inventory: '📋 Tuzatish' };
    const rows = moves.length ? moves.map(m => el('div', { class: 'hist-row' }, [
      el('div', { class: 'hist-info' }, [
        el('span', {}, TYPE[m.type] || m.type),
        el('span', { class: m.qty >= 0 ? 'pos' : 'neg' }, `${m.qty >= 0 ? '+' : ''}${fmtQty(m.qty)} ${ing.unit}`),
        el('span', { class: 'hist-date' }, `${dateStr(m.created_at)} ${timeStr(m.created_at)}`),
      ]),
      m.type === 'out_sale' ? null : el('button', { class: 'hist-del', title: 'Xato yozuvni o\'chirish', onClick: () => delMove(m) }, '🗑'),
    ])) : [el('div', { class: 'empty-mini' }, 'Harakatlar yo\'q')];

    const modal = el('div', { class: 'modal scroll' }, [
      el('h3', {}, '📋 ' + ing.name + ' — tarix'),
      el('div', { class: 'edit-ing-link', onClick: () => { bg.remove(); editIngredient(ing); } }, '✎ Ingredientni tahrirlash'),
      el('div', { class: 'hist-list' }, rows),
      el('div', { class: 'modal-actions' }, [el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Yopish')]),
    ]);
    const bg = el('div', { class: 'modal-bg' }, modal);
    document.body.appendChild(bg);

    async function delMove(m) {
      if (!await confirmBox('Bu yozuv o\'chirilsin va ombor qoldig\'i tuzatilsinmi?')) return;
      await deleteStockMovement(m.id);
      bg.remove();
      toast('🗑 O\'chirildi');
      renderWarehouse(root);
    }
  }
}

function fmtQty(n) { return (Math.round((n || 0) * 1000) / 1000).toString(); }
