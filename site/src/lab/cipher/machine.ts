// The machine, built from layout.ts and generated surfaces.
//
// Draw-call discipline is the point of the structure here. The old build spent
// ~135 calls, mostly on 26 key labels and 26 lamp labels each carrying their own
// canvas and material. Here every repeated part is one InstancedMesh, labels
// share one atlas, and the three rotors share one ring texture, which lands the
// whole machine in the high teens.

import * as THREE from 'three';
import {
  CASE, DECK, ROTOR, AXLE_R, AXLE_LEN, PLINTH, SHROUD, PLUGBOARD, PLATE, SOCKET,
  KEY_R, KEY_H, KEY_TRAVEL, LAMP_R, LAMP_H,
  keySlots, lampSlots, socketSlots,
} from './layout';
import { atlasCell, brushedBump, crinkleBump, letterAtlas, plateTexture, ringTexture, woodBump } from './surfaces';

export interface Palette {
  paint: number;
  brass: number;
  key: number;
  keyInk: string;
  lampOff: number;
  lampOn: number;
  cable: number;
  ringGround: string;
  ringInk: string;
  ringAccent: string;
  plateGround: string;
  plateInk: string;
}

export interface Machine {
  root: THREE.Group;
  /** Rotor pivots, left to right, rotated on the 360/26 grid. */
  rotors: THREE.Object3D[];
  keys: THREE.InstancedMesh;
  lamps: THREE.InstancedMesh;
  /** Letter -> instance index, for press and glow. */
  keyIndex: Map<string, number>;
  lampIndex: Map<string, number>;
  /** Sink one cap and its label, t in [0,1] of KEY_TRAVEL. Unknown letters no-op. */
  setKeyTravel(letter: string, t: number): void;
  /** Blend one lamp from its off colour to its on colour, t in [0,1]. */
  setLamp(letter: string, t: number): void;
  drawCalls: number;
  dispose(): void;
}

const tex = (c: HTMLCanvasElement, repeat = false): THREE.CanvasTexture => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  return t;
};

/**
 * Patches a material so each instance samples its own cell of the letter atlas.
 * This is the trick that collapses 52 labelled parts into two draw calls.
 */
function useAtlasCells(material: THREE.Material, cols: number, rows: number): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n attribute vec2 aCell;\n varying vec2 vCell;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n vCell = aCell;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n varying vec2 vCell;`)
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
           vec2 cellUv = vCell + vMapUv * vec2(${(1 / cols).toFixed(6)}, ${(1 / rows).toFixed(6)});
           vec4 sampledDiffuseColor = texture2D( map, cellUv );
           diffuseColor *= sampledDiffuseColor;
         #endif`,
      );
  };
}

export function buildMachine(p: Palette, env: THREE.Texture | null): Machine {
  const root = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T): T => (disposables.push(x), x);

  const crinkle = keep(tex(crinkleBump(), true));
  crinkle.repeat.set(6, 4);
  const brushed = keep(tex(brushedBump(), true));
  brushed.repeat.set(3, 3);
  const grain = keep(tex(woodBump(), true));
  grain.repeat.set(2, 1);

  // Wrinkle-finish enamel is a dielectric: the old metalness 0.22 let the env
  // map wash the near-black paint up to a light plastic grey — and with the
  // metalness fixed, the studio HDRI's diffuse IBL kept doing the same job.
  // Every non-metal here therefore sips the env; only the metals drink it.
  const paint = keep(new THREE.MeshStandardMaterial({
    color: p.paint, roughness: 0.68, metalness: 0.05, bumpMap: crinkle, bumpScale: 0.06,
    envMap: env, envMapIntensity: 0.08,
  }));
  const brass = keep(new THREE.MeshStandardMaterial({
    color: p.brass, roughness: 0.31, metalness: 0.95, bumpMap: brushed, bumpScale: 0.012, envMap: env,
  }));
  // Stamped steel for the shroud — harder and shinier than the enamel.
  const steel = keep(new THREE.MeshStandardMaterial({
    color: p.paint, roughness: 0.42, metalness: 0.55, bumpMap: crinkle, bumpScale: 0.02,
    envMap: env, envMapIntensity: 0.3,
  }));
  const wood = keep(new THREE.MeshStandardMaterial({
    color: 0x3a2718, roughness: 0.66, metalness: 0.0, bumpMap: grain, bumpScale: 0.025,
    envMap: env, envMapIntensity: 0.08,
  }));

  // ── Case, plinth, deck edge and front furniture ─────────────────────────
  const body = new THREE.Mesh(keep(new THREE.BoxGeometry(CASE.w, CASE.h, CASE.d)), paint);
  body.position.y = CASE.h / 2;
  body.castShadow = body.receiveShadow = true;
  root.add(body);

  const plinth = new THREE.Mesh(keep(new THREE.BoxGeometry(PLINTH.w, PLINTH.h, PLINTH.d)), wood);
  plinth.position.set(0, PLINTH.y, PLINTH.z);
  plinth.castShadow = plinth.receiveShadow = true;
  root.add(plinth);

  const plug = new THREE.Mesh(
    keep(new THREE.BoxGeometry(PLUGBOARD.w, PLUGBOARD.h, PLUGBOARD.d)),
    keep(new THREE.MeshStandardMaterial({
      color: p.paint, roughness: 0.5, metalness: 0.35, envMap: env, envMapIntensity: 0.3,
    })),
  );
  plug.position.set(0, PLUGBOARD.y, PLUGBOARD.z);
  root.add(plug);

  // The plate's text is baked into its texture, so the maker's mark is one mesh
  // — and it now sits in its own band, clear of the plugboard it used to hide in.
  const plate = new THREE.Mesh(
    keep(new THREE.BoxGeometry(PLATE.w, PLATE.h, PLATE.d)),
    keep(new THREE.MeshStandardMaterial({
      map: keep(tex(plateTexture(p.plateGround, p.plateInk))),
      roughness: 0.34, metalness: 0.9, envMap: env,
    })),
  );
  plate.position.set(0, PLATE.y, PLATE.z);
  root.add(plate);

  // ── Sockets, plug tips and cables ────────────────────────────────────────
  const slots = socketSlots();
  // Three patch cables, and therefore six plug tips. The endpoints match the
  // plugboard pairs the cipher actually uses.
  const cablePairs: [number, number][] = [[1, 8], [4, 10], [2, 7]];
  const tips = cablePairs.flatMap(([a, b]) => [a, b]);
  // One InstancedMesh carries sockets AND tips: same brass cylinder, the tips
  // just run narrower and longer through their instance matrices.
  const sockets = new THREE.InstancedMesh(
    keep(new THREE.CylinderGeometry(SOCKET.r, SOCKET.r, SOCKET.h, 12)),
    brass,
    slots.length + tips.length,
  );
  const m = new THREE.Matrix4();
  // Sockets stand out of the front face, so their axis turns from y to z.
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  // Anything on the rotor axle turns from y to x instead. The flanges were reusing
  // the socket rotation, which stood them on end: two 1.12-diameter discs per
  // rotor, square across the drum, rising 0.56 above the deck. Invisible in every
  // check we had, obvious the first time the scene graph was drawn.
  const qAxle = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  const noRot = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const tipScale = new THREE.Vector3(0.7, 2.3, 0.7);
  slots.forEach((s, i) =>
    sockets.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, s.y, PLUGBOARD.z + PLUGBOARD.d / 2), q, one)),
  );
  tips.forEach((slotIdx, i) =>
    sockets.setMatrixAt(
      slots.length + i,
      m.compose(
        new THREE.Vector3(slots[slotIdx].x, slots[slotIdx].y, PLUGBOARD.z + PLUGBOARD.d / 2 + 0.04),
        q,
        tipScale,
      ),
    ),
  );
  root.add(sockets);

  // The cables hang, they do not bulge: thin braided loops sagging below the
  // panel's bottom edge, not red worms pushed through its face.
  const cableMat = keep(new THREE.MeshStandardMaterial({
    color: p.cable, roughness: 0.55, metalness: 0.05, envMap: env, envMapIntensity: 0.2,
  }));
  const cableGeos = cablePairs.map(([a, b]) => {
    const from = new THREE.Vector3(slots[a].x, slots[a].y, PLUGBOARD.z + 0.12);
    const to = new THREE.Vector3(slots[b].x, slots[b].y, PLUGBOARD.z + 0.12);
    const sag = Math.min(from.y, to.y) - 0.34;
    const d1 = from.clone().lerp(to, 0.33).setY(sag).setZ(PLUGBOARD.z + 0.26);
    const d2 = from.clone().lerp(to, 0.67).setY(sag).setZ(PLUGBOARD.z + 0.26);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, d1, d2, to]), 24, 0.014, 6);
  });
  const cables = new THREE.Mesh(keep(mergeGeometries(cableGeos)), cableMat);
  cableGeos.forEach((g) => g.dispose());
  root.add(cables);

  // ── Rotors: one ring texture, three pivots, sunk into the deck ─────────
  const ring = keep(tex(ringTexture(p.ringGround, p.ringInk, p.ringAccent)));
  const ringMat = keep(new THREE.MeshStandardMaterial({
    map: ring, roughness: 0.42, metalness: 0.6, envMap: env, envMapIntensity: 0.7,
  }));
  const drumGeo = keep(new THREE.CylinderGeometry(ROTOR.r, ROTOR.r, ROTOR.w, 48, 1, true));
  const flangeGeo = keep(new THREE.CylinderGeometry(ROTOR.flangeR, ROTOR.flangeR, 0.05, 32));

  const rotors: THREE.Object3D[] = [];
  const flanges = new THREE.InstancedMesh(flangeGeo, brass, 6);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.position.set((i - 1) * ROTOR.gap, ROTOR.y, ROTOR.z);
    const drum = new THREE.Mesh(drumGeo, ringMat);
    drum.rotation.z = Math.PI / 2;
    drum.castShadow = true;
    pivot.add(drum);
    root.add(pivot);
    rotors.push(pivot);

    [-1, 1].forEach((side, k) => {
      flanges.setMatrixAt(
        i * 2 + k,
        m.compose(
          new THREE.Vector3((i - 1) * ROTOR.gap + (side * (ROTOR.w / 2 + 0.02)), ROTOR.y, ROTOR.z),
          qAxle,
          one,
        ),
      );
    });
  }
  root.add(flanges);

  const axleGeo = keep(new THREE.CylinderGeometry(AXLE_R, AXLE_R, AXLE_LEN, 12));
  axleGeo.rotateZ(Math.PI / 2);
  const knobGeos = [-1, 1].map((side) => {
    const g = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 20);
    g.rotateZ(Math.PI / 2);
    g.translate(side * (SHROUD.w / 2 + 0.04), 0, 0);
    return g;
  });
  const axleParts = mergeGeometries([axleGeo, ...knobGeos]);
  knobGeos.forEach((g) => g.dispose());
  const axle = new THREE.Mesh(keep(axleParts), brass);
  axle.position.set(0, ROTOR.y, ROTOR.z);
  root.add(axle);

  // ── The shroud: fascia and cheeks the rotors rise out of ────────────────
  const shroudGeos = [
    new THREE.BoxGeometry(SHROUD.w, SHROUD.h, SHROUD.t),
    ...([-1, 1] as const).map((side) => {
      const g = new THREE.BoxGeometry(SHROUD.t, SHROUD.h, SHROUD.cheekD);
      g.translate(side * (SHROUD.w / 2 - SHROUD.t / 2), 0, SHROUD.cheekZ - SHROUD.fasciaZ);
      return g;
    }),
  ];
  const shroud = new THREE.Mesh(keep(mergeGeometries(shroudGeos)), steel);
  shroudGeos.forEach((g) => g.dispose());
  shroud.position.set(0, DECK + SHROUD.h / 2, SHROUD.fasciaZ);
  shroud.castShadow = true;
  root.add(shroud);

  // ── Keyboard and lampboard: caps, lamps, and two atlas label layers ────
  const atlas = keep(tex(letterAtlas(p.keyInk)));
  const keyData = keySlots();
  const lampData = lampSlots();

  const keys = new THREE.InstancedMesh(
    keep(new THREE.CylinderGeometry(KEY_R * 0.94, KEY_R, KEY_H, 20)),
    // Bakelite: near-black with a soft gloss. The white discs were the single
    // biggest reason the old machine read as a toy.
    keep(new THREE.MeshStandardMaterial({
      color: p.key, roughness: 0.45, metalness: 0.0, envMap: env, envMapIntensity: 0.15,
    })),
    keyData.length,
  );
  keys.castShadow = true;
  const keyIndex = new Map<string, number>();
  keyData.forEach((s, i) => {
    keys.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, DECK + KEY_H / 2, s.z), new THREE.Quaternion(), one));
    keyIndex.set(s.letter, i);
  });
  root.add(keys);

  const lamps = new THREE.InstancedMesh(
    keep(new THREE.CylinderGeometry(LAMP_R, LAMP_R * 0.95, LAMP_H, 20)),
    // Dark glass windows seated near-flush; the glow does all the talking.
    keep(new THREE.MeshStandardMaterial({
      color: p.lampOff, roughness: 0.15, metalness: 0.1, emissive: p.lampOn, emissiveIntensity: 0,
      envMap: env, envMapIntensity: 0.4,
    })),
    lampData.length,
  );
  const lampIndex = new Map<string, number>();
  lampData.forEach((s, i) => {
    lamps.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, DECK + LAMP_H / 2 - 0.01, s.z), new THREE.Quaternion(), one));
    lampIndex.set(s.letter, i);
    lamps.setColorAt(i, new THREE.Color(p.lampOff));
  });
  root.add(lamps);

  // A brass bezel around each window, so the lampboard reads as fittings in a
  // panel rather than as a second keyboard.
  const bezels = new THREE.InstancedMesh(
    keep(new THREE.TorusGeometry(LAMP_R + 0.022, 0.013, 8, 24)),
    brass,
    lampData.length,
  );
  const flatBezel = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  lampData.forEach((s, i) => {
    bezels.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, DECK + 0.008, s.z), flatBezel, one));
  });
  root.add(bezels);

  // Label layers: flat discs just above each cap/lamp, all sampling one atlas.
  const labelLayer = (
    data: { letter: string; x: number; z: number }[],
    radius: number,
    y: number,
  ): THREE.InstancedMesh => {
    const mat = keep(new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false }));
    useAtlasCells(mat, 7, 4);
    const mesh = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(radius * 1.5, radius * 1.5)), mat, data.length);
    const cells = new Float32Array(data.length * 2);
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    data.forEach((s, i) => {
      mesh.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, y, s.z), flat, one));
      const [u, v] = atlasCell(s.letter);
      cells[i * 2] = u;
      cells[i * 2 + 1] = v;
    });
    mesh.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
    return mesh;
  };

  const keyLabels = labelLayer(keyData, KEY_R, DECK + KEY_H + 0.002);
  const lampLabels = labelLayer(lampData, LAMP_R, DECK + LAMP_H + 0.002);
  root.add(keyLabels, lampLabels);

  // The two maps above were built and then read by nothing: press() threw the
  // letter away, so no cap ever sank and no lamp ever lit on a page whose whole
  // instruction is PRESS ANY LETTER. These are the missing consumers, kept here
  // because the matrices belong with the geometry that authored them.
  const flatQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const at = new THREE.Vector3();
  const lampOff = new THREE.Color(p.lampOff);
  const lampOn = new THREE.Color(p.lampOn);
  const lampMix = new THREE.Color();

  const setKeyTravel = (letter: string, t: number): void => {
    const i = keyIndex.get(letter);
    if (i === undefined) return;
    const s = keyData[i];
    const drop = KEY_TRAVEL * t;
    keys.setMatrixAt(i, m.compose(at.set(s.x, DECK + KEY_H / 2 - drop, s.z), noRot, one));
    keyLabels.setMatrixAt(i, m.compose(at.set(s.x, DECK + KEY_H + 0.002 - drop, s.z), flatQ, one));
    keys.instanceMatrix.needsUpdate = true;
    keyLabels.instanceMatrix.needsUpdate = true;
  };

  const setLamp = (letter: string, t: number): void => {
    const i = lampIndex.get(letter);
    if (i === undefined) return;
    lamps.setColorAt(i, lampMix.copy(lampOff).lerp(lampOn, t));
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  };

  // Count what the renderer will actually submit, so the budget is a fact.
  let drawCalls = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) drawCalls++;
  });

  return {
    root,
    rotors,
    keys,
    lamps,
    keyIndex,
    lampIndex,
    setKeyTravel,
    setLamp,
    drawCalls,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/** Minimal geometry merge — avoids pulling in the addons build for one call. */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const names = ['position', 'normal', 'uv'] as const;
  let vertexCount = 0;
  for (const g of geos) vertexCount += g.attributes.position.count;

  for (const name of names) {
    const itemSize = geos[0].attributes[name].itemSize;
    const array = new Float32Array(vertexCount * itemSize);
    let at = 0;
    for (const g of geos) {
      array.set(g.attributes[name].array as Float32Array, at);
      at += g.attributes[name].count * itemSize;
    }
    out.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }

  const indices: number[] = [];
  let base = 0;
  for (const g of geos) {
    const idx = g.index!;
    for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + base);
    base += g.attributes.position.count;
  }
  out.setIndex(indices);
  out.computeBoundingSphere();
  return out;
}
