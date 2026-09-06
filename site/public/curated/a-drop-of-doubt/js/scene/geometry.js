import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const origin = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const transform = new THREE.Matrix4();

/** Batch decorative geometry by material, keeping moving parts in their own group. */
export class Builder {
  constructor() {
    this.parts = new Map();
  }
  add(
    geometry,
    material,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  ) {
    quaternion.setFromEuler(euler.set(...rotation));
    transform.compose(
      origin.set(...position),
      quaternion,
      new THREE.Vector3(...scale),
    );
    geometry.applyMatrix4(transform);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    for (const key of Object.keys(flat.attributes))
      if (!["position", "normal", "uv"].includes(key))
        flat.deleteAttribute(key);
    if (!flat.attributes.uv)
      flat.setAttribute(
        "uv",
        new THREE.BufferAttribute(
          new Float32Array(flat.attributes.position.count * 2),
          2,
        ),
      );
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(flat);
    return this;
  }
  box(material, position, size, bevel = 0, rotation = [0, 0, 0]) {
    const g = bevel
      ? new RoundedBoxGeometry(
          ...size,
          2,
          Math.min(bevel, ...size.map((x) => x / 3)),
        )
      : new THREE.BoxGeometry(...size);
    return this.add(g, material, position, rotation);
  }
  ball(material, position, size, detail = 12) {
    return this.add(
      new THREE.SphereGeometry(1, detail, Math.max(6, detail / 2)),
      material,
      position,
      [0, 0, 0],
      size,
    );
  }
  cylinder(
    material,
    position,
    top,
    bottom,
    height,
    segments = 16,
    rotation = [0, 0, 0],
  ) {
    return this.add(
      new THREE.CylinderGeometry(top, bottom, height, segments),
      material,
      position,
      rotation,
    );
  }
  path(material, points, radius = 0.01, segments = 24) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return this.add(
      new THREE.TubeGeometry(curve, segments, radius, 6, false),
      material,
    );
  }
  lathe(material, points, position, segments = 28, rotation = [0, 0, 0]) {
    return this.add(
      new THREE.LatheGeometry(
        points.map((p) => new THREE.Vector2(...p)),
        segments,
      ),
      material,
      position,
      rotation,
    );
  }
  finish(name = "", shadows = true) {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, pieces] of this.parts) {
      const geometry = mergeGeometries(pieces, false);
      for (const g of pieces) g.dispose();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

export function surface(fn, columns = 32, rows = 24) {
  const vertices = [],
    uv = [],
    indices = [];
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= columns; x++) {
      vertices.push(...fn(x / columns, y / rows));
      uv.push(x / columns, 1 - y / rows);
    }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function fanGeometry(radius = 0.45) {
  return surface(
    (u, v) => {
      const a = 0.1 + u * (Math.PI - 0.2),
        r = radius * (0.12 + 0.88 * v);
      return [
        Math.cos(a) * r,
        Math.sin(a) * r,
        0.018 * Math.cos(u * Math.PI * 28) * v,
      ];
    },
    40,
    12,
  );
}

export function flower3D(
  builder,
  material,
  center,
  radius,
  petals = 7,
  tilt = 0,
) {
  const [x, y, z] = center;
  for (let i = 0; i < petals; i++) {
    const a = tilt + (i / petals) * Math.PI * 2;
    builder.add(
      new THREE.SphereGeometry(1, 8, 6),
      material,
      [
        x + Math.cos(a) * radius * 0.47,
        y + Math.sin(a) * radius * 0.47,
        z + 0.012,
      ],
      [0, 0.22 * Math.sin(a), a - Math.PI / 2],
      [radius * 0.34, radius * 0.57, radius * 0.14],
    );
  }
  builder.ball(
    material,
    [x, y, z + 0.026],
    [radius * 0.24, radius * 0.24, radius * 0.19],
    10,
  );
}

export function interpolateRows(rows, value) {
  let i = 0;
  while (i < rows.length - 2 && value > rows[i + 1][0]) i++;
  const a = rows[i],
    b = rows[i + 1],
    t = THREE.MathUtils.clamp((value - a[0]) / (b[0] - a[0]), 0, 1);
  return a.slice(1).map((v, j) => THREE.MathUtils.lerp(v, b[j + 1], t));
}
