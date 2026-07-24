// ============================================================
// expenses.js — Xarajatlar (faqat Egasi)
// Xarajat qo'shish, kunlik/oylik yig'indi, kategoriya bo'yicha.
// ============================================================
import * as db from '../db.js';
import { state } from '../state.js';
import { el, $, money, toast, dateStr, isoToDayKey, isoToMonthKey, todayKey, monthKey, confirmBox } from '../util.js';

const CATS = [
  { id: 'rent', label: 'Ijara', icon: '🏠' },
  { id: 'salary', label: 'Oylik', icon: '👥' },
  { id: 'utilities', label: 'Kommunal', icon: '💡' },
  { id: 'supplies', label: 'Xomashyo', icon: '📦' },
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'tax', label: 'Soliq', icon: '🧾' },
  { id: 'other', label: 'Boshqa', icon: '➕' },
];
const catInfo = id => CATS.find(c => c.id === id) || { label: id, icon: '💸' };

let period = 'month'; // 'today' | 'month'

export async function renderExpenses(root) {
  root.innerHTML = '';
  const all = await db.getAll('expenses');
  const tKey = todayKey(), mKey = monthKey();
  const items = all.filter(e => period === 'today' ? isoToDayKey(e.created_at) === tKey : isoToMonthKey(e.created_at) === mKey)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const total = items.reduce((s, e) => s + (e.amount || 0), 0);

  // Kategoriya bo'yicha taqsimot
  const byCat = {};
  items.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + e.amount);

  const header = el('div', { class: 'screen-head' }, [
    el('h2', {}, '💸 Xarajatlar'),
    el('button', { class: 'add-btn', onClick: () => addExpense() }, '+ Xarajat'),
  ]);
  root.appendChild(header);

  // davr almashtirgich
  const seg = el('div', { class: 'segment' }, [
    el('button', { class: 'seg-btn' + (period === 'today' ? ' active' : ''), onClick: () => { period = 'today'; renderExpenses(root); } }, 'Bugun'),
    el('button', { class: 'seg-btn' + (period === 'month' ? ' active' : ''), onClick: () => { period = 'month'; renderExpenses(root); } }, 'Shu oy'),
  ]);
  root.appendChild(seg);

  root.appendChild(el('div', { class: 'big-stat red' }, [
    el('div', { class: 'bs-label' }, period === 'today' ? 'Bugungi xarajat' : 'Oylik xarajat'),
    el('div', { class: 'bs-value' }, money(total)),
  ]));

  // kategoriya taqsimoti
  if (Object.keys(byCat).length) {
    const catWrap = el('div', { class: 'cat-bars' });
    Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cid, amt]) => {
      const ci = catInfo(cid);
      const pct = total > 0 ? Math.round(amt / total * 100) : 0;
      catWrap.appendChild(el('div', { class: 'cat-bar-row' }, [
        el('div', { class: 'cb-head' }, [el('span', {}, `${ci.icon} ${ci.label}`), el('span', {}, `${money(amt)} (${pct}%)`)]),
        el('div', { class: 'cb-track' }, el('div', { class: 'cb-fill', style: `width:${pct}%` })),
      ]));
    });
    root.appendChild(catWrap);
  }

  // ro'yxat
  const list = el('div', { class: 'exp-list' });
  if (items.length === 0) list.appendChild(el('div', { class: 'empty-mini' }, 'Bu davrda xarajat yo\'q'));
  items.forEach(e => {
    const ci = catInfo(e.category);
    list.appendChild(el('div', { class: 'exp-row', onClick: () => addExpense(e) }, [
      el('div', { class: 'exp-ic' }, ci.icon),
      el('div', { class: 'exp-info' }, [
        el('div', { class: 'exp-name' }, ci.label + (e.note ? ' — ' + e.note : '')),
        el('div', { class: 'exp-date' }, dateStr(e.created_at)),
      ]),
      el('div', { class: 'exp-amt' }, money(e.amount)),
    ]));
  });
  root.appendChild(list);

  // --- Qo'shish/tahrirlash ---
  function addExpense(exp) {
    const isNew = !exp;
    exp = exp || { category: 'supplies', amount: 0, note: '' };
    const amtI = el('input', { class: 'fld-input', type: 'number', value: exp.amount || '', placeholder: 'Summa (so\'m)' });
    const noteI = el('input', { class: 'fld-input', value: exp.note || '', placeholder: 'Izoh (ixtiyoriy)' });
    const catWrap = el('div', { class: 'cat-pick' });
    let chosen = exp.category;
    CATS.forEach(c => catWrap.appendChild(el('button', {
      type: 'button', class: 'catp-btn' + (c.id === chosen ? ' sel' : ''),
      onClick: (ev) => { chosen = c.id; [...catWrap.children].forEach(b => b.classList.remove('sel')); ev.currentTarget.classList.add('sel'); }
    }, `${c.icon} ${c.label}`)));

    const modal = el('div', { class: 'modal scroll' }, [
      el('h3', {}, isNew ? 'Yangi xarajat' : 'Xarajatni tahrirlash'),
      el('label', { class: 'fld-label' }, 'Summa'), amtI,
      el('label', { class: 'fld-label' }, 'Kategoriya'), catWrap,
      el('label', { class: 'fld-label' }, 'Izoh'), noteI,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Bekor'),
        isNew ? null : el('button', { class: 'btn-delete', onClick: del }, '🗑'),
        el('button', { class: 'btn-confirm', onClick: save }, '💾 Saqlash'),
      ]),
    ]);
    const bg = el('div', { class: 'modal-bg' }, modal);
    document.body.appendChild(bg);

    async function save() {
      const amount = +amtI.value;
      if (!amount || amount <= 0) { toast('Summa kiriting', 'error'); return; }
      await db.put('expenses', { ...exp, category: chosen, amount, note: noteI.value.trim(), created_by: state.user.id });
      bg.remove(); toast('💾 Saqlandi'); renderExpenses(root);
    }
    async function del() {
      if (!await confirmBox('Xarajat o\'chirilsinmi?')) return;
      await db.remove('expenses', exp.id); bg.remove(); toast('🗑 O\'chirildi'); renderExpenses(root);
    }
  }
}
