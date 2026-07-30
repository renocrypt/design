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

/**
 * The drawing's answer to a keystroke, so the Proof register keeps the promise
 * the copy makes. Held until the next press rather than timed out: a drawing
 * states, it does not animate.
 */
let proofMarked: Element[] = [];
const markProof = (typed: string, lit: string): void => {
  proofMarked.forEach((el) => el.classList.remove('is-down', 'is-lit'));
  proofMarked = [];
  if (!proof) return;
  const down = typed && proof.querySelector(`[data-key="${typed}"]`);
  const glow = lit && proof.querySelector(`[data-lamp="${lit}"]`);
  if (down) {
    down.classList.add('is-down');
    proofMarked.push(down);
  }
  if (glow) {
    glow.classList.add('is-lit');
    proofMarked.push(glow);
  }
};

// ── Theme: two registers, continuous with the rest of the lab ──────────────
const applyTheme = (mode: 'day' | 'night') => {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem('hub-theme', mode);
  const btn = $<HTMLButtonElement>('#theme');
  if (!btn) return;
  // 'Signal ↗' is an offer, and it has to be one the page can keep: with no
  // WebGL context, pressing it changed the theme and left the same drawing on
  // screen, which reads as a dead button rather than as a missing register.
  if (document.documentElement.dataset.signal === 'unavailable') {
    btn.textContent = 'Proof only';
    btn.title = 'The lit machine needs WebGL, which this browser did not provide.';
    btn.disabled = true;
    return;
  }
  btn.textContent = mode === 'day' ? 'Signal ↗' : 'Proof ↗';
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
      // The colophon printed a bare em-dash forever in the Proof register, so the
      // sentence read '... BJ · EK · CH · — draw calls.' A drawing has no draw
      // calls; the clause is dropped rather than left claiming a number.
      const line = $('#draw-line');
      if (!ok) {
        // Say so. The page was showing the drawing and asserting a paragraph
        // lower that it is 'not a fallback' — true when the drawing is chosen,
        // a lie when it is all the browser could give you. Note: never set
        // data-webgl here; the CSS shows the drawing on :not([data-webgl]).
        document.documentElement.dataset.signal = 'unavailable';
        if (line) line.textContent = ' · no WebGL context in this browser, so the machine is unavailable here.';
        // The toggle was already labelled before this resolved, so relabel it.
        applyTheme(document.documentElement.dataset.theme === 'day' ? 'day' : 'night');
        return;
      }
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

/**
 * Which way the drawing leans, per chapter, so it is never under the copy.
 * The Signal register gets this for free: the camera has five stops, so the
 * machine swings out of the way as you scroll. The Proof register had none of it
 * — a fixed, dead-centre 62rem drawing beneath text columns that alternate sides,
 * which ran 328px of key circles straight through two chapters. Same scalar and
 * the same five stops, so the drawing leans away from the copy instead.
 * -1 = drawing left (copy on the right), +1 = drawing right, 0 = centred.
 */
const PROOF_LEAN = [0, -1, 1, -1, 1];

const readScroll = () => {
  const span = document.documentElement.scrollHeight - innerHeight;
  const v = span > 0 ? (scrollY / span) * (sections.length - 1) : 0;
  scene?.setScroll(v);

  const i = Math.max(0, Math.min(PROOF_LEAN.length - 2, Math.floor(v)));
  const f = Math.max(0, Math.min(1, v - i));
  const lean = PROOF_LEAN[i] + (PROOF_LEAN[i + 1] - PROOF_LEAN[i]) * f;
  document.documentElement.style.setProperty('--proof-lean', lean.toFixed(4));
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
  // The cipher letter goes to the scene too — it is the one that lights a lamp.
  scene?.press(letter, out, wheel.position);
  markProof(letter, out);
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
  scene?.press('', '', wheel.position);
  markProof('', '');
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
  scene?.press('', '', wheel.position);
  markProof('', '');
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
