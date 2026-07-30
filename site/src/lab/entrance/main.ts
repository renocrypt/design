// World 00 · Lab entrance — the phosphor console.
//
// The lab's identity was always an oscilloscope: near-black ground, phosphor
// mint, mono readouts. This page makes that literal — one big screen, four
// channels, each study reduced to its signature trace. Every trace is a pure
// function of absolute time, so the scrolling windows need no stored state and
// the mini monitors and the solo screen share one recipe.

import './entrance.css';
import { gsap } from 'gsap';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(globalThis.devicePixelRatio || 1, 1.75);

const PHOSPHOR = '#62e6c8';
const BG = '#0c0c0e';
const FADE = 'rgba(12, 12, 14, 0.1)'; // == --bg at 10%: phosphor persistence

/** Deterministic hash → [0,1). The traces are functions of absolute time. */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** Modulo that never goes negative — t can dip below 0 on the first frames. */
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const smootherstep = (v: number): number => {
  const x = clamp01(v);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

type Ctx = CanvasRenderingContext2D;
type Pt = readonly [number, number];

/** One phosphor stroke: a wide soft pass under a narrow hot one. */
const trace = (c: Ctx, pts: Pt[], gain = 1): void => {
  c.globalCompositeOperation = 'lighter';
  for (const [width, alpha] of [[3.4, 0.14], [1.4, 0.9]] as const) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
    c.lineWidth = width;
    c.strokeStyle = PHOSPHOR;
    c.globalAlpha = alpha * gain;
    c.stroke();
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
};

/** The beam's current position, for modes that draw a closed curve. */
const beam = (c: Ctx, x: number, y: number, gain = 1): void => {
  c.globalCompositeOperation = 'lighter';
  c.beginPath();
  c.arc(x, y, 2.6, 0, Math.PI * 2);
  c.fillStyle = PHOSPHOR;
  c.globalAlpha = 0.95 * gain;
  c.fill();
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
};

/** YT mode: x maps to a receding window of absolute time. */
const yt = (
  c: Ctx,
  w: number,
  h: number,
  t: number,
  value: (ta: number) => number,
  window: number,
  gain: number,
): void => {
  const n = Math.max(160, Math.floor(w / 3));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const nx = i / n;
    pts.push([nx * w, h * 0.5 - value(t - (1 - nx) * window) * h * 0.3]);
  }
  trace(c, pts, gain);
};

// ── The four signatures ──────────────────────────────────────────────────

// S1 · Living Matrix — three wandering attention heads over sequence noise.
// x is the lattice axis, not time; the heads drift across it.
const HEADS = [
  { sp: 0.9, ph: 0.0, wd: 0.05, amp: 1.0 },
  { sp: 0.55, ph: 2.1, wd: 0.085, amp: -0.68 },
  { sp: 1.4, ph: 4.4, wd: 0.035, amp: 0.5 },
] as const;
const drawMatrix = (c: Ctx, w: number, h: number, t: number, gain: number): void => {
  const n = Math.max(160, Math.floor(w / 3));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const nx = i / n;
    let v = 0;
    for (const hd of HEADS) {
      const cx = 0.5 + 0.37 * Math.sin(t * hd.sp + hd.ph);
      const d = nx - cx;
      v += hd.amp * Math.exp(-(d * d) / (2 * hd.wd * hd.wd));
    }
    v += 0.025 * Math.sin(nx * 90 + t * 6.3);
    pts.push([nx * w, h * 0.5 - v * h * 0.24]);
  }
  trace(c, pts, gain);
};

// S2 · Platonic Drift — the scope flips to XY: a drift is a path, not a
// signal. Five Lissajous ratios, one per solid, cycling on a slow clock.
const SOLIDS = [
  { name: 'TETRA', a: 1, b: 2 },
  { name: 'HEXA', a: 3, b: 2 },
  { name: 'OCTA', a: 4, b: 3 },
  { name: 'DODECA', a: 5, b: 3 },
  { name: 'ICOSA', a: 5, b: 4 },
] as const;
const SOLID_CYCLE = 4;
const drawDrift = (c: Ctx, w: number, h: number, t: number, gain: number): void => {
  const { a, b } = SOLIDS[mod(Math.floor(t / SOLID_CYCLE), SOLIDS.length)];
  const phase = t * 0.4;
  const pts: Pt[] = [];
  const n = 280;
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * Math.PI * 2;
    pts.push([
      w * 0.5 + w * 0.36 * Math.sin(a * u + phase),
      h * 0.5 + h * 0.33 * Math.sin(b * u),
    ]);
  }
  trace(c, pts, gain);
  const u0 = (t * 0.9) % (Math.PI * 2);
  beam(
    c,
    w * 0.5 + w * 0.36 * Math.sin(a * u0 + phase),
    h * 0.5 + h * 0.33 * Math.sin(b * u0),
    gain,
  );
};

// S4 · The Agent — a servo trace: five rest levels, eased moves between them,
// and the occasional twitch. Four poses cycle on the readout.
const SERVO_STEP = 1.4;
const servoLevel = (n: number): number => Math.round((hash(n) * 2 - 1) * 2) / 2;
const servo = (ta: number): number => {
  const i = Math.floor(ta / SERVO_STEP);
  const l = ta - i * SERVO_STEP;
  const v0 = servoLevel(i - 1);
  const v1 = servoLevel(i);
  let v = v0 + (v1 - v0) * smootherstep(l / 0.55);
  if (hash(i * 7.31) > 0.7) v += Math.sin(l * 34) * 0.07 * Math.exp(-l * 5);
  return v;
};
const POSES = ['IDLE', 'WAVE', 'WALK', 'TURN'] as const;

// S5 · Cipher Engine — a 26-level staircase, one step per rotor advance. The
// readout keeps rotor windows and an output stream that starts with the known
// answer: Enigma I at AAA turns AAAAA into BDZGO (LESSONS.md).
const CIPHER_STEP = 0.35;
const LETTER = (n: number): string => String.fromCharCode(65 + (((n % 26) + 26) % 26));
const cipherValue = (ta: number): number =>
  (Math.floor(hash(Math.floor(ta / CIPHER_STEP)) * 26) / 25) * 2 - 1;
const KNOWN = 'BDZGO';
const cipherExtra = (t: number): string => {
  const i = Math.max(0, Math.floor(t / CIPHER_STEP));
  const win = `${LETTER(Math.floor(i / 676))} ${LETTER(Math.floor(i / 26))} ${LETTER(i)}`;
  let out = '';
  for (let k = Math.max(0, i - 5); k < i; k++) {
    out += k < 5 ? KNOWN[k] : LETTER(Math.floor(hash(k * 3.7 + 0.3) * 26));
  }
  return `WIN ${win} · OUT ${out || '—'}`;
};

interface Channel {
  key: string;
  title: string;
  mode: string;
  extra: (t: number) => string;
  draw: (c: Ctx, w: number, h: number, t: number, gain?: number) => void;
}

const channels: Channel[] = [
  {
    key: 'S1',
    title: 'LIVING MATRIX',
    mode: 'SEQ · 3 HEADS',
    extra: () => 'HEADS 3 · Q K V',
    draw: (c, w, h, t, gain = 1) => drawMatrix(c, w, h, t, gain),
  },
  {
    key: 'S2',
    title: 'PLATONIC DRIFT',
    mode: 'XY · 5 SOLIDS',
    extra: (t) => {
      const s = SOLIDS[mod(Math.floor(t / SOLID_CYCLE), SOLIDS.length)];
      return `${s.name} · ${s.a}:${s.b}`;
    },
    draw: (c, w, h, t, gain = 1) => drawDrift(c, w, h, t, gain),
  },
  {
    key: 'S4',
    title: 'THE AGENT',
    mode: 'YT · SERVO',
    extra: (t) => `POSE ${POSES[mod(Math.floor(t / 2.8), POSES.length)]}`,
    draw: (c, w, h, t, gain = 1) => yt(c, w, h, t, servo, 5.6, gain),
  },
  {
    key: 'S5',
    title: 'CIPHER ENGINE',
    mode: 'YT · 26 LEVELS',
    extra: cipherExtra,
    draw: (c, w, h, t, gain = 1) => yt(c, w, h, t, cipherValue, 3.2, gain),
  },
];

// ── Scopes ───────────────────────────────────────────────────────────────

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

interface Scope {
  c: Ctx;
  w: number;
  h: number;
}

const makeScope = (el: HTMLCanvasElement, opaque: boolean): Scope => {
  const c = el.getContext('2d');
  if (!c) throw new Error('2d context unavailable');
  const scope: Scope = { c, w: 0, h: 0 };
  const resize = (): void => {
    const r = el.getBoundingClientRect();
    scope.w = Math.max(1, r.width);
    scope.h = Math.max(1, r.height);
    el.width = Math.round(scope.w * DPR);
    el.height = Math.round(scope.h * DPR);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (opaque) {
      c.fillStyle = BG;
      c.fillRect(0, 0, scope.w, scope.h);
    } else {
      c.clearRect(0, 0, scope.w, scope.h);
    }
  };
  new ResizeObserver(resize).observe(el);
  resize();
  return scope;
};

/** Redrawn every frame against the fade, so the graticule holds at a steady glow. */
const graticule = (c: Ctx, w: number, h: number): void => {
  c.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const x = Math.round((w * i) / 10) + 0.5;
    c.strokeStyle = `rgba(232, 228, 216, ${i === 5 ? 0.12 : 0.06})`;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
  for (let i = 1; i < 8; i++) {
    const y = Math.round((h * i) / 8) + 0.5;
    c.strokeStyle = `rgba(232, 228, 216, ${i === 4 ? 0.12 : 0.06})`;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
};

const hero = makeScope($<HTMLCanvasElement>('#hero')!, true);
const rows = Array.from(document.querySelectorAll<HTMLAnchorElement>('.channels a'));
const minis = rows.map((row) => makeScope(row.querySelector<HTMLCanvasElement>('.mini')!, false));

// ── Channel selection ────────────────────────────────────────────────────

let active = 0;
let solo = false;

const setText = (sel: string, text: string): void => {
  const el = $(sel);
  if (el && el.textContent !== text) el.textContent = text;
};

const setReadouts = (): void => {
  const ch = channels[active];
  setText('#ro-ch', `CH${active + 1} · ${ch.key} — ${ch.title}`);
  setText('#ro-mode', ch.mode);
  setText('#ro-state', solo ? 'SOLO · HELD' : 'AUTO · SWEEP 5S');
};

rows.forEach((row, i) => {
  row.addEventListener('pointerenter', () => {
    active = i;
    solo = true;
    setReadouts();
  });
  row.addEventListener('pointerleave', () => {
    solo = false;
    setReadouts();
  });
  row.addEventListener('focusin', () => {
    active = i;
    solo = true;
    setReadouts();
  });
  row.addEventListener('focusout', () => {
    solo = false;
    setReadouts();
  });
});

setInterval(() => {
  if (!solo) {
    active = (active + 1) % channels.length;
    setReadouts();
  }
}, 5000);

// ── Clock ────────────────────────────────────────────────────────────────

const tick = (): void => setText('#ro-clock', new Date().toTimeString().slice(0, 8));
tick();
setInterval(tick, 1000);

// ── Render ───────────────────────────────────────────────────────────────

/** Boot gain: 0 until the tube warms up, swept to 1 by the GSAP timeline. */
const power = { v: reduced ? 1 : 0 };

const frame = (t: number): void => {
  hero.c.globalCompositeOperation = 'source-over';
  hero.c.fillStyle = FADE;
  hero.c.fillRect(0, 0, hero.w, hero.h);
  graticule(hero.c, hero.w, hero.h);
  channels[active].draw(hero.c, hero.w, hero.h, t, power.v);
  // The power-on sweep: a bright leading edge while the tube warms up.
  if (power.v < 1) {
    hero.c.fillStyle = PHOSPHOR;
    hero.c.globalAlpha = (1 - power.v) * 0.5;
    hero.c.fillRect(power.v * hero.w - 1, 0, 2, hero.h);
    hero.c.globalAlpha = 1;
  }
  minis.forEach((m, i) => {
    m.c.clearRect(0, 0, m.w, m.h);
    channels[i].draw(m.c, m.w, m.h, t, 0.8 * Math.max(power.v, 0.001));
  });
  setText('#ro-extra', channels[active].extra(t));
};

setReadouts();

if (reduced) {
  // A drawing states, it does not animate: one settled frame per screen.
  hero.c.fillStyle = BG;
  hero.c.fillRect(0, 0, hero.w, hero.h);
  graticule(hero.c, hero.w, hero.h);
  channels[0].draw(hero.c, hero.w, hero.h, 2.6);
  minis.forEach((m, i) => channels[i].draw(m.c, m.w, m.h, 2.6, 0.8));
  setText('#ro-extra', channels[0].extra(2.6));
} else {
  const t0 = performance.now();
  const loop = (now: number): void => {
    frame((now - t0) / 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ── Boot: tube flicker, then everything else. GSAP owns every transform
  // it touches — no CSS transitions on these properties.
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo(
    '.scope',
    { autoAlpha: 0 },
    {
      keyframes: [
        { autoAlpha: 0.75, duration: 0.07 },
        { autoAlpha: 0.12, duration: 0.05 },
        { autoAlpha: 0.9, duration: 0.06 },
        { autoAlpha: 0.35, duration: 0.04 },
        { autoAlpha: 1, duration: 0.2 },
      ],
    },
  )
    .from('.top', { y: -14, autoAlpha: 0, duration: 0.5 }, 0.1)
    .from('.hero-copy > *', { y: 26, autoAlpha: 0, stagger: 0.09, duration: 0.7 }, 0.35)
    .from('.channels li', { y: 22, autoAlpha: 0, stagger: 0.07, duration: 0.55 }, 0.5)
    .from('.bottom', { autoAlpha: 0, duration: 0.6 }, 0.8);
  gsap.to(power, { v: 1, duration: 1.6, ease: 'power2.inOut', delay: 0.3 });
}
