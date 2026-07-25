// ============================================================
// reports.js — Hisobot / Dashboard (faqat Egasi)
// Tushum, xarajat, foyda, top taomlar, to'lov turi taqsimoti.
// ============================================================
import { salesSummary, topProducts } from '../repo.js';
import { lowStock } from '../repo.js';
import { el, $, money } from '../util.js';

let period = 'today';

export async function renderReports(root) {
  root.innerHTML = '';
  const sum = await salesSummary(period);
  const top = await topProducts(period, 7);
  const low = await lowStock();

  root.appendChild(el('div', { class: 'screen-head' }, [el('h2', {}, '📊 Hisobot')]));

  const seg = el('div', { class: 'segment' }, [
    el('button', { class: 'seg-btn' + (period === 'today' ? ' active' : ''), onClick: () => { period = 'today'; renderReports(root); } }, 'Bugun'),
    el('button', { class: 'seg-btn' + (period === 'month' ? ' active' : ''), onClick: () => { period = 'month'; renderReports(root); } }, 'Shu oy'),
    el('button', { class: 'seg-btn' + (period === 'all' ? ' active' : ''), onClick: () => { period = 'all'; renderReports(root); } }, 'Hammasi'),
  ]);
  root.appendChild(seg);

  // 3 ta katta raqam
  const stats = el('div', { class: 'stat-grid' }, [
    statCard('Tushum', sum.revenue, 'green'),
    statCard('Xarajat', sum.expenses, 'red'),
    statCard('Sof foyda', sum.netProfit, sum.netProfit >= 0 ? 'blue' : 'red'),
  ]);
  root.appendChild(stats);

  // foyda taqsimoti
  root.appendChild(el('div', { class: 'mini-stats' }, [
    miniStat('Buyurtmalar', sum.count + ' ta'),
  ]));

  // to'lov turi
  const payTotal = sum.byMethod.cash + sum.byMethod.click;
  root.appendChild(el('div', { class: 'panel' }, [
    el('div', { class: 'panel-title' }, '💳 To\'lov turi'),
    payBar('💵 Naqd', sum.byMethod.cash, payTotal, 'var(--green)'),
    payBar('📱 Click', sum.byMethod.click, payTotal, 'var(--brand)'),
  ]));

  // top taomlar
  const topPanel = el('div', { class: 'panel' }, [el('div', { class: 'panel-title' }, '🏆 Eng ko\'p sotilgan')]);
  if (top.length === 0) topPanel.appendChild(el('div', { class: 'empty-mini' }, 'Hali sotuv yo\'q'));
  top.forEach((t, i) => topPanel.appendChild(el('div', { class: 'top-row' }, [
    el('span', { class: 'top-rank' }, '#' + (i + 1)),
    el('span', { class: 'top-name' }, t.name),
    el('span', { class: 'top-qty' }, t.qty + ' ta'),
    el('span', { class: 'top-sum' }, money(t.sum)),
  ])));
  root.appendChild(topPanel);

  // kam qolgan ombor
  if (low.length > 0) {
    const lowPanel = el('div', { class: 'panel' }, [el('div', { class: 'panel-title' }, '⚠️ Kam qolgan ingredientlar')]);
    low.forEach(i => lowPanel.appendChild(el('div', { class: 'top-row' }, [
      el('span', { class: 'top-name' }, i.name),
      el('span', { class: 'low-q' }, `${i.stock_qty} ${i.unit} (min ${i.min_qty})`),
    ])));
    root.appendChild(lowPanel);
  }

  root.appendChild(el('div', { class: 'report-note' }, 'ℹ️ 2-bosqichda bu hisobot har kuni Telegram orqali avtomatik yuboriladi.'));
}

function statCard(label, value, color) {
  return el('div', { class: 'stat-card ' + color }, [
    el('div', { class: 'sc-label' }, label),
    el('div', { class: 'sc-value' }, money(value, false)),
    el('div', { class: 'sc-unit' }, 'so\'m'),
  ]);
}
function miniStat(label, value) {
  return el('div', { class: 'mini-stat' }, [el('div', { class: 'ms-v' }, value), el('div', { class: 'ms-l' }, label)]);
}
function payBar(label, value, total, color) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0;
  return el('div', { class: 'cat-bar-row' }, [
    el('div', { class: 'cb-head' }, [el('span', {}, label), el('span', {}, `${money(value)} (${pct}%)`)]),
    el('div', { class: 'cb-track' }, el('div', { class: 'cb-fill', style: `width:${pct}%;background:${color}` })),
  ]);
}
