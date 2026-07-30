// Checks the cipher against published Enigma I behaviour, not against our own
// expectations. Run: node src/lab/cipher/enigma.test.mjs
//
// The old S5 machine passed a reciprocity check and still enciphered wrongly,
// which is exactly why the known-answer vector matters more than self-consistency.

// Node 24 strips TypeScript natively, so the module is imported as authored —
// no transpile step and nothing to drift out of sync with what ships.
import { newWheel, encode, buildPlugboard, windowLetters, STEP_ANGLE } from './enigma.ts';

let failures = 0;
const check = (name, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        expected ${expected}\n        actual   ${actual}`);
};

const run = (text, wheel = newWheel(), board = buildPlugboard([])) =>
  [...text].map((ch) => encode(wheel, board, ch).cipher).join('');

// 1. The canonical vector: Enigma I, rotors I-II-III, reflector B, rings AAA,
//    windows AAA, no plugboard. AAAAA -> BDZGO. The old machine gave DHLXO.
check('AAAAA at AAA gives BDZGO', run('AAAAA'), 'BDZGO');

// 2. Reciprocity: retyping the ciphertext at the same start returns the plaintext.
const plain = 'ATTACKATDAWNTHISISALONGERMESSAGETOSTEPTHEROTORSTWICE';
const cipher = run(plain);
check('reciprocal over 52 letters', run(cipher), plain);

// 3. No letter may ever encipher to itself — the flaw that broke Enigma.
check('no letter maps to itself', [...plain].some((ch, i) => ch === cipher[i]) ? 'self-map found' : 'none', 'none');

// 4. Double-stepping. The anomaly fires when the MIDDLE rotor sits on its own
//    notch, and rotor II's notch is E — so the case to watch is ADU, where the
//    middle goes D -> E -> F on consecutive presses and drags the left with it.
//    (An earlier draft of this test asserted AAU -> BCX, which was simply a
//    wrong expectation: from AAU the middle never reaches E, so nothing doubles.)
const windowsFrom = (position) => {
  const w = newWheel([0, 1, 2], position);
  const board = buildPlugboard([]);
  const seen = [];
  for (let i = 0; i < 3; i++) {
    encode(w, board, 'A');
    seen.push(windowLetters(w).replace(/ /g, ''));
  }
  return seen.join(',');
};
check('double-step ADU -> ADV, AEW, BFX', windowsFrom([0, 3, 20]), 'ADV,AEW,BFX');
check('no false double-step AAU -> AAV, ABW, ABX', windowsFrom([0, 0, 20]), 'AAV,ABW,ABX');
const board = buildPlugboard([]);

// 5. The plugboard must actually be in the path.
const swapped = run('AAAAA', newWheel(), buildPlugboard(['AB']));
check('plugboard changes the output', swapped === 'BDZGO' ? 'ignored' : 'applied', 'applied');

// 6. Plugboard is involutive, so reciprocity must survive it.
const pb = buildPlugboard(['AB', 'CD', 'EF', 'GH', 'IJ', 'KL']);
const ct = run(plain, newWheel(), pb);
check('reciprocal with plugboard', run(ct, newWheel(), pb), plain);

// 7. The angle the motion law quantises to.
check('step angle is 360/26', STEP_ANGLE.toFixed(3), (360 / 26).toFixed(3));

// 8. The trace must be the full 10-stop path for the wiring diagram.
check('trace has 10 stops', encode(newWheel(), buildPlugboard([]), 'A').path.length, 10);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
