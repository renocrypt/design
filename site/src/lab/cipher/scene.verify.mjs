// Look at the 3D machine on a box with no GPU.
// Run: node --experimental-strip-types --import ./tools/ts-resolve.mjs src/lab/cipher/scene.verify.mjs
//
// Rasterising needs a GPU. Building the scene graph and projecting it does not —
// that is all CPU maths, and it is where every framing and geometry mistake
// actually lives. This parses the REAL shipped asset (textureless twin of
// public/lab/cipher/enigma.glb) through the REAL parseMachine from machine.ts,
// projects it through the REAL camera stops from scene.ts, then writes an SVG
// wireframe so the thing can be looked at instead of assumed.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const THREE = await import('three');
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
const { parseMachine } = await import('./machine.ts');
const { CASE } = await import('./layout.ts');

// The real stops, imported rather than transcribed. They used to be copied into
// this file under a comment claiming an assertion kept the two lists in step;
// there was no such assertion, so the copy was free to rot silently.
const { CAMERA_STOPS } = await import('./scene.ts');
// The same motion law the page runs, so the poses measured here are the poses shown.
const { makeTracks, retarget } = await import('./tracks.ts');

const FOV = 33;
const ASPECT = 16 / 9;

/**
 * Where each chapter's copy sits, from the chapter classes in
 * lab/s5-cipher-engine.html: `.chapter--right` pushes `.inner` right, everything
 * else runs left. One entry per stop, in order.
 */
const COPY_SIDE = ['left', 'right', 'left', 'right', 'left'];

/**
 * The copy column in NDC, at a 1440-wide reference viewport.
 * `.chapter` padding is clamp(1.25rem, 5vw, 5rem) → 72px at 1440, and
 * `.chapter .inner` is max-width 30rem → 480px. So the column runs 72..552 from
 * whichever edge it is anchored to, which is |x| 0.233..0.900 in NDC.
 */
const COL_INNER = 0.233;
const COL_OUTER = 0.9;
/**
 * How much of that column the machine may cover.
 *
 * Not zero: the hero deliberately runs its display face over the machine's dark
 * lower body, and that overlap is the composition — it sits at 20%. What broke
 * readability was body copy on the lit keyboard, measured at 46% on the old
 * stop 2 and plainly unreadable in a screenshot. 25% admits the hero and nothing
 * heavier; the four body chapters solve to ≤2%, so the margin is not being leaned on.
 */
const MAX_COVER = 0.25;

// Node's fetch cannot read files, so the loader gets bytes. The wire twin has
// no textures, which is what makes it parseable off-DOM.
const buf = readFileSync(resolve(here, 'enigma-wire.glb'));
const gltf = await new Promise((res, rej) => {
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej);
});

const machine = parseMachine(gltf, { lampOn: 0 });
machine.root.updateWorldMatrix(true, true);

// ── What is actually in the scene ─────────────────────────────────────────
const worldBox = (o) => {
  o.geometry.computeBoundingBox();
  return o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
};

const meshes = [];
machine.root.traverse((o) => {
  if (o.isMesh) meshes.push({ name: o.name, box: worldBox(o) });
});

const whole = new THREE.Box3();
meshes.forEach((m) => whole.union(m.box));
const size = new THREE.Vector3();
const centre = new THREE.Vector3();
whole.getSize(size);
whole.getCenter(centre);

/**
 * Put the machine into the pose a given scroll position actually produces.
 *
 * This file used to measure the assembled, un-yawed object at every stop — a
 * pose the page never shows. `retarget` swings the machine up to 0.42 rad and
 * opens the anatomy across stops 1-2, and both change the silhouette the copy
 * has to sit beside. Measuring the rest state reported stop 1 as 0% covered
 * while a screenshot showed a paragraph lying across the deck.
 *
 * Targets, not eased values: a stop is where the tracks are heading, and the
 * page rests there whenever the reader stops scrolling.
 */
const poseAt = (v) => {
  const tracks = makeTracks();
  retarget(tracks, v, CAMERA_STOPS.length);
  machine.explode(tracks.spread.target);
  machine.root.rotation.y = tracks.yaw.target;
  machine.root.updateWorldMatrix(true, true);
  const boxes = [];
  machine.root.traverse((o) => {
    if (o.isMesh) boxes.push({ name: o.name, box: worldBox(o) });
  });
  const box = new THREE.Box3();
  boxes.forEach((b) => box.union(b.box));
  return { boxes, box, yaw: tracks.yaw.target, spread: tracks.spread.target };
};

/** Back to rest, so the geometry assertions above measure the shipped object. */
const rest = () => {
  machine.explode(0);
  machine.root.rotation.y = 0;
  machine.root.updateWorldMatrix(true, true);
};

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n        ${detail}`}`);
};

console.log(`meshes ${meshes.length}  ·  draw calls reported ${machine.drawCalls}`);
console.log(`extent  x ${size.x.toFixed(2)}  y ${size.y.toFixed(2)}  z ${size.z.toFixed(2)}`);
console.log(`centre  ${centre.toArray().map((n) => n.toFixed(2)).join(', ')}\n`);

// 52 movers (keys + lamps) plus the merged static shell.
//
// The wire twin under-counts: stripping its materials collapses the per-material
// merge buckets in parseMachine, so it reports 56 where the SERVED asset reports
// 62 — read off the page's own colophon, 2026-07-30. Checking the raw number here
// would claim 8 calls of headroom against a real margin of 2, so the gap is added
// back before the comparison.
const WIRE_UNDERCOUNT = 6;
const served = machine.drawCalls + WIRE_UNDERCOUNT;
check('draw calls stay inside the stated budget', served <= 64,
  `${machine.drawCalls} on the wire twin → ~${served} served, budget 64`);
check('machine is centred on the axle line in x', Math.abs(centre.x) < 0.05, `x centre ${centre.x.toFixed(3)}`);
check('machine footprint matches the measured case in x',
  Math.abs(size.x - CASE.w) < 0.05, `x extent ${size.x.toFixed(3)} against case ${CASE.w}`);
// The bake floors the case bottom to y=0; the ground plane and the shadow
// catcher both assume it.
const sunken = meshes.filter((m) => m.box.min.y < -0.005);
check('nothing sinks below the floor', sunken.length === 0,
  sunken.map((m) => `${m.name} reaches y=${m.box.min.y.toFixed(3)}`).join('; '));

// The animatable contract: exactly the 52 parts the page promises.
const keyMeshes = meshes.filter((m) => m.name.startsWith('key-'));
const lampMeshes = meshes.filter((m) => m.name.startsWith('lamp-'));
check('26 key parts exist', keyMeshes.length === 26, `${keyMeshes.length} found`);
check('26 lamp parts exist', lampMeshes.length === 26, `${lampMeshes.length} found`);

// A keystroke must actually move a key, and the anatomy must actually open —
// measured on the real matrices, not on the assumption the API is wired up.
const q = keyMeshes.find((m) => m.name === 'key-Q');
machine.setKeyTravel('Q', 1);
machine.root.updateWorldMatrix(true, true);
check('pressing Q sinks its cap', worldBox(qObj()).max.y < q.box.max.y - 0.05,
  'cap did not move');
machine.setKeyTravel('Q', 0);
function qObj() {
  let found = null;
  machine.root.traverse((o) => { if (o.name === 'key-Q') found = o; });
  return found;
}

// ── Framing: does the machine fit each camera stop? ───────────────────────
const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 60);
const cornersOf = (box) => {
  const out = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z));
    }
  }
  return out;
};

CAMERA_STOPS.forEach((stop, i) => {
  camera.position.set(...stop.pos);
  camera.lookAt(new THREE.Vector3(...stop.look));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  // Measure the pose this stop actually holds, not the object at rest.
  const pose = poseAt(i);

  // One screen-x interval per part, kept separate rather than merged into a
  // single envelope: once the anatomy opens there is real daylight between the
  // pieces, and an envelope would bill the copy for gaps it can be read through.
  let maxU = 0;
  let maxV = 0;
  let behind = 0;
  let ndcMin = Infinity;
  let ndcMax = -Infinity;
  const spans = [];
  for (const part of pose.boxes) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of cornersOf(part.box)) {
      const p = c.clone().project(camera);
      if (p.z > 1) behind++;
      maxU = Math.max(maxU, Math.abs(p.x));
      maxV = Math.max(maxV, Math.abs(p.y));
      lo = Math.min(lo, p.x);
      hi = Math.max(hi, p.x);
    }
    spans.push([lo, hi]);
    ndcMin = Math.min(ndcMin, lo);
    ndcMax = Math.max(ndcMax, hi);
  }
  // 1.0 exactly fills the frame. A close-up is allowed to exceed it; what is not
  // allowed is burying the chapter's copy, which is the next check.
  const fill = Math.max(maxU, maxV);
  const target = new THREE.Vector3(...stop.look);
  const aimed = whole.containsPoint(target);
  check(`stop ${i} is aimed at the machine (fills ${fill.toFixed(2)}× the frame)`,
    behind === 0 && aimed,
    `${behind} corners behind the camera; look-at ${stop.look.join(',')} `
    + `${aimed ? 'inside' : 'OUTSIDE'} bounds `
    + `x ${whole.min.x.toFixed(2)}..${whole.max.x.toFixed(2)} `
    + `y ${whole.min.y.toFixed(2)}..${whole.max.y.toFixed(2)} `
    + `z ${whole.min.z.toFixed(2)}..${whole.max.z.toFixed(2)}`);

  // Does the machine leave this chapter's copy readable?
  //
  // The silhouette is approximated by the projected bounding box, which is
  // generous to the machine — the real object is narrower than its AABB — so a
  // pass here is a conservative pass. That is the right direction for a check
  // whose failure mode is unreadable text.
  const side = COPY_SIDE[i];
  const [colLo, colHi] = side === 'left'
    ? [-COL_OUTER, -COL_INNER]
    : [COL_INNER, COL_OUTER];
  // Union of the per-part spans, clipped to the column: sort by start, then walk
  // and accumulate, so overlapping parts are not counted twice.
  const clipped = spans
    .map(([lo, hi]) => [Math.max(lo, colLo), Math.min(hi, colHi)])
    .filter(([lo, hi]) => hi > lo)
    .sort((a, b) => a[0] - b[0]);
  let union = 0;
  let cursor = colLo;
  for (const [lo, hi] of clipped) {
    if (hi <= cursor) continue;
    union += hi - Math.max(lo, cursor);
    cursor = hi;
  }
  const covered = union / (colHi - colLo);
  check(
    `stop ${i} leaves the ${side} copy column readable (${(covered * 100).toFixed(0)}% covered`
    + `${pose.spread ? ', anatomy open' : ''})`,
    covered <= MAX_COVER,
    `machine spans NDC x ${ndcMin.toFixed(2)}..${ndcMax.toFixed(2)}, `
    + `copy column ${colLo.toFixed(2)}..${colHi.toFixed(2)}, `
    + `yaw ${pose.yaw.toFixed(2)} spread ${pose.spread} — `
    + `pull the stop back or swing it further ${side === 'left' ? 'right' : 'left'}`);
});
rest();

// ── Draw it, so it can be looked at ───────────────────────────────────────
const W = 960;
const H = 540;
const svgFor = (stop, i) => {
  camera.position.set(...stop.pos);
  camera.lookAt(new THREE.Vector3(...stop.look));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const to2d = (v) => {
    const p = v.clone().project(camera);
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H, p.z];
  };

  const lines = [];
  for (const m of meshes) {
    const b = m.box;
    const pts = [];
    for (const x of [b.min.x, b.max.x]) {
      for (const y of [b.min.y, b.max.y]) {
        for (const z of [b.min.z, b.max.z]) pts.push(new THREE.Vector3(x, y, z));
      }
    }
    const EDGES = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
    for (const [a, c] of EDGES) {
      const p = to2d(pts[a]);
      const q2 = to2d(pts[c]);
      if (p[2] > 1 || q2[2] > 1) continue;
      lines.push(`<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q2[0].toFixed(1)}" y2="${q2[1].toFixed(1)}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
    + `<rect width="${W}" height="${H}" fill="#14140f"/>`
    + `<g stroke="#8fe3c0" stroke-width="0.6" fill="none" opacity="0.85">${lines.join('')}</g>`
    + `<text x="14" y="26" fill="#e8e4d8" font-family="monospace" font-size="14">`
    + `STOP ${i} · pos ${stop.pos.join(', ')} · look ${stop.look.join(', ')}</text></svg>`;
};

const outDir = resolve(here, '../../../.verify');
CAMERA_STOPS.forEach((stop, i) => {
  writeFileSync(resolve(outDir, `stop-${i}.svg`), svgFor(stop, i));
});
console.log(`\nwireframes → site/.verify/stop-0..4.svg`);
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
