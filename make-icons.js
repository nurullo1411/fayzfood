// PWA ikonka generatori (oddiy: to'q fonda 🍔 emoji o'rniga oranj kvadrat + harf)
// Tashqi kutubxonasiz, sof PNG yozadi.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function makePNG(size, filename) {
  const w = size, h = size;
  const bg = [232, 89, 12];        // brand orange
  const fg = [255, 255, 255];

  // RGBA piksellar
  const bytesPerPixel = 4;
  const rowSize = w * bytesPerPixel;
  const raw = Buffer.alloc((rowSize + 1) * h);

  // Oddiy "F" harfi chizamiz (markazda)
  const m = Math.floor(size * 0.28);          // chekka
  const thick = Math.floor(size * 0.11);
  for (let y = 0; y < h; y++) {
    raw[y * (rowSize + 1)] = 0; // filter byte
    for (let x = 0; x < w; x++) {
      let c = bg;
      const inVert = x >= m && x < m + thick && y >= m && y < size - m;
      const inTop = y >= m && y < m + thick && x >= m && x < size - m;
      const inMid = y >= Math.floor(size * 0.46) && y < Math.floor(size * 0.46) + thick && x >= m && x < size - m - Math.floor(size*0.06);
      if (inVert || inTop || inMid) c = fg;
      const off = y * (rowSize + 1) + 1 + x * bytesPerPixel;
      raw[off] = c[0]; raw[off + 1] = c[1]; raw[off + 2] = c[2]; raw[off + 3] = 255;
    }
  }

  const idat = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(filename, png);
  console.log('yozildi:', filename, png.length, 'bayt');
}

// CRC32
const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return c ^ 0xFFFFFFFF;
}

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
makePNG(192, path.join(dir, 'icon-192.png'));
makePNG(512, path.join(dir, 'icon-512.png'));
