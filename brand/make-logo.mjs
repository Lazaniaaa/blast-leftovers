// Renders the Blast Leftovers mark (ring + orange dot) to PNG without dependencies.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function png(size, file, { bg, ring, dot }) {
  const c = size / 2, R = size * 0.30, W = size * 0.075, D = size * 0.155;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const S = 4; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const px = x + (sx + 0.5) / S - c, py = y + (sy + 0.5) / S - c;
        const d = Math.hypot(px, py);
        const col = d <= D ? dot : Math.abs(d - R) <= W / 2 ? ring : bg;
        r += col[0]; g += col[1]; b += col[2];
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r / (S * S); raw[o + 1] = g / (S * S); raw[o + 2] = b / (S * S); raw[o + 3] = 255;
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let k = n; for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1; return k >>> 0; });
  const crc = (buf) => { let k = 0xffffffff; for (const v of buf) k = crcTable[(k ^ v) & 0xff] ^ (k >>> 8); return (k ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
png(640, new URL('./logo-dark-640.png', import.meta.url), { bg: hex('#15171a'), ring: hex('#e9ebe6'), dot: hex('#ff6a3d') });
png(640, new URL('./logo-light-640.png', import.meta.url), { bg: hex('#f1f2ee'), ring: hex('#15171a'), dot: hex('#d9481f') });
png(640, new URL('./logo-orange-640.png', import.meta.url), { bg: hex('#d9481f'), ring: hex('#ffffff'), dot: hex('#15171a') });
console.log('ok');
