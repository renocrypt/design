// The Proof register: the machine as a paper technical drawing.
//
// This is not a fallback dressed up as a design — it is the light theme, and it
// is also rung 3 of the degrade ladder. One implementation serves both, which is
// why the light mode is fully art-directed on a machine with no GPU: what you
// see here is the real thing, not a placeholder.
//
// Every coordinate comes from layout.ts, so the drawing and the object cannot
// disagree. The object is now a real model — "Enigma Machine" by ASHISH (CC BY
// 4.0) — and the drawing credits it, because a drawing that does not name its
// subject is not a drawing.

import {
  BODY, CASE, DECK, FRONT, STEP_DEG, KEY_R, LAMP_R,
  keySlots, lampSlots,
} from './layout';

/** World units to SVG units, plus a margin for the annotation gutter. */
const S = 88;
const PAD = 132;

const W = CASE.w * S + PAD * 2;
const H = CASE.d * S + PAD * 2;
// Numbers, not strings: these get arithmetic done on them at call sites, and
// returning formatted strings made `pz(FRONT) - 4` silently concatenate.
const px = (x: number): number => x * S + W / 2;
/** Plan view: +z (front of the machine) points DOWN the page, as on a drawing. */
const pz = (z: number): number => z * S + H / 2;

const el = (tag: string, attrs: Record<string, string | number>, inner = ''): string =>
  `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>${inner}</${tag}>`;

const label = (x: number, y: number, text: string, cls = 'bp-t') =>
  el('text', { x, y, class: cls }, text);

/**
 * Plan view of the machine on its sheet: the body, the open lid standing behind
 * it, the lampboard and keyboard repeated as 26 circles each, the plugboard on
 * the front lip. The lamp/key gap the drawing once stated is now a measured
 * fact: lamps sit at z 0.55 → −0.14, keys at 1.09 → 1.90, and the two banks
 * cannot overlap because the model's geometry says so.
 */
export function blueprintSVG(): string {
  const parts: string[] = [];

  // Sheet grid.
  parts.push(el('rect', { x: 0, y: 0, width: W, height: H, class: 'bp-sheet' }));
  for (let gx = PAD; gx <= W - PAD; gx += S / 2) {
    parts.push(el('line', { x1: gx, y1: PAD, x2: gx, y2: H - PAD, class: 'bp-grid' }));
  }
  for (let gy = PAD; gy <= H - PAD; gy += S / 2) {
    parts.push(el('line', { x1: PAD, y1: gy, x2: W - PAD, y2: gy, class: 'bp-grid' }));
  }

  // The open lid, drawn first so the body sits over it: in plan it is the band
  // behind the machine where the lid's crown and hinges project.
  parts.push(el('rect', {
    x: px(-CASE.w / 2), y: pz(-CASE.d / 2),
    width: CASE.w * S, height: (BODY.backZ + CASE.d / 2) * S,
    rx: 6, class: 'bp-lid',
  }));

  // Machine body, back edge to front lip.
  parts.push(el('rect', {
    x: px(-CASE.w / 2), y: pz(BODY.backZ),
    width: CASE.w * S, height: (FRONT - BODY.backZ) * S,
    rx: 6, class: 'bp-case',
  }));

  // Centreline.
  parts.push(el('line', { x1: px(0), y1: PAD - 26, x2: px(0), y2: H - PAD + 26, class: 'bp-centre' }));

  // The rotor cover: the raised hood between lid and lampboard, where the wheel
  // windows and thumbwheels live. The rotors are sealed inside it — the drawing
  // says so instead of pretending to show them.
  const COVER = { z0: -1.96, z1: -1.16 };
  parts.push(el('rect', {
    x: px(-CASE.w / 2 + 0.22), y: pz(COVER.z0),
    width: (CASE.w - 0.44) * S, height: (COVER.z1 - COVER.z0) * S,
    rx: 10, class: 'bp-plug',
  }));
  parts.push(el('path', {
    d: `M ${px(CASE.w / 2 - 0.22)} ${pz((COVER.z0 + COVER.z1) / 2)} L ${W - PAD + 44} ${pz((COVER.z0 + COVER.z1) / 2)}`,
    class: 'bp-leader',
  }));
  parts.push(label(W - PAD + 50, pz((COVER.z0 + COVER.z1) / 2) - 6, 'ROTOR COVER', 'bp-t bp-t--note'));
  parts.push(label(W - PAD + 50, pz((COVER.z0 + COVER.z1) / 2) + 10, 'WHEELS SEALED INSIDE', 'bp-t bp-t--note'));

  // Lamp bank, then key bank. Both carry their letter so the Proof register can
  // answer a keystroke: the page promises 'a key sinks, a lamp lights', and a
  // static drawing was quietly not delivering it on any machine without a GPU.
  lampSlots().forEach((s) => {
    parts.push(el('circle', {
      cx: px(s.x), cy: pz(s.z), r: LAMP_R * S, class: 'bp-lamp', 'data-lamp': s.letter,
    }));
    parts.push(label(px(s.x), pz(s.z) + 4, s.letter, 'bp-t bp-t--tiny'));
  });
  keySlots().forEach((s) => {
    parts.push(el('circle', {
      cx: px(s.x), cy: pz(s.z), r: KEY_R * S, class: 'bp-key', 'data-key': s.letter,
    }));
    parts.push(label(px(s.x), pz(s.z) + 4, s.letter, 'bp-t bp-t--tiny'));
  });

  // Plugboard on the front lip, where the three cable sockets sit on the model.
  const PLUG = { z0: 2.54, z1: FRONT };
  parts.push(el('rect', {
    x: px(-CASE.w / 2 + 0.22), y: pz(PLUG.z0),
    width: (CASE.w - 0.44) * S, height: (PLUG.z1 - PLUG.z0) * S,
    class: 'bp-plug',
  }));

  // Name the banks. Both are 26 circles carrying the same QWERTZ letters, because
  // that is what the machine is — but unlabelled, side by side, the drawing reads
  // as one keyboard printed twice. A drawing that does not name its parts is not
  // a drawing.
  const bankLabels: [number, string][] = [
    [pz(0.209), 'LAMPBOARD'],
    [pz(1.5), 'KEYBOARD'],
    [pz((PLUG.z0 + PLUG.z1) / 2), 'PLUGBOARD'],
  ];
  bankLabels.forEach(([y, text]) => {
    parts.push(el('path', { d: `M ${px(-CASE.w / 2)} ${y} L ${PAD - 46} ${y}`, class: 'bp-leader' }));
    parts.push(label(PAD - 54, y + 4, text, 'bp-t bp-t--lead'));
  });

  // Annotations live in a titleblock in the bottom-right, where a drawing puts
  // one. Sized off the longest row rather than guessed: 10px mono with 0.14em
  // tracking runs ~7.4px a character.
  const TB_W = 384;
  const TB_H = 104;
  const tbX = W - PAD / 2 - TB_W;
  const tbY = pz(FRONT) + 22; // clear of the case outline, and inside the sheet
  parts.push(el('rect', { x: tbX, y: tbY, width: TB_W, height: TB_H, class: 'bp-case' }));
  parts.push(el('line', { x1: tbX, y1: tbY + 22, x2: tbX + TB_W, y2: tbY + 22, class: 'bp-leader' }));
  const notes: string[] = [
    `ENIGMA · PLAN · 1:1 @ ${S}px/u`,
    `CASE ${CASE.w.toFixed(2)} × ${CASE.d.toFixed(2)} × ${CASE.h.toFixed(2)} · DECK y=${DECK}`,
    `ROTOR STEP ${STEP_DEG.toFixed(3)}° = 360/26`,
    '26 KEYS · 26 LAMPS · MEASURED OFF THE MODEL',
    'MODEL "ENIGMA MACHINE" · ASHISH · CC BY 4.0',
  ];
  notes.forEach((t, i) => parts.push(
    label(tbX + 11, tbY + 15 + i * 15, t, i === 0 ? 'bp-t bp-t--note bp-t--head' : 'bp-t bp-t--note'),
  ));

  return el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    xmlns: 'http://www.w3.org/2000/svg',
    class: 'blueprint',
    role: 'img',
    'aria-label': 'Plan drawing of the Enigma cipher machine',
  }, parts.join(''));
}
