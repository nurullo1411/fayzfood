// ============================================================
// login.js — PIN-kod bilan kirish (3 rol)
// ============================================================
import * as db from '../db.js';
import { setSession } from '../state.js';
import { getSetting } from '../repo.js';
import { el, $, toast } from '../util.js';

export async function renderLogin(root, onSuccess) {
  const brandName = await getSetting('brand_name', 'FayzFood');
  const logoType = await getSetting('brand_logo_type', 'emoji');
  const logoVal = await getSetting('brand_logo_value', '🍔');
  const logoHtml = logoType === 'image' ? `<img src="${logoVal}" alt="">` : logoVal;

  let pin = '';

  const dots = el('div', { class: 'pin-dots' });
  const renderDots = () => {
    dots.innerHTML = '';
    for (let i = 0; i < 4; i++) dots.appendChild(el('span', { class: 'pin-dot' + (i < pin.length ? ' filled' : '') }));
  };

  const hint = el('div', { class: 'login-hint', html: 'PIN-kod kiriting' });

  async function submit() {
    const users = await db.getAll('users');
    const user = users.find(u => u.pin === pin && u.is_active);
    if (user) {
      setSession(user);
      toast(`Xush kelibsiz, ${user.name}!`);
      onSuccess();
    } else {
      hint.textContent = "Noto'g'ri PIN-kod";
      hint.classList.add('err');
      dots.classList.add('shake');
      pin = '';
      setTimeout(() => { dots.classList.remove('shake'); renderDots(); hint.classList.remove('err'); hint.textContent = 'PIN-kod kiriting'; }, 800);
    }
  }

  function press(d) {
    if (pin.length >= 4) return;
    pin += d;
    renderDots();
    if (pin.length === 4) setTimeout(submit, 150);
  }
  function back() { pin = pin.slice(0, -1); renderDots(); }

  const pad = el('div', { class: 'pin-pad' });
  ['1','2','3','4','5','6','7','8','9'].forEach(n =>
    pad.appendChild(el('button', { class: 'pin-key', onClick: () => press(n) }, n)));
  pad.appendChild(el('button', { class: 'pin-key pin-empty' }, ''));
  pad.appendChild(el('button', { class: 'pin-key', onClick: () => press('0') }, '0'));
  pad.appendChild(el('button', { class: 'pin-key pin-back', onClick: back }, '⌫'));

  const card = el('div', { class: 'login-card' }, [
    el('div', { class: 'login-logo', html: logoHtml }),
    el('div', { class: 'login-brand', html: brandName }),
    dots, hint, pad,
    el('div', { class: 'login-demo', html: 'Namuna PIN: <b>1111</b> Egasi · <b>2222</b> Ishchi · <b>3333</b> Kuryer' }),
  ]);

  root.appendChild(el('div', { class: 'login-wrap' }, card));
  renderDots();

  // klaviatura bilan ham
  const keyHandler = (e) => {
    if (e.key >= '0' && e.key <= '9') press(e.key);
    else if (e.key === 'Backspace') back();
  };
  document.addEventListener('keydown', keyHandler);
  root._cleanup = () => document.removeEventListener('keydown', keyHandler);
}
