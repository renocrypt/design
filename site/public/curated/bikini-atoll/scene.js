import * as THREE from "three/webgpu";
import {
  Fn,
  uniform,
  vec2,
  vec3,
  float,
  color,
  positionLocal,
  positionWorld,
  normalWorld,
  cameraPosition,
  uv,
  texture,
  attribute,
  sin,
  cos,
  pow,
  mix,
  smoothstep,
  normalize,
  reflect,
  dot,
  max,
  abs,
  exp,
  fract,
  length,
} from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Everything in this world is generated here. No asset pipeline or build step.
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp,
  lerp = THREE.MathUtils.lerp;
const TAU = Math.PI * 2;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = {
  ready: false,
  degraded: false,
  exploring: false,
  underwater: false,
  wreck: 0,
  sound: false,
  drift: !reducedMotion,
  journeys: !reducedMotion,
  hidden: false,
  quality: "auto",
  light: "day",
  fps: 60,
  moving: false,
};
const keys = new Set();
const rayPlacements = [];
let slowSeconds = 0;
let visibleSeconds = 0;
let renderer,
  scene,
  camera,
  ocean,
  sun,
  hemisphere,
  sky,
  flight = null,
  previousTime = 0,
  elapsed = 0,
  lastUI = 0,
  frames = 0,
  frameTime = 0,
  adaptTime = 0;
let yaw = 0,
  pitch = 0,
  lookYaw = 0,
  lookPitch = 0,
  dragging = false,
  pointer = { x: 0, y: 0 },
  audioSystem = null,
  toastTimer;
let seed = 901;
function random() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function noise(x, z) {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function smoothNoise(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz,
    u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  return lerp(
    lerp(noise(ix, iz), noise(ix + 1, iz), u),
    lerp(noise(ix, iz + 1), noise(ix + 1, iz + 1), u),
    v,
  );
}
function fbm(x, z) {
  return (
    smoothNoise(x, z) * 0.57 +
    smoothNoise(x * 2.03, z * 2.03) * 0.28 +
    smoothNoise(x * 4.01, z * 4.01) * 0.15
  );
}
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clockNode = uniform(0),
  submergedNode = uniform(0),
  goldenNode = uniform(0);
const sunDirection = uniform(v3(0.3, 0.43, -0.85).normalize());
const WORLD_SIZE = 3500;
const islandPaths = [
  {
    points: [
      [660, 425, 39],
      [649, 322, 54],
      [650, 215, 61],
      [631, 98, 62],
      [612, -37, 64],
      [554, -176, 58],
      [480, -304, 51],
      [377, -413, 42],
      [259, -470, 31],
      [175, -481, 15],
    ],
  },
  {
    points: [
      [20, -596, 24],
      [-110, -623, 32],
      [-246, -638, 37],
      [-365, -605, 26],
      [-460, -557, 15],
    ],
  },
  {
    points: [
      [-708, -407, 20],
      [-793, -305, 36],
      [-842, -170, 39],
      [-851, -44, 27],
    ],
  },
  {
    points: [
      [-841, 130, 27],
      [-788, 276, 42],
      [-699, 397, 29],
      [-611, 451, 13],
    ],
  },
  {
    points: [
      [-372, 669, 24],
      [-227, 721, 38],
      [-107, 738, 30],
      [15, 710, 18],
    ],
  },
  {
    points: [
      [229, 681, 19],
      [336, 641, 35],
      [437, 573, 29],
      [512, 495, 13],
    ],
  },
];
function coastDistance(x, z) {
  let best = 1e6;
  for (const island of islandPaths) {
    const p = island.points;
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az, aw] = p[i],
        [bx, bz, bw] = p[i + 1],
        dx = bx - ax,
        dz = bz - az,
        t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      const dist =
        Math.hypot(x - ax - dx * t, z - az - dz * t) - lerp(aw, bw, t);
      if (dist < best) best = dist;
    }
  }
  return (
    best +
    (fbm(x * 0.025, z * 0.025) - 0.5) * 10 +
    (smoothNoise(x * 0.08, z * 0.08) - 0.5) * 2
  );
}
function terrainHeight(x, z) {
  const d = coastDistance(x, z);
  if (d < 0)
    return (
      0.42 +
      4.6 * (1 - Math.exp(d * 0.048)) +
      (fbm(x * 0.065, z * 0.065) - 0.5) * Math.min(1.4, -d * 0.08)
    );
  return Math.max(
    -59 + fbm(x * 0.012, z * 0.012) * 4,
    -d * 0.14 - Math.pow(Math.max(0, d - 36), 1.33) * 0.052,
  );
}
const startPosition = v3(230, 190, 510),
  startTarget = v3(480, 0, -60);
const wrecks = [
  {
    name: "USS Saratoga",
    type: "CV-3 · AIRCRAFT CARRIER · 1927",
    length: 270,
    depth: 52,
    pos: v3(50, -53, -150),
    rotation: -0.38,
    description:
      "A floating airfield, now a world of its own. Follow the flight deck into the quiet.",
    view: v3(197, -23, 32),
    target: v3(44, -35, -125),
  },
  {
    name: "IJN Nagato",
    type: "IMPERIAL JAPANESE NAVY · BATTLESHIP · 1920",
    length: 221,
    depth: 52,
    pos: v3(-300, -54, -45),
    rotation: 0.9,
    description:
      "An overturned giant. Four enormous propellers rise into the blue, where a battleship’s keel became its crown.",
    view: v3(-140, -24, -200),
    target: v3(-331, -41, -66),
  },
  {
    name: "USS Arkansas",
    type: "BB-33 · BATTLESHIP · 1912",
    length: 171,
    depth: 52,
    pos: v3(-145, -54, 280),
    rotation: -0.9,
    description:
      "After two world wars, a final resting place. Its overturned hull has become a refuge for life in the lagoon.",
    view: v3(30, -31, 390),
    target: v3(-130, -42, 280),
  },
];
const vegetation = new THREE.Group(),
  underwaterWorld = new THREE.Group(),
  fishSchools = [],
  birds = [];
let terrain,
  foam,
  particles,
  rays,
  shipMeshes = [];

function setProgress(value, label) {
  $("loading-progress").style.width = `${value}%`;
  $("loading-label").textContent = label;
}
function notify(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 3500);
}
function createTexture(size, paint) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  paint(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function grainTexture(base, scale = 36) {
  return createTexture(256, (ctx, s) => {
    const data = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        let n =
          (random() - 0.5) * scale +
          (fbm(x * 0.04, y * 0.04) - 0.5) * scale * 0.8;
        const i = (y * s + x) * 4;
        data.data[i] = base[0] + n;
        data.data[i + 1] = base[1] + n;
        data.data[i + 2] = base[2] + n;
        data.data[i + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
  });
}
function corrosionTexture() {
  return createTexture(512, (ctx, n) => {
    const data = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const f = fbm(x * 0.025, y * 0.025),
          streak = smoothNoise(x * 0.22, y * 0.009),
          detail = (random() - 0.5) * 38,
          corrosion = clamp((f - 0.34) * 2.8, 0, 1),
          algae = clamp((streak - 0.5) * 2, 0, 0.5),
          k = (y * n + x) * 4;
        data.data[k] = lerp(155, 111, corrosion) * (1 - algae * 0.4) + detail;
        data.data[k + 1] =
          lerp(164, 83, corrosion) * (1 - algae * 0.16) + detail;
        data.data[k + 2] =
          lerp(150, 49, corrosion) * (1 - algae * 0.2) + detail;
        data.data[k + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
  });
}
function makeNoiseTexture() {
  const n = 256,
    data = new Uint8Array(n * n * 4);
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      let dx = 0,
        dz = 0;
      for (let i = 1; i < 9; i++) {
        let a = i * 2.399,
          fx = Math.round(Math.cos(a) * (2 + i * 1.5)),
          fz = Math.round(Math.sin(a) * (2 + i * 1.5)),
          q = ((x * fx + z * fz) / n) * TAU + i;
        dx += (Math.cos(q) * fx) / (i * 9);
        dz += (Math.cos(q) * fz) / (i * 9);
      }
      const k = (z * n + x) * 4;
      data[k] = clamp(128 + dx * 70, 0, 255);
      data[k + 1] = clamp(128 + dz * 70, 0, 255);
      data[k + 2] = 255;
      data[k + 3] = 255;
    }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function buildTerrain() {
  const segments = 540,
    g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position,
    colors = new Float32Array(p.count * 3),
    sand = new THREE.Color("#eadcc0"),
    green = new THREE.Color("#536747"),
    wet = new THREE.Color("#bdc8aa"),
    floor = new THREE.Color("#8cafa0"),
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      h = terrainHeight(x, z);
    p.setY(i, h);
    if (h > 1.1) c.copy(sand).lerp(green, clamp((h - 1.1) / 2.6, 0, 1) * 0.78);
    else if (h > -0.8) c.copy(sand).lerp(wet, clamp(-h, 0, 1) * 0.35);
    else c.copy(wet).lerp(floor, clamp((-h - 4) / 43, 0, 1));
    c.multiplyScalar(0.86 + fbm(x * 0.13, z * 0.13) * 0.25);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const sandTex = grainTexture([223, 217, 189], 30);
  sandTex.anisotropy = 4;
  const m = new THREE.MeshStandardNodeMaterial({
    roughness: 0.93,
    vertexColors: true,
  });
  m.colorNode = attribute("color", "vec3").mul(
    texture(sandTex, positionWorld.xz.mul(0.18)).rgb.mul(1.5),
  );
  m.emissiveNode = causticNode(positionWorld)
    .mul(vec3(0.1, 0.26, 0.2))
    .mul(smoothstep(0, 4, positionWorld.y.negate()))
    .mul(exp(positionWorld.y.mul(0.055)))
    .mul(0.4);
  terrain = new THREE.Mesh(g, m);
  terrain.receiveShadow = true;
  scene.add(terrain);
  const n = 512,
    data = new Uint8Array(n * n * 4);
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const wx = (x / (n - 1) - 0.5) * WORLD_SIZE,
        wz = (z / (n - 1) - 0.5) * WORLD_SIZE,
        h = terrainHeight(wx, wz),
        k = (z * n + x) * 4;
      data[k] = clamp((-h / 65) * 255, 0, 255);
      data[k + 1] = fbm(wx * 0.052, wz * 0.052) * 255;
      data[k + 2] = clamp(coastDistance(wx, wz) / 200, 0, 1) * 255;
      data[k + 3] = 255;
    }
  const bathymetry = new THREE.DataTexture(data, n, n);
  bathymetry.magFilter = bathymetry.minFilter = THREE.LinearFilter;
  bathymetry.needsUpdate = true;
  return bathymetry;
}
const causticNode = Fn(([p]) => {
  const q = p.xz.mul(0.58),
    t = clockNode.mul(0.29);
  const a = sin(q.x.add(sin(q.y.mul(1.37).add(t)).mul(1.6)).add(t));
  const b = cos(
    q.y
      .mul(1.12)
      .add(sin(q.x.mul(0.84).sub(t)).mul(1.4))
      .sub(t),
  );
  return pow(float(1).sub(abs(a.add(b).mul(0.5))), 13);
});
const skyColor = Fn(([direction]) => {
  const h = max(direction.y, 0),
    sunAmount = pow(max(dot(direction, sunDirection), 0), 18);
  const zenith = mix(
    vec3(0.045, 0.23, 0.4),
    vec3(0.19, 0.32, 0.37),
    goldenNode,
  );
  const horizon = mix(
    vec3(0.43, 0.68, 0.72),
    vec3(0.93, 0.62, 0.34),
    goldenNode,
  );
  const c = mix(horizon, zenith, pow(h, 0.45)).toVar();
  c.addAssign(vec3(0.2, 0.17, 0.1).mul(sunAmount));
  const cuv = direction.xz.div(max(direction.y, 0.055)).mul(0.065);
  const clouds = texture(
    cloudTexture,
    cuv.add(vec2(clockNode.mul(0.0006), 0)),
  ).r;
  const mask = smoothstep(0.52, 0.78, clouds)
    .mul(smoothstep(0.02, 0.16, h))
    .mul(float(1).sub(smoothstep(0.55, 0.9, h)));
  c.assign(mix(c, vec3(0.92, 0.91, 0.82), mask.mul(0.8)));
  c.addAssign(
    vec3(2, 1.7, 1.2).mul(pow(max(dot(direction, sunDirection), 0), 1800)),
  );
  return c;
});
const cloudTexture = createTexture(256, (ctx, n) => {
  const data = ctx.createImageData(n, n);
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const f = fbm(x * 0.026, z * 0.046),
        k = (z * n + x) * 4;
      data.data[k] = data.data[k + 1] = data.data[k + 2] = f * 255;
      data.data[k + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
});
cloudTexture.colorSpace = THREE.NoColorSpace;
function buildOcean(bathymetry) {
  const skyM = new THREE.MeshBasicNodeMaterial({
    side: THREE.BackSide,
    depthWrite: false,
  });
  skyM.colorNode = mix(
    skyColor(normalize(positionWorld.sub(cameraPosition))),
    color("#075561"),
    submergedNode,
  );
  skyM.fog = false;
  sky = new THREE.Mesh(new THREE.SphereGeometry(28000, 32, 16), skyM);
  sky.frustumCulled = false;
  sky.renderOrder = -5;
  scene.add(sky);
  const normalTex = makeNoiseTexture();
  const waveHeight = Fn(([p]) =>
    sin(p.x.mul(0.052).add(p.z.mul(0.027)).add(clockNode.mul(0.8)))
      .mul(0.16)
      .add(
        sin(p.x.mul(-0.04).add(p.z.mul(0.066)).sub(clockNode.mul(0.64))).mul(
          0.12,
        ),
      )
      .add(sin(p.x.mul(0.1).add(p.z.mul(0.083)).add(clockNode)).mul(0.045)),
  );
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  m.positionNode = positionLocal.add(vec3(0, waveHeight(positionLocal), 0));
  m.colorNode = Fn(() => {
    const p = positionWorld.xz,
      eye = normalize(cameraPosition.sub(positionWorld)),
      distance = length(cameraPosition.sub(positionWorld));
    const a = texture(
      normalTex,
      p.mul(0.015).add(vec2(clockNode.mul(0.009), clockNode.mul(0.004))),
    ).xy.sub(0.5);
    const rotated = vec2(
      p.y.mul(0.86).add(p.x.mul(0.51)),
      p.y.mul(0.51).sub(p.x.mul(0.86)),
    );
    const b = texture(
      normalTex,
      rotated.mul(0.048).add(vec2(clockNode.mul(-0.006), clockNode.mul(0.011))),
    ).xy.sub(0.5);
    const c = texture(
      normalTex,
      p.mul(0.155).add(vec2(clockNode.mul(0.014), clockNode.mul(-0.013))),
    ).xy.sub(0.5);
    const d = texture(
      normalTex,
      p.mul(0.44).sub(vec2(clockNode.mul(0.019), clockNode.mul(0.01))),
    ).xy.sub(0.5);
    const ripple = a
      .mul(0.31)
      .add(b.mul(0.23))
      .add(c.mul(0.14))
      .add(d.mul(0.1).mul(float(1).sub(smoothstep(140, 650, distance))));
    const normal = normalize(vec3(ripple.x, 1, ripple.y));
    const reflected = reflect(eye.negate(), normal),
      fresnel = pow(float(1).sub(max(dot(eye, normal), 0)), 4)
        .mul(0.84)
        .add(0.035);
    const bath = texture(bathymetry, p.div(WORLD_SIZE).add(0.5)),
      depth = bath.r.mul(65);
    const shallows = mix(
      vec3(0.21, 0.59, 0.47),
      vec3(0.017, 0.37, 0.34),
      smoothstep(0.1, 12, depth),
    );
    const deep = mix(
      vec3(0.015, 0.23, 0.28),
      vec3(0.01, 0.155, 0.22),
      smoothstep(20, 64, depth),
    );
    const sea = mix(shallows, deep, smoothstep(7, 42, depth)).toVar();
    const reef = smoothstep(0.41, 0.7, bath.g)
      .mul(smoothstep(1, 6, depth))
      .mul(float(1).sub(smoothstep(12, 36, depth)));
    sea.mulAssign(float(1).sub(reef.mul(0.28)));
    sea.addAssign(
      causticNode(positionWorld)
        .mul(vec3(0.07, 0.16, 0.1))
        .mul(float(1).sub(smoothstep(1, 10, depth))),
    );
    sea.assign(mix(sea, skyColor(reflected), fresnel));
    const glint = pow(
      max(dot(reflect(sunDirection.negate(), normal), eye), 0),
      300,
    ).mul(2.8);
    sea.addAssign(
      mix(vec3(1, 0.93, 0.75), vec3(1, 0.65, 0.29), goldenNode).mul(glint),
    );
    const shore = float(1).sub(smoothstep(0.1, 1.8, depth));
    const froth = smoothstep(
      0.18,
      0.52,
      sin(depth.mul(6).sub(clockNode.mul(1.1)).add(a.x.mul(3))),
    )
      .mul(shore)
      .mul(0.43);
    sea.assign(mix(sea, vec3(0.8, 0.91, 0.8), froth));
    const underside = vec3(0.017, 0.23, 0.28)
      .add(vec3(0.1, 0.24, 0.23).mul(pow(max(dot(normal, eye.negate()), 0), 4)))
      .add(glint.mul(0.04));
    return mix(sea, underside, submergedNode);
  })();
  const geometry = new THREE.PlaneGeometry(1, 1, 280, 280);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * 2,
      z = p.getZ(i) * 2;
    p.setXYZ(
      i,
      Math.sign(x) * Math.pow(Math.abs(x), 2.5) * 22000,
      0,
      Math.sign(z) * Math.pow(Math.abs(z), 2.5) * 22000,
    );
  }
  geometry.computeVertexNormals();
  ocean = new THREE.Mesh(geometry, m);
  ocean.frustumCulled = false;
  scene.add(ocean);
}

function palmGeometry() {
  const trunk = new THREE.CylinderGeometry(0.15, 0.36, 10, 7, 14),
    p = trunk.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 5;
    p.setXYZ(
      i,
      p.getX(i) + y * y * 0.012,
      y,
      p.getZ(i) + Math.sin(y * 0.18) * 0.26,
    );
  }
  trunk.computeVertexNormals();
  const verts = [],
    colors = [],
    indices = [];
  function leaf(a, b, c, d, col) {
    const index = verts.length / 3;
    [a, b, c, d].forEach((p) => {
      verts.push(...p);
      colors.push(col.r, col.g, col.b);
    });
    indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  }
  for (let f = 0; f < 11; f++) {
    const angle = (f / 11) * TAU + (random() - 0.5) * 0.3,
      L = 4.8 + random() * 1.8,
      rise = 0.6 + random() * 1.9,
      droop = 2.5 + random() * 1.5,
      dx = Math.cos(angle),
      dz = Math.sin(angle),
      nx = -dz,
      nz = dx;
    const point = (t) => [
      1.2 + dx * L * t,
      10 + Math.sin(t * Math.PI * 0.9) * rise - t * t * droop,
      dz * L * t + 0.25,
    ];
    const col = new THREE.Color().setHSL(
      0.225 + random() * 0.065,
      0.44 + random() * 0.18,
      0.15 + random() * 0.08,
    );
    for (let i = 0; i < 19; i++) {
      const t = i / 19,
        t2 = (i + 1) / 19,
        a = point(t),
        b = point(t2),
        wid = 0.035 * (1 - t) + 0.01;
      leaf(
        [a[0] + nx * wid, a[1], a[2] + nz * wid],
        [a[0] - nx * wid, a[1], a[2] - nz * wid],
        [b[0] - nx * wid, b[1], b[2] - nz * wid],
        [b[0] + nx * wid, b[1], b[2] + nz * wid],
        col,
      );
      if (i < 2) continue;
      for (const side of [-1, 1]) {
        const width = Math.sin(Math.PI * t) * 1.15 * (0.8 + random() * 0.25),
          tip = point(Math.min(t + 0.19, 1));
        tip[0] += nx * width * side;
        tip[1] -= 0.18 + width * 0.13;
        tip[2] += nz * width * side;
        const end = point(t + 0.055);
        leaf(
          a,
          [tip[0] - dx * 0.14, tip[1] + 0.035, tip[2] - dz * 0.14],
          tip,
          end,
          col.clone().multiplyScalar(0.82 + random() * 0.34),
        );
      }
    }
  }
  const fronds = new THREE.BufferGeometry();
  fronds.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  fronds.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  fronds.setIndex(indices);
  fronds.computeVertexNormals();
  return { trunk, fronds };
}
function buildVegetation() {
  const { trunk, fronds } = palmGeometry();
  const bark = grainTexture([129, 125, 99], 49);
  bark.repeat.set(2, 12);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: bark,
    roughness: 1,
    color: "#ada184",
  });
  const leafMat = new THREE.MeshStandardNodeMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.82,
  });
  leafMat.colorNode = attribute("color", "vec3").mul(0.92);
  leafMat.positionNode = positionLocal.add(
    vec3(
      sin(clockNode.mul(0.8).add(positionLocal.x))
        .mul(smoothstep(7, 12, positionLocal.y))
        .mul(0.09),
      0,
      cos(clockNode.mul(0.65).add(positionLocal.z))
        .mul(smoothstep(7, 12, positionLocal.y))
        .mul(0.08),
    ),
  );
  const locations = [];
  for (let k = 0; k < islandPaths.length; k++) {
    const path = islandPaths[k].points,
      count = k === 0 ? 480 : 105;
    for (let i = 0; i < count; i++) {
      const j = Math.floor(random() * (path.length - 1)),
        t = random(),
        a = path[j],
        b = path[j + 1],
        x = lerp(a[0], b[0], t) + (random() - 0.5) * lerp(a[2], b[2], t) * 1.75,
        z = lerp(a[1], b[1], t) + (random() - 0.5) * lerp(a[2], b[2], t) * 1.75,
        h = terrainHeight(x, z);
      if (h > 1.6)
        locations.push([x, h - 0.1, z, 0.68 + random() * 0.67, random() * TAU]);
    }
  }
  const trunks = new THREE.InstancedMesh(trunk, trunkMat, locations.length),
    leaves = new THREE.InstancedMesh(fronds, leafMat, locations.length),
    dummy = new THREE.Object3D();
  locations.forEach(([x, y, z, s, r], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set((random() - 0.5) * 0.08, r, (random() - 0.5) * 0.08);
    dummy.scale.set(s, s * (0.85 + random() * 0.3), s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    leaves.setMatrixAt(i, dummy.matrix);
  });
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = true;
  leaves.receiveShadow = true;
  vegetation.add(trunks, leaves);
  const bushGeo = new THREE.IcosahedronGeometry(1, 1),
    bp = bushGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const v =
      0.83 + noise(bp.getX(i) * 7, bp.getY(i) * 9 + bp.getZ(i) * 3) * 0.32;
    bp.setXYZ(i, bp.getX(i) * v, bp.getY(i) * v, bp.getZ(i) * v);
  }
  bushGeo.computeVertexNormals();
  const bushMat = new THREE.MeshStandardMaterial({
      roughness: 1,
      color: "#82966a",
    }),
    bushes = new THREE.InstancedMesh(bushGeo, bushMat, locations.length * 4),
    bushColor = new THREE.Color();
  let bi = 0;
  for (const [x, y, z] of locations)
    for (let i = 0; i < 4; i++) {
      const bx = x + (random() - 0.5) * 18,
        bz = z + (random() - 0.5) * 18,
        h = terrainHeight(bx, bz);
      dummy.position.set(bx, h + 0.5, bz);
      const s = h > 1.8 ? 1.5 + random() * 3 : 0;
      dummy.scale.set(s, s * (0.65 + random() * 0.5), s);
      dummy.rotation.set(random(), random() * TAU, random());
      dummy.updateMatrix();
      bushes.setMatrixAt(bi, dummy.matrix);
      bushColor.setHSL(
        0.23 + random() * 0.05,
        0.26 + random() * 0.27,
        0.17 + random() * 0.13,
      );
      bushes.setColorAt(bi++, bushColor);
    }
  bushes.castShadow = bushes.receiveShadow = true;
  vegetation.add(bushes);
  scene.add(vegetation);
}

function buildShip(index) {
  const spec = wrecks[index],
    carrier = index === 0,
    L = spec.length,
    W = carrier ? 34 : index === 1 ? 33 : 28,
    H = carrier ? 19 : 14;
  const bins = [[], [], [], [], []],
    ship = new THREE.Group();
  function add(g, x = 0, y = 0, z = 0, material = 0, rx = 0, ry = 0, rz = 0) {
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    if (g.index) g = g.toNonIndexed();
    if (g.attributes.uv) g.deleteAttribute("uv");
    bins[material].push(g);
  }
  const box = (w, h, d, x, y, z, m = 0, rx = 0, ry = 0, rz = 0) =>
    add(new THREE.BoxGeometry(w, h, d), x, y, z, m, rx, ry, rz);
  const cylinder = (rt, rb, h, x, y, z, m = 0, rx = 0, ry = 0, rz = 0) =>
    add(new THREE.CylinderGeometry(rt, rb, h, 10), x, y, z, m, rx, ry, rz);
  const hullPoints = [
    [-0.5, 0.03],
    [-0.46, 0.54],
    [-0.38, 0.87],
    [-0.22, 1],
    [0.2, 1],
    [0.38, 0.91],
    [0.48, 0.63],
    [0.5, 0.16],
  ];
  const verts = [],
    idx = [];
  for (const [zl, ww] of hullPoints) {
    const ring = [
      [-W * 0.48 * ww, H],
      [-W * 0.5 * ww, H * 0.67],
      [-W * 0.39 * ww, H * 0.24],
      [-W * 0.16 * ww, 0],
      [W * 0.16 * ww, 0],
      [W * 0.39 * ww, H * 0.24],
      [W * 0.5 * ww, H * 0.67],
      [W * 0.48 * ww, H],
    ];
    for (const [x, y] of ring) verts.push(x, y, zl * L);
  }
  for (let j = 0; j < hullPoints.length - 1; j++)
    for (let i = 0; i < 7; i++) {
      const a = j * 8 + i,
        b = a + 8;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  hull.setIndex(idx);
  hull.computeVertexNormals();
  add(hull);
  const shape = new THREE.Shape();
  shape.moveTo(-W * 0.5, -L * 0.4);
  shape.lineTo(-W * 0.48, L * 0.43);
  shape.lineTo(-W * 0.2, L * 0.5);
  shape.lineTo(W * 0.2, L * 0.5);
  shape.lineTo(W * 0.48, L * 0.43);
  shape.lineTo(W * 0.5, -L * 0.4);
  shape.lineTo(W * 0.26, -L * 0.49);
  shape.lineTo(-W * 0.26, -L * 0.49);
  shape.closePath();
  const deck = new THREE.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: false,
    curveSegments: 1,
  });
  add(deck, 0, H, 0, 1, Math.PI / 2);
  if (carrier) {
    // Flight deck, collapsed hangar openings, starboard island, and corroded fittings.
    for (let z = -112; z < 116; z += 4.5) {
      box(W - 1, 0.055, 0.09, 0, H + 0.06, z, 2);
    }
    for (let z = -100; z < 114; z += 14) {
      box(0.4, 0.07, 6, -2, H + 0.08, z, 3);
    }
    for (const z of [-65, 44]) {
      box(12, 0.07, 15, 0, H + 0.1, z, 2);
      box(0.22, 0.1, 15, -6, H + 0.16, z, 0);
      box(0.22, 0.1, 15, 6, H + 0.16, z, 0);
      box(12, 0.1, 0.22, 0, H + 0.16, z - 7.5, 0);
    }
    for (const side of [-1, 1])
      for (let z = -96; z < 108; z += 10) {
        box(0.12, 5.5, 7, side * (W * 0.49), H - 4, z, 2);
        box(0.7, 7, 0.5, side * (W * 0.49), H - 4, z + 4.5, 0);
        box(2, 0.5, 9, side * (W * 0.5), H - 7, z, 0);
      }
    box(9, 8, 50, 12, H + 4, -16, 0);
    box(10, 2.1, 20, 12, H + 9, -34, 0);
    box(9, 2, 14, 12, H + 11, -36, 0);
    box(10, 0.6, 22, 12, H + 10, -34, 1);
    for (let i = 0; i < 6; i++)
      box(1.1, 1, 0.1, 8 + i * 1.5, H + 10.2, -43.1, 2);
    for (let i = 0; i < 8; i++)
      box(0.12, 1.2, 1.4, 17.1, H + 8, -40 + i * 4, 2);
    box(8, 12, 17, 12, H + 12, 1, 0);
    box(7.1, 0.2, 15.5, 12, H + 18.1, 1, 2);
    cylinder(0.18, 0.3, 11, 11, H + 17, -27, 0);
    box(10, 0.2, 0.2, 11, H + 19, -27, 0);
    box(0.2, 3, 6, 11, H + 21, -27, 0);
    for (const side of [-1, 1])
      for (const z of [-102, -82, 82, 104]) {
        cylinder(2.5, 2.8, 1.4, side * 18, H - 1, z, 0);
        cylinder(0.95, 1.3, 1.6, side * 18, H + 0.5, z, 0);
        cylinder(0.12, 0.19, 5, side * 19, H + 1.4, z, 0, 0, 0, side * -1.35);
      }
    for (let z = -115; z < 121; z += 4.5)
      for (const side of [-1, 1]) {
        cylinder(0.045, 0.05, 1, side * 16.7, H + 0.6, z, 0);
      }
    for (const side of [-1, 1]) box(0.08, 0.08, 234, side * 16.7, H + 1, 0, 0);
    // A few simplified aircraft remains along the deck.
    for (const [x, z, r] of [
      [-7, -88, -0.15],
      [7, -63, 0.2],
      [-8, 39, 0.4],
      [6, 70, -0.23],
    ]) {
      const plane = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.25, 8, 8),
        new THREE.MeshBasicMaterial(),
      );
      body.rotation.x = Math.PI / 2;
      plane.add(body);
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(11, 0.15, 1.65),
        body.material,
      );
      wing.position.z = -0.6;
      plane.add(wing);
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.15, 1),
        body.material,
      );
      tail.position.z = 3;
      plane.add(tail);
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.1, 1.5),
        body.material,
      );
      fin.position.set(0, 0.4, 2.5);
      plane.add(fin);
      plane.rotation.y = r;
      plane.position.set(x, H + 1, z);
      plane.updateMatrixWorld(true);
      for (const part of plane.children) {
        const g = part.geometry.clone().applyMatrix4(part.matrixWorld);
        add(g, 0, 0, 0, 0);
        part.geometry.dispose();
      }
      body.material.dispose();
    }
    // Corrosion has opened the stern deck; exposed beams suggest the hangar below.
    for (let z = 65; z < 106; z += 6)
      box(W * 0.82, 0.6, 0.65, 0, H - 2.3, z, 0, 0, 0, 0.025);
  } else {
    // These battleships are shown capsized: the four screws are above the seabed.
    box(W * 0.69, 5, L * 0.4, 0, H + 2, 0, 0);
    for (const z of [-L * 0.31, -L * 0.19, L * 0.2, L * 0.32]) {
      cylinder(4.3, 4.8, 2.2, 0, H + 2, z, 0);
      for (const x of [-1.1, 1.1])
        cylinder(
          0.32,
          0.43,
          11,
          x,
          H + 2,
          z + (z < 0 ? -6 : 6),
          0,
          Math.PI / 2,
        );
    }
    for (const x of [-W * 0.31, -W * 0.15, W * 0.15, W * 0.31]) {
      cylinder(0.5, 0.7, 14, x, 3, L * 0.4, 0, Math.PI / 2);
      const z = L * 0.46;
      cylinder(0.8, 0.95, 2.4, x, 2.5, z, 4, Math.PI / 2);
      for (let blade = 0; blade < 4; blade++) {
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0.35, 0.2);
        bladeShape.bezierCurveTo(1.4, 1.35, 3.35, 1.55, 3.5, 0.45);
        bladeShape.bezierCurveTo(3.65, -0.55, 2.25, -1.2, 0.45, -0.25);
        bladeShape.closePath();
        const prop = new THREE.ExtrudeGeometry(bladeShape, {
          depth: 0.18,
          bevelEnabled: true,
          bevelSize: 0.06,
          bevelThickness: 0.06,
          bevelSegments: 1,
          curveSegments: 5,
        });
        add(prop, x, 2.5, z, 4, 0, 0, (blade / 4) * TAU + 0.25);
      }
    }
    box(1.5, 3.2, L * 0.65, 0, 0.3, 0, 0);
    for (const x of [-W * 0.37, W * 0.37]) box(0.65, 1, L * 0.6, x, 5, 0, 0);
  }
  const rust = corrosionTexture(),
    dark = grainTexture([38, 53, 44], 31);
  const palette = ["#797f66", "#8f8b66", "#1c3937", "#b9b49a", "#a39562"];
  bins.forEach((geos, i) => {
    if (!geos.length) return;
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    const mat = new THREE.MeshStandardNodeMaterial({
      roughness: 0.94,
      metalness: i === 4 ? 0.24 : 0.06,
      side: THREE.DoubleSide,
    });
    const weights = abs(normalWorld).div(
      abs(normalWorld).x.add(abs(normalWorld).y).add(abs(normalWorld).z),
    );
    const surface = texture(i === 2 ? dark : rust, positionWorld.xy.mul(0.065))
      .rgb.mul(weights.z)
      .add(
        texture(i === 2 ? dark : rust, positionWorld.zy.mul(0.065)).rgb.mul(
          weights.x,
        ),
      )
      .add(
        texture(i === 2 ? dark : rust, positionWorld.xz.mul(0.065)).rgb.mul(
          weights.y,
        ),
      );
    mat.colorNode = color(palette[i]).mul(surface.mul(3));
    mat.emissiveNode = causticNode(positionWorld)
      .mul(vec3(0.008, 0.022, 0.017))
      .mul(max(normalWorld.y, 0))
      .add(color(palette[i]).mul(0.04));
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    ship.add(mesh);
  });
  if (!carrier) {
    const flipped = new THREE.Group();
    while (ship.children.length) flipped.add(ship.children[0]);
    flipped.rotation.z = Math.PI + (index === 2 ? 0.14 : 0);
    flipped.position.y = H + 5;
    ship.add(flipped);
  }
  ship.position.copy(spec.pos);
  ship.rotation.y = spec.rotation;
  ship.name = spec.name;
  underwaterWorld.add(ship);
  shipMeshes.push(ship);
}

function buildMarineLife() {
  const dummy = new THREE.Object3D(),
    rockGeo = new THREE.IcosahedronGeometry(1, 2),
    rockMat = new THREE.MeshStandardNodeMaterial({ roughness: 1 });
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const s =
      0.83 + noise(rp.getX(i) * 3, rp.getZ(i) * 3 + rp.getY(i) * 2) * 0.32;
    rp.setXYZ(i, rp.getX(i) * s, rp.getY(i) * s, rp.getZ(i) * s);
  }
  rockGeo.computeVertexNormals();
  rockMat.colorNode = color("#597568").mul(
    texture(
      grainTexture([144, 149, 121], 87),
      positionWorld.xz.mul(0.3),
    ).rgb.mul(1.7),
  );
  rockMat.emissiveNode = causticNode(positionWorld).mul(
    vec3(0.004, 0.014, 0.011),
  );
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 1050),
    rockColor = new THREE.Color();
  for (let i = 0; i < 1050; i++) {
    const wreck = wrecks[i % 3],
      angle = random() * TAU,
      r = 45 + random() * 180,
      x = wreck.pos.x + Math.cos(angle) * r,
      z = wreck.pos.z + Math.sin(angle) * r,
      s = 0.5 + random() * 3.2;
    dummy.position.set(x, terrainHeight(x, z) + s * 0.25, z);
    dummy.scale.set(s, s * (0.35 + random() * 0.5), s);
    dummy.rotation.set(random() * 3, random() * 3, random() * 3);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rockColor.setHSL(
      0.27 + random() * 0.13,
      0.16 + random() * 0.25,
      0.28 + random() * 0.22,
    );
    rocks.setColorAt(i, rockColor);
  }
  rocks.receiveShadow = true;
  underwaterWorld.add(rocks);
  const coralParts = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU,
      g = new THREE.CylinderGeometry(0.04, 0.18, 1.8 + random(), 5);
    g.rotateZ(0.6 + random() * 0.4);
    g.rotateY(angle);
    g.translate(Math.cos(angle) * 0.3, 0.8, Math.sin(angle) * 0.3);
    coralParts.push(g.toNonIndexed());
  }
  const coralGeo = mergeGeometries(coralParts),
    corals = new THREE.InstancedMesh(
      coralGeo,
      new THREE.MeshStandardMaterial({ color: "#899a74", roughness: 1 }),
      200,
    );
  for (let i = 0; i < 200; i++) {
    const w = wrecks[i % 3],
      a = random() * TAU,
      r = 35 + random() * 100,
      x = w.pos.x + Math.cos(a) * r,
      z = w.pos.z + Math.sin(a) * r;
    dummy.position.set(x, terrainHeight(x, z), z);
    dummy.scale.setScalar(0.35 + random() * 1.3);
    dummy.rotation.set(0, random() * TAU, 0);
    dummy.updateMatrix();
    corals.setMatrixAt(i, dummy.matrix);
    corals.setColorAt(
      i,
      new THREE.Color().setHSL(0.08 + random() * 0.32, 0.22, 0.38),
    );
  }
  underwaterWorld.add(corals);
  const fishParts = [];
  function fishPart(geometry, shade = 1) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute("uv");
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      const belly = clamp(
        0.85 - g.attributes.position.getY(i / 3) * 0.5,
        0.6,
        1,
      );
      colors.set([shade * belly, shade * belly, shade * belly], i);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    fishParts.push(g);
  }
  const body = new THREE.SphereGeometry(1, 12, 8);
  body.scale(0.19, 0.34, 0.82);
  fishPart(body);
  const fins = new THREE.BufferGeometry();
  fins.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0.63, 0, 0.46, 1.3, 0, 0, 1.05, 0, 0, 0.63, 0, 0, 1.05, 0, -0.46,
        1.3, 0, 0.28, -0.24, 0, 0.58, 0.08, 0, 0.3, 0.4, -0.12, -0.04, -0.25,
        -0.49, -0.16, 0.21, -0.15, -0.14, 0.12, 0.12, -0.04, -0.25, 0.49, -0.16,
        0.21, 0.15, -0.14, 0.12,
      ],
      3,
    ),
  );
  fins.computeVertexNormals();
  fishPart(fins, 0.72);
  for (const side of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.04, 6, 4);
    eye.translate(side * 0.151, 0.085, -0.52);
    fishPart(eye, 0.018);
  }
  const fishGeo = mergeGeometries(fishParts),
    fishMat = new THREE.MeshStandardMaterial({
      color: "#bad2c5",
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.48,
      metalness: 0.28,
    });
  for (let s = 0; s < 8; s++) {
    const count = (s === 7 ? 30 : 42) + Math.floor(random() * 20),
      mesh = new THREE.InstancedMesh(fishGeo, fishMat, count),
      w = wrecks[s % 3];
    const individuals = [];
    for (let i = 0; i < count; i++) {
      individuals.push({
        phase: random() * TAU,
        r: 5 + random() * 23,
        y: (random() - 0.5) * 12,
        size: s === 7 ? 0.4 + random() * 0.4 : 0.3 + random() * 0.4,
      });
      mesh.setColorAt(
        i,
        new THREE.Color().setHSL(
          0.12 + random() * 0.44,
          0.15 + random() * 0.2,
          0.52 + random() * 0.22,
        ),
      );
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // School matrices move in world space; their initial origin bounds are stale.
    mesh.frustumCulled = false;
    fishSchools.push({
      mesh,
      individuals,
      center:
        s === 7
          ? v3(125, -18, -30)
          : v3(
              w.pos.x + (random() - 0.5) * 130,
              -18 - random() * 20,
              w.pos.z + (random() - 0.5) * 160,
            ),
      phase: s * 2,
    });
    underwaterWorld.add(mesh);
  }
  const pm = new THREE.MeshBasicNodeMaterial({
    color: "#a8d9cc",
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  pm.positionNode = positionLocal.add(
    vec3(
      sin(clockNode.mul(0.3).add(positionLocal.y)).mul(0.2),
      clockNode.mul(0.018),
      0,
    ),
  );
  particles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 4, 3),
    pm,
    1600,
  );
  for (let i = 0; i < 1600; i++) {
    dummy.position.set(
      (random() - 0.5) * 620,
      -random() * 54 - 1,
      (random() - 0.5) * 680,
    );
    dummy.scale.setScalar(0.4 + random() * 1.8);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    particles.setMatrixAt(i, dummy.matrix);
  }
  underwaterWorld.add(particles);
  const rayMat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  rayMat.colorNode = vec3(0.14, 0.34, 0.32);
  rayMat.opacityNode = pow(sin(uv().y.mul(Math.PI)), 2)
    .mul(0.065)
    .mul(pow(sin(uv().x.mul(Math.PI)), 2));
  rayMat.fog = false;
  rays = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 85), rayMat, 20);
  rays.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rays.frustumCulled = false;
  for (let i = 0; i < 20; i++) {
    const width = 8 + random() * 13;
    const position = v3((random() - 0.5) * 600, -28, (random() - 0.5) * 550);
    rayPlacements.push({ width, position });
    dummy.position.copy(position);
    dummy.rotation.set(0, 0, -0.3);
    dummy.scale.set(width, 1, 1);
    dummy.updateMatrix();
    rays.setMatrixAt(i, dummy.matrix);
  }
  underwaterWorld.add(rays);
  scene.add(underwaterWorld);
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -1.5, 0.1, 0, -0.25, 0, 0.25, 0, 0, 0, 0, 0, 0, 0.25, 0, 0.25, 1.5, 0.1,
        0,
      ],
      3,
    ),
  );
  birdGeo.computeVertexNormals();
  for (let i = 0; i < 11; i++) {
    const bird = new THREE.Mesh(
      birdGeo,
      new THREE.MeshBasicMaterial({ color: "#d5d8c9", side: THREE.DoubleSide }),
    );
    bird.userData = {
      phase: random() * TAU,
      r: 90 + random() * 180,
      y: 30 + random() * 22,
    };
    birds.push(bird);
    scene.add(bird);
  }
}

function lookAt(target) {
  camera.lookAt(target);
  const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
  yaw = lookYaw = e.y;
  pitch = lookPitch = e.x;
}
function flyTo(position, target, duration = 5) {
  const q = camera.quaternion.clone(),
    oldPosition = camera.position.clone();
  camera.position.copy(position);
  camera.lookAt(target);
  const endQ = camera.quaternion.clone();
  camera.position.copy(oldPosition);
  camera.quaternion.copy(q);
  if (!state.journeys) {
    camera.position.copy(position);
    camera.quaternion.copy(endQ);
    const e = new THREE.Euler().setFromQuaternion(endQ, "YXZ");
    yaw = lookYaw = e.y;
    pitch = lookPitch = e.x;
    flight = null;
    return;
  }
  flight = {
    start: camera.position.clone(),
    end: position.clone(),
    q,
    endQ,
    startTime: elapsed,
    duration,
  };
  keys.clear();
}
function enterExploration() {
  if (!state.ready) return;
  state.exploring = true;
  document.body.classList.add("is-exploring");
  $("hero").inert = true;
  $("hero").setAttribute("aria-hidden", "true");
  $("explore-hint").hidden = false;
}
function updateModeUI(underwater) {
  document.body.classList.toggle("is-underwater", underwater);
  $("surface-button").classList.toggle("selected", !underwater);
  $("surface-button").setAttribute("aria-pressed", String(!underwater));
  $("dive-button").classList.toggle("selected", underwater);
  $("dive-button").setAttribute("aria-pressed", String(underwater));
  $("nav-atoll").classList.toggle("active", !underwater);
  $("nav-wrecks").classList.toggle("active", underwater);
  $("chapter-number").textContent = underwater ? "02" : "01";
  $("chapter-name").textContent = underwater
    ? "THE SUNKEN FLEET"
    : "THE LAGOON";
  $("chapter-caption").textContent = underwater
    ? "Some stories live below."
    : "Above the ordinary.";
  $("wreck-card").hidden = !underwater;
  $("explore-hint").textContent = underwater
    ? "Breathe slowly. Let the blue unfold."
    : "Take your time. There’s no wrong direction.";
}
function describeWreck(index) {
  state.wreck = index;
  const w = wrecks[index];
  $("wreck-index").textContent = `0${index + 1} / THE SUNKEN FLEET`;
  $("wreck-title").textContent = w.name;
  $("wreck-type").textContent = w.type;
  $("wreck-description").textContent = w.description;
  $("wreck-length").textContent = w.length;
  $("wreck-depth").textContent = w.depth;
}
function visitWreck(index) {
  if (!state.ready) return;
  closeDialogs();
  enterExploration();
  describeWreck(index);
  const w = wrecks[index];
  flyTo(w.view, w.target, 6);
}
function visitSurface(overview = false) {
  if (!state.ready) return;
  closeDialogs();
  if (overview) {
    state.exploring = false;
    document.body.classList.remove("is-exploring");
    $("hero").inert = false;
    $("hero").removeAttribute("aria-hidden");
    $("explore-hint").hidden = true;
    flyTo(startPosition, startTarget, 5);
  } else {
    enterExploration();
    flyTo(v3(360, 5.2, 190), v3(527, 4, -70), 5);
  }
}
function closeDialogs() {
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
}
function showNotes(note = "atoll") {
  closeDialogs();
  selectNote(note);
  $("journal-dialog").showModal();
  keys.clear();
}
function selectNote(note) {
  document.querySelectorAll("[data-note]").forEach((b) => {
    const active = b.dataset.note === note;
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
  });
  for (const n of ["atoll", "history", "fleet"])
    $("note-" + n).hidden = n !== note;
}
function bindUI() {
  $("home-button").onclick = () => visitSurface(true);
  $("nav-atoll").onclick = () => visitSurface(true);
  $("explore-button").onclick = () => visitSurface();
  $("surface-button").onclick = () => visitSurface();
  $("map-surface").onclick = () => visitSurface();
  for (const id of ["hero-dive-button", "dive-button", "nav-wrecks"])
    $(id).onclick = () => visitWreck(state.wreck);
  $("next-wreck").onclick = () => visitWreck((state.wreck + 1) % wrecks.length);
  $("wreck-story").onclick = () => showNotes("fleet");
  $("journal-button").onclick = () => showNotes();
  document
    .querySelectorAll("[data-wreck]")
    .forEach((b) => (b.onclick = () => visitWreck(Number(b.dataset.wreck))));
  document.querySelectorAll("[data-note]").forEach((b) => {
    b.onclick = () => selectNote(b.dataset.note);
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const tabs = [...document.querySelectorAll("[data-note]")],
          index = (tabs.indexOf(b) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
        selectNote(tabs[index].dataset.note);
        tabs[index].focus();
      }
    });
  });
  selectNote("atoll");
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          d.close();
      }
    });
  });
  $("map-button").onclick = () => {
    closeDialogs();
    $("map-dialog").showModal();
    drawMap($("large-map"), true);
    keys.clear();
  };
  $("settings-button").onclick = () => {
    closeDialogs();
    $("settings-dialog").showModal();
    keys.clear();
  };
  $("fullscreen-button").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Fullscreen is not available in this browser.");
    }
  };
  document.addEventListener("fullscreenchange", () =>
    $("fullscreen-button").setAttribute(
      "aria-label",
      document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
    ),
  );
  $("sound-button").onclick = toggleSound;
  $("light-select").onchange = (e) => {
    state.light = e.target.value;
    notify(
      state.light === "golden"
        ? "The lagoon, in a warmer light."
        : "A new Pacific morning.",
    );
  };
  $("quality-select").onchange = (e) => {
    state.quality = e.target.value;
    setQuality();
  };
  $("drift-button").onclick = () => {
    state.drift = !state.drift;
    $("drift-state").textContent = state.drift ? "On" : "Off";
  };
  $("motion-button").onclick = () => {
    state.journeys = !state.journeys;
    $("motion-state").textContent = state.journeys ? "On" : "Off";
  };
  $("drift-state").textContent = state.drift ? "On" : "Off";
  $("motion-state").textContent = state.journeys ? "On" : "Off";
  $("retry-button").onclick = () => location.reload();
  const canvas = $("world");
  canvas.addEventListener("pointerdown", (e) => {
    if (!state.ready) return;
    dragging = true;
    pointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - pointer.x,
      dy = e.clientY - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 1) {
      enterExploration();
      flight = null;
      lookYaw -= dx * 0.0025;
      lookPitch = clamp(lookPitch - dy * 0.0025, -1.4, 1.4);
    }
    pointer = { x: e.clientX, y: e.clientY };
  });
  const release = () => {
    dragging = false;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (!state.ready) return;
      enterExploration();
      flight = null;
      camera.position.y = clamp(camera.position.y - e.deltaY * 0.025, -54, 150);
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    if (
      document.querySelector("dialog[open]") ||
      e.target.matches("input,select,textarea")
    )
      return;
    if (e.code === "KeyH") {
      state.hidden = !state.hidden;
      document.body.classList.toggle("ui-hidden", state.hidden);
      notify(state.hidden ? "Press H to bring the guide back." : "");
      return;
    }
    if (e.code === "Space" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      if (!e.repeat)
        (state.underwater ? visitSurface : () => visitWreck(state.wreck))();
      return;
    }
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyQ",
        "KeyE",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ShiftLeft",
        "ShiftRight",
      ].includes(e.code)
    ) {
      e.preventDefault();
      if (state.ready) {
        enterExploration();
        flight = null;
        keys.add(e.code);
      }
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    dragging = false;
  });
  document.querySelectorAll("[data-move]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      enterExploration();
      flight = null;
      keys.add(b.dataset.move);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(event, () => keys.delete(b.dataset.move));
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    previousTime = 0;
    if (audioSystem)
      audioSystem.master.gain.setTargetAtTime(
        document.hidden ? 0 : state.sound ? 0.22 : 0,
        audioSystem.ctx.currentTime,
        0.4,
      );
  });
  window.addEventListener("resize", resize);
}

async function toggleSound() {
  try {
    if (!audioSystem) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(),
        master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      const buffer = ctx.createBuffer(2, ctx.sampleRate * 7, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + white * 0.024) / 1.025;
          data[i] = last * 3.6;
        }
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1300;
      filter.Q.value = 0.4;
      const surfGain = ctx.createGain();
      surfGain.gain.value = 0.65;
      noiseSource.connect(filter);
      filter.connect(surfGain);
      surfGain.connect(master);
      const swell = ctx.createOscillator(),
        swellGain = ctx.createGain();
      swell.frequency.value = 0.105;
      swellGain.gain.value = 0.28;
      swell.connect(swellGain);
      swellGain.connect(surfGain.gain);
      swell.start();
      noiseSource.start();
      const deep = ctx.createOscillator(),
        deepGain = ctx.createGain();
      deep.type = "sine";
      deep.frequency.value = 58;
      deepGain.gain.value = 0;
      deep.connect(deepGain);
      deepGain.connect(master);
      deep.start();
      audioSystem = { ctx, master, filter, deepGain };
    }
    await audioSystem.ctx.resume();
    state.sound = !state.sound;
    audioSystem.master.gain.setTargetAtTime(
      state.sound ? 0.22 : 0,
      audioSystem.ctx.currentTime,
      0.8,
    );
    $("sound-button").setAttribute("aria-pressed", String(state.sound));
    $("sound-button").setAttribute(
      "aria-label",
      state.sound
        ? "Sound on. Mute ocean sound"
        : "Sound off. Enable ocean sound",
    );
    $("sound-label").textContent = state.sound ? "SOUND ON" : "SOUND OFF";
  } catch {
    notify("Ocean sound is unavailable in this browser.");
  }
}

function drawMap(canvas, large = false) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height,
    scale = Math.min(w / 2200, h / 1800),
    cx = w * 0.51,
    cy = h * 0.47;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const outline = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * TAU,
      r = 1 + Math.sin(a * 5) * 0.035 + Math.sin(a * 9) * 0.02;
    outline.push([Math.cos(a) * 880 * r, Math.sin(a) * 735 * r]);
  }
  for (const [factor, alpha] of [
    [1.08, 0.1],
    [1.17, 0.06],
    [0.86, 0.08],
  ]) {
    ctx.beginPath();
    outline.forEach(([x, y], i) =>
      i
        ? ctx.lineTo(x * factor, y * factor)
        : ctx.moveTo(x * factor, y * factor),
    );
    ctx.closePath();
    ctx.strokeStyle = `rgba(213,226,193,${alpha})`;
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
  }
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = "rgba(63,132,124,.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(213,226,193,.27)";
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const island of islandPaths) {
    ctx.beginPath();
    island.points.forEach(([x, z], i) =>
      i ? ctx.lineTo(x, z) : ctx.moveTo(x, z),
    );
    ctx.strokeStyle = "rgba(185,208,162,.75)";
    ctx.lineWidth = large ? 30 : 23;
    ctx.stroke();
    ctx.strokeStyle = "rgba(199,216,176,.16)";
    ctx.lineWidth = 70;
    ctx.stroke();
  }
  for (let i = 0; i < wrecks.length; i++) {
    const p = wrecks[i].pos;
    ctx.beginPath();
    ctx.arc(p.x, p.z, large ? 13 : 16, 0, TAU);
    ctx.fillStyle =
      state.underwater && state.wreck === i
        ? "#f4f0d5"
        : "rgba(220,231,206,.52)";
    ctx.fill();
    if (large) {
      ctx.font = '25px "DM Sans", sans-serif';
      ctx.fillStyle = "rgba(237,240,217,.67)";
      ctx.fillText(
        `0${i + 1}  ${wrecks[i].name.replace("USS ", "").replace("IJN ", "")}`,
        p.x + 28,
        p.z + 9,
      );
    }
  }
  if (camera) {
    ctx.save();
    ctx.translate(
      clamp(camera.position.x, -1030, 1030),
      clamp(camera.position.z, -800, 800),
    );
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(-13, 15);
    ctx.lineTo(0, 8);
    ctx.lineTo(13, 15);
    ctx.closePath();
    ctx.fillStyle = "#f3f0d8";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, TAU);
    ctx.strokeStyle = "rgba(233,240,211,.22)";
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function setQuality() {
  if (!renderer) return;
  let ratio =
    state.quality === "high"
      ? Math.min(devicePixelRatio, 1.75)
      : state.quality === "low"
        ? 1
        : Math.min(devicePixelRatio, 1.65);
  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight);
  $("render-status").textContent =
    `${renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2 compatibility"} · ${state.quality === "auto" ? "Adaptive detail" : state.quality === "high" ? "High detail" : "Light detail"} · Procedural world`;
}
function resize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 640 ? 62 : 49;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  drawMap($("mini-map"));
  if ($("map-dialog").open) drawMap($("large-map"), true);
}
const moveVector = new THREE.Vector3(),
  forward = new THREE.Vector3(),
  right = new THREE.Vector3(),
  orientation = new THREE.Euler(0, 0, 0, "YXZ"),
  instanceDummy = new THREE.Object3D();
const previousPosition = new THREE.Vector3();
function keepOutsideHulls() {
  for (let i = 0; i < wrecks.length; i++) {
    const w = wrecks[i],
      dx = camera.position.x - w.pos.x,
      dz = camera.position.z - w.pos.z,
      cosR = Math.cos(w.rotation),
      sinR = Math.sin(w.rotation),
      x = dx * cosR - dz * sinR,
      z = dx * sinR + dz * cosR,
      relativeY = camera.position.y - w.pos.y;
    const halfLength = w.length * 0.5,
      beam = i === 0 ? 17 : i === 1 ? 16.5 : 14,
      taper = clamp((1 - Math.abs(z) / halfLength) * 3.5, 0.1, 1),
      halfWidth = beam * taper + 1.2,
      top = i === 0 ? 20.5 : 21;
    if (
      Math.abs(z) > halfLength ||
      Math.abs(x) > halfWidth ||
      relativeY < 0 ||
      relativeY > top + 1.7
    )
      continue;
    if (previousPosition.y >= w.pos.y + top + 1.6) {
      camera.position.y = w.pos.y + top + 1.7;
      continue;
    }
    const outX = (x < 0 ? -1 : 1) * halfWidth;
    camera.position.x = w.pos.x + outX * cosR + z * sinR;
    camera.position.z = w.pos.z - outX * sinR + z * cosR;
  }
}
const airFog = new THREE.Color("#bad3ce"),
  waterFog = new THREE.Color("#075561"),
  daySun = new THREE.Color("#fff0cf"),
  goldSun = new THREE.Color("#ffd19a");
function animate(timestamp) {
  if (!state.ready) return;
  const rawDt = previousTime ? (timestamp - previousTime) / 1000 : 0.016,
    dt = Math.min(rawDt, 0.055);
  previousTime = timestamp;
  if (document.hidden) return;
  elapsed += dt;
  visibleSeconds += rawDt;
  clockNode.value = elapsed;
  if (flight) {
    const t = clamp((elapsed - flight.startTime) / flight.duration, 0, 1),
      ease = t * t * (3 - 2 * t);
    camera.position.lerpVectors(flight.start, flight.end, ease);
    camera.quaternion.slerpQuaternions(flight.q, flight.endQ, ease);
    orientation.setFromQuaternion(camera.quaternion, "YXZ");
    yaw = lookYaw = orientation.y;
    pitch = lookPitch = orientation.x;
    if (t === 1) flight = null;
  } else {
    previousPosition.copy(camera.position);
    yaw = lerp(yaw, lookYaw, 1 - Math.exp(-dt * 12));
    pitch = lerp(pitch, lookPitch, 1 - Math.exp(-dt * 12));
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    const moving = keys.size > 0;
    state.moving = moving || dragging;
    document.body.classList.toggle("is-moving", state.moving);
    if (moving) {
      camera.getWorldDirection(forward);
      right.crossVectors(forward, camera.up).normalize();
      moveVector.set(0, 0, 0);
      if (keys.has("KeyW") || keys.has("ArrowUp")) moveVector.add(forward);
      if (keys.has("KeyS") || keys.has("ArrowDown")) moveVector.sub(forward);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) moveVector.sub(right);
      if (keys.has("KeyD") || keys.has("ArrowRight")) moveVector.add(right);
      if (keys.has("KeyQ")) moveVector.y -= 1;
      if (keys.has("KeyE")) moveVector.y += 1;
      const speed =
        (state.underwater ? 14 : 27) *
        (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 2.5 : 1);
      camera.position.addScaledVector(moveVector.normalize(), speed * dt);
    } else if (
      state.drift &&
      !dragging &&
      !document.querySelector("dialog[open]")
    ) {
      camera.position.y +=
        Math.sin(elapsed * 0.48) * dt * (state.underwater ? 0.018 : 0.035);
      camera.rotation.z = Math.sin(elapsed * 0.16) * 0.0009;
    }
    camera.position.x = clamp(camera.position.x, -1370, 1370);
    camera.position.z = clamp(camera.position.z, -1370, 1370);
    const floor = terrainHeight(camera.position.x, camera.position.z);
    camera.position.y = clamp(camera.position.y, Math.max(-55, floor + 2), 240);
    if (camera.position.y < 0) keepOutsideHulls();
  }
  const below = camera.position.y < -0.45;
  if (below !== state.underwater) {
    state.underwater = below;
    updateModeUI(below);
    $("waterline").classList.remove("crossing");
    void $("waterline").offsetWidth;
    $("waterline").classList.add("crossing");
  }
  submergedNode.value = lerp(
    submergedNode.value,
    below ? 1 : 0,
    1 - Math.exp(-dt * 3),
  );
  goldenNode.value = lerp(
    goldenNode.value,
    state.light === "golden" ? 1 : 0,
    1 - Math.exp(-dt * 1.2),
  );
  sunDirection.value
    .set(0.3, lerp(0.43, 0.19, goldenNode.value), -0.85)
    .normalize();
  sun.position
    .copy(sun.target.position)
    .addScaledVector(sunDirection.value, 1100);
  const underwater = submergedNode.value,
    depth = Math.max(0, -camera.position.y);
  scene.fog.color.copy(airFog).lerp(waterFog, underwater);
  scene.fog.density = lerp(0.00007, 0.0035 + depth * 0.000018, underwater);
  sun.color.copy(daySun).lerp(goldSun, goldenNode.value);
  sun.intensity = lerp(3.2, 1.4, underwater);
  hemisphere.intensity = lerp(2.1, 1.65, underwater);
  sky.position.copy(camera.position);
  underwaterWorld.visible = camera.position.y < 35;
  rays.visible = below;
  if (audioSystem && state.sound) {
    audioSystem.filter.frequency.setTargetAtTime(
      below ? 310 : 1400,
      audioSystem.ctx.currentTime,
      0.7,
    );
    audioSystem.deepGain.gain.setTargetAtTime(
      below ? 0.075 : 0,
      audioSystem.ctx.currentTime,
      0.8,
    );
  }
  if (underwaterWorld.visible) {
    rayPlacements.forEach((ray, i) => {
      instanceDummy.position.copy(ray.position);
      instanceDummy.rotation.set(0, Math.atan2(camera.position.x - ray.position.x, camera.position.z - ray.position.z), -0.3);
      instanceDummy.scale.set(ray.width, 1, 1);
      instanceDummy.updateMatrix();
      rays.setMatrixAt(i, instanceDummy.matrix);
    });
    rays.instanceMatrix.needsUpdate = true;
    for (const school of fishSchools) {
      const phase = elapsed * 0.055 + school.phase;
      school.individuals.forEach((fish, i) => {
        const a = phase + fish.phase,
          x = school.center.x + Math.cos(a) * fish.r * 1.6,
          z = school.center.z + Math.sin(a) * fish.r;
        instanceDummy.position.set(
          x,
          school.center.y +
            fish.y +
            Math.sin(elapsed * 0.35 + fish.phase) * 0.6,
          z,
        );
        instanceDummy.rotation.set(
          0,
          -a - Math.PI / 2,
          Math.sin(elapsed * 3 + fish.phase) * 0.065,
        );
        instanceDummy.scale.set(
          fish.size,
          fish.size,
          fish.size * (1 + Math.sin(elapsed * 7 + i) * 0.08),
        );
        instanceDummy.updateMatrix();
        school.mesh.setMatrixAt(i, instanceDummy.matrix);
      });
      school.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  for (const bird of birds) {
    const b = bird.userData,
      a = elapsed * 0.012 + b.phase;
    bird.position.set(
      440 + Math.cos(a) * b.r,
      b.y + Math.sin(elapsed * 0.23 + b.phase) * 1.8,
      -60 + Math.sin(a) * b.r,
    );
    bird.rotation.y = -a;
    bird.scale.y = 0.4 + Math.abs(Math.sin(elapsed * 2.5 + b.phase)) * 0.9;
    bird.visible = !below;
  }
  try { renderer.render(scene, camera); }
  catch { showStaticView(); return; }
  frames++;
  frameTime += rawDt;
  adaptTime += dt;
  if (elapsed - lastUI > 0.25) {
    $("depth-value").textContent = depth.toFixed(1);
    $("depth-indicator").style.top = `${clamp(depth / 60, 0, 1) * 141}px`;
    if (below && !flight) {
      let nearest = 0,
        distance = Infinity;
      wrecks.forEach((w, i) => {
        const d = Math.hypot(
          camera.position.x - w.pos.x,
          camera.position.z - w.pos.z,
        );
        if (d < distance) {
          nearest = i;
          distance = d;
        }
      });
      const selected = wrecks[state.wreck].pos;
      const selectedDistance = Math.hypot(
        camera.position.x - selected.x,
        camera.position.z - selected.z,
      );
      // Keep a guided destination selected where two viewing areas overlap.
      if (
        nearest !== state.wreck &&
        distance < 280 &&
        selectedDistance > distance + 70
      )
        describeWreck(nearest);
      $("wreck-card").hidden =
        Math.hypot(
          camera.position.x - wrecks[state.wreck].pos.x,
          camera.position.z - wrecks[state.wreck].pos.z,
        ) > 340;
    }
    $("location-note").setAttribute("aria-hidden", String(state.exploring));
    drawMap($("mini-map"));
    if ($("map-dialog").open) drawMap($("large-map"), true);
    lastUI = elapsed;
  }
  if (frameTime > 2) {
    state.fps = Math.round(frames / frameTime);
    frames = 0;
    frameTime = 0;
  }
  slowSeconds = visibleSeconds > 20 && state.fps < 18 ? slowSeconds + rawDt : 0;
  if (slowSeconds > 12) { showStaticView(); return; }
  if (state.quality === "auto" && adaptTime > 6) {
    const ratio = renderer.getPixelRatio();
    if (state.fps < 38 && ratio > 1)
      renderer.setPixelRatio(Math.max(1, ratio - 0.2));
    else if (state.fps > 57 && ratio < Math.min(devicePixelRatio, 1.65))
      renderer.setPixelRatio(
        Math.min(Math.min(devicePixelRatio, 1.65), ratio + 0.1),
      );
    adaptTime = 0;
  }
}

function showStaticView() {
  if (state.degraded) return;
  state.degraded = true;
  state.ready = false;
  keys.clear();
  flight = null;
  closeDialogs();
  renderer?.setAnimationLoop(null);
  if (audioSystem) audioSystem.master.gain.setTargetAtTime(0, audioSystem.ctx.currentTime, .2);
  document.body.classList.add('static-mode');
  document.body.classList.remove('is-exploring', 'is-underwater', 'ui-hidden');
  $('loading-screen').classList.add('complete');
  $('fallback-card').inert = false;
  $('fallback-card').removeAttribute('aria-hidden');
}

async function init() {
  bindUI();
  $('world').addEventListener('webglcontextlost', (event) => { event.preventDefault(); showStaticView(); });
  try {
    setProgress(10, "Opening a window to the Pacific…");
    renderer = new THREE.WebGPURenderer({
      canvas: $("world"),
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    await renderer.init();
    renderer.backend.device?.lost.then(() => showStaticView());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(airFog, 0.00015);
    camera = new THREE.PerspectiveCamera(
      innerWidth < 640 ? 62 : 49,
      innerWidth / innerHeight,
      0.3,
      50000,
    );
    camera.position.copy(startPosition);
    lookAt(startTarget);
    hemisphere = new THREE.HemisphereLight("#d0edf0", "#66775c", 2.1);
    scene.add(hemisphere);
    sun = new THREE.DirectionalLight("#fff0cf", 3.2);
    sun.position.set(800, 430, -890);
    sun.target.position.set(500, 0, -40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -490;
    sun.shadow.camera.right = 490;
    sun.shadow.camera.top = 490;
    sun.shadow.camera.bottom = -490;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 1800;
    sun.shadow.normalBias = 1.1;
    sun.shadow.bias = -0.00008;
    scene.add(sun, sun.target);
    setQuality();
    setProgress(24, "Tracing the edge of the reef…");
    await new Promise((r) => setTimeout(r, 30));
    const bathymetry = buildTerrain();
    buildOcean(bathymetry);
    setProgress(47, "A little sand. A thousand palms…");
    await new Promise((r) => setTimeout(r, 30));
    buildVegetation();
    setProgress(67, "Finding the stories beneath the blue…");
    await new Promise((r) => setTimeout(r, 30));
    wrecks.forEach((_, i) => buildShip(i));
    buildMarineLife();
    setProgress(84, "Letting the light settle…");
    await new Promise((r) => setTimeout(r, 30));
    underwaterWorld.visible = true;
    await renderer.compileAsync(scene, camera);
    if (state.degraded) return;
    renderer.render(scene, camera);
    setProgress(100, "You’re a world away.");
    state.ready = true;
    renderer.setAnimationLoop(animate);
    resize();
    drawMap($("mini-map"));
    setTimeout(() => $("loading-screen").classList.add("complete"), 300);
    // Read-only diagnostics for browser verification and performance tuning.
    window.atoll = {
      get status() {
        return {
          ...state,
          renderer: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2",
          position: camera.position.toArray(),
          pixelRatio: renderer.getPixelRatio(),
          drawCalls: renderer.info.render.drawCalls,
          triangles: renderer.info.render.triangles,
        };
      },
      camera,
      scene,
      renderer,
      visitWreck,
      visitSurface,
    };
  } catch (error) {
    console.warn("The live lagoon is unavailable; showing the illustrated view.", error);
    showStaticView();
  }
}
init();
