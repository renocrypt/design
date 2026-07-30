// The Enigma I core — the real transform, not an Enigma-flavoured one.
//
// The previous S5 implementation (2026-07) got the shape right and the maths
// wrong: it applied each rotor's offset on the way IN and never removed it on
// the way OUT, so `AAAAA` enciphered to DHLXO where a real Enigma I at AAA
// gives BDZGO. It also stepped the middle rotor every 26 letters instead of on
// the right rotor's notch, so the famous double-step never happened, and its
// plugboard was geometry only — the panel and cables on the case were never
// touched by the cipher.
//
// All three are fixed here, and enigma.test.mjs checks the fixes against the
// published BDZGO vector rather than against our own expectations.

const A = 'A'.charCodeAt(0);
const idx = (letter: string): number => letter.charCodeAt(0) - A;
const chr = (i: number): string => String.fromCharCode(A + (((i % 26) + 26) % 26));

/** Historical rotor wirings and their turnover notches (Enigma I, 1930). */
const ROTORS = [
  { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' }, // I   — steps the next rotor at Q→R
  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' }, // II  — at E→F
  { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' }, // III — at V→W
] as const;

const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

/** Forward wirings as index maps, plus their inverses, built once. */
const FORWARD = ROTORS.map((r) => [...r.wiring].map(idx));
const INVERSE = FORWARD.map((f) => {
  const inv = new Array<number>(26);
  f.forEach((to, from) => (inv[to] = from));
  return inv;
});
const REFLECT = [...REFLECTOR_B].map(idx);
const NOTCH = ROTORS.map((r) => idx(r.notch));

export interface Wheel {
  /** Rotor slot order as mounted: [left, middle, right]. */
  order: [number, number, number];
  /** Current window letters as offsets 0–25, same order. */
  position: [number, number, number];
}

/**
 * A rotor substitution with the ring offset applied on entry AND removed on
 * exit. Missing that removal is what made the old machine unhistorical: the
 * letter kept the offset it picked up, so every subsequent stage was shifted.
 */
const throughRotor = (map: number[], c: number, offset: number): number =>
  (map[(c + offset) % 26] - offset + 26) % 26;

/** Plugboard pairs, e.g. ['AB','CD']. Involutive: it maps both ways. */
export const buildPlugboard = (pairs: readonly string[]): number[] => {
  const board = Array.from({ length: 26 }, (_, i) => i);
  for (const pair of pairs) {
    const [a, b] = [idx(pair[0]), idx(pair[1])];
    board[a] = b;
    board[b] = a;
  }
  return board;
};

/**
 * Advance the wheels for one keypress, including the double-step anomaly:
 * when the MIDDLE rotor sits on its own notch it steps itself and the left
 * rotor on the next press, so the middle rotor advances twice in two presses.
 * The old implementation carried like an odometer, which never does this.
 */
export function step(w: Wheel): void {
  const [l, m, r] = w.order;
  const atNotch = (slot: number, pos: number) => pos === NOTCH[slot];

  if (atNotch(m, w.position[1])) {
    w.position[1] = (w.position[1] + 1) % 26;
    w.position[0] = (w.position[0] + 1) % 26;
  } else if (atNotch(r, w.position[2])) {
    w.position[1] = (w.position[1] + 1) % 26;
  }
  w.position[2] = (w.position[2] + 1) % 26;
  void l;
}

export interface Trace {
  /** Every index the signal occupies, in order, for the wiring diagram. */
  path: number[];
  cipher: string;
}

/**
 * Encipher one letter, stepping first — a real machine advances the rotor
 * before the contact closes, which is why the first letter is never enciphered
 * at the window position you set.
 *
 * Returns the full signal path so section S3 can draw the actual route rather
 * than a decorative line.
 */
export function encode(w: Wheel, plugboard: number[], letter: string): Trace {
  step(w);

  const path: number[] = [];
  let c = idx(letter.toUpperCase());
  if (c < 0 || c > 25) return { path: [], cipher: letter };

  path.push(c);
  c = plugboard[c];
  path.push(c);

  // Right to left through the rotors, each with its own window offset.
  for (let i = 2; i >= 0; i--) {
    c = throughRotor(FORWARD[w.order[i]], c, w.position[i]);
    path.push(c);
  }

  c = REFLECT[c];
  path.push(c);

  // Left to right, back through the inverse wirings.
  for (let i = 0; i <= 2; i++) {
    c = throughRotor(INVERSE[w.order[i]], c, w.position[i]);
    path.push(c);
  }

  c = plugboard[c];
  path.push(c);

  return { path, cipher: chr(c) };
}

export const newWheel = (
  order: [number, number, number] = [0, 1, 2],
  position: [number, number, number] = [0, 0, 0],
): Wheel => ({ order, position: [...position] as [number, number, number] });

export const windowLetters = (w: Wheel): string => w.position.map(chr).join(' ');

/** Degrees a rotor turns per letter — the quantisation the whole motion law uses. */
export const STEP_ANGLE = 360 / 26;
