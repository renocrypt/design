// World 00 · Cipher — page wiring.
//
// Scroll drives one scalar; scene.ts spreads it across five tracks at their own
// rates. Typing drives the real cipher from enigma.ts, and the rotor angles it
// returns are always multiples of 360/26.

import './tokens.css';
import './cipher.css';
import { buildPlugboard, encode, newWheel, windowLetters, STEP_ANGLE } from './enigma';
import { blueprintSVG } from './blueprint';
import { mountScene, type SceneHandle } from './scene';
import { STEP_DEG } from './layout';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The cipher: rotors I-II-III, reflector B, and three plugboard pairs that match
// the three cables modelled on the case — the panel means something now.
const PLUG_PAIRS = ['BJ', 'EK', 'CH'];
const plugboard = buildPlugboard(PLUG_PAIRS);
let wheel = newWheel([0, 1, 2], [0, 0, 0]);
let plain = '';
let cipher = '';

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

// ── Proof register: drawn from the same constants as the mesh ──────────────
const proof = $('.proof');
if (proof) proof.innerHTML = blueprintSVG();

// ── Theme: two registers, continuous with the rest of the lab ──────────────
const applyTheme = (mode: 'day' | 'night') => {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem('hub-theme', mode);
  const btn = $('#theme');
  if (btn) btn.textContent = mode === 'day' ? 'Signal ↗' : 'Proof ↗';
};
applyTheme((localStorage.getItem('hub-theme') as 'day' | 'night') ?? 'night');
$('#theme')?.addEventListener('click', () =>
  applyTheme(document.documentElement.dataset.theme === 'day' ? 'night' : 'day'),
);

// ── Signal register: the lit machine ──────────────────────────────────────
const canvas = $<HTMLCanvasElement>('#stage');
let scene: SceneHandle | null = null;

if (canvas) {
  scene = mountScene(
    canvas,
    {
      paint: 0x191a1d,
      brass: 0xb08d57,
      key: 0xe8e2d0,
      keyInk: '#17140e',
      lampOff: 0x3a2f1d,
      lampOn: 0xffb454,
      cable: 0x8c2f24,
      ringGround: '#141414',
      ringInk: '#e8e2d0',
      ringAccent: '#ffb454',
      plateGround: '#b08d57',
      plateInk: '#17140e',
    },
    '/hdri/studio_small_03_1k.hdr',
    (ok) => {
      if (!ok) return;
      document.documentElement.dataset.webgl = 'on';
      scene?.resize();
      const dc = $('#drawcalls');
      if (dc && scene) dc.textContent = String(scene.drawCalls);
    },
  );
  scene?.setReduced(reduced);
}

// ── Scroll: one scalar in, five tracks out ────────────────────────────────
const sections = [...document.querySelectorAll('.chapter')];
const readScroll = () => {
  const span = document.documentElement.scrollHeight - innerHeight;
  const v = span > 0 ? (scrollY / span) * (sections.length - 1) : 0;
  scene?.setScroll(v);
};

let queued = false;
addEventListener(
  'scroll',
  () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      readScroll();
    });
  },
  { passive: true },
);
addEventListener('resize', () => {
  scene?.resize();
  readScroll();
});

// ── Typing: the machine actually enciphers ────────────────────────────────
const paint = () => {
  const p = $('#out-plain');
  const c = $('#out-cipher');
  const w = $('#out-windows');
  if (p) p.textContent = plain.slice(-32) || '—';
  if (c) c.textContent = cipher.slice(-32) || '—';
  if (w) w.textContent = windowLetters(wheel);
};

const press = (letter: string) => {
  const { cipher: out } = encode(wheel, plugboard, letter);
  plain += letter;
  cipher += out;
  scene?.press(letter, wheel.position);
  paint();
};

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const ch = e.key.toUpperCase();
  if (ch.length === 1 && ch >= 'A' && ch <= 'Z') {
    e.preventDefault();
    press(ch);
  }
});

$('#reset')?.addEventListener('click', () => {
  wheel = newWheel([0, 1, 2], [0, 0, 0]);
  plain = cipher = '';
  scene?.press('', wheel.position);
  paint();
});

// The reciprocity proof, offered as one click: retype the ciphertext from the
// same start position and the plaintext comes back. It is the property that
// makes an Enigma an Enigma, so the page demonstrates it rather than asserting it.
$('#prove')?.addEventListener('click', () => {
  const text = cipher || 'ATTACKATDAWN';
  const fresh = newWheel([0, 1, 2], [0, 0, 0]);
  const back = [...text].map((ch) => encode(fresh, plugboard, ch).cipher).join('');
  wheel = newWheel([0, 1, 2], [0, 0, 0]);
  plain = text;
  cipher = back;
  scene?.press('', wheel.position);
  paint();
});

// ── Facts the colophon prints, from source rather than from memory ────────
const stepEl = $('#step-angle');
if (stepEl) stepEl.textContent = `${STEP_DEG.toFixed(3)}°`;
const pairsEl = $('#plug-pairs');
if (pairsEl) pairsEl.textContent = PLUG_PAIRS.join(' · ');

paint();
readScroll();

// ── Frame loop ────────────────────────────────────────────────────────────
const tick = (now: number) => {
  scene?.frame(now);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

if (import.meta.hot) import.meta.hot.dispose(() => scene?.dispose());

void STEP_ANGLE;
