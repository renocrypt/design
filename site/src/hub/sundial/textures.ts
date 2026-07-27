import * as THREE from 'three';

// Runtime canvas textures — zero bytes shipped. Deterministic PRNG so every
// load renders the identical wall (cache-friendly, no Math.random drift).

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 512² grayscale paint-tooth: shared roughnessMap + bumpMap for every painted
// surface — highlights must break like painted plywood, not plastic.
export function makeTooth(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const rand = mulberry32(11);
  for (let i = 0; i < S * S; i++) {
    const v = 205 + (rand() - 0.5) * 34 + (rand() - 0.5) * 16;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// 1024² wall mottle: ±3% value, 2 octaves, ±1.5/255 hash dither baked in
// (kills gradient banding at 4× zoom). Multiplied over the wall albedo.
export function makeMottle(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const rand = mulberry32(23);
  // Coarse octave: low-res value grid, bilinear-ish upsample via smooth noise.
  const G = 16;
  const grid: number[] = [];
  for (let i = 0; i < (G + 1) * (G + 1); i++) grid.push((rand() - 0.5) * 0.06);
  const sample = (u: number, v: number) => {
    const gx = u * G;
    const gy = v * G;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const s = (x: number, y: number) => grid[y * (G + 1) + x];
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    return (
      s(x0, y0) * (1 - sx) * (1 - sy) +
      s(x0 + 1, y0) * sx * (1 - sy) +
      s(x0, y0 + 1) * (1 - sx) * sy +
      s(x0 + 1, y0 + 1) * sx * sy
    );
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const coarse = sample(x / S, y / S);
      const fine = (rand() - 0.5) * 0.02;
      const dither = (rand() - 0.5) * (3 / 255);
      const v = Math.round(255 * (0.5 + coarse + fine) + dither * 255);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

// 256² soft radial halo sprite for the night crescent.
export function makeHalo(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,233,192,0.9)');
  g.addColorStop(0.4, 'rgba(255,233,192,0.25)');
  g.addColorStop(1, 'rgba(255,233,192,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

// 256² numeral atlas: 01–04 in General Sans 700, one per quadrant.
// Used as alphaMap cutout decals stamped on the shapes.
export function makeNumerals(): { tex: THREE.CanvasTexture; uv: (n: number) => [number, number] } {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#fff';
  ctx.font = `700 64px 'General Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cells: [string, number, number][] = [
    ['01', 64, 64],
    ['02', 192, 64],
    ['03', 64, 192],
    ['04', 192, 192],
  ];
  for (const [label, x, y] of cells) ctx.fillText(label, x, y);
  const tex = new THREE.CanvasTexture(c);
  return {
    tex,
    uv: (n) => [((n - 1) % 2) * 0.5, n <= 2 ? 0.5 : 0],
  };
}
