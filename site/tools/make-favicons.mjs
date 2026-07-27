// Favicon set generator — rasterises the mark to PNG/ICO without any image
// library (this machine has none: no PIL, no cairosvg, no ImageMagick, no
// rsvg). The mark is the hub's own: three rounded bars on cream paper.
//
//   node tools/make-favicons.mjs
//
// Writes public/favicon.ico (16+32), public/apple-touch-icon.png (180),
// and public/icon-512.png. public/favicon.svg is hand-authored and stays the
// sharp path for browsers that take it; these are the fallbacks Safari and
// the /lab/ archive rely on.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// The mark, in a 32-unit square — same geometry as favicon.svg.
const GROUND = [0xf5, 0xef, 0xe6]; // cream paper
const BARS = [
  { y: 6, fill: [0xe3, 0xe1, 0xdc] }, // pale
  { y: 13, fill: [0x1a, 0x1c, 0x1c] }, // ink
  { y: 20, fill: [0xe5, 0x26, 0x2c] }, // red
];

/** Signed distance to a rounded rect, negative inside. */
function sdRoundRect(px, py, x, y, w, h, r) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = Math.max(Math.abs(px - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(py - cy) - (h / 2 - r), 0);
  return Math.hypot(dx, dy) - r;
}

/** Coverage in [0,1] via 4×4 supersampling — cheap analytic AA. */
function coverage(px, py, unit, shape) {
  const S = 4;
  let hits = 0;
  for (let sy = 0; sy < S; sy++) {
    for (let sx = 0; sx < S; sx++) {
      const u = (px + (sx + 0.5) / S) * unit;
      const v = (py + (sy + 0.5) / S) * unit;
      if (shape(u, v) <= 0) hits++;
    }
  }
  return hits / (S * S);
}

function render(size) {
  const unit = 32 / size; // device px → mark units
  const px = new Uint8Array(size * size * 4);

  const shapes = [
    { fill: GROUND, sd: (u, v) => sdRoundRect(u, v, 0, 0, 32, 32, 7) },
    ...BARS.map((b) => ({ fill: b.fill, sd: (u, v) => sdRoundRect(u, v, 7, b.y, 18, 5, 2.5) })),
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const s of shapes) {
        const c = coverage(x, y, unit, s.sd);
        if (c === 0) continue;
        // src-over, premultiplied maths then un-premultiplied on write
        const na = c + a * (1 - c);
        r = (s.fill[0] * c + r * a * (1 - c)) / na;
        g = (s.fill[1] * c + g * a * (1 - c)) / na;
        b = (s.fill[2] * c + b * a * (1 - c)) / na;
        a = na;
      }
      const i = (y * size + x) * 4;
      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}

// ── minimal PNG writer (RGBA, filter 0) ──
function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO container holding PNG payloads (universally supported since Vista) ──
function ico(entries) {
  const dir = Buffer.alloc(6 + 16 * entries.length);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(entries.length, 4);
  let offset = dir.length;
  entries.forEach((e, i) => {
    const o = 6 + 16 * i;
    dir[o] = e.size === 256 ? 0 : e.size;
    dir[o + 1] = e.size === 256 ? 0 : e.size;
    dir[o + 2] = 0; // palette
    dir[o + 3] = 0; // reserved
    dir.writeUInt16LE(1, o + 4); // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32BE(0, o + 8);
    dir.writeUInt32LE(e.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.data.length;
  });
  return Buffer.concat([dir, ...entries.map((e) => e.data)]);
}

const sizes = [16, 32, 180, 512];
const made = Object.fromEntries(sizes.map((s) => [s, png(s, render(s))]));

writeFileSync(
  join(OUT, 'favicon.ico'),
  ico([
    { size: 16, data: made[16] },
    { size: 32, data: made[32] },
  ]),
);
writeFileSync(join(OUT, 'apple-touch-icon.png'), made[180]);
writeFileSync(join(OUT, 'icon-512.png'), made[512]);

console.log(
  `favicon.ico ${(made[16].length + made[32].length) / 1} B payload · ` +
    `apple-touch-icon.png ${made[180].length} B · icon-512.png ${made[512].length} B`,
);
