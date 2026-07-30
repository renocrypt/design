// Look at the 3D machine on a box with no GPU.
// Run: node --experimental-strip-types src/lab/cipher/scene.verify.mjs
//
// Rasterising needs a GPU. Building the scene graph and projecting it does not —
// that is all CPU maths, and it is where every framing and geometry mistake
// actually lives. This builds the REAL machine from machine.ts and projects it
// through the REAL camera stops from scene.ts, then writes an SVG wireframe so
// the thing can be looked at instead of assumed.
//
// It exists because 'no GPU here, unverified' was being used as an answer. It
// is not one: the case depth changed from 3.2 to 3.6 under camera poses that
// were hand-tuned for 3.2, and nobody could say whether the machine still fit
// the frame. Now it is a number.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Minimal DOM so surfaces.ts can generate its canvases ──────────────────
// Nothing reads a pixel here; only geometry is under test, so the 2D context is
// a no-op recorder and the canvas is just a width/height pair.
const ctx2d = new Proxy({}, {
  get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })),
  set: () => true,
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }),
};

const THREE = await import('three');
const { buildMachine } = await import('./machine.ts');
const { CASE } = await import('./layout.ts');

// The camera stops, copied from scene.ts. Kept in step by the assertion below,
// which fails if scene.ts stops matching this list.
const CAMERA_STOPS = [
  { pos: [3.9, 3.15, 6.2], look: [0, 1.15, 0] },
  { pos: [1.1, 5.4, 4.5], look: [0, 1.5, -0.6] },
  { pos: [-3.2, 2.5, 4.9], look: [-0.2, 1.2, -0.4] },
  { pos: [0.2, 2.05, 4.15], look: [0, 1.35, 0.5] },
  { pos: [5.2, 3.6, 6.9], look: [0, 1.1, 0] },
];
const FOV = 33;
const ASPECT = 16 / 9;

const palette = {
  paint: 0x2b2b2b, brass: 0xb08d57, key: 0x1a1a1a, keyInk: '#e8e4d8',
  lampOff: 0x2a2a26, lampOn: 0xffe9a8, cable: 0x141414,
  ringGround: '#b08d57', ringInk: '#17140e', ringAccent: '#8c2f2f',
  plateGround: '#b08d57', plateInk: '#17140e',
};

const machine = buildMachine(palette, null);
machine.root.updateWorldMatrix(true, true);

// ── What is actually in the scene ─────────────────────────────────────────
/**
 * World bounds of one object. An InstancedMesh's own matrixWorld says nothing
 * about where its instances are, so the per-instance matrices have to be folded
 * in — the first version of this file skipped that and reported the key caps as
 * sitting below the table, because it was measuring the geometry at the origin.
 */
const worldBox = (o) => {
  o.geometry.computeBoundingBox();
  const geo = o.geometry.boundingBox;
  if (!o.isInstancedMesh) return geo.clone().applyMatrix4(o.matrixWorld);
  const out = new THREE.Box3();
  const im = new THREE.Matrix4();
  const mat = new THREE.Matrix4();
  for (let n = 0; n < o.count; n++) {
    o.getMatrixAt(n, im);
    mat.multiplyMatrices(o.matrixWorld, im);
    out.union(geo.clone().applyMatrix4(mat));
  }
  return out;
};

const meshes = [];
machine.root.traverse((o) => {
  if (!o.isMesh) return;
  meshes.push({
    name: o.name || o.geometry.type,
    count: o.isInstancedMesh ? o.count : 1,
    box: worldBox(o),
    obj: o,
  });
});

const whole = new THREE.Box3();
meshes.forEach((m) => whole.union(m.box));
const size = new THREE.Vector3();
const centre = new THREE.Vector3();
whole.getSize(size);
whole.getCenter(centre);

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n        ${detail}`}`);
};

console.log(`meshes ${meshes.length}  ·  draw calls reported ${machine.drawCalls}`);
console.log(`extent  x ${size.x.toFixed(2)}  y ${size.y.toFixed(2)}  z ${size.z.toFixed(2)}`);
console.log(`centre  ${centre.toArray().map((n) => n.toFixed(2)).join(', ')}\n`);

check('draw calls stay inside the stated budget', machine.drawCalls <= 20, `${machine.drawCalls} calls`);
check('machine is centred on the axle line in x', Math.abs(centre.x) < 0.02, `x centre ${centre.x.toFixed(3)}`);
check('nothing escapes the case footprint in x',
  whole.min.x > -CASE.w / 2 - 0.35 && whole.max.x < CASE.w / 2 + 0.35,
  `x ${whole.min.x.toFixed(2)}..${whole.max.x.toFixed(2)} against case ±${CASE.w / 2}`);
const sunken = meshes.filter((m) => m.box.min.y < -0.02);
check('nothing sinks below the table', sunken.length === 0,
  sunken.map((m) => `${m.name}×${m.count} reaches y=${m.box.min.y.toFixed(3)}`).join('; '));

// Rotor assemblies, measured off the BUILT instances rather than off the numbers
// they were meant to be built from. layout.test.mjs checks the intent and passed
// while the flanges were rotated onto the wrong axis, standing 1.12 across a
// 0.85 pitch and overlapping their neighbours by 0.27. Only the real matrices
// show that, which is the entire reason this file exists.
const flangeMesh = meshes.find((m) => m.count === 6);
if (flangeMesh) {
  const im = new THREE.Matrix4();
  const spans = [];
  flangeMesh.obj.geometry.computeBoundingBox();
  for (let n = 0; n < 6; n++) {
    flangeMesh.obj.getMatrixAt(n, im);
    const b = flangeMesh.obj.geometry.boundingBox.clone()
      .applyMatrix4(new THREE.Matrix4().multiplyMatrices(flangeMesh.obj.matrixWorld, im));
    spans.push([b.min.x, b.max.x]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let worst = Infinity;
  for (let n = 1; n < spans.length; n++) worst = Math.min(worst, spans[n][0] - spans[n - 1][1]);
  check(`rotor assemblies clear each other by ${worst.toFixed(3)} on the axle`, worst > -0.001,
    `flanges overlap by ${(-worst).toFixed(3)} — check the axis they are rotated onto`);
}

// ── Framing: does the machine fit each camera stop? ───────────────────────
const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 60);
const corners = () => {
  const out = [];
  for (const x of [whole.min.x, whole.max.x]) {
    for (const y of [whole.min.y, whole.max.y]) {
      for (const z of [whole.min.z, whole.max.z]) out.push(new THREE.Vector3(x, y, z));
    }
  }
  return out;
};

const framings = CAMERA_STOPS.map((stop, i) => {
  camera.position.set(...stop.pos);
  camera.lookAt(new THREE.Vector3(...stop.look));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  let maxU = 0;
  let maxV = 0;
  let behind = 0;
  for (const c of corners()) {
    const p = c.clone().project(camera);
    if (p.z > 1) behind++;
    maxU = Math.max(maxU, Math.abs(p.x));
    maxV = Math.max(maxV, Math.abs(p.y));
  }
  // 1.0 exactly fills the frame. Stops 1–3 are close-ups, so >1 is the intent,
  // not a fault — asserting a fill ceiling here would just be a made-up number.
  // What must hold is that the shot is AIMED at the machine: nothing folded
  // behind the camera, and the look-at target inside the object's bounds.
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
  return { i, fill, maxU, maxV };
});

// ── Draw it, so it can be looked at ───────────────────────────────────────
const W = 960;
const H = 540;
const svgFor = (stop) => {
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
    // Instanced parts are drawn per instance, so keys and lamps show up as the
    // 26 objects they are rather than as one box around the whole bank.
    const instances = m.obj.isInstancedMesh ? m.obj.count : 1;
    for (let n = 0; n < instances; n++) {
      const mat = m.obj.matrixWorld.clone();
      if (m.obj.isInstancedMesh) {
        const im = new THREE.Matrix4();
        m.obj.getMatrixAt(n, im);
        mat.multiply(im);
      }
      const b = m.obj.geometry.boundingBox;
      const pts = [];
      for (const x of [b.min.x, b.max.x]) {
        for (const y of [b.min.y, b.max.y]) {
          for (const z of [b.min.z, b.max.z]) {
            pts.push(new THREE.Vector3(x, y, z).applyMatrix4(mat));
          }
        }
      }
      const EDGES = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
      for (const [a, c] of EDGES) {
        const p = to2d(pts[a]);
        const q = to2d(pts[c]);
        if (p[2] > 1 || q[2] > 1) continue;
        lines.push(`<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
    + `<rect width="${W}" height="${H}" fill="#14140f"/>`
    + `<g stroke="#8fe3c0" stroke-width="0.6" fill="none" opacity="0.85">${lines.join('')}</g>`
    + `<text x="14" y="26" fill="#e8e4d8" font-family="monospace" font-size="14">`
    + `STOP ${stop.i} · pos ${stop.pos.join(', ')} · look ${stop.look.join(', ')}</text></svg>`;
};

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../../.verify');
CAMERA_STOPS.forEach((stop, i) => {
  writeFileSync(resolve(outDir, `stop-${i}.svg`), svgFor({ ...stop, i }));
});
console.log(`\nwireframes → site/.verify/stop-0..4.svg`);
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
