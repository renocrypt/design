// The Proof register: the machine as a paper technical drawing.
//
// This is not a fallback dressed up as a design — it is the light theme, and it
// is also rung 3 of the degrade ladder. One implementation serves both, which is
// why the light mode is fully art-directed on a machine with no GPU: what you
// see here is the real thing, not a placeholder.
//
// Every coordinate comes from layout.ts, so the drawing and the object cannot
// disagree. The dimension callouts print real numbers for the same reason.

import {
  CASE, DECK, FRONT, ROTOR, PLUGBOARD, PLATE, STEP_DEG,
  keySlots, lampSlots, socketSlots,
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
 * Plan view of the deck: case outline, key and lamp banks, rotor bank, and the
 * front furniture that used to overlap. The gap the old build got wrong is
 * dimensioned explicitly, because a drawing that states its clearances is how
 * you stop that bug coming back.
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

  // Case outline.
  parts.push(el('rect', {
    x: px(-CASE.w / 2), y: pz(-CASE.d / 2), width: CASE.w * S, height: CASE.d * S,
    rx: 6, class: 'bp-case',
  }));

  // Centreline.
  parts.push(el('line', { x1: px(0), y1: PAD - 26, x2: px(0), y2: H - PAD + 26, class: 'bp-centre' }));

  // Rotor bank, drawn as three circles on one axle.
  parts.push(el('line', {
    x1: px(-ROTOR.gap - 0.55), y1: pz(ROTOR.z), x2: px(ROTOR.gap + 0.55), y2: pz(ROTOR.z), class: 'bp-axle',
  }));
  for (let i = 0; i < 3; i++) {
    const cx = (i - 1) * ROTOR.gap;
    parts.push(el('circle', { cx: px(cx), cy: pz(ROTOR.z), r: ROTOR.flangeR * S, class: 'bp-rotor' }));
    parts.push(el('circle', { cx: px(cx), cy: pz(ROTOR.z), r: ROTOR.r * S, class: 'bp-rotor-inner' }));
    parts.push(label(px(cx), pz(ROTOR.z) + 5, ['I', 'II', 'III'][i], 'bp-t bp-t--mid'));
  }

  // Lamp bank, then key bank.
  lampSlots().forEach((s) => {
    parts.push(el('circle', { cx: px(s.x), cy: pz(s.z), r: 0.145 * S, class: 'bp-lamp' }));
    parts.push(label(px(s.x), pz(s.z) + 4, s.letter, 'bp-t bp-t--tiny'));
  });
  keySlots().forEach((s) => {
    parts.push(el('circle', { cx: px(s.x), cy: pz(s.z), r: 0.175 * S, class: 'bp-key' }));
    parts.push(label(px(s.x), pz(s.z) + 4, s.letter, 'bp-t bp-t--tiny'));
  });

  // Plugboard footprint on the front edge, with its sockets.
  parts.push(el('rect', {
    x: px(-PLUGBOARD.w / 2), y: pz(FRONT) - 4, width: PLUGBOARD.w * S, height: 12, class: 'bp-plug',
  }));
  socketSlots().forEach((s, i) => {
    parts.push(el('circle', { cx: px(s.x), cy: pz(FRONT) + (i < 6 ? -1 : 5), r: 3, class: 'bp-socket' }));
  });

  // Annotations — real values, pulled from the same constants the mesh uses.
  const notes: [number, number, string][] = [
    [PAD - 96, PAD - 44, `RENOCRYPT M-26 · PLAN · 1:1 @ ${S}px/u`],
    [PAD - 96, PAD - 24, `CASE ${CASE.w} × ${CASE.d} × ${CASE.h}  ·  DECK y=${DECK}`],
    [PAD - 96, H - PAD + 40, `ROTOR STEP ${STEP_DEG.toFixed(3)}° = 360/26`],
    [PAD - 96, H - PAD + 58, `PLATE y=${PLATE.y}  ·  PLUGBOARD y=${PLUGBOARD.y}  ·  CLEARANCE ${(
      (PLATE.y - PLATE.h / 2) - (PLUGBOARD.y + PLUGBOARD.h / 2)
    ).toFixed(3)}`],
    [PAD - 96, H - PAD + 76, 'ALL SURFACES GENERATED · NO TEXTURE DOWNLOADS'],
  ];
  notes.forEach(([x, y, t]) => parts.push(label(x, y, t, 'bp-t bp-t--note')));

  // Leader line calling out the rotor bank, the way a drawing would.
  parts.push(el('path', {
    d: `M ${px(ROTOR.gap + 0.7)} ${pz(ROTOR.z)} L ${W - PAD + 44} ${pz(ROTOR.z)}`, class: 'bp-leader',
  }));
  parts.push(label(W - PAD + 50, pz(ROTOR.z) - 6, 'ROTOR BANK', 'bp-t bp-t--note'));
  parts.push(label(W - PAD + 50, pz(ROTOR.z) + 10, 'SUNK ' + (DECK - (ROTOR.y - ROTOR.flangeR)).toFixed(2), 'bp-t bp-t--note'));

  return el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    xmlns: 'http://www.w3.org/2000/svg',
    class: 'blueprint',
    role: 'img',
    'aria-label': 'Plan drawing of the RENOCRYPT M-26 cipher engine',
  }, parts.join(''));
}
