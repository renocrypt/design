// Geometry assertions for the machine. Run: node src/lab/cipher/layout.test.mjs
//
// The machine is now a real model (ASHISH's CC-BY Enigma), and layout.ts is a
// MEASURED table of its 26 keys and 26 lamps. These checks guard the table
// against the mistakes that made the old procedural build ship wrong: rows in
// the wrong order, a letter missing or duplicated, banks overlapping, slots
// drifting off the footprint.

import {
  CASE, STEP_DEG, KEY_R, LAMP_R, keySlots, lampSlots,
} from './layout.ts';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n        ${detail}`}`);
};

// 1. The banks must type the alphabet. Counting slots is not the same as
//    covering A–Z: the old rows spelled QWERTYUIO, so Y appeared twice and the
//    machine had no Z key at all.
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (const [name, slots] of [['keyboard', keySlots()], ['lampboard', lampSlots()]]) {
  const letters = slots.map((s) => s.letter);
  const missing = [...AZ].filter((c) => !letters.includes(c));
  const dupes = [...new Set(letters.filter((c, i) => letters.indexOf(c) !== i))];
  check(`${name} covers A-Z exactly once`, missing.length === 0 && dupes.length === 0,
    `missing ${missing.join('') || 'none'}, duplicated ${dupes.join('') || 'none'}`);
}
check('26 keys and 26 lamps', keySlots().length === 26 && lampSlots().length === 26,
  `${keySlots().length} keys, ${lampSlots().length} lamps`);

// 2. Row order. +z faces the operator, so the bottom row of a real Enigma —
//    PYXCVBNML — must be frontmost, and QWERTZUIO the row nearest the rotors.
//    Lamps repeat the same grammar behind the keys.
const rowsOf = (slots) => {
  const byZ = new Map();
  slots.forEach((s) => byZ.set(s.z, [...(byZ.get(s.z) ?? []), s.letter]));
  return [...byZ.entries()].sort((a, b) => b[0] - a[0])
    .map(([, letters]) => [...letters].sort().join(''));
};
const GRAMMAR = ['BCLMNPVXY', 'ADFGHJKS', 'EIOQRTUWZ']; // PYXCVBNML / ASDFGHJK / QWERTZUIO, sorted
for (const [name, slots] of [['keyboard', keySlots()], ['lampboard', lampSlots()]]) {
  const rows = rowsOf(slots);
  check(`${name} rows run front to back PYXCVBNML / ASDFGHJK / QWERTZUIO`,
    rows.join('|') === GRAMMAR.join('|'), `front to back: ${rows.join(' / ')}`);
}

// 3. Every lamp sits behind its own key, on the same column: the lampboard is
//    the keyboard's grammar shifted toward the rotors, not a second keyboard.
const keysByLetter = new Map(keySlots().map((s) => [s.letter, s]));
const displaced = lampSlots().filter(
  (s) => s.z >= keysByLetter.get(s.letter).z || Math.abs(s.x - keysByLetter.get(s.letter).x) > 0.01,
);
check('every lamp sits behind its key, same column', displaced.length === 0,
  displaced.map((s) => s.letter).join(','));

// 4. The two banks must not overlap in z — surface to surface, not centre to
//    centre (the old version compared centres and reported daylight that was
//    not there).
const keyBack = Math.min(...keySlots().map((s) => s.z)) - KEY_R;
const lampFront = Math.max(...lampSlots().map((s) => s.z)) + LAMP_R;
check(`keyboard clears lampboard by ${(keyBack - lampFront).toFixed(3)}`, keyBack - lampFront > 0.1,
  `key bank starts at ${keyBack.toFixed(3)}, lamp bank ends at ${lampFront.toFixed(3)}`);

// 5. Everything inside the footprint the camera and the drawing assume.
const all = [...keySlots(), ...lampSlots()];
const outside = all.filter((s) => Math.abs(s.x) > CASE.w / 2 || Math.abs(s.z) > CASE.d / 2);
check('all keys and lamps inside the case footprint', outside.length === 0, `${outside.length} outside`);

// 6. Caps within a row must not touch: pitch exceeds diameter, or the press of
//    one key would visually swallow its neighbour.
for (const [name, slots, r] of [['keyboard', keySlots(), KEY_R], ['lampboard', lampSlots(), LAMP_R]]) {
  let worst = Infinity;
  const byRow = new Map();
  slots.forEach((s) => byRow.set(s.z, [...(byRow.get(s.z) ?? []), s.x]));
  for (const xs of byRow.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) worst = Math.min(worst, xs[i] - xs[i - 1] - 2 * r);
  }
  check(`${name} caps clear each other by ${worst.toFixed(3)} in-row`, worst > 0.02,
    `tightest pair overlaps by ${(-worst).toFixed(3)}`);
}

// 7. The quantisation the motion law and the readout depend on.
check(`step angle ${STEP_DEG.toFixed(3)} deg`, Math.abs(STEP_DEG - 13.846) < 0.001);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
