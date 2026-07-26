// ============================================================
// kassa.js — Buyurtma qabul qilish va sotuv
// Sotuv bazaga yoziladi + ombordan ingredient avtomatik chiqim.
// Ishchi tannarx/foyda ko'rmaydi.
// ============================================================
import * as db from '../db.js';
import { checkout } from '../repo.js';
import { state, isOwner } from '../state.js';
import { el, $, money, toast } from '../util.js';

let cart = [];
let activeCat = 'all';
let orderType = 'dine_in';
let deliveryAddress = '';
let deliveryFee = 0;

export async function renderKassa(root) {
  cart = [];
  const cats = (await db.getAll('categories')).sort((a, b) => a.sort_order - b.sort_order);
  const products = (await db.getAll('products')).filter(p => p.is_available);

  root.innerHTML = '';
  const layout = el('div', { class: 'kassa-layout' });

  // CHAP: menyu
  const menuPane = el('section', { class: 'menu-pane' });
  const catRow = el('div', { class: 'cats' });
  const grid = el('div', { class: 'products' });

  function renderCats() {
    catRow.innerHTML = '';
    const all = el('button', { class: 'cat' + (activeCat === 'all' ? ' active' : ''), onClick: () => { activeCat = 'all'; renderCats(); renderGrid(); } }, 'Hammasi');
    catRow.appendChild(all);
    cats.forEach(c => catRow.appendChild(el('button', {
      class: 'cat' + (activeCat === c.id ? ' active' : ''),
      onClick: () => { activeCat = c.id; renderCats(); renderGrid(); }
    }, c.name)));
  }
  function renderGrid() {
    grid.innerHTML = '';
    products.filter(p => activeCat === 'all' || p.category_id === activeCat).forEach(p => {
      grid.appendChild(el('div', { class: 'card', onClick: () => add(p) }, [
        el('div', { class: 'emoji', html: p.emoji || '🍽️' }),
        el('div', { class: 'pname' }, p.name),
        el('div', { class: 'pprice' }, money(p.price)),
      ]));
    });
  }
  menuPane.appendChild(catRow);
  menuPane.appendChild(grid);

  // O'NG: savat
  const cartPane = el('aside', { class: 'cart-pane' });
  const typeRow = el('div', { class: 'order-types' });
  [['dine_in','🍽️ Zal'],['takeaway','🥡 Olib ketish'],['delivery','🛵 Dostavka']].forEach(([t, lbl]) => {
    typeRow.appendChild(el('button', {
      class: 'otype' + (orderType === t ? ' active' : ''),
      onClick: (e) => {
        orderType = t;
        [...typeRow.children].forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        addressBox.hidden = t !== 'delivery';
        renderCart();
      }
    }, lbl));
  });
  const addressI = el('input', { class: 'fld-input', value: deliveryAddress, placeholder: 'Yetkazish manzili' });
  const feeI = el('input', { class: 'fld-input', type: 'number', value: deliveryFee || '', placeholder: 'Yetkazish narxi (ixtiyoriy)' });
  addressI.addEventListener('input', () => deliveryAddress = addressI.value);
  feeI.addEventListener('input', () => { deliveryFee = +feeI.value || 0; renderCart(); });
  const addressBox = el('div', { class: 'address-box', ...(orderType !== 'delivery' ? { hidden: 'true' } : {}) }, [addressI, feeI]);
  const cartList = el('div', { class: 'cart-list' });
  const grandTotal = el('span', {}, money(0));
  const payBtn = el('button', { class: 'pay-btn', disabled: 'true', onClick: openPay }, "To'lov");
  const summary = el('div', { class: 'cart-summary' }, [
    el('div', { class: 'row total' }, [el('span', {}, 'Jami'), grandTotal]),
    payBtn,
  ]);
  cartPane.appendChild(typeRow);
  cartPane.appendChild(addressBox);
  cartPane.appendChild(cartList);
  cartPane.appendChild(summary);

  function total() {
    const cartSum = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
    return orderType === 'delivery' ? cartSum + deliveryFee : cartSum;
  }
  function add(p) { const ex = cart.find(i => i.product.id === p.id); if (ex) ex.qty++; else cart.push({ product: p, qty: 1 }); renderCart(); }
  function chg(id, d) { const it = cart.find(i => i.product.id === id); if (!it) return; it.qty += d; if (it.qty <= 0) cart = cart.filter(i => i.product.id !== id); renderCart(); }
  function renderCart() {
    if (cart.length === 0) {
      cartList.innerHTML = `<div class="cart-empty"><div class="cart-empty-ic">🧾</div><p>Savat bo'sh</p><small>Taom tanlang</small></div>`;
    } else {
      cartList.innerHTML = '';
      cart.forEach(i => {
        cartList.appendChild(el('div', { class: 'citem' }, [
          el('div', { class: 'ci-emoji', html: i.product.emoji || '🍽️' }),
          el('div', { class: 'ci-info' }, [
            el('div', { class: 'ci-name' }, i.product.name),
            el('div', { class: 'ci-price' }, `${money(i.product.price)} × ${i.qty} = ${money(i.product.price * i.qty)}`),
          ]),
          el('div', { class: 'qty' }, [
            el('button', { onClick: () => chg(i.product.id, -1) }, '−'),
            el('span', {}, String(i.qty)),
            el('button', { onClick: () => chg(i.product.id, 1) }, '+'),
          ]),
        ]));
      });
    }
    grandTotal.textContent = money(total());
    payBtn.disabled = cart.length === 0;
  }

  // To'lov oynasi
  function openPay() {
    if (cart.length === 0) return;
    if (orderType === 'delivery' && !deliveryAddress.trim()) { toast('Yetkazish manzilini kiriting', 'error'); return; }
    let method = 'cash';
    const sum = total();

    const givenInput = el('input', { type: 'number', placeholder: 'Mijoz bergan summa', class: 'fld-input' });
    const changeRow = el('div', { class: 'change-row', html: "Qaytim: <b>0 so'm</b>" });
    const cashBox = el('div', { class: 'cash-box' }, [
      el('label', { class: 'fld-label' }, 'Mijoz bergan summa'), givenInput, changeRow,
      el('div', { class: 'quick-cash' }, quickCashButtons(sum, givenInput, changeRow)),
    ]);
    const clickBox = el('div', { class: 'click-box', hidden: 'true', html: `📱 Mijoz Click ilovasi orqali <b>${money(sum)}</b> to'lov qildi.<br><small>Tasdiqlashdan oldin summa haqiqatan tushganini tekshiring.</small>` });

    givenInput.addEventListener('input', () => updateChange(givenInput, changeRow, sum));

    const methods = el('div', { class: 'pay-methods' });
    [['cash','💵 Naqd'],['click','📱 Click']].forEach(([m, lbl]) => {
      methods.appendChild(el('button', {
        class: 'pm' + (m === 'cash' ? ' active' : ''),
        onClick: (e) => { method = m; [...methods.children].forEach(b => b.classList.remove('active')); e.target.classList.add('active'); cashBox.hidden = m !== 'cash'; clickBox.hidden = m !== 'click'; }
      }, lbl));
    });

    const bg = el('div', { class: 'modal-bg' });
    const modal = el('div', { class: 'modal' }, [
      el('h3', {}, "To'lov"),
      el('div', { class: 'pay-amount', html: `Jami to'lov: <b>${money(sum)}</b>` }),
      methods, cashBox, clickBox,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Bekor'),
        el('button', { class: 'btn-confirm', onClick: () => confirmPay(method, givenInput, sum, bg) }, '✅ Tasdiqlash'),
      ]),
    ]);
    bg.appendChild(modal);
    document.body.appendChild(bg);
  }

  async function confirmPay(method, givenInput, sum, bg) {
    const given = +givenInput.value || sum;
    if (method === 'cash' && given < sum) { toast('Summa yetmaydi', 'error'); return; }
    const order = await checkout(cart, {
      type: orderType, payment_method: method, given, created_by: state.user.id,
      address: orderType === 'delivery' ? deliveryAddress.trim() : null,
      delivery_fee: orderType === 'delivery' ? deliveryFee : 0,
    });
    bg.remove();
    const typeName = { dine_in: 'Zal', takeaway: 'Olib ketish', delivery: 'Dostavka' }[orderType];
    toast(`✅ Buyurtma #${order.order_no} yopildi (${typeName})`);
    cart = [];
    deliveryAddress = ''; deliveryFee = 0;
    addressI.value = ''; feeI.value = '';
    renderCart();
  }

  renderCats(); renderGrid(); renderCart();
  layout.appendChild(menuPane);
  layout.appendChild(cartPane);
  root.appendChild(layout);
}

function quickCashButtons(sum, input, changeRow) {
  const opts = [...new Set([sum, Math.ceil(sum / 10000) * 10000, Math.ceil(sum / 50000) * 50000, Math.ceil(sum / 100000) * 100000])].filter(v => v >= sum).slice(0, 4);
  return opts.map(v => el('button', { onClick: () => { input.value = v; updateChange(input, changeRow, sum); } }, money(v, false)));
}
function updateChange(input, changeRow, sum) {
  const ch = (+input.value || 0) - sum;
  changeRow.innerHTML = ch >= 0 ? `Qaytim: <b style="color:var(--green)">${money(ch)}</b>` : `<b style="color:var(--red)">Summa yetmaydi</b>`;
}
