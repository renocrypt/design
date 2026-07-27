import { mulberry32 } from '../../shared/rng';

// Seeded canvas bits for the machine hall — mulberry32(4) only, cache-stable.

// The pulse's additive glow sprite: radial falloff + 2% seeded speckle.
export function makeGlowSprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,235,235,0.45)');
  g.addColorStop(1, 'rgba(255,210,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const rnd = mulberry32(4);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 56;
    ctx.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1, 1);
  }
  return c;
}

// The ground's seeded speckle map, redrawn per theme.
export function drawSpeckle(canvas: HTMLCanvasElement, base: string): void {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const rnd = mulberry32(4);
  const b = parseInt(base.slice(1), 16);
  for (let i = 0; i < 900; i++) {
    const j = 1 + (rnd() * 2 - 1) * 0.015;
    const r = Math.min(255, ((b >> 16) & 255) * j);
    const g = Math.min(255, ((b >> 8) & 255) * j);
    const bl = Math.min(255, (b & 255) * j);
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${bl | 0})`;
    const s = 1 + rnd();
    ctx.fillRect(rnd() * canvas.width, rnd() * canvas.height, s, s);
  }
}

export function makeSpeckleCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  return c;
}
