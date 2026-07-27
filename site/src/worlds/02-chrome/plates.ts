import { mulberry32 } from '../../shared/rng';

// The seven assay plates — the world's photo stand-ins.
// Foundry paperwork: a seeded machine draws the same plate every visit;
// rotation alone does the polaroid cue (no border/shadow/radius, except the
// pistachio-bordered day/night pair — the measured founders-pair exception).

const W = 480;
const H = 600;

// The canonical chrome ramp (hard #232322 horizon at .54).
const RAMP: [number, string][] = [
  [0, '#fbfbf9'],
  [0.2, '#d8d7d3'],
  [0.46, '#8f8e8a'],
  [0.54, '#232322'],
  [0.6, '#c9c8c4'],
  [0.82, '#efeeea'],
  [1, '#fafaf8'],
];

function rampAt(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (x <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = (x - t0) / (t1 - t0);
      const a = parseInt(c0.slice(1), 16);
      const b = parseInt(c1.slice(1), 16);
      const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k);
      const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k);
      const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * k);
      return `rgb(${r},${g},${bl})`;
    }
  }
  return RAMP[RAMP.length - 1][1];
}

const CAPTIONS = [
  'ASSAY 01 — HORIZON JITTER ±3PX',
  'ASSAY 02 — ORDERED DITHER',
  'ASSAY 03 — DAY GROUND',
  'ASSAY 04 — NIGHT GROUND',
  'ASSAY 05 — BAND COUNT 24',
  'ASSAY 06 — SPECULAR .30',
  'ASSAY 07 — SEED 0xA55A',
];

// Exact scatter (% of the 58vw × 86vh field). Pair = idx 2 (DAY) + idx 3 (NIGHT).
const SCATTER = [
  { l: 1, t: 4 },
  { l: 34, t: 0 },
  { l: 66, t: 7 },
  { l: 6, t: 48 },
  { l: 21, t: 55 },
  { l: 48, t: 46 },
  { l: 72, t: 52 },
];

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type ShapeKind = 'bar' | 'disc' | 'arc' | 'teardrop';

function specimenPath(ctx: CanvasRenderingContext2D, kind: ShapeKind): { x: number; y: number; w: number; h: number } {
  const cx = W / 2;
  const cy = 268;
  ctx.beginPath();
  let box = { x: cx - 130, y: cy - 110, w: 260, h: 220 };
  switch (kind) {
    case 'bar':
      box = { x: cx - 140, y: cy - 48, w: 280, h: 96 };
      ctx.rect(box.x, box.y, box.w, box.h);
      break;
    case 'disc':
      ctx.arc(cx, cy, 112, 0, Math.PI * 2);
      break;
    case 'arc':
      ctx.arc(cx, cy + 78, 118, Math.PI, Math.PI * 2);
      ctx.closePath();
      box = { x: cx - 118, y: cy - 40, w: 236, h: 118 };
      break;
    case 'teardrop':
      ctx.moveTo(cx, cy - 118);
      ctx.bezierCurveTo(cx + 66, cy - 40, cx + 104, cy + 18, cx + 104, cy + 66);
      ctx.arc(cx, cy + 66, 104, 0, Math.PI, false);
      ctx.bezierCurveTo(cx - 104, cy + 18, cx - 66, cy - 40, cx, cy - 118);
      box = { x: cx - 104, y: cy - 118, w: 208, h: 288 };
      break;
  }
  return box;
}

function drawPlate(index: number, dpr: number): HTMLCanvasElement {
  const rnd = mulberry32(0xa55a + index);
  const night = index === 3; // ASSAY 04 — NIGHT GROUND
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Ground + paper tooth.
  ctx.fillStyle = night ? '#232322' : '#f4f3f0';
  ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const j = (rnd() * 2 - 1) * 6;
    d[i] += j;
    d[i + 1] += j;
    d[i + 2] += j;
  }
  ctx.putImageData(img, 0, 0);

  // Specimen shape with the ramp as 24 discrete bands (hard horizon survives).
  const kinds: ShapeKind[] = ['bar', 'disc', 'arc', 'teardrop'];
  const kind = kinds[Math.floor(rnd() * kinds.length)];
  ctx.save();
  const box = specimenPath(ctx, kind);
  ctx.clip();
  const bands = 24;
  for (let i = 0; i < bands; i++) {
    const jitter = (rnd() * 2 - 1) * (3 / box.h); // ±3px stop jitter, in t units
    const t = i / (bands - 1) + jitter;
    ctx.fillStyle = rampAt(t);
    ctx.fillRect(box.x - 1, box.y + (i * box.h) / bands, box.w + 2, box.h / bands + 1);
  }
  // Specular hairline at 30% height.
  ctx.fillStyle = 'rgb(255 255 255 / 90%)';
  ctx.fillRect(box.x, box.y + box.h * 0.3, box.w, 1);
  // Ordered dither over the specimen only.
  ctx.fillStyle = night ? 'rgb(234 233 230 / 5%)' : 'rgb(24 24 24 / 5%)';
  for (let y = box.y; y < box.y + box.h; y += 4) {
    for (let x = box.x; x < box.x + box.w; x += 4) {
      if (BAYER[(y >> 2) % 4][(x >> 2) % 4] / 16 < 0.5) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();

  // Engraved index (never colossal, never bleeding — the paperwork guardrail).
  ctx.fillStyle = night ? 'rgb(234 233 230 / 85%)' : 'rgb(24 24 24 / 85%)';
  ctx.font = '400 64px Zodiak, Georgia, serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(index + 1).padStart(2, '0'), 26, 88);

  // Caption strip: diegetic process data, never an exhibit title.
  ctx.strokeStyle = night ? 'rgb(234 233 230 / 30%)' : 'rgb(24 24 24 / 30%)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 44.5);
  ctx.lineTo(W, H - 44.5);
  ctx.stroke();
  ctx.fillStyle = night ? 'rgb(234 233 230 / 60%)' : 'rgb(24 24 24 / 60%)';
  ctx.font = '500 11px Switzer, sans-serif';
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.44px';
  } catch {
    /* older canvas: tracking silently absent */
  }
  ctx.fillText(CAPTIONS[index], 16, H - 17);

  return canvas;
}

export interface PlateHandle {
  el: HTMLElement;
  rotation: number;
}

export async function initPlates(field: HTMLElement): Promise<PlateHandle[]> {
  await Promise.all([
    document.fonts.load('400 64px Zodiak'),
    document.fonts.load('500 11px Switzer'),
  ]).catch(() => undefined);

  const parA = field.querySelector<HTMLElement>('.par-a')!;
  const parB = field.querySelector<HTMLElement>('.par-b')!;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const handles: PlateHandle[] = [];

  SCATTER.forEach((pos, i) => {
    const rnd = mulberry32(0xa55a + i);
    const pair = i === 2 || i === 3;
    const rotation = (rnd() * 2 - 1) * (pair ? 5.0 : 4.5);
    const el = document.createElement('div');
    el.className = pair ? 'plate plate--pair' : 'plate';
    el.style.left = `${pos.l}%`;
    el.style.top = `${pos.t}%`;
    el.append(drawPlate(i, dpr));
    (i % 2 === 0 ? parA : parB).append(el);
    handles.push({ el, rotation });
  });

  return handles;
}
