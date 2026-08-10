// The machine, loaded from a real model instead of built from primitives.
//
// The asset is "Enigma Machine" by ASHISH (CC BY 4.0 — see ASSETS.md in this
// folder), split offline into 127 nodes: 26 key-*, 26 lamp-*, and the static
// shell. This module loads it, bakes the whole transform chain into the
// geometry (front to +z, ×SCALE, centred, floored — the numbers in layout.ts
// are measured against exactly this bake), then merges the static shell per
// material so the draw calls go to the parts that can actually move.
//
// What can move: every key sinks on its letter, every lamp lights on its
// letter, and explode() opens the anatomy for the scroll's spread track. The
// rotors themselves stay sealed behind the cover — the model has no full
// letter rings to step, so stepping lives in the readout, not the mesh.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCALE, KEY_TRAVEL } from './layout';

export interface Palette {
  lampOn: number;
}

export interface Machine {
  root: THREE.Group;
  /** Sink one cap, t in [0,1] of KEY_TRAVEL. Unknown letters no-op. */
  setKeyTravel(letter: string, t: number): void;
  /** Glow one lamp from off to on, t in [0,1]. */
  setLamp(letter: string, t: number): void;
  /** Open the anatomy: 0 assembled, 1 fully separated. */
  explode(t: number): void;
  drawCalls: number;
  dispose(): void;
}

/** Where each part class goes when the anatomy opens. */
const EXPLODE = {
  key: new THREE.Vector3(0, 0.7, 0.1),
  lamp: new THREE.Vector3(0, 1.5, 0),
  cover: new THREE.Vector3(0, 2.3, -0.3),
  lid: new THREE.Vector3(0, 0.8, -1.2),
  plug: new THREE.Vector3(0, 0.2, 1.3),
} as const;

type PartClass = keyof typeof EXPLODE | 'static';

const classify = (name: string, c: THREE.Vector3): PartClass => {
  if (name.startsWith('key-')) return 'key';
  if (name.startsWith('lamp-')) return 'lamp';
  if (c.z < -1.9) return 'lid';
  if (c.z > 2.3) return 'plug';
  if (c.z < -1.0 && c.y > 2.4) return 'cover';
  return 'static';
};

/**
 * Meshopt-compressed geometry carries quantised (normalised integer)
 * attributes; applying a matrix to those in place corrupts them. Dequantise
 * everything to float32 first — GPU prefers it anyway.
 */
const dequantize = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      arr[i * a.itemSize] = a.getX(i);
      if (a.itemSize > 1) arr[i * a.itemSize + 1] = a.getY(i);
      if (a.itemSize > 2) arr[i * a.itemSize + 2] = a.getZ(i);
      if (a.itemSize > 3) arr[i * a.itemSize + 3] = a.getW(i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (geo.index) out.setIndex(geo.index.clone());
  return out;
};

/** position/normal/uv only, so merge batches share one attribute set. */
const stripForMerge = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv'] as const) {
    if (geo.attributes[name]) out.setAttribute(name, geo.attributes[name]);
  }
  if (geo.index) out.setIndex(geo.index);
  return out;
};

/**
 * The load half: fetch and parse. Split from parseMachine so the headless
 * verifier can feed bytes instead of a URL (Node's fetch cannot read files).
 */
export const loadMachine = async (url: string): Promise<{ scene: THREE.Group }> => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync(url);
};

export const parseMachine = (gltf: { scene: THREE.Group }, palette: Palette): Machine => {
  const root = new THREE.Group();
  root.name = 'machine';
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T): T => (disposables.push(x), x);

  gltf.scene.updateMatrixWorld(true);

  // Bake: +90° about Y (front to +z), ×SCALE, then recentre/floor by the
  // transformed bounds. Two passes: measure, then apply with the offset in.
  const rotScale = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  rotScale.multiply(new THREE.Matrix4().makeScale(SCALE, SCALE, SCALE));

  const src: { name: string; geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = dequantize(mesh.geometry);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rotScale, mesh.matrixWorld));
    src.push({ name: mesh.name, geo, mat: mesh.material as THREE.Material });
  });

  const bounds = new THREE.Box3();
  src.forEach(({ geo }) => {
    geo.computeBoundingBox();
    bounds.union(geo.boundingBox!);
  });
  const offset = new THREE.Vector3(
    -(bounds.min.x + bounds.max.x) / 2,
    -bounds.min.y,
    -(bounds.min.z + bounds.max.z) / 2,
  );
  const shift = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z);
  src.forEach(({ geo }) => {
    geo.applyMatrix4(shift);
    geo.computeBoundingBox();
  });

  // Classify, then merge the static shell per (class × material); keys and
  // lamps stay individual because they are the parts that move.
  const keys = new Map<string, THREE.Mesh>();
  const lamps = new Map<string, THREE.Mesh>();
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
  const movers: { mesh: THREE.Object3D; cls: PartClass }[] = [];

  for (const { name, geo, mat } of src) {
    const c = geo.boundingBox!.getCenter(new THREE.Vector3());
    const cls = classify(name, c);
    if (cls === 'key' || cls === 'lamp') {
      const mesh = new THREE.Mesh(keep(geo), mat);
      mesh.name = name;
      mesh.castShadow = cls === 'key';
      movers.push({ mesh, cls });
      if (cls === 'key') keys.set(name.slice(4), mesh);
      else lamps.set(name.slice(5), mesh);
      root.add(mesh);
    } else {
      const key = `${cls}|${mat.name}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, geos: [] }));
      b.geos.push(geo);
    }
  }

  for (const [key, { mat, geos }] of buckets) {
    const cls = key.split('|')[0] as PartClass;
    const merged = keep(mergeGeometries(geos.map(stripForMerge), false));
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = `merged-${key}`;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    if (cls !== 'static') movers.push({ mesh, cls });
  }

  // Lamps get their own materials: the shared mec material cannot glow per
  // letter. No emissiveMap on purpose — the lens texture is near-black, and
  // multiplying the emissive by it kept the 'lit' lamp indistinguishable from
  // an unlit one. The whole disc burns amber instead, the way a lit lens reads
  // from operator distance.
  const lampOn = new THREE.Color(palette.lampOn);
  for (const mesh of lamps.values()) {
    const base = mesh.material as THREE.MeshStandardMaterial;
    const m = keep(base.clone());
    m.emissive.copy(lampOn);
    m.emissiveMap = null;
    m.emissiveIntensity = 0;
    mesh.material = m;
  }

  const rests = movers.map(({ mesh, cls }) => ({
    mesh,
    rest: mesh.position.clone(),
    dir: (EXPLODE as Record<string, THREE.Vector3>)[cls],
  }));
  // Key travel composes with the explode rather than fighting it: the press is
  // stored per key and folded into the same position pass.
  const travels = new Map<THREE.Object3D, number>();
  let exploded = 0;
  const apply = (): void => {
    for (const { mesh, rest, dir } of rests) {
      mesh.position.set(
        rest.x + dir.x * exploded,
        rest.y + dir.y * exploded - KEY_TRAVEL * (travels.get(mesh) ?? 0),
        rest.z + dir.z * exploded,
      );
    }
  };

  let drawCalls = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) drawCalls++;
  });

  return {
    root,
    setKeyTravel(letter, t) {
      const mesh = keys.get(letter);
      if (!mesh) return;
      travels.set(mesh, t);
      apply();
    },
    setLamp(letter, t) {
      const mesh = lamps.get(letter);
      // 4.5, not 2.2: the emissive map is a dark lens with a light glyph, so
      // most of the disc multiplies the glow down — 2.2 never read on screen.
      if (mesh) (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 4.5 * t;
    },
    explode(t) {
      exploded = t;
      apply();
    },
    drawCalls,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
};

export const buildMachine = async (url: string, palette: Palette): Promise<Machine> =>
  parseMachine(await loadMachine(url), palette);
