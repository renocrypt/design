// The machine's dimensions, in one place, because two things read them: the
// Three.js build and the SVG blueprint that stands in for it in the Proof
// register. One source means the drawing cannot drift from the object.
//
// It also exists because the old S5 laid parts out by eye and sealed its own
// nameplate inside the plugboard panel — a 0.34 y-overlap nobody could see from
// any angle. layout.test.mjs now asserts that no two separately-authored parts
// intersect, so that class of bug fails a run instead of shipping.
//
// Units are arbitrary but consistent: the case is 4.4 wide, and everything else
// is expressed against it. Front of the machine faces +z, which is where the
// camera lives.

export interface Box {
  name: string;
  /** Centre. */
  at: [number, number, number];
  /** Full extents. */
  size: [number, number, number];
  /** Rotation about x, radians. */
  tilt?: number;
}

// Depth is 3.6, not 3.2: at 3.2 the bank spacing that keeps the back lamp row out
// of the rotor drums does not fit between the front wall and the axle. The old
// value bought its proportion by burying six lamps in the rotors.
// Height is 1.9, not 1.6: a real machine is a chest, not a podium — at 1.6 the
// case read as a flat grey slab under everything that sits on it.
export const CASE = { w: 4.4, h: 1.9, d: 3.6 } as const;
/** Top face of the case — the plane the keyboard and lampboard sit on. */
export const DECK = CASE.h;
/** Front face, where the plugboard and nameplate live. */
export const FRONT = CASE.d / 2;

/** The carrying-box tray the machine stands in — dark stained wood, one step
 *  wider than the case on every side. Its top is the case's y=0. */
export const PLINTH = { w: 5.0, h: 0.35, d: 4.15, y: -0.175, z: 0.05 } as const;

/**
 * Keyboard: three staggered rows on the deck, front third of the case, listed
 * front to back. Two things were wrong here and both were visible in a single
 * plan drawing: the rows ran backwards (QWERTZUIO belongs at the BACK, nearest
 * the rotors, with PYXCVBNML under the operator's hands), and the top row was
 * spelled QWERTYUIO — the QWERTZ Y/Z swap missed — which gave the machine two Y
 * keys and no Z at all.
 */
export const KEY_ROWS = [
  { letters: 'PYXCVBNML', z: 1.565 },
  { letters: 'ASDFGHJK', z: 1.225 },
  { letters: 'QWERTZUIO', z: 0.885 },
] as const;
export const KEY_PITCH = 0.44;
/** Bakelite discs, not drums: 0.16 radius, 0.09 tall — the old 0.175/0.14
 *  white cylinders are what read as marshmallows. */
export const KEY_R = 0.16;
export const KEY_H = 0.09;
/** How far a key sinks when pressed. */
export const KEY_TRAVEL = 0.075;

/** Lampboard: same three-row grammar and the same order, behind the keys.
 *  Lamps are glass windows seated near-flush, not a second keyboard. */
export const LAMP_ROWS = [
  { letters: 'PYXCVBNML', z: 0.265 },
  { letters: 'ASDFGHJK', z: -0.075 },
  { letters: 'QWERTZUIO', z: -0.415 },
] as const;
export const LAMP_R = 0.12;
export const LAMP_H = 0.035;

/**
 * Rotors: three on one axle at the back, sunk deep into the deck so only the
 * crown of the letter rings shows above the shroud — a real machine hides the
 * works. The scroll's spread track lifts them clear of the cradle, which is
 * what the explode now explodes OUT OF.
 */
export const ROTOR = {
  r: 0.5,
  flangeR: 0.56,
  w: 0.34,
  gap: 0.85,
  y: DECK + 0.04,
  z: -1.22,
} as const;
export const AXLE_R = 0.075;
/** Short enough to end inside the shroud cheeks; the knobs outside carry it. */
export const AXLE_LEN = ROTOR.gap * 2 + 0.6;

/**
 * The cradle the rotors rise out of: a front fascia and two end cheeks, no
 * top — the crowns poke through the open slot. Placed so each wall clears the
 * flange discs surface-to-surface (the fascia sits 0.037 off the flange arc at
 * deck height) — and so the crude boxes in solids() stay disjoint too.
 */
export const SHROUD = {
  w: 2.5,
  t: 0.07,
  h: 0.32,
  fasciaZ: ROTOR.z + 0.63,
  cheekD: 1.12,
  cheekZ: ROTOR.z + 0.03,
} as const;

/** Front-face furniture. Bands chosen so these two can never overlap again. */
export const PLUGBOARD = { w: 2.7, h: 0.58, d: 0.05, y: 0.49, z: FRONT + 0.02 } as const;
export const SOCKET = { r: 0.05, h: 0.06, cols: 6, rows: 2, pitch: 0.42, rowGap: 0.26 } as const;
export const PLATE = { w: 1.9, h: 0.3, d: 0.035, y: 1.3, z: FRONT + 0.02 } as const;

/** Degrees per rotor step, and therefore the quantisation of every rotation. */
export const STEP_DEG = 360 / 26;

const keyX = (row: { letters: string }, i: number): number =>
  -((row.letters.length - 1) * KEY_PITCH) / 2 + i * KEY_PITCH;

/** Every key's deck position, in the order the atlas expects. */
export const keySlots = (): { letter: string; x: number; z: number }[] =>
  KEY_ROWS.flatMap((row) => [...row.letters].map((letter, i) => ({ letter, x: keyX(row, i), z: row.z })));

export const lampSlots = (): { letter: string; x: number; z: number }[] =>
  LAMP_ROWS.flatMap((row) => [...row.letters].map((letter, i) => ({ letter, x: keyX(row, i), z: row.z })));

export const socketSlots = (): { x: number; y: number }[] => {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < SOCKET.rows; r++) {
    for (let c = 0; c < SOCKET.cols; c++) {
      out.push({
        x: -((SOCKET.cols - 1) * SOCKET.pitch) / 2 + c * SOCKET.pitch,
        y: PLUGBOARD.y + SOCKET.rowGap / 2 - r * SOCKET.rowGap,
      });
    }
  }
  return out;
};

/**
 * The parts a collision check cares about: separately-authored solids on the
 * same face. Keys, lamps and sockets are excluded on purpose — they are
 * deliberately seated in their parent surface.
 */
export const solids = (): Box[] => [
  { name: 'case', at: [0, CASE.h / 2, 0], size: [CASE.w, CASE.h, CASE.d] },
  { name: 'plinth', at: [0, PLINTH.y, PLINTH.z], size: [PLINTH.w, PLINTH.h, PLINTH.d] },
  { name: 'plugboard', at: [0, PLUGBOARD.y, PLUGBOARD.z], size: [PLUGBOARD.w, PLUGBOARD.h, PLUGBOARD.d] },
  { name: 'nameplate', at: [0, PLATE.y, PLATE.z], size: [PLATE.w, PLATE.h, PLATE.d] },
  {
    name: 'rotor-bank',
    at: [0, ROTOR.y, ROTOR.z],
    size: [ROTOR.gap * 2 + ROTOR.w, ROTOR.flangeR * 2, ROTOR.flangeR * 2],
  },
  { name: 'shroud-fascia', at: [0, DECK + SHROUD.h / 2, SHROUD.fasciaZ], size: [SHROUD.w, SHROUD.h, SHROUD.t] },
  ...([-1, 1] as const).map((side) => ({
    name: `shroud-cheek-${side < 0 ? 'l' : 'r'}`,
    at: [side * (SHROUD.w / 2 - SHROUD.t / 2), DECK + SHROUD.h / 2, SHROUD.cheekZ] as [number, number, number],
    size: [SHROUD.t, SHROUD.h, SHROUD.cheekD] as [number, number, number],
  })),
];

/** Axis-aligned overlap along one axis; positive means they interpenetrate. */
export const overlap = (a: Box, b: Box, axis: 0 | 1 | 2): number => {
  const lo = (x: Box) => x.at[axis] - x.size[axis] / 2;
  const hi = (x: Box) => x.at[axis] + x.size[axis] / 2;
  return Math.min(hi(a), hi(b)) - Math.max(lo(a), lo(b));
};

export const intersects = (a: Box, b: Box): boolean =>
  ([0, 1, 2] as const).every((axis) => overlap(a, b, axis) > 0);
