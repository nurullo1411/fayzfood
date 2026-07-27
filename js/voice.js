// ============================================================
// voice.js — Ovozli buyurtmani matnga aylantirish va taomlarga moslashtirish
// Brauzerning nutqni tanish (Web Speech API) natijasini oddiy qoidalar bilan tahlil qiladi.
// ============================================================

export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[ʻʼ'’`]/g, '')
    .replace(/[().,!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NUM_WORDS = {
  bitta: 1, bir: 1, ikkita: 2, ikki: 2, uchta: 3, uch: 3, tortta: 4, tort: 4,
  beshta: 5, besh: 5, oltita: 6, olti: 6, yettita: 7, yetti: 7, sakkizta: 8, sakkiz: 8,
  toqqizta: 9, toqqiz: 9, onta: 10, on: 10,
};

// Faqat SO'Z ko'rinishidagi sonni miqdor sifatida oladi. Raqamlarning o'zi (masalan "11")
// bu yerda tegilmaydi — ular pastda mahsulot KODI sifatida tekshiriladi, chunki "Kola 1.0" kabi
// hajm raqamlari bilan chalkashib ketmasligi kerak.
function extractQty(segment) {
  const words = segment.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (NUM_WORDS[words[i]] !== undefined) {
      const qty = NUM_WORDS[words[i]];
      words.splice(i, 1);
      return { qty, rest: words.join(' ').trim() };
    }
  }
  return { qty: 1, rest: segment };
}

function buildIndex(products) {
  return products.map(p => {
    const norm = normalize(p.name);
    let size = null, base = norm;
    if (norm.includes('kichik')) { size = 'kichik'; base = norm.replace('kichik', '').trim(); }
    else if (norm.includes('katta')) { size = 'katta'; base = norm.replace('katta', '').trim(); }
    const allWords = base.split(' ').filter(w => w && w !== 'va');
    const core = allWords.filter(w => !/^\d+$/.test(w));   // nomdagi so'zlar (majburiy mos kelishi kerak)
    const nums = allWords.filter(w => /^\d+$/.test(w));    // hajm raqamlari (aytilsa aniqlashtirish uchun)
    return { product: p, core, nums, size };
  });
}

// Nutqdan olingan matnni { matched: [{product, qty}], unresolved: [matn] } ga aylantiradi.
// Bir nechta taom bir xil nomga ega bo'lsa (masalan Kola 0.5/1.0/1.5): agar hajm aniq aytilgan
// bo'lsa aynan o'shani, aytilmagan bo'lsa eng arzonini tanlaydi.
export function parseVoiceOrder(transcript, products) {
  const index = buildIndex(products);
  const segments = normalize(transcript)
    .split(/\bva\b|\bhamda\b|,|\+/)
    .map(s => s.trim())
    .filter(Boolean);

  const matched = [];
  const unresolved = [];

  for (const seg of segments) {
    const { qty, rest } = extractQty(seg);
    if (!rest) continue;

    // Mahsulot KODI bo'yicha: segment "so'z sifatidagi miqdor"dan tashqari FAQAT raqamdan iborat bo'lsa
    // (masalan "11" yoki "ikkita 11" -> qty ajratilgach rest="11"), shu kodli mahsulotni tanlaydi.
    const digitOnly = rest.replace(/\s+/g, '');
    if (/^\d+$/.test(digitOnly)) {
      const byCode = products.find(p => p.code === +digitOnly);
      if (byCode) { matched.push({ product: byCode, qty }); continue; }
    }

    const candidates = index.filter(entry => {
      if (entry.core.length === 0) return false;
      if (entry.size && !rest.includes(entry.size)) return false;
      return entry.core.every(w => rest.includes(w));
    });

    if (candidates.length > 0) {
      const exact = candidates.filter(e => e.nums.length > 0 && e.nums.every(n => rest.includes(n)));
      const pool = exact.length > 0 ? exact : candidates;
      pool.sort((a, b) => a.product.price - b.product.price);
      matched.push({ product: pool[0].product, qty });
    } else {
      unresolved.push(seg);
    }
  }

  return { matched, unresolved };
}

// Brauzer nutqni tanish funksiyasini qo'llab-quvvatlaydimi
export function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Bir martalik tinglash: onResult(transcript) yoki onError(kod) chaqiriladi
export function listenOnce(onResult, onError) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) { onError('unsupported'); return null; }
  const rec = new Ctor();
  rec.lang = 'uz-UZ';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => onResult(e.results[0][0].transcript);
  rec.onerror = (e) => onError(e.error || 'error');
  rec.start();
  return rec;
}
