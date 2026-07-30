// Geometry assertions for the machine. Run: node src/lab/cipher/layout.test.mjs
//
// The old S5 shipped its nameplate sealed inside the plugboard panel, invisible
// from every angle, because parts were positioned by eye. These checks make that
// class of mistake fail a run.

import {
  CASE, DECK, FRONT, ROTOR, PLUGBOARD, PLATE, SOCKET, STEP_DEG,
  KEY_ROWS, LAMP_ROWS, KEY_R, LAMP_R, LAMP_H,
  keySlots, lampSlots, socketSlots, solids, intersects, overlap,
} from './layout.ts';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n        ${detail}`}`);
};

// 1. No two separately-authored solids may interpenetrate — the old bug.
const parts = solids().filter((p) => p.name !== 'case');
let clash = '';
for (let i = 0; i < parts.length; i++) {
  for (let j = i + 1; j < parts.length; j++) {
    if (intersects(parts[i], parts[j])) {
      clash += `${parts[i].name} x ${parts[j].name} `
        + `(y ${overlap(parts[i], parts[j], 1).toFixed(3)}, z ${overlap(parts[i], parts[j], 2).toFixed(3)}) `;
    }
  }
}
check('no solid intersects another', clash === '', clash);

// 2. Specifically: the nameplate must clear the plugboard, with real daylight.
const gap = (PLATE.y - PLATE.h / 2) - (PLUGBOARD.y + PLUGBOARD.h / 2);
check(`nameplate clears plugboard by ${gap.toFixed(3)}`, gap > 0.1, `gap ${gap.toFixed(3)} is too tight`);

// 3. Front furniture must READ as mounted on the front face: its front surface
//    proud of the case so it is visible, and its back seated in the face rather
//    than floating in front of it or buried behind it. Seating a panel a few
//    thou into the surface is correct engineering, so the check allows it.
for (const [name, o] of [['plugboard', PLUGBOARD], ['nameplate', PLATE]]) {
  const front = o.z + o.d / 2;
  const back = o.z - o.d / 2;
  check(`${name} front face is proud (${front.toFixed(3)} > ${FRONT})`, front > FRONT + 0.005);
  check(`${name} is seated, not floating`, back <= FRONT + 0.005 && back >= FRONT - 0.03,
    `back face at ${back.toFixed(3)}, case front ${FRONT}`);
}

// 4. Sockets must land on the plugboard panel, not float off its edge.
const offPanel = socketSlots().filter(
  (s) => Math.abs(s.x) + SOCKET.r > PLUGBOARD.w / 2 || Math.abs(s.y - PLUGBOARD.y) + SOCKET.r > PLUGBOARD.h / 2,
);
check('every socket lands on the panel', offPanel.length === 0, `${offPanel.length} off-panel`);

// 5. Keys and lamps must sit on the deck, inside the case footprint, and the
//    two banks must not overlap each other in z.
const all = [...keySlots(), ...lampSlots()];
const outside = all.filter((s) => Math.abs(s.x) > CASE.w / 2 - 0.1 || Math.abs(s.z) > CASE.d / 2 - 0.05);
check('all keys and lamps inside the case footprint', outside.length === 0, `${outside.length} outside`);

// Edges, not centres. The old version compared the FRONTMOST lamp centre to the
// backmost key centre and reported +0.64 of daylight where there was none; every
// clearance below is now measured surface-to-surface.
const keyBack = Math.min(...keySlots().map((s) => s.z)) - KEY_R;
const lampFront = Math.max(...lampSlots().map((s) => s.z)) + LAMP_R;
check(`keyboard clears lampboard by ${(keyBack - lampFront).toFixed(3)}`, keyBack - lampFront > 0.1,
  `key bank starts at ${keyBack.toFixed(3)}, lamp bank ends at ${lampFront.toFixed(3)}`);

// 6. Rotors must be sunk into the deck, showing an arc rather than floating.
const sunk = DECK - (ROTOR.y - ROTOR.flangeR);
const proud = ROTOR.y + ROTOR.flangeR - DECK;
check(`rotors sink ${sunk.toFixed(2)} into the deck`, sunk > 0.15, `only ${sunk.toFixed(3)} below the lid`);
check(`rotors show ${proud.toFixed(2)} above the deck`, proud > 0.3);

// 7. Rotors must not collide with the lampboard — checked at the height the lamps
//    actually occupy, because the drums are cylinders: their z half-width shrinks
//    away from the axle, and using the full flange radius flatters the clearance.
const lampMidY = DECK + LAMP_H / 2 - 0.01;
const dy = Math.abs(lampMidY - ROTOR.y);
const rotorHalfZ = dy >= ROTOR.flangeR ? 0 : Math.sqrt(ROTOR.flangeR ** 2 - dy ** 2);
const rotorFrontAtLamps = ROTOR.z + rotorHalfZ;
const lampBack = Math.min(...lampSlots().map((s) => s.z)) - LAMP_R;
check(`rotor bank clears the lampboard by ${(lampBack - rotorFrontAtLamps).toFixed(3)}`,
  lampBack - rotorFrontAtLamps > 0.1,
  `at y=${lampMidY.toFixed(3)} the drums reach z=${rotorFrontAtLamps.toFixed(3)}, `
  + `the back lamp row starts at z=${lampBack.toFixed(3)}`);

// 8. Rotors sit on one axle, so they can only clash along it. solids() lumps all
//    three into a single box and can never see this, hence the explicit check.
const rotorHalfX = ROTOR.w / 2 + 0.02 + 0.025; // drum half-width + flange offset + flange thickness
check(`adjacent rotors clear each other by ${(ROTOR.gap - 2 * rotorHalfX).toFixed(3)}`,
  ROTOR.gap - 2 * rotorHalfX > 0.05,
  `pitch ${ROTOR.gap} against ${(2 * rotorHalfX).toFixed(3)} of occupied axle`);

// 9. The keyboard must be able to type the alphabet. Counting slots is not the
//    same as covering A–Z: the old rows spelled QWERTYUIO, so Y appeared twice
//    and the machine had no Z key at all.
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (const [name, slots] of [['keyboard', keySlots()], ['lampboard', lampSlots()]]) {
  const letters = slots.map((s) => s.letter);
  const missing = [...AZ].filter((c) => !letters.includes(c));
  const dupes = [...new Set(letters.filter((c, i) => letters.indexOf(c) !== i))];
  check(`${name} covers A-Z exactly once`, missing.length === 0 && dupes.length === 0,
    `missing ${missing.join('') || 'none'}, duplicated ${dupes.join('') || 'none'}`);
}

// 10. Row order. +z faces the operator, so the bottom row of a real Enigma —
//     PYXCVBNML — must be the frontmost, and QWERTZUIO the row nearest the rotors.
for (const [name, rows] of [['keyboard', KEY_ROWS], ['lampboard', LAMP_ROWS]]) {
  const byZ = [...rows].sort((a, b) => b.z - a.z).map((r) => r.letters);
  check(`${name} rows run front to back PYXCVBNML / ASDFGHJK / QWERTZUIO`,
    byZ.join('|') === 'PYXCVBNML|ASDFGHJK|QWERTZUIO', `front to back: ${byZ.join(' / ')}`);
}

// 11. The quantisation the motion law depends on.
check(`step angle ${STEP_DEG.toFixed(3)} deg`, Math.abs(STEP_DEG - 13.846) < 0.001);
check('26 keys and 26 lamps', keySlots().length === 26 && lampSlots().length === 26,
  `${keySlots().length} keys, ${lampSlots().length} lamps`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
