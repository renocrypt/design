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
  CASE, DECK, FRONT, ROTOR, PLINTH, SHROUD, PLUGBOARD, PLATE, STEP_DEG,
  KEY_ROWS, KEY_R, LAMP_ROWS, LAMP_R, LAMP_H,
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

  // Case outline, then the carrying-box tray around it.
  parts.push(el('rect', {
    x: px(-CASE.w / 2), y: pz(-CASE.d / 2), width: CASE.w * S, height: CASE.d * S,
    rx: 6, class: 'bp-case',
  }));
  parts.push(el('rect', {
    x: px(-PLINTH.w / 2), y: pz(PLINTH.z - PLINTH.d / 2), width: PLINTH.w * S, height: PLINTH.d * S,
    rx: 8, class: 'bp-case',
  }));

  // Centreline.
  parts.push(el('line', { x1: px(0), y1: PAD - 26, x2: px(0), y2: H - PAD + 26, class: 'bp-centre' }));

  // Rotor bank. The drums are cylinders lying on one axle along x, so in PLAN they
  // are rectangles — w across the axle by 2·flangeR deep. Drawing them as circles
  // put an end-elevation shape into a plan view, which is why three rotors pitched
  // 0.85 apart appeared to interpenetrate by 0.27 on a drawing whose own numbers
  // said they clear each other by 0.42.
  parts.push(el('line', {
    x1: px(-ROTOR.gap - 0.55), y1: pz(ROTOR.z), x2: px(ROTOR.gap + 0.55), y2: pz(ROTOR.z), class: 'bp-axle',
  }));
  const flangeOffset = ROTOR.w / 2 + 0.02;
  for (let i = 0; i < 3; i++) {
    const cx = (i - 1) * ROTOR.gap;
    // Flanges are the thin lines, the drum is the solid part — the other way round
    // and the two bright bars read as a pair of slots cut in the deck.
    [-1, 1].forEach((side) => {
      parts.push(el('rect', {
        x: px(cx + side * flangeOffset) - 2, y: pz(ROTOR.z - ROTOR.flangeR),
        width: 4, height: ROTOR.flangeR * 2 * S, class: 'bp-rotor-inner',
      }));
    });
    parts.push(el('rect', {
      x: px(cx - ROTOR.w / 2), y: pz(ROTOR.z - ROTOR.r),
      width: ROTOR.w * S, height: ROTOR.r * 2 * S, class: 'bp-rotor',
    }));
    // Clear of the axle centreline, which runs through the drum's middle.
    parts.push(label(px(cx), pz(ROTOR.z) + 26, ['I', 'II', 'III'][i], 'bp-t bp-t--mid'));
  }

  // The cradle: fascia and cheeks the rotors rise out of.
  parts.push(el('rect', {
    x: px(-SHROUD.w / 2), y: pz(SHROUD.fasciaZ - SHROUD.t / 2),
    width: SHROUD.w * S, height: SHROUD.t * S, class: 'bp-plug',
  }));
  [-1, 1].forEach((side) => {
    parts.push(el('rect', {
      x: px(side * (SHROUD.w / 2 - SHROUD.t / 2) - SHROUD.t / 2), y: pz(SHROUD.cheekZ - SHROUD.cheekD / 2),
      width: SHROUD.t * S, height: SHROUD.cheekD * S, class: 'bp-plug',
    }));
  });

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

  // Plugboard footprint on the front edge, with its sockets.
  parts.push(el('rect', {
    x: px(-PLUGBOARD.w / 2), y: pz(FRONT) - 4, width: PLUGBOARD.w * S, height: 12, class: 'bp-plug',
  }));
  socketSlots().forEach((s, i) => {
    parts.push(el('circle', { cx: px(s.x), cy: pz(FRONT) + (i < 6 ? -1 : 5), r: 3, class: 'bp-socket' }));
  });

  // Name the banks. Both are 26 circles carrying the same QWERTZ letters, because
  // that is what the machine is — but unlabelled, side by side, the drawing reads
  // as one keyboard printed twice. A drawing that does not name its parts is not
  // a drawing.
  const bankLabels: [number, string][] = [
    [pz(LAMP_ROWS[1].z), 'LAMPBOARD'],
    [pz(KEY_ROWS[1].z), 'KEYBOARD'],
  ];
  bankLabels.forEach(([y, text]) => {
    parts.push(el('path', { d: `M ${px(-CASE.w / 2)} ${y} L ${PAD - 46} ${y}`, class: 'bp-leader' }));
    parts.push(label(PAD - 54, y + 4, text, 'bp-t bp-t--lead'));
  });
  parts.push(el('path', {
    d: `M ${px(-PLUGBOARD.w / 2)} ${pz(FRONT) + 2} L ${PAD - 46} ${pz(FRONT) + 2}`, class: 'bp-leader',
  }));
  parts.push(label(PAD - 54, pz(FRONT) + 6, 'PLUGBOARD', 'bp-t bp-t--lead'));

  // Annotations live in a titleblock in the bottom-right, where a drawing puts
  // one. They used to start at x=36 in a 651-wide sheet, so on the page they were
  // laid straight over the hero column: 'reflector' and 'ROTOR STEP 13.846°' were
  // printed on top of each other.
  // Sized off the longest row rather than guessed: 10px mono with 0.14em tracking
  // runs ~7.4px a character, and the clearance line is 48 of them.
  const TB_W = 384;
  const TB_H = 104;
  const tbX = W - PAD / 2 - TB_W;
  const tbY = pz(CASE.d / 2) + 22; // clear of the case outline, and inside the sheet
  parts.push(el('rect', { x: tbX, y: tbY, width: TB_W, height: TB_H, class: 'bp-case' }));
  parts.push(el('line', { x1: tbX, y1: tbY + 22, x2: tbX + TB_W, y2: tbY + 22, class: 'bp-leader' }));
  // Clearances the object had to be corrected to honour, printed so the next
  // person reads them off the drawing instead of trusting the shape.
  const lampY = DECK + LAMP_H / 2 - 0.01;
  const rotorReach = ROTOR.z + Math.sqrt(ROTOR.flangeR ** 2 - (lampY - ROTOR.y) ** 2);
  const lampBack = Math.min(...LAMP_ROWS.map((r) => r.z)) - LAMP_R;
  const notes: string[] = [
    `RENOCRYPT M-26 · PLAN · 1:1 @ ${S}px/u`,
    `CASE ${CASE.w} × ${CASE.d} × ${CASE.h} · DECK y=${DECK}`,
    `ROTOR STEP ${STEP_DEG.toFixed(3)}° = 360/26`,
    `PLATE↔PLUGBOARD ${((PLATE.y - PLATE.h / 2) - (PLUGBOARD.y + PLUGBOARD.h / 2)).toFixed(3)}`,
    `ROTOR↔LAMPBOARD ${(lampBack - rotorReach).toFixed(3)} @ y=${lampY.toFixed(3)}`,
    'ALL SURFACES GENERATED · NO DOWNLOADS',
  ];
  notes.forEach((t, i) => parts.push(
    label(tbX + 11, tbY + 15 + i * 15, t, i === 0 ? 'bp-t bp-t--note bp-t--head' : 'bp-t bp-t--note'),
  ));

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
