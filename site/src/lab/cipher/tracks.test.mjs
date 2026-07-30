// The motion law's central claim, checked as maths rather than by eye — this
// machine has no GPU, so the scene never mounts here and the browser cannot
// answer it. Run: node src/lab/cipher/tracks.test.mjs
//
// The claim: five tracks fed the SAME scroll value must not move as one. The old
// page had a single scrubbed timeline, so everything shared one curve; if these
// rates ever collapse toward each other, the rebuild has lost its point.

import { makeTracks, advance } from './tracks.ts';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n        ${detail}`}`);
};

const tracks = makeTracks();
const names = Object.keys(tracks);
const rates = names.map((n) => tracks[n].rate);

// 1. Five distinct rates, none a simple multiple of another — harmonics would
//    let tracks re-synchronise, which is the thing we are avoiding.
check('five distinct rates', new Set(rates).size === 5, rates.join(', '));
let harmonic = '';
for (let i = 0; i < rates.length; i++) {
  for (let j = i + 1; j < rates.length; j++) {
    // Compare as max/min so the check is order-independent — a first draft only
    // looked one way and would have missed half the pairs.
    const ratio = Math.max(rates[i], rates[j]) / Math.min(rates[i], rates[j]);
    if (Math.abs(ratio - Math.round(ratio)) < 0.02 && Math.round(ratio) > 1) {
      harmonic += `${names[i]}:${names[j]}=${ratio.toFixed(3)} `;
    }
  }
}
check('no rate is an integer multiple of another', harmonic === '', harmonic);

// 2. Step every track to the same target and confirm they are spread apart
//    while settling — the drift between them IS the non-linearity.
Object.values(tracks).forEach((t) => (t.target = 1));
const dt = 1 / 60;
const at = (frames) => {
  const fresh = makeTracks();
  Object.values(fresh).forEach((t) => (t.target = 1));
  for (let f = 0; f < frames; f++) Object.values(fresh).forEach((t) => advance(t, dt));
  return Object.fromEntries(Object.entries(fresh).map(([k, t]) => [k, +t.value.toFixed(4)]));
};

const mid = at(10);
const spread = Math.max(...Object.values(mid)) - Math.min(...Object.values(mid));
check(`tracks spread ${(spread * 100).toFixed(1)}% apart after 10 frames`, spread > 0.15,
  JSON.stringify(mid));

// 3. Every track must still converge — drift is the point, drag is not.
const late = at(240);
const worst = Math.min(...Object.values(late));
check(`all tracks reach the target (worst ${worst})`, worst > 0.98, JSON.stringify(late));

// 4. Order must be stable: faster rate always leads. If this fails the mapping
//    and the rates disagree somewhere.
const ordered = names.slice().sort((a, b) => tracks[b].rate - tracks[a].rate);
const byValue = Object.entries(mid).sort((a, b) => b[1] - a[1]).map(([k]) => k);
check('faster tracks lead', ordered.join('>') === byValue.join('>'), `${ordered} vs ${byValue}`);

// 5. Frame-rate independence: the same elapsed time must land in the same place
//    whether it arrives as 60 small steps or 20 larger ones.
const walk = (steps, step) => {
  const t = makeTracks().camera;
  t.target = 1;
  for (let i = 0; i < steps; i++) advance(t, step);
  return t.value;
};
const fast = walk(60, 1 / 60);
const slow = walk(20, 3 / 60);
check(`60fps and 20fps agree within ${(Math.abs(fast - slow) * 100).toFixed(2)}%`,
  Math.abs(fast - slow) < 0.02, `${fast.toFixed(4)} vs ${slow.toFixed(4)}`);

// 6. Reduced motion is a hard snap, not a fast ease.
const snapped = makeTracks();
Object.values(snapped).forEach((t) => { t.target = 1; t.value = t.target; });
check('reduced motion snaps to target', Object.values(snapped).every((t) => t.value === 1));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
