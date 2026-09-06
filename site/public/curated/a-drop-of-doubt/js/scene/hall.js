import * as THREE from "three/webgpu";
import { Builder, surface, fanGeometry, flower3D } from "./geometry.js";

import { SEATS } from "./people.js";

export function createChair(m, royal = false) {
  const b = new Builder(),
    width = royal ? 1.62 : 0.68,
    depth = royal ? 0.68 : 0.62;
  const half = width / 2;
  b.box(m.blackwood, [0, 0.52, 0], [width, 0.085, depth], 0.035);
  b.box(
    royal ? m.yellow : m.silk.ivory,
    [0, 0.568, 0],
    [width - 0.12, 0.045, depth - 0.1],
    0.02,
  );
  for (const x of [-half + 0.05, half - 0.05])
    for (const z of [-depth / 2 + 0.06, depth / 2 - 0.06]) {
      b.box(m.blackwood, [x, 0.27, z], [0.066, 0.52, 0.066], 0.015);
      b.box(m.blackwood, [x, 0.16, 0], [0.035, 0.035, depth - 0.04], 0.01);
    }
  const top = royal ? 1.25 : 1.1;
  for (const x of [-half + 0.05, half - 0.05]) {
    b.box(m.blackwood, [x, 0.89, -0.26], [0.06, 0.7, 0.055], 0.016);
    b.path(
      m.blackwood,
      [
        [x, 0.62, 0.23],
        [x, 0.78, 0.2],
        [x, 0.8, -0.04],
        [x, 0.93, -0.27],
      ],
      0.027,
      18,
    );
  }
  b.path(
    m.blackwood,
    [
      [-half + 0.04, top - 0.05, -0.26],
      [-half * 0.5, top + 0.025, -0.28],
      [0, top + 0.06, -0.29],
      [half * 0.5, top + 0.025, -0.28],
      [half - 0.04, top - 0.05, -0.26],
    ],
    0.036,
    22,
  );
  b.box(m.blackwood, [0, 0.86, -0.278], [width - 0.18, 0.41, 0.025], 0.02);
  const count = royal ? 3 : 1;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.42;
    b.add(new THREE.TorusGeometry(0.107, 0.009, 6, 28), m.wood, [
      x,
      0.9,
      -0.251,
    ]);
    b.path(
      m.wood,
      [
        [x - 0.075, 0.85, -0.235],
        [x - 0.055, 0.95, -0.235],
        [x, 0.98, -0.235],
        [x + 0.06, 0.92, -0.235],
        [x + 0.075, 0.855, -0.235],
      ],
      0.008,
      18,
    );
    flower3D(b, royal ? m.gold : m.wood, [x, 0.905, -0.229], 0.063, 6);
  }
  if (royal)
    for (const x of [-0.59, 0.59]) {
      b.cylinder(m.yellowLight, [x, 0.69, 0.06], 0.15, 0.15, 0.29, 24, [
        0,
        0,
        Math.PI / 2,
      ]);
      b.cylinder(m.gold, [x - 0.15, 0.69, 0.06], 0.153, 0.153, 0.012, 24, [
        0,
        0,
        Math.PI / 2,
      ]);
      b.cylinder(m.gold, [x + 0.15, 0.69, 0.06], 0.153, 0.153, 0.012, 24, [
        0,
        0,
        Math.PI / 2,
      ]);
    }
  return b.finish(royal ? "empress-seat" : "court-chair");
}

function teacup(b, m, x, y, z) {
  b.lathe(
    m.porcelain,
    [
      [0.026, 0],
      [0.026, 0.012],
      [0.058, 0.035],
      [0.072, 0.085],
      [0.074, 0.092],
    ],
    [x, y, z],
    24,
  );
  b.lathe(
    m.porcelain,
    [
      [0, 0.098],
      [0.03, 0.096],
      [0.077, 0.091],
      [0.079, 0.096],
      [0.014, 0.113],
      [0.012, 0.127],
      [0, 0.13],
    ],
    [x, y, z],
    24,
  );
  b.lathe(
    m.goldLight,
    [
      [0.071, 0.088],
      [0.075, 0.09],
      [0.075, 0.094],
    ],
    [x, y, z],
    24,
  );
  b.lathe(
    m.porcelain,
    [
      [0, 0],
      [0.09, 0],
      [0.091, 0.01],
      [0.075, 0.015],
      [0.025, 0.016],
    ],
    [x, y - 0.011, z],
    24,
  );
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    b.ball(
      m.rose,
      [x + 0.06 * Math.cos(a), y + 0.055, z + 0.06 * Math.sin(a)],
      [0.008, 0.009, 0.008],
      6,
    );
  }
}

function table(b, m, x, z) {
  b.box(m.wood, [x, 0.66, z], [0.48, 0.046, 0.62], 0.017);
  b.box(m.wood, [x, 0.59, z], [0.43, 0.1, 0.54], 0.015);
  for (const dx of [-0.175, 0.175])
    for (const dz of [-0.22, 0.22])
      b.box(m.wood, [x + dx, 0.32, z + dz], [0.043, 0.63, 0.043], 0.01);
  b.box(m.wood, [x, 0.22, z], [0.38, 0.026, 0.48], 0.007);
  teacup(b, m, x, 0.69, z - 0.015);
}

function curtainGeometry(width, height, phase = 0) {
  return surface(
    (u, v) => {
      const tie = Math.sin(v * Math.PI) * 0.24;
      return [
        (u - 0.5) * width + tie,
        (1 - v) * height,
        (0.037 + 0.035 * v) * Math.sin(u * Math.PI * 18 + phase) +
          0.1 * Math.sin(v * Math.PI),
      ];
    },
    48,
    18,
  );
}

function vase(b, m, x, y, z, scale = 1) {
  const points = [
    [0.075, 0],
    [0.078, 0.035],
    [0.14, 0.07],
    [0.18, 0.24],
    [0.12, 0.38],
    [0.072, 0.43],
    [0.062, 0.59],
    [0.088, 0.62],
  ];
  b.lathe(
    m.porcelain,
    points.map(([r, h]) => [r * scale, h * scale]),
    [x, y, z],
    32,
  );
  for (const h of [0.04, 0.11, 0.32, 0.58])
    b.cylinder(
      m.porcelainBlue,
      [x, y + h * scale, z],
      (0.077 + (h > 0.1 && h < 0.35 ? 0.083 : 0)) * scale,
      (0.077 + (h > 0.1 && h < 0.35 ? 0.083 : 0)) * scale,
      0.013 * scale,
      28,
    );
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    b.path(
      m.wood,
      [
        [x, y + 0.5 * scale, z],
        [
          x + Math.cos(a) * 0.13 * scale,
          y + 0.87 * scale,
          z + Math.sin(a) * 0.1 * scale,
        ],
        [
          x + Math.cos(a) * 0.31 * scale,
          y + (1.05 + i * 0.022) * scale,
          z + Math.sin(a) * 0.25 * scale,
        ],
      ],
      0.006 * scale,
      12,
    );
    for (let j = 0; j < 5; j++) {
      const t = j / 5;
      const xx = x + Math.cos(a) * (0.12 + 0.19 * t) * scale,
        zz = z + Math.sin(a) * (0.1 + 0.15 * t) * scale;
      b.ball(
        j % 2 ? m.leaf : m.leafLight,
        [xx, y + (0.86 + t * 0.24 + i * 0.015) * scale, zz],
        [0.047 * scale, 0.026 * scale, 0.08 * scale],
        8,
      );
    }
  }
}

export function createHall(m) {
  const root = new THREE.Group();
  root.name = "Jingren Palace";
  const b = new Builder();
  b.box(m.grout, [0, -0.13, 0.5], [10, 0.25, 16]);
  for (let x = -4.75; x < 5; x += 0.5)
    for (let z = -6.75; z < 8; z += 0.5)
      b.box(m.floor, [x, -0.012, z], [0.493, 0.024, 0.493]);
  b.box(m.redDark, [0, 0.13, -5.18], [5.4, 0.28, 3.16], 0.014);
  b.box(m.yellow, [0, 0.282, -3.62], [5.44, 0.022, 0.034]);
  b.box(m.carpet, [0, 0.285, -5.18], [5.25, 0.012, 3.02]);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.65, 8.8), m.carpet);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.018, 1.12);
  rug.receiveShadow = true;
  root.add(rug);
  b.box(m.wood, [0, 0.35, -4.76], [0.88, 0.09, 0.43], 0.026);
  b.box(m.yellow, [0, 0.399, -4.76], [0.81, 0.01, 0.37]);

  // The back wall and its black floral screen establish the Empress's axis.
  b.box(m.wall, [0, 2.1, -6.83], [10, 4.4, 0.16]);
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.64,
      h = 2.36 - Math.abs(i) * 0.075;
    b.box(m.blackwood, [x, 0.32 + h / 2, -6.22], [0.652, h, 0.12], 0.014);
    b.box(m.inlay, [x, 0.34 + h / 2, -6.144], [0.572, h - 0.15, 0.019]);
    b.add(
      new THREE.SphereGeometry(1, 16, 8),
      m.blackwood,
      [x, 0.32 + h, -6.22],
      [0, 0, 0],
      [0.35, 0.17, 0.074],
    );
    b.box(m.wood, [x - 0.31, 0.32 + h / 2, -6.12], [0.027, h, 0.025], 0.006);
  }
  for (const x of [-2.02, 2.02]) {
    b.cylinder(m.red, [x, 1.72, -6.11], 0.018, 0.018, 2.8, 12);
    b.add(fanGeometry(0.43), m.blackwood, [x, 2.77, -6.11]);
    for (let i = 0; i < 15; i++) {
      const a = 0.15 + (i / 14) * (Math.PI - 0.3);
      b.path(
        m.gold,
        [
          [x, 2.77, -6.09],
          [x + Math.cos(a) * 0.38, 2.77 + Math.sin(a) * 0.38, -6.09],
        ],
        0.004,
        3,
      );
    }
    b.ball(m.gold, [x, 2.8, -6.065], [0.07, 0.074, 0.02]);
  }

  // Window modules are real frames and mullions in front of diffuse daylight.
  for (const side of [-1, 1]) {
    const x = side * 4.7;
    b.box(m.wood, [x, 0.42, 0.4], [0.16, 0.86, 14.6]);
    b.box(m.red, [x, 3.91, 0.4], [0.19, 0.55, 14.6]);
    for (const z of [-5, -2.5, 0, 2.5, 5]) {
      b.box(m.window, [x, 2.14, z], [0.055, 2.52, 2.23]);
      for (const edge of [-1, 1])
        b.box(
          m.wood,
          [x - side * 0.04, 2.12, z + edge * 1.14],
          [0.12, 2.65, 0.065],
          0.01,
        );
      for (const h of [0.87, 1.6, 2.68, 3.37])
        b.box(m.wood, [x - side * 0.043, h, z], [0.12, 0.05, 2.28], 0.008);
      for (let k = -4; k <= 4; k++)
        b.box(
          m.wood,
          [x - side * 0.05, 2.15, z + k * 0.247],
          [0.09, 2.51, 0.024],
        );
      for (const h of [1.06, 1.27, 1.47, 2.87, 3.08, 3.27]) {
        b.box(m.wood, [x - side * 0.063, h, z], [0.11, 0.025, 2.28]);
        for (let k = -4; k < 4; k++)
          b.box(
            m.wood,
            [x - side * 0.07, h + 0.055, z + (k + 0.5) * 0.247],
            [0.11, 0.11, 0.024],
          );
      }
      b.box(m.yellow, [x - side * 0.15, 3.51, z], [0.11, 0.28, 2.25]);
      for (let k = 0; k < 34; k++)
        b.cylinder(
          m.yellowLight,
          [x - side * 0.19, 3.27 - (k % 3) * 0.016, z - 1.08 + k * 0.065],
          0.006,
          0.004,
          0.26,
          5,
        );
    }
    for (const z of [-6.22, -3.75, -1.25, 1.25, 3.75, 6.23]) {
      b.cylinder(m.red, [side * 4.18, 1.96, z], 0.145, 0.164, 3.85, 24);
      b.cylinder(m.blackwood, [side * 4.18, 0.067, z], 0.22, 0.24, 0.13, 24);
      b.cylinder(m.gold, [side * 4.18, 0.165, z], 0.17, 0.2, 0.064, 24);
      b.box(m.redDark, [side * 4.18, 3.72, z], [0.48, 0.18, 0.45], 0.04);
      b.box(m.gold, [side * 4.18, 3.85, z], [0.5, 0.032, 0.48], 0.009);
    }
  }
  for (const z of [-6.2, -3.75, 1.25, 6.2]) {
    b.box(m.redDark, [0, 3.94, z], [9.1, 0.25, 0.2]);
    b.box(m.bluePaint, [0, 3.8, z], [8.7, 0.075, 0.16]);
    b.box(m.gold, [0, 3.744, z], [8.65, 0.018, 0.175]);
    for (let x = -3.6; x < 4; x += 0.6)
      b.add(new THREE.TorusGeometry(0.072, 0.009, 4, 12), m.gold, [
        x,
        3.798,
        z + 0.087,
      ]);
  }
  b.box(m.wood, [0, 4.22, 0.1], [9.55, 0.1, 14.5]);
  for (let x = -4.4; x < 4.5; x += 0.45)
    b.box(m.redDark, [x, 4.12, 0.1], [0.037, 0.15, 14.5]);

  // Hanging lamps, silk valances, and the entry sequence seen in the reverse view.
  for (const x of [-3.35, 3.35])
    for (const z of [-4.85, 0.1, 4.8]) {
      b.cylinder(m.gold, [x, 3.65, z], 0.012, 0.012, 0.9, 8);
      b.cylinder(m.yellowLight, [x, 3.32, z], 0.24, 0.2, 0.49, 8);
      for (const y of [3.08, 3.53])
        b.cylinder(m.redDark, [x, y, z], 0.26, 0.26, 0.053, 8);
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4;
        b.box(
          m.gold,
          [x + 0.218 * Math.cos(a), 3.32, z + 0.218 * Math.sin(a)],
          [0.012, 0.5, 0.012],
        );
      }
      for (let j = 0; j < 22; j++) {
        const a = (j / 22) * Math.PI * 2;
        b.cylinder(
          m.yellow,
          [x + 0.21 * Math.cos(a), 2.95, z + 0.21 * Math.sin(a)],
          0.004,
          0.003,
          0.24,
          4,
        );
      }
    }
  for (const side of [-1, 1]) {
    b.add(
      curtainGeometry(1.65, 3.42),
      m.silk.amber,
      [side * 3.77, 0.06, 5.69],
      [0, side * 0.3, 0],
    );
    b.box(m.redDark, [side * 3.84, 1.78, 5.79], [0.17, 0.09, 0.19], 0.02);
    b.box(m.wall, [side * 3.32, 1.98, 7.77], [3.0, 4.0, 0.18]);
  }
  b.box(m.red, [0, 3.65, 7.78], [4.1, 0.28, 0.22]);
  for (const x of [-1.98, 1.98])
    b.box(m.red, [x, 1.76, 7.78], [0.17, 3.55, 0.25]);
  b.box(m.bluePaint, [0, 1.6, 10.01], [3.75, 3.4, 0.06]);
  b.box(m.redDark, [0, -0.09, 8.9], [4.0, 0.12, 3.1]);
  b.box(m.carpet, [0, -0.01, 8.9], [2.5, 0.01, 3.1]);

  for (const [id, position] of Object.entries(SEATS)) {
    const chair = createChair(m, id === "empress");
    chair.position.set(...position);
    chair.rotation.y =
      id === "empress" ? 0 : position[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(chair);
    if (id !== "empress") table(b, m, position[0] * 0.97, position[2] - 0.69);
  }
  for (const side of [-1, 1]) {
    const x = side * 2.97,
      z = -5.42;
    b.cylinder(m.wood, [x, 0.58, z], 0.34, 0.29, 1.14, 12);
    b.cylinder(m.gold, [x, 1.18, z], 0.41, 0.41, 0.06, 24);
    vase(b, m, x, 1.23, z, 0.56);
    table(b, m, side * 3.8, 3.93);
    vase(b, m, side * 3.8, 0.69, 3.93, 0.53);
    b.cylinder(m.blackwood, [side * 3.44, 1.05, -6.0], 0.33, 0.29, 0.14, 20);
    for (let i = 0; i < 7; i++)
      b.ball(
        m.yellow,
        [
          side * 3.44 + Math.sin(i * 2.4) * 0.22,
          1.19 + (i % 2) * 0.035,
          -6.0 + Math.cos(i * 2.4) * 0.2,
        ],
        [0.065, 0.063, 0.064],
      );
  }
  root.add(b.finish("architecture-and-furnishings"));
  return root;
}
