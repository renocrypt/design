// Solve for camera stops that leave each chapter's copy column clear.
//
// Not part of the checks — scene.verify.mjs asserts the result. This is the tool
// that FINDS the numbers, kept because the next framing change will want it too.
// Run: node --experimental-strip-types --import ./tools/ts-resolve.mjs src/lab/cipher/stops.tune.mjs
//
// Each stop keeps its viewing ANGLE, which is its character — the top-down look
// into the deck, the low three-quarter on the plugboard. Only two things move:
// how far back the camera sits along that same view vector, and where along x it
// aims. That keeps the art direction and fixes only the collision.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const THREE = await import('three');
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
const { parseMachine } = await import('./machine.ts');
const { CAMERA_STOPS } = await import('./scene.ts');
const { makeTracks, retarget } = await import('./tracks.ts');

const COPY_SIDE = ['left', 'right', 'left', 'right', 'left'];
const COL_INNER = 0.233;
const COL_OUTER = 0.9;
const FOV = 33;
const ASPECT = 16 / 9;

/**
 * Coverage to solve for: none at all.
 *
 * Measured on screen — 40% reads as broken, 15% puts a paragraph on the deck,
 * and even 2% still clipped the first characters of five lines, because a small
 * FRACTION of a wide column is still a dozen pixels straight through the text
 * edge. The body chapters are cheap to solve at zero, so there is no reason to
 * buy a tolerance. The hero keeps its overlap and is not solved here.
 */
const WANT_COVER = 0;
/**
 * Keep the object commanding the frame; below this it turns into a thumbnail.
 * 0.6 rather than 0.75 because stop 2 holds the anatomy fully open at 23° of
 * yaw, and the spread pieces need real distance before they clear the copy.
 */
const MIN_FILL = 0.6;
const MAX_FILL = 1.75;
/** How far back the search may push, as a multiple of each stop's original reach. */
const MAX_REACH = 4.5;

const buf = readFileSync(resolve(here, 'enigma-wire.glb'));
const gltf = await new Promise((res, rej) => {
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej);
});
const machine = parseMachine(gltf, { lampOn: 0 });
machine.root.updateWorldMatrix(true, true);

const whole = new THREE.Box3();
machine.root.traverse((o) => {
  if (!o.isMesh) return;
  o.geometry.computeBoundingBox();
  whole.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
});

const cornersOf = (box) => {
  const out = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
};

/**
 * The pose a scroll position actually holds — yaw and anatomy included.
 * Solving against the object at rest is what produced the first set of stops:
 * clean on paper, and still with a paragraph across the deck on screen.
 * Cached per stop because it is the same pose for every candidate at that stop.
 */
const poseCache = new Map();
const poseAt = (v) => {
  if (poseCache.has(v)) return poseCache.get(v);
  const tracks = makeTracks();
  retarget(tracks, v, CAMERA_STOPS.length);
  machine.explode(tracks.spread.target);
  machine.root.rotation.y = tracks.yaw.target;
  machine.root.updateWorldMatrix(true, true);
  const boxes = [];
  machine.root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    boxes.push(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  const pose = { corners: boxes.map(cornersOf) };
  poseCache.set(v, pose);
  return pose;
};

const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 60);

const measure = (pos, look, side, stopIndex) => {
  camera.position.set(...pos);
  camera.lookAt(new THREE.Vector3(...look));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const { corners } = poseAt(stopIndex);
  let maxU = 0, maxV = 0, behind = 0;
  const spans = [];
  for (const partCorners of corners) {
    let lo = Infinity, hi = -Infinity;
    for (const c of partCorners) {
      const p = c.clone().project(camera);
      if (p.z > 1) behind++;
      maxU = Math.max(maxU, Math.abs(p.x));
      maxV = Math.max(maxV, Math.abs(p.y));
      lo = Math.min(lo, p.x);
      hi = Math.max(hi, p.x);
    }
    spans.push([lo, hi]);
  }
  const [colLo, colHi] = side === 'left' ? [-COL_OUTER, -COL_INNER] : [COL_INNER, COL_OUTER];
  const clipped = spans
    .map(([lo, hi]) => [Math.max(lo, colLo), Math.min(hi, colHi)])
    .filter(([lo, hi]) => hi > lo)
    .sort((a, b) => a[0] - b[0]);
  let union = 0, cursor = colLo;
  for (const [lo, hi] of clipped) {
    if (hi <= cursor) continue;
    union += hi - Math.max(lo, cursor);
    cursor = hi;
  }
  return {
    fill: Math.max(maxU, maxV),
    cover: union / (colHi - colLo),
    behind,
    aimed: whole.containsPoint(new THREE.Vector3(...look)),
  };
};

const r2 = (n) => Math.round(n * 10) / 10;

console.log('stop  side   →  pos                    look                  fill  cover');
const solved = CAMERA_STOPS.map((stop, i) => {
  const side = COPY_SIDE[i];
  const L = new THREE.Vector3(...stop.look);
  const P = new THREE.Vector3(...stop.pos);
  const view = P.clone().sub(L); // preserved exactly: the angle is the art direction

  let best = null;
  // Push the subject away from the copy: aim past it on the copy's side, so the
  // machine swings to the far side of frame. Bounded by the aimed-at-machine
  // rule, which will not let the look-at leave the object.
  //
  // Candidates are ROUNDED BEFORE they are measured, so the numbers printed at
  // the end are the exact numbers that were checked. Searching at full precision
  // and rounding afterwards is how the first run emitted look x -2.2 against a
  // bound of -2.19: valid when solved, one hundredth outside once written down.
  for (let dx = -2.2; dx <= 2.2; dx += 0.1) {
    for (let s = 1.0; s <= MAX_REACH; s += 0.05) {
      const look = [r2(L.x + dx), r2(L.y), r2(L.z)];
      const pos = [r2(look[0] + view.x * s), r2(look[1] + view.y * s), r2(look[2] + view.z * s)];
      const m = measure(pos, look, side, i);
      if (m.behind || !m.aimed) continue;
      if (m.fill < MIN_FILL || m.fill > MAX_FILL) continue;
      if (m.cover > WANT_COVER) continue;
      // Prefer the biggest machine that still clears the copy, then the least
      // disturbance to the original aim.
      const score = -m.fill * 10 + Math.abs(dx);
      if (!best || score < best.score) best = { score, pos, look, ...m };
    }
  }
  if (!best) {
    console.log(`  ${i}  ${side.padEnd(6)} →  NO SOLUTION inside the constraints`);
    return stop;
  }
  console.log(
    `  ${i}  ${side.padEnd(6)} →  [${best.pos.join(', ').padEnd(20)}]  [${best.look.join(', ').padEnd(18)}]  `
    + `${best.fill.toFixed(2)}  ${(best.cover * 100).toFixed(0)}%`,
  );
  return { pos: best.pos, look: best.look };
});

console.log('\nPaste into CAMERA_STOPS in scene.ts:\n');
for (const s of solved) {
  console.log(`  { pos: [${s.pos.join(', ')}], look: [${s.look.join(', ')}] },`);
}
