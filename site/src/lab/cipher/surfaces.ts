// Every surface on this machine is generated at init — no texture downloads.
// The only external asset in the whole world is one CC0 HDRI and one OFL
// typeface, which is the claim section S5 prints, so it has to stay true.
//
// Deterministic throughout: same seed, same machine, every visit.

const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** mulberry32 — the repo's standing seeded PRNG. */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, x: c.getContext('2d')! };
};

export const MONO = "600 96px 'Martian Mono', ui-monospace, monospace";

/**
 * One atlas holding all 26 letters in a 7x4 grid, so every key label and every
 * lamp label is a single shared texture. This is what lets 52 labels cost two
 * draw calls instead of 52 materials and 52 canvases, which is how the old
 * build reached ~135.
 */
export const ATLAS_COLS = 7;
export const ATLAS_ROWS = 4;
export const CELL = 128;

export function letterAtlas(ink: string): HTMLCanvasElement {
  const { c, x } = canvas(ATLAS_COLS * CELL, ATLAS_ROWS * CELL);
  x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = ink;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = MONO;
  [...AZ].forEach((ch, i) => {
    const cx = (i % ATLAS_COLS) * CELL + CELL / 2;
    const cy = Math.floor(i / ATLAS_COLS) * CELL + CELL / 2;
    x.fillText(ch, cx, cy);
  });
  return c;
}

/** UV offset for a letter's cell in the atlas, for the instanced attribute. */
export const atlasCell = (letter: string): [number, number] => {
  const i = AZ.indexOf(letter);
  return [(i % ATLAS_COLS) / ATLAS_COLS, 1 - (Math.floor(i / ATLAS_COLS) + 1) / ATLAS_ROWS];
};

/**
 * The rotor letter ring: 26 glyphs around the circumference, wrapped on the
 * cylinder. One texture shared by all three rotors — they differ by rotation,
 * not by material.
 */
export function ringTexture(ground: string, ink: string, accent: string): HTMLCanvasElement {
  const { c, x } = canvas(26 * 96, 192);
  x.fillStyle = ground;
  x.fillRect(0, 0, c.width, c.height);

  // Machined banding, so the ring is not a flat fill under raking light.
  const r = rng(0x5eed05);
  for (let i = 0; i < 220; i++) {
    const y = r() * c.height;
    x.fillStyle = `rgba(255,255,255,${0.012 + r() * 0.02})`;
    x.fillRect(0, y, c.width, 0.6 + r() * 1.2);
  }

  x.textAlign = 'center';
  x.textBaseline = 'middle';
  [...AZ].forEach((ch, i) => {
    const cx = i * 96 + 48;
    // Engraved: a dark cut with a light lower lip, which reads as depth.
    x.font = "600 78px 'Martian Mono', ui-monospace, monospace";
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.fillText(ch, cx, 100);
    x.fillStyle = i === 0 ? accent : ink;
    x.fillText(ch, cx, 97);
    // Index tick between letters — the graduated ring the dial pole showed.
    x.fillStyle = 'rgba(0,0,0,0.4)';
    x.fillRect(i * 96 + 95, 6, 2, 22);
    x.fillRect(i * 96 + 95, c.height - 28, 2, 22);
  });
  return c;
}

/** The maker's plate, with its text baked in so the plate is one mesh. */
export function plateTexture(ground: string, ink: string): HTMLCanvasElement {
  const { c, x } = canvas(1024, 160);
  x.fillStyle = ground;
  x.fillRect(0, 0, c.width, c.height);
  const r = rng(0xb0a55);
  for (let i = 0; i < 600; i++) {
    x.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
    x.fillRect(r() * c.width, r() * c.height, 1.5, 1.5);
  }
  x.strokeStyle = 'rgba(0,0,0,0.35)';
  x.lineWidth = 3;
  x.strokeRect(10, 10, c.width - 20, c.height - 20);
  x.fillStyle = ink;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = "700 62px 'Martian Mono', ui-monospace, monospace";
  x.fillText('RENOCRYPT', c.width / 2, 60);
  x.font = "400 34px 'Martian Mono', ui-monospace, monospace";
  x.fillText('M-26  ·  CIPHER ENGINE', c.width / 2, 114);
  return c;
}

/**
 * Crinkle paint for the case: the real machines were wrinkle-finished, and a
 * flat MeshStandardMaterial is exactly why the old one read as clay. Returns a
 * bump map; the albedo stays a token colour.
 */
export function crinkleBump(size = 512): HTMLCanvasElement {
  const { c, x } = canvas(size, size);
  const r = rng(0xc21c1e);
  x.fillStyle = '#808080';
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const cx = r() * size;
    const cy = r() * size;
    const rad = 2 + r() * 7;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const v = 128 + (r() - 0.5) * 120;
    g.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, rad, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

/** Brushed circular grain for the brass flanges and plate surrounds. */
export function brushedBump(size = 512): HTMLCanvasElement {
  const { c, x } = canvas(size, size);
  const r = rng(0xbba55);
  x.fillStyle = '#808080';
  x.fillRect(0, 0, size, size);
  x.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {
    const y = r() * size;
    const v = 128 + (r() - 0.5) * 70;
    x.strokeStyle = `rgba(${v},${v},${v},0.5)`;
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(size, y + (r() - 0.5) * 3);
    x.stroke();
  }
  return c;
}
