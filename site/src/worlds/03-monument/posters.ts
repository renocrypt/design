import { mulberry32 } from '../../shared/rng';

// THE POSTER GENERATOR — 32 deterministic exhibition posters, one recipe
// feeding three outputs (WebGL planes, rung-2 DOM strip, Gift Shop postcard).
// Guardrails (distinctiveness verdict): the 620px numeral MUST bleed off at
// least one canvas edge; posters never get rotation, border, shadow, paper
// tooth, or collage treatment — they hang flat as gallery prints.

export interface Poster {
  index: number;
  seed: number;
  paletteName: string;
  seat: [number, number, number]; // Fibonacci-sphere coordinate (curatorial data)
  canvas: HTMLCanvasElement;
}

const W = 512;
const H = 724;

interface Palette {
  name: string;
  ground: string;
  ink: string;
  accents: string[];
}

// The whole lab hiding inside the collection — every hex traceable.
const PALETTES: Palette[] = [
  { name: 'NOIR', ground: '#f9f4eb', ink: '#1a1c1c', accents: ['#e75d60'] },
  { name: 'CHROME', ground: '#eae9e6', ink: '#181818', accents: ['#ff4c24', '#ecfdad', '#3fae86'] },
  { name: 'MONUMENT', ground: '#ffffff', ink: '#000000', accents: ['#ab54f7'] },
  { name: 'PULSE', ground: '#e5262c', ink: '#fdd2d2', accents: ['#3d3c47', '#f9cfd1', '#00b870'] },
  { name: 'HUB', ground: '#f4ebe0', ink: '#0e0d0b', accents: ['#0072e3', '#ffb200', '#ea3737'] },
];

export function fibonacciSeat(k: number): [number, number, number] {
  const r = 6.5;
  const y = 1 - (2 * (k + 0.5)) / 32;
  const theta = k * 2.399963;
  const rr = r * Math.sqrt(1 - y * y);
  return [rr * Math.cos(theta), r * y, rr * Math.sin(theta)];
}

export function generatePoster(index: number): Poster {
  const seed = 20260300 + index;
  const rng = mulberry32(seed);
  const pal = PALETTES[index % PALETTES.length];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // (a) ground.
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, 0, W, H);

  // (b) three hairlines — the world's grammar echoed inside the artwork.
  ctx.strokeStyle = pal.ink;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = Math.round(H * rng());
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // (c) shapes from the 3-glyph grammar, x snapped to the 12-column grid.
  const n = 2 + Math.floor(rng() * 3);
  const colW = W / 12;
  for (let i = 0; i < n; i++) {
    const kind = Math.floor(rng() * 3); // 0 disc · 1 ring · 2 full-bleed bar
    const col = Math.floor(rng() * 12);
    const x = col * colW;
    const radius = (0.08 + 0.14 * rng()) * W;
    const cy = H * (0.18 + rng() * 0.6);
    ctx.fillStyle = pal.accents[i % pal.accents.length];
    ctx.strokeStyle = ctx.fillStyle;
    ctx.globalAlpha = i === 0 ? 1 : 0.3 + 0.4 * rng();
    if (kind === 0) {
      ctx.beginPath();
      ctx.arc(x, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(x, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const horizontal = rng() < 0.5;
      const thick = (0.04 + 0.1 * rng()) * W;
      if (horizontal) ctx.fillRect(0, cy - thick / 2, W, thick);
      else ctx.fillRect(x - thick / 2, 0, thick, H);
    }
  }
  ctx.globalAlpha = 1;

  // (d) the colossal numeral — crop, never shrink-to-fit (the guardrail).
  const label = String(index + 1).padStart(2, '0');
  ctx.fillStyle = pal.ink;
  ctx.font = '400 620px "League Gothic"';
  ctx.textBaseline = 'alphabetic';
  const widths = [...label].map((ch) => ctx.measureText(ch).width);
  const tracking = -34; // manual −0.055em
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (label.length - 1);
  let tx = (W - total) / 2;
  for (let i = 0; i < label.length; i++) {
    ctx.fillText(label[i], tx, H * 0.94);
    tx += widths[i] + tracking;
  }

  // (e) the caption, dim tier — the seed is public curatorial data.
  ctx.globalAlpha = 0.2;
  ctx.font = '400 18px "League Gothic"';
  ctx.fillText(`EXHIBIT ${label} — SEED ${seed}`, 24, 44);
  ctx.globalAlpha = 1;

  return { index, seed, paletteName: pal.name, seat: fibonacciSeat(index), canvas };
}

export async function generatePosters(onProgress?: (done: number, total: number) => void): Promise<Poster[]> {
  await Promise.all([document.fonts.load('400 620px "League Gothic"'), document.fonts.load('400 18px "League Gothic"')]);
  const posters: Poster[] = [];
  for (let i = 0; i < 32; i++) {
    posters.push(generatePoster(i));
    onProgress?.(i + 1, 32);
    // Yield so the preloader counter paints between batches.
    if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0));
  }
  return posters;
}
