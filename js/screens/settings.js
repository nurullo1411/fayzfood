// ============================================================
// settings.js — Sozlamalar (faqat Egasi)
// Brending (logo+nom), xodim/kuryer boshqaruvi, Telegram.
// ============================================================
import * as db from '../db.js';
import { getSetting, setSetting, resetTestData } from '../repo.js';
import { el, $, toast, confirmBox } from '../util.js';

const EMOJIS = ['🍔','🍕','🌯','🍗','🍟','🌭','🥙','🍱','☕','🥤','🔥','⭐'];

export async function renderSettings(root) {
  root.innerHTML = '';
  root.appendChild(el('div', { class: 'screen-head' }, [el('h2', {}, '⚙️ Sozlamalar')]));

  // === Brending ===
  const brandName = await getSetting('brand_name', 'FayzFood');
  const logoType = await getSetting('brand_logo_type', 'emoji');
  const logoVal = await getSetting('brand_logo_value', '🍔');
  let tmpType = logoType, tmpVal = logoVal;

  const nameI = el('input', { class: 'fld-input', value: brandName, maxlength: '22' });
  const preview = el('div', { class: 'brand-preview' }, [
    el('div', { class: 'bp-logo', id: 'bpLogo', html: logoType === 'image' ? `<img src="${logoVal}">` : logoVal }),
    el('div', { class: 'bp-name', id: 'bpName' }, brandName),
  ]);
  const emojiRow = el('div', { class: 'emoji-pick' });
  function renderEmoji() {
    emojiRow.innerHTML = '';
    EMOJIS.forEach(e => emojiRow.appendChild(el('button', {
      class: 'emoji-btn' + (tmpType === 'emoji' && tmpVal === e ? ' sel' : ''),
      onClick: () => { tmpType = 'emoji'; tmpVal = e; renderEmoji(); updatePrev(); }
    }, e)));
  }
  function updatePrev() {
    $('#bpLogo', preview).innerHTML = tmpType === 'image' ? `<img src="${tmpVal}">` : tmpVal;
    $('#bpName', preview).textContent = nameI.value || 'FayzFood';
  }
  nameI.oninput = updatePrev;
  const fileI = el('input', { type: 'file', accept: 'image/*', hidden: 'true' });
  fileI.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { tmpType = 'image'; tmpVal = r.result; renderEmoji(); updatePrev(); }; r.readAsDataURL(f);
  };
  const saveBrand = el('button', { class: 'btn-confirm wide', onClick: async () => {
    await setSetting('brand_name', nameI.value.trim() || 'FayzFood');
    await setSetting('brand_logo_type', tmpType);
    await setSetting('brand_logo_value', tmpVal);
    toast('💾 Saqlandi — yangilanadi');
    setTimeout(() => location.reload(), 700);
  } }, '💾 Brendingni saqlash');

  renderEmoji();
  root.appendChild(section('🏷️ Logotip va nom', [
    preview,
    el('label', { class: 'fld-label' }, 'Restoran nomi'), nameI,
    el('label', { class: 'fld-label' }, 'Logotip'),
    el('div', { class: 'logo-options' }, [
      el('button', { class: 'logo-upload', onClick: () => fileI.click() }, '🖼️ Rasm yuklash'),
      el('button', { class: 'logo-clear', onClick: () => { tmpType = 'emoji'; tmpVal = '🍔'; renderEmoji(); updatePrev(); } }, '↺ Emoji'),
    ]),
    fileI, emojiRow, saveBrand,
  ]));

  // === Xodimlar ===
  await renderStaff(root);

  // === Telegram ===
  const tgId = await getSetting('telegram_chat_id', '');
  const tgI = el('input', { class: 'fld-input', value: tgId, placeholder: 'Telegram chat ID' });
  root.appendChild(section('📨 Telegram hisobot', [
    el('p', { class: 'hint' }, 'Hisobotlar shu Telegram chatga yuboriladi (2-bosqichda ulanadi).'),
    el('label', { class: 'fld-label' }, 'Chat ID'), tgI,
    el('button', { class: 'btn-confirm wide', onClick: async () => { await setSetting('telegram_chat_id', tgI.value.trim()); toast('💾 Saqlandi'); } }, '💾 Saqlash'),
  ]));

  // === Ma'lumotlarni tozalash ===
  root.appendChild(section('🧹 Ma\'lumotlar', [
    el('p', { class: 'hint' }, 'Sinov uchun kiritilgan barcha savdo, ombor kirim/chiqim va xarajatlarni o\'chiradi. Ombor qoldig\'i boshlang\'ich holatga qaytadi. Taomlar, narxlar, xodimlar va kuryerlar o\'zgarmaydi.'),
    el('button', { class: 'btn-delete wide', onClick: doReset }, '🧹 Sinov ma\'lumotlarini tozalash'),
  ]));

  async function doReset() {
    if (!await confirmBox('DIQQAT: barcha savdo tarixi, ombor harakatlari va xarajatlar butunlay o\'chiriladi. Bu amalni ortga qaytarib bo\'lmaydi. Davom etamizmi?')) return;
    await resetTestData();
    toast('🧹 Tozalandi');
    setTimeout(() => location.reload(), 700);
  }
}

async function renderStaff(root) {
  const users = await db.getAll('users');
  const ROLE = { owner: 'Egasi', staff: 'Ishchi', courier: 'Kuryer' };
  const list = el('div', { class: 'staff-list' });
  users.forEach(u => list.appendChild(el('div', { class: 'staff-row', onClick: () => editUser(u) }, [
    el('div', { class: 'stf-ic' }, u.role === 'owner' ? '👑' : u.role === 'courier' ? '🛵' : '👤'),
    el('div', { class: 'stf-info' }, [
      el('div', { class: 'stf-name' }, u.name + (u.is_active ? '' : ' (nofaol)')),
      el('div', { class: 'stf-sub' }, `${ROLE[u.role]} · PIN: ${u.pin}`),
    ]),
    el('div', { class: 'pr-arrow' }, '›'),
  ])));
  const sec = section('👥 Xodimlar va kuryerlar', [
    list,
    el('button', { class: 'add-btn wide', onClick: () => editUser(null) }, '+ Yangi xodim'),
  ]);
  root.appendChild(sec);

  function editUser(u) {
    const isNew = !u;
    u = u || { name: '', role: 'staff', pin: '', is_active: true };
    const nameI = el('input', { class: 'fld-input', value: u.name, placeholder: 'Ism' });
    const roleSel = el('select', { class: 'fld-input' }, Object.entries(ROLE).map(([k, v]) =>
      el('option', { value: k, ...(k === u.role ? { selected: 'true' } : {}) }, v)));
    const pinI = el('input', { class: 'fld-input', type: 'text', inputmode: 'numeric', maxlength: '4', value: u.pin, placeholder: '4 xonali PIN' });
    const actSel = el('select', { class: 'fld-input' }, [
      el('option', { value: '1', ...(u.is_active ? { selected: 'true' } : {}) }, 'Faol'),
      el('option', { value: '0', ...(!u.is_active ? { selected: 'true' } : {}) }, 'Nofaol'),
    ]);
    const modal = el('div', { class: 'modal scroll' }, [
      el('h3', {}, isNew ? 'Yangi xodim' : 'Xodimni tahrirlash'),
      el('label', { class: 'fld-label' }, 'Ism'), nameI,
      el('label', { class: 'fld-label' }, 'Rol'), roleSel,
      el('label', { class: 'fld-label' }, 'PIN-kod (kirish uchun)'), pinI,
      el('label', { class: 'fld-label' }, 'Holati'), actSel,
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn-cancel', onClick: () => bg.remove() }, 'Bekor'),
        (isNew || u.role === 'owner') ? null : el('button', { class: 'btn-delete', onClick: del }, '🗑'),
        el('button', { class: 'btn-confirm', onClick: save }, '💾 Saqlash'),
      ]),
    ]);
    const bg = el('div', { class: 'modal-bg' }, modal);
    document.body.appendChild(bg);

    async function save() {
      if (!nameI.value.trim()) { toast('Ism kiriting', 'error'); return; }
      if (!/^\d{4}$/.test(pinI.value)) { toast('PIN 4 xonali bo\'lsin', 'error'); return; }
      const users = await db.getAll('users');
      if (users.some(x => x.pin === pinI.value && x.id !== u.id)) { toast('Bu PIN band', 'error'); return; }
      await db.put('users', { ...u, name: nameI.value.trim(), role: roleSel.value, pin: pinI.value, is_active: actSel.value === '1' });
      bg.remove(); toast('💾 Saqlandi'); renderSettings(root);
    }
    async function del() {
      if (!await confirmBox('Xodim o\'chirilsinmi?')) return;
      await db.remove('users', u.id); bg.remove(); toast('🗑 O\'chirildi'); renderSettings(root);
    }
  }
}

function section(title, children) {
  return el('div', { class: 'settings-section' }, [el('div', { class: 'panel-title' }, title), ...children]);
}
