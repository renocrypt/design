import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Builder, surface } from "./geometry.js";

export async function loadHeadLibrary() {
  const [gltf, metadata] = await Promise.all([
    new GLTFLoader().loadAsync("./assets/models/heads.glb"),
    fetch("./assets/models/head-features.json").then((r) => r.json()),
  ]);
  const geometries = {};
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    geometry.computeBoundingSphere();
    geometries[node.name] = geometry;
  });
  return { geometries, ...metadata };
}

function modelName(person) {
  if (person.face) return person.face;
  if (person.id === "empress-attendant--1") return "jiang";
  return "jianqiu";
}

export function personSkin(m, person) {
  const source = m.headLibrary.faces[modelName(person)];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(...source.skin, THREE.SRGBColorSpace),
    roughness: 0.59,
    specularIntensity: 0.3,
    sheen: 0.08,
    sheenColor: "#cfaa98",
  });
}

const average = (points) =>
  points
    .reduce((v, p) => v.add(p), new THREE.Vector3())
    .divideScalar(points.length);
const curve = (points, closed = false) =>
  new THREE.CatmullRomCurve3(points, closed, "centripetal");

function irisGeometry(center, offset, radius, eyeSurface) {
  const geometry = surface(
    (u, v) => {
      const a = u * Math.PI * 2,
        r = radius * v;
      const x = offset.x + Math.cos(a) * r,
        y = offset.y + Math.sin(a) * r;
      return [center.x + x, center.y + y, eyeSurface(x, y) + 0.00016];
    },
    64,
    10,
  );
  const uv = geometry.attributes.uv,
    colors = [];
  for (let i = 0; i < uv.count; i++) {
    const a = uv.getX(i) * Math.PI * 2,
      r = 1 - uv.getY(i);
    let shade =
      0.75 + Math.sin(a * 51 + r * 13) * 0.13 + Math.sin(a * 89 - r * 7) * 0.1;
    if (r > 0.88) shade *= 0.6;
    const color =
      r < 0.43
        ? new THREE.Color("#070b0b")
        : new THREE.Color("#342820").multiplyScalar(shade);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function addEye(root, builder, m, points, loop, irisIndex, skin) {
  const ring = loop.map((i) => points[i]),
    centre = average(ring);
  const width =
    Math.max(...ring.map((p) => p.x)) - Math.min(...ring.map((p) => p.x));
  // Fit the visible cornea to the eyelid opening. A complete sphere can protrude
  // through a portrait-fitted lower lid, leaving an exposed white rim.
  const ordered = ring
    .slice()
    .sort(
      (a, b) =>
        Math.atan2(a.y - centre.y, a.x - centre.x) -
        Math.atan2(b.y - centre.y, b.x - centre.x),
    );
  const contourCurve = curve(ordered, true);
  const boundary = [];
  for (let i = 0; i < 128; i++) {
    const p = contourCurve.getPoint(i / 128);
    boundary.push({
      angle: Math.atan2(p.y - centre.y, p.x - centre.x),
      point: p,
    });
  }
  boundary.sort((a, b) => a.angle - b.angle);
  const atAngle = (angle) => {
    let i = boundary.findIndex((p) => p.angle > angle);
    if (i < 0) i = 0;
    const a = boundary[(i + boundary.length - 1) % boundary.length],
      b = boundary[i];
    let start = a.angle,
      end = b.angle;
    if (end < start) end += Math.PI * 2;
    if (angle < start) angle += Math.PI * 2;
    return a.point.clone().lerp(b.point, (angle - start) / (end - start));
  };
  const eyeSurface = (x, y) => {
    const edge = atAngle(Math.atan2(y, x));
    const ratio =
      Math.hypot(x, y) / Math.hypot(edge.x - centre.x, edge.y - centre.y);
    return THREE.MathUtils.lerp(
      centre.z + width * 0.12,
      edge.z - 0.00035,
      ratio * ratio,
    );
  };
  const sclera = surface(
    (u, v) => {
      const edge = atAngle(u * Math.PI * 2 - Math.PI);
      const x = (edge.x - centre.x) * v,
        y = (edge.y - centre.y) * v;
      return [centre.x + x, centre.y + y, eyeSurface(x, y)];
    },
    64,
    12,
  );
  const eyeball = new THREE.Mesh(sclera, m.sclera);
  eyeball.name = "eye-surface";
  root.add(eyeball);
  const predicted = points[irisIndex] || average(ring);
  const offset = new THREE.Vector2(
    THREE.MathUtils.clamp(
      (predicted.x - centre.x) * 0.35,
      -width * 0.05,
      width * 0.05,
    ),
    -width * 0.015,
  );
  const iris = new THREE.Mesh(
    irisGeometry(centre, offset, width * 0.232, eyeSurface),
    m.iris,
  );
  iris.name = "iris-and-pupil";
  root.add(iris);
  const contour = [...ring, ring[0]].map((p) => [p.x, p.y, p.z + 0.0005]);
  builder.path(skin, contour, 0.00085, 64);
  const upper = ring
    .filter((p) => p.y > average(ring).y)
    .sort((a, b) => a.x - b.x);
  if (upper.length > 2) {
    const lashLine = upper.map(
      (p) => new THREE.Vector3(p.x, p.y - 0.0004, p.z + 0.001),
    );
    const lashCurve = curve(lashLine);
    builder.path(
      m.lash,
      lashLine.map((p) => p.toArray()),
      0.00045,
      32,
    );
    for (let i = 1; i < 20; i++) {
      const p = lashCurve.getPoint(i / 20);
      const bend = (i / 20 - 0.5) * 0.001;
      builder.path(
        m.lash,
        [
          p.toArray(),
          [p.x + bend, p.y + 0.0011, p.z + 0.0018],
          [p.x + bend, p.y + 0.002, p.z + 0.0028],
        ],
        0.00018,
        4,
      );
    }
    const crease = upper.map((p) => [p.x, p.y + 0.004, p.z - 0.001]);
    builder.path(skin, crease, 0.0007, 30);
  }
}

function addBrow(builder, m, points, paths, person) {
  const outlines = paths.map((path) =>
    path.map((i) => points[i].clone()).sort((a, b) => a.x - b.x),
  );
  if (outlines.length < 2) return;
  outlines.sort((a, b) => average(a).y - average(b).y);
  const bottom = curve(outlines[0]),
    top = curve(outlines[1]);
  const weight =
    person.id === "empress" ? 0.42 : person.id === "zhen" ? 0.7 : 0.57;
  const geometry = surface(
    (u, v) => {
      const a = bottom.getPoint(u),
        b = top.getPoint(u);
      const taper = 0.12 + 0.88 * Math.pow(Math.sin(u * Math.PI), 0.32);
      a.lerp(b, 0.22 + (1 - v) * weight * taper);
      a.z += 0.00065;
      return a.toArray();
    },
    28,
    4,
  );
  builder.add(geometry, m.brow);
  for (let i = 0; i < 43; i++) {
    const u = i / 42,
      a = bottom.getPoint(u),
      b = top.getPoint(Math.min(1, u + 0.016));
    b.lerp(a, 1 - weight);
    a.z += 0.001;
    b.z += 0.001;
    builder.path(
      m.brow,
      [
        a.toArray(),
        a
          .clone()
          .lerp(b, 0.55)
          .add(new THREE.Vector3(0.0004, 0, 0.0004))
          .toArray(),
        b.toArray(),
      ],
      0.00012,
      4,
    );
  }
}

function addMouth(root, builder, m, points, loops) {
  const mouth = loops.map((loop) => loop.map((i) => points[i]));
  mouth.sort(
    (a, b) =>
      Math.max(...a.map((p) => p.x)) -
      Math.min(...a.map((p) => p.x)) -
      (Math.max(...b.map((p) => p.x)) - Math.min(...b.map((p) => p.x))),
  );
  const inner = mouth[0],
    centre = average(inner),
    vertices = [],
    indices = [];
  vertices.push(centre.x, centre.y, centre.z - 0.008);
  for (const p of inner) vertices.push(p.x, p.y, p.z - 0.002);
  const signed = inner.reduce(
    (sum, p, i) =>
      sum +
      p.x * inner[(i + 1) % inner.length].y -
      inner[(i + 1) % inner.length].x * p.y,
    0,
  );
  for (let i = 0; i < inner.length; i++) {
    const a = i + 1,
      b = ((i + 1) % inner.length) + 1;
    indices.push(...(signed > 0 ? [0, a, b] : [0, b, a]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  root.add(new THREE.Mesh(geometry, m.mouth));
  const minX = Math.min(...inner.map((p) => p.x)),
    maxX = Math.max(...inner.map((p) => p.x));
  const top = Math.max(...inner.map((p) => p.y)),
    bottom = Math.min(...inner.map((p) => p.y));
  if (top - bottom > 0.0035) {
    const width = (maxX - minX) * 0.69,
      height = Math.min(0.004, (top - bottom) * 0.47);
    for (let i = 0; i < 6; i++) {
      builder.box(
        m.teeth,
        [
          centre.x + ((i - 2.5) * width) / 6,
          top - height * 0.64,
          centre.z - 0.004 - Math.abs(i - 2.5) * 0.0002,
        ],
        [width / 6 - 0.00025, height, 0.0024],
        0.0006,
      );
    }
  }
}

export function createSculptedFace(m, person, index) {
  const name = modelName(person),
    library = m.headLibrary;
  const info = library.faces[name],
    points = info.points.map((p) => new THREE.Vector3(...p));
  const root = new THREE.Group();
  root.name = "sculpted-head";
  const vertexSkin = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.58,
    specularIntensity: 0.28,
    sheen: 0.08,
    sheenColor: "#c79d88",
  });
  const skin = personSkin(m, person);
  const lod = new THREE.LOD();
  for (const [suffix, distance] of [
    ["hi", 0],
    ["lo", 3.1],
  ]) {
    const geometry = library.geometries[`${name}_${suffix}`];
    if (!geometry) throw new Error(`Missing modeled head: ${name}_${suffix}`);
    const mesh = new THREE.Mesh(geometry, vertexSkin);
    mesh.name = "anatomical-skin";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    lod.addLevel(mesh, distance);
  }
  root.add(lod);
  const b = new Builder();
  addEye(root, b, m, points, library.features.leftEye, 473, skin);
  addEye(root, b, m, points, library.features.rightEye, 468, skin);
  addBrow(b, m, points, library.features.leftBrow, person);
  addBrow(b, m, points, library.features.rightBrow, person);
  addMouth(root, b, m, points, library.features.lips);

  // The scalp follows a continuous hairline and encloses a modeled cranium.
  b.add(
    surface(
      (u, v) => {
        const theta = u * Math.PI * 2;
        const boundary =
          1.65 - 0.55 * Math.cos(theta) + 0.1 * Math.max(0, -Math.cos(theta));
        const phi = v * boundary;
        const groove = 0.00012 * Math.sin(theta * 96) * Math.sin(phi);
        return [
          Math.sin(theta) * Math.sin(phi) * (0.102 + groove),
          0.025 + Math.cos(phi) * 0.153,
          -0.047 + Math.cos(theta) * Math.sin(phi) * (0.126 + groove),
        ];
      },
      192,
      28,
    ),
    m.hair,
  );
  for (const side of [-1, 1]) {
    const x = side * 0.093;
    b.ball(skin, [x, 0.003, -0.014], [0.011, 0.026, 0.009], 20);
    b.ball(skin, [x + side * 0.004, 0.004, -0.006], [0.005, 0.015, 0.004], 16);
    b.path(
      skin,
      [
        [x, -0.015, -0.004],
        [x + side * 0.006, 0.015, -0.004],
        [x, 0.027, -0.011],
        [x - side * 0.005, 0.018, -0.014],
      ],
      0.0022,
      20,
    );
  }
  root.add(b.finish("eyes-brows-mouth-and-scalp"));
  root.userData.faceSource = name;
  root.userData.photographicMap = false;
  return root;
}
