// ttf → three.js typeface.json, charset-limited.
// Usage: node tools/ttf-to-typeface.mjs <font.ttf> <out.json> <charset>
// The typeface.json "o" grammar: m/l/q/c commands in font units, y-up,
// contours implicitly closed — three's FontLoader parses exactly this.
import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const [, , src, dest, charset] = process.argv;
if (!src || !dest || !charset) {
  console.error('usage: node tools/ttf-to-typeface.mjs <font.ttf> <out.json> <charset>');
  process.exit(1);
}

const font = opentype.parse(readFileSync(src).buffer);
const upm = font.unitsPerEm;
const glyphs = {};

for (const ch of charset) {
  const glyph = font.charToGlyph(ch);
  const path = glyph.getPath(0, 0, upm); // font units, but opentype y is DOWN
  let o = '';
  for (const cmd of path.commands) {
    const n = (v) => Math.round(v); // integers keep the json tiny; ±1/1000em is invisible
    const f = (v) => n(-v); // flip y: typeface.json is y-up
    switch (cmd.type) {
      case 'M':
        o += `m ${n(cmd.x)} ${f(cmd.y)} `;
        break;
      case 'L':
        o += `l ${n(cmd.x)} ${f(cmd.y)} `;
        break;
      case 'Q':
        o += `q ${n(cmd.x)} ${f(cmd.y)} ${n(cmd.x1)} ${f(cmd.y1)} `;
        break;
      case 'C':
        o += `c ${n(cmd.x)} ${f(cmd.y)} ${n(cmd.x1)} ${f(cmd.y1)} ${n(cmd.x2)} ${f(cmd.y2)} `;
        break;
      case 'Z':
        break; // contours close implicitly
      default:
        throw new Error(`unhandled path command ${cmd.type}`);
    }
  }
  glyphs[ch] = {
    ha: glyph.advanceWidth,
    x_min: glyph.xMin ?? 0,
    x_max: glyph.xMax ?? 0,
    o: o.trim(),
  };
}

const json = {
  familyName: font.names.fullName?.en ?? 'unknown',
  ascender: font.ascender,
  descender: font.descender,
  underlinePosition: font.tables.post?.underlinePosition ?? -100,
  underlineThickness: font.tables.post?.underlineThickness ?? 50,
  boundingBox: {
    xMin: font.tables.head?.xMin ?? 0,
    xMax: font.tables.head?.xMax ?? 0,
    yMin: font.tables.head?.yMin ?? 0,
    yMax: font.tables.head?.yMax ?? 0,
  },
  resolution: upm,
  original_font_information: font.names,
  cssFontWeight: 'bold',
  cssFontStyle: 'normal',
  glyphs,
};

writeFileSync(dest, JSON.stringify(json));
console.log(`wrote ${dest}: ${charset.length} glyphs, upm ${upm}, ${JSON.stringify(json).length} bytes`);
for (const ch of charset) {
  const g = glyphs[ch];
  console.log(` ${ch}: advance ${g.ha}, x ${g.x_min}..${g.x_max}`);
}
