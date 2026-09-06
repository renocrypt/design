import * as THREE from "three/webgpu";
import { Builder, surface, flower3D, interpolateRows } from "./geometry.js";
import { SEATS, PEOPLE } from "./people.js";
import { createSculptedFace, personSkin } from "./heads.js";

const sitting = [
  [0, 1.12, 0.073, 0.067, 0],
  [0.11, 1.04, 0.22, 0.115, 0],
  [0.3, 0.82, 0.173, 0.12, 0.014],
  [0.49, 0.58, 0.22, 0.17, 0.04],
  [0.65, 0.46, 0.255, 0.215, 0.22],
  [0.85, 0.21, 0.235, 0.14, 0.38],
  [1, 0.044, 0.255, 0.17, 0.39],
];
const standing = [
  [0, 1.5, 0.073, 0.067, 0],
  [0.11, 1.4, 0.22, 0.115, 0],
  [0.3, 1.12, 0.175, 0.128, 0],
  [0.49, 0.87, 0.218, 0.15, 0.005],
  [0.65, 0.53, 0.23, 0.15, 0.014],
  [0.85, 0.22, 0.25, 0.17, 0.021],
  [1, 0.044, 0.272, 0.19, 0.021],
];
const neckY = (stand) => (stand ? 1.5 : 1.12);

function robe(stand, from = 0, to = 1, lift = 0) {
  return surface(
    (u, t) => {
      const v = THREE.MathUtils.lerp(from, to, t),
        [y, rx, rz, z] = interpolateRows(stand ? standing : sitting, v);
      const a = u * Math.PI * 2 + Math.PI;
      const fold = 0.006 * Math.sin(a * 14 + v * 3) * (0.25 + v);
      return [
        Math.sin(a) * (rx + lift + fold),
        y,
        Math.cos(a) * (rz + lift + fold) + z,
      ];
    },
    48,
    36,
  );
}

function wrist(stand, side, id) {
  if (!stand && id === "zhen" && side < 0) return [-0.3, 0.79, 0.24];
  return [side * 0.145, stand ? 1.045 : 0.72, stand ? 0.18 : 0.34];
}

function sleeve(stand, side, id, from = 0, to = 1, lift = 0) {
  const end = wrist(stand, side, id);
  const c = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.185, stand ? 1.405 : 1.025, 0.005),
    new THREE.Vector3(side * 0.31, stand ? 1.23 : 0.88, 0.045),
    new THREE.Vector3(side * 0.285, stand ? 1.13 : 0.78, 0.15),
    new THREE.Vector3(...end),
  ]);
  const axis = new THREE.Vector3(1, 0, 0),
    n = new THREE.Vector3(),
    b = new THREE.Vector3();
  return surface(
    (u, v) => {
      const t = THREE.MathUtils.lerp(from, to, v),
        p = c.getPoint(t),
        tangent = c.getTangent(t);
      b.crossVectors(tangent, axis).normalize();
      n.crossVectors(b, tangent).normalize();
      const a = u * Math.PI * 2,
        r = 0.087 + Math.sin(t * Math.PI) * 0.034 + t * 0.016 + lift;
      p.addScaledVector(n, Math.cos(a) * r).addScaledVector(
        b,
        Math.sin(a) * r * (1 + 0.14 * Math.cos(a * 6)),
      );
      return p.toArray();
    },
    28,
    22,
  );
}

function scarf(stand) {
  const y = neckY(stand),
    points = [
      [0, -0.058, y + 0.032, 0.07],
      [0.27, 0.057, y - 0.1, 0.139],
      [1, 0.045, y - 0.4, 0.151],
    ];
  return surface(
    (u, v) => {
      const [x, h, z] = interpolateRows(points, v);
      return [
        x + (u - 0.5) * 0.092,
        h,
        z + 0.005 * Math.sin(u * Math.PI * 3) * v,
      ];
    },
    8,
    18,
  );
}

function hand(m, side, id) {
  const b = new Builder();
  b.ball(m.skin, [0, 0, 0], [0.028, 0.04, 0.013], 16);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.012,
      len = 0.05 - Math.abs(i - 1) * 0.006;
    b.path(
      m.skin,
      [
        [x, -0.014, 0.005],
        [x + side * 0.004, -0.039, 0.014],
        [x + side * 0.003, -0.032 - len, 0.024],
      ],
      0.0055,
      9,
    );
    if (id === "zhen" && i > 1) {
      b.path(
        m.gold,
        [
          [x + side * 0.003, -0.032 - len, 0.024],
          [x + side * 0.009, -0.071 - len, 0.03],
          [x + side * 0.014, -0.102 - len, 0.022],
        ],
        0.0033,
        10,
      );
      b.ball(m.jade, [x, -0.047, 0.024], [0.006, 0.006, 0.004], 8);
    }
  }
  b.path(
    m.skin,
    [
      [side * 0.022, 0.014, 0.002],
      [side * 0.04, -0.001, 0.01],
      [side * 0.035, -0.023, 0.018],
    ],
    0.007,
    9,
  );
  return b.finish("hand");
}

function createHead(m, person, index) {
  const root = new THREE.Group();
  root.name = "head";
  const b = new Builder();
  root.add(createSculptedFace(m, person, index));
  b.ball(m.hair, [0, 0.09, -0.103], [0.105, 0.095, 0.059], 20);
  const flower = m[person.flower] || m.rose;
  if (person.crown === "imperial") {
    b.ball(m.hair, [0, 0.185, -0.025], [0.195, 0.11, 0.092], 20);
    for (let k = 0; k < 5; k++) {
      const r = 0.18 + k * 0.013,
        yy = 0.134 + k * 0.023;
      const points = [];
      for (let i = 0; i <= 22; i++) {
        const a = (Math.PI * i) / 22;
        points.push([Math.cos(a) * r, yy + Math.sin(a) * 0.071, 0.037]);
      }
      b.path(m.gold, points, 0.0055, 28);
      for (let i = 0; i < 17; i++) {
        const a = 0.07 + (i / 16) * (Math.PI - 0.14);
        b.ball(
          i % 3 === 0 ? m.ruby : m.pearl,
          [Math.cos(a) * r, yy + Math.sin(a) * 0.071, 0.045],
          [0.007, 0.008, 0.006],
          8,
        );
      }
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const a = 0.15 + i * 0.17;
        b.path(
          m.gold,
          [
            [side * 0.12, 0.19, 0.045],
            [side * (0.19 + i * 0.005), 0.24 + i * 0.006, 0.012],
            [side * (0.16 + 0.075 * Math.sin(a)), 0.35 + i * 0.006, 0.025],
          ],
          0.006,
          12,
        );
        b.add(
          new THREE.SphereGeometry(1, 8, 6),
          m.gold,
          [side * (0.16 + 0.075 * Math.sin(a)), 0.34 + i * 0.006, 0.032],
          [0, 0, side * 0.7],
          [0.011, 0.035, 0.006],
        );
      }
      flower3D(b, m.gold, [side * 0.165, 0.245, 0.062], 0.058, 7);
      b.ball(m.ruby, [side * 0.18, 0.245, 0.082], [0.014, 0.019, 0.009]);
    }
    flower3D(b, m.goldLight, [0, 0.265, 0.074], 0.084, 8);
    b.path(
      m.goldLight,
      [
        [-0.09, 0.315, 0.054],
        [0, 0.35, 0.075],
        [0.09, 0.315, 0.054],
      ],
      0.008,
      18,
    );
    b.ball(m.ruby, [0, 0.322, 0.089], [0.021, 0.026, 0.009], 12);
  } else if (person.crown === "rounded") {
    b.ball(m.hair, [0, 0.183, -0.055], [0.19, 0.15, 0.086], 24);
    for (let k = 0; k < 3; k++) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI;
        pts.push([
          Math.cos(a) * (0.167 + k * 0.006),
          0.166 + Math.sin(a) * (0.122 + k * 0.006),
          0.024,
        ]);
      }
      b.path(k === 0 ? m.turquoise : m.silver, pts, 0.005, 28);
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 23) * Math.PI;
      b.ball(
        m.pearl,
        [Math.cos(a) * 0.174, 0.16 + Math.sin(a) * 0.129, 0.033],
        [0.0055, 0.0055, 0.006],
        8,
      );
    }
    flower3D(b, flower, [0.16, 0.174, 0.041], 0.081, 9, 0.3);
    flower3D(b, flower, [0.174, 0.186, 0.061], 0.053, 7, 0.7);
    flower3D(b, m.silver, [-0.06, 0.241, 0.032], 0.047, 6);
    b.ball(m.ruby, [-0.06, 0.243, 0.052], [0.018, 0.022, 0.007], 12);
  } else if (person.crown === "floral") {
    b.ball(m.hair, [0, 0.183, -0.047], [0.24, 0.105, 0.071], 20);
    flower3D(b, m.peach, [-0.176, 0.242, 0.017], 0.077, 8);
    flower3D(b, m.yellowLight, [-0.128, 0.26, 0.034], 0.044, 6);
    flower3D(b, m.rose, [-0.202, 0.196, 0.038], 0.045, 6);
    flower3D(b, m.turquoise, [0.164, 0.247, 0.028], 0.078, 9);
    flower3D(b, m.silver, [0.183, 0.201, 0.061], 0.044, 7);
    b.ball(m.pearl, [0.183, 0.205, 0.079], [0.018, 0.022, 0.014], 12);
    for (let k = 0; k < 5; k++) {
      const x = 0.145 + k * 0.014;
      b.path(
        m.silver,
        [
          [x, 0.178, 0.063],
          [x + 0.004, 0.118, 0.067],
          [x - 0.002, 0.069 - (k % 2) * 0.012, 0.066],
        ],
        0.0019,
        6,
      );
      for (let j = 0; j < 4; j++)
        b.ball(
          m.pearl,
          [x, 0.16 - j * 0.029, 0.067],
          [0.0048, 0.007, 0.0048],
          8,
        );
    }
    for (let j = 0; j < 4; j++) {
      flower3D(
        b,
        m.silver,
        [0, 0.178 + j * 0.029, 0.071],
        0.022 - j * 0.002,
        5,
      );
      b.ball(m.ruby, [0, 0.179 + j * 0.029, 0.081], [0.008, 0.009, 0.004], 8);
    }
  } else if (person.crown === "loops") {
    b.ball(m.hair, [-0.092, 0.202, -0.049], [0.14, 0.083, 0.075], 20);
    b.ball(m.hair, [0.093, 0.204, -0.052], [0.132, 0.082, 0.07], 20);
    flower3D(b, m.blossom, [-0.133, 0.213, 0.027], 0.042, 6);
    flower3D(b, m.blossom, [0.098, 0.253, 0.014], 0.047, 7);
    b.path(
      m.gold,
      [
        [-0.19, 0.208, 0.021],
        [-0.21, 0.142, 0.038],
        [-0.202, 0.07, 0.043],
      ],
      0.003,
      10,
    );
    b.ball(m.jade, [-0.2, 0.08, 0.043], [0.012, 0.023, 0.01]);
  } else if (person.crown === "wing") {
    const shape = new THREE.Shape();
    shape.moveTo(-0.274, 0.24);
    shape.lineTo(-0.21, 0.132);
    shape.quadraticCurveTo(0, 0.153, 0.21, 0.132);
    shape.lineTo(0.274, 0.24);
    shape.quadraticCurveTo(0, 0.28, -0.274, 0.24);
    b.add(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.055,
        bevelEnabled: true,
        bevelSize: 0.007,
        bevelThickness: 0.005,
        bevelSegments: 2,
        steps: 1,
      }),
      m.hair,
      [0, 0, -0.032],
    );
    for (const side of [-1, 1]) {
      flower3D(b, flower, [side * 0.168, 0.219, 0.04], 0.046, 6);
      flower3D(b, flower, [side * 0.102, 0.207, 0.043], 0.027, 5);
      b.ball(m.pearl, [side * 0.212, 0.213, 0.051], [0.006, 0.009, 0.008], 8);
    }
    flower3D(b, m.gold, [0, 0.225, 0.04], 0.038, 7);
    b.path(
      m.gold,
      [
        [0, 0.205, 0.05],
        [0, 0.15, 0.06],
        [0, 0.119, 0.065],
      ],
      0.002,
      8,
    );
    b.ball(
      person.id === "an" ? m.gold : m.turquoise,
      [0, 0.126, 0.066],
      [0.008, 0.012, 0.004],
      10,
    );
    if (person.id === "jing") {
      for (let j = 0; j < 13; j++)
        b.path(
          m.turquoise,
          [
            [-0.196 + j * 0.002, 0.17, 0.031],
            [-0.197 + j * 0.002, -0.045, 0.035],
            [-0.192 + j * 0.002, -0.148, 0.04],
          ],
          0.0019,
          8,
        );
      b.ball(m.silver, [-0.19, 0.147, 0.035], [0.017, 0.025, 0.012], 12);
    }
  } else {
    b.ball(m.hair, [0, 0.146, -0.076], [0.061, 0.065, 0.061], 12);
    b.ball(m.rose, [0.044, 0.15, -0.02], [0.012, 0.014, 0.008], 8);
  }

  for (const side of [-1, 1]) {
    b.path(
      m.gold,
      [
        [side * 0.098, -0.018, -0.007],
        [side * 0.106, -0.035, 0.01],
        [side * 0.111, -0.099, 0.016],
        [side * 0.108, -0.128, 0.018],
      ],
      0.0015,
      12,
    );
    const jewel =
      person.id === "ning"
        ? m.jade
        : person.id === "zhen"
          ? m.ruby
          : person.crown === "imperial"
            ? m.goldLight
            : m.pearl;
    for (let i = 0; i < 3; i++)
      b.ball(
        i === 2 ? jewel : m.pearl,
        [side * 0.109, -0.063 - i * 0.026, 0.019],
        [0.005 + i * 0.002, 0.007 + i * 0.002, 0.005 + i * 0.002],
        10,
      );
  }
  root.add(b.finish("hair-and-jewellery"));
  return root;
}

function buildCharacter(materials, person, index) {
  const m = { ...materials, skin: personSkin(materials, person) };
  const root = new THREE.Group();
  root.name = person.id;
  root.position.set(...person.position);
  root.rotation.y = person.yaw;
  const moving = person.id === "qi",
    initialStanding = person.standing || false;
  const morphs = [];
  const bodyBuilder = new Builder();
  const part = (fn, material) => {
    if (moving) {
      const base = fn(false),
        target = fn(true);
      base.morphAttributes.position = [target.attributes.position];
      base.morphAttributes.normal = [target.attributes.normal];
      const mesh = new THREE.Mesh(base, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      morphs.push(mesh);
    } else bodyBuilder.add(fn(initialStanding), material);
  };
  part((s) => robe(s), m.silk[person.fabric] || m.silk.attendant);
  part(
    (s) => robe(s, 0.07, 0.19, 0.0035),
    person.id === "qi" ? m.silk.coral : m.trim,
  );
  part((s) => robe(s, 0.945, 0.978, 0.0035), m.trim);
  for (const side of [-1, 1]) {
    part(
      (s) => sleeve(s, side, person.id),
      m.silk[person.fabric] || m.silk.attendant,
    );
    part((s) => sleeve(s, side, person.id, 0.79, 0.93, 0.003), m.trim);
    part((s) => sleeve(s, side, person.id, 0.945, 1, 0.004), m.scarf);
  }
  part((s) => scarf(s), m.scarf);
  if (!moving) root.add(bodyBuilder.finish("robes"));
  const upper = new THREE.Group();
  upper.name = "neck-and-ornaments";
  const b = new Builder();
  b.cylinder(m.skin, [0, 0.024, -0.006], 0.053, 0.061, 0.16, 20);
  b.cylinder(m.scarf, [0, -0.012, 0.003], 0.068, 0.081, 0.057, 24);
  if (person.id === "qi") {
    for (let i = 0; i <= 26; i++) {
      const a = (i / 26) * Math.PI;
      b.ball(
        i % 5 === 0 ? m.gold : m.ruby,
        [
          Math.cos(a) * 0.103,
          -0.064 - Math.sin(a) * 0.273,
          0.14 + Math.sin(a) * 0.023,
        ],
        [0.007, 0.009, 0.006],
        8,
      );
    }
    b.ball(m.jade, [0, -0.35, 0.17], [0.025, 0.033, 0.004], 12);
  }
  if (person.id === "empress" || person.id === "zhen") {
    flower3D(b, m.gold, [0.036, -0.23, 0.171], 0.017, 6);
    flower3D(b, m.gold, [0.033, -0.3, 0.17], 0.013, 5);
  }
  upper.add(b.finish("collar"));
  root.add(upper);
  const head = createHead(m, person, index);
  root.add(head);
  const hands = [-1, 1].map((side) => {
    const h = hand(m, side, person.id);
    root.add(h);
    return h;
  });
  const shoes = new Builder();
  for (const side of [-1, 1]) {
    shoes.ball(
      m.shoe,
      [side * 0.085, 0.045, initialStanding ? 0.08 : 0.49],
      [0.06, 0.033, 0.13],
      12,
    );
    shoes.cylinder(
      m.scarf,
      [side * 0.085, 0.024, initialStanding ? 0.08 : 0.43],
      0.031,
      0.036,
      0.05,
      10,
    );
  }
  root.add(shoes.finish("shoes"));

  const headBase = person.yaw === 0 ? 0 : person.position[0] < 0 ? -0.24 : 0.24;
  root.userData.focus = new THREE.Vector3();
  function pose(stand = initialStanding ? 1 : 0, time = 0, active = false) {
    for (const mesh of morphs) mesh.morphTargetInfluences[0] = stand;
    const ny = THREE.MathUtils.lerp(1.12, 1.5, stand);
    upper.position.y = ny;
    head.position.set(0, ny + 0.137 + Math.sin(time * 0.88 + index) * 0.002, 0);
    head.rotation.y =
      headBase +
      Math.sin(time * 0.24 + index) * 0.014 +
      (active ? Math.sin(time * 1.7) * 0.012 : 0);
    head.rotation.z = Math.sin(time * 0.51 + index * 2) * 0.007;
    for (let i = 0; i < 2; i++) {
      const a = wrist(false, i === 0 ? -1 : 1, person.id),
        b = wrist(true, i === 0 ? -1 : 1, person.id);
      hands[i].position.set(
        ...a.map((n, k) => THREE.MathUtils.lerp(n, b[k], stand)),
      );
      hands[i].rotation.set(-0.7, 0, (i === 0 ? -1 : 1) * 0.42);
    }
    root.userData.focus.set(0, ny + 0.145, 0.035);
  }
  pose();
  root.userData.person = person;
  return {
    root,
    head,
    pose,
    person,
    focus() {
      return root.localToWorld(root.userData.focus.clone());
    },
  };
}

export function createCast(m) {
  const group = new THREE.Group();
  group.name = "the-assembled-court";
  const actors = new Map();
  PEOPLE.forEach((p, i) => {
    const actor = buildCharacter(m, p, i);
    group.add(actor.root);
    actors.set(p.id, actor);
  });
  let index = 10;
  for (const p of PEOPLE.filter((p) => p.id !== "empress")) {
    const person = {
      id: `attendant-${p.id}`,
      fabric: p.id === "qi" ? "rose" : "attendant",
      position: [Math.sign(p.position[0]) * 3.7, 0, p.position[2] - 0.15],
      yaw: (Math.sign(p.position[0]) * -Math.PI) / 2,
      crown: "simple",
      standing: true,
    };
    const actor = buildCharacter(m, person, index++);
    group.add(actor.root);
    actors.set(person.id, actor);
  }
  for (const side of [-1, 1]) {
    const p = {
      id: `empress-attendant-${side}`,
      fabric: side < 0 ? "blue" : "lilac",
      position: [side * 1.12, 0.31, -5.77],
      yaw: 0,
      crown: side < 0 ? "simple" : "simple",
      standing: true,
    };
    const actor = buildCharacter(m, p, index++);
    group.add(actor.root);
    actors.set(p.id, actor);
    if (side < 0) {
      const b = new Builder();
      b.cylinder(m.red, [0, 0.135, 0], 0, 0.175, 0.15, 24);
      b.cylinder(m.hair, [0, 0.061, 0], 0.17, 0.17, 0.018, 24);
      b.ball(m.gold, [0, 0.22, 0], [0.016, 0.022, 0.016], 10);
      actor.head.add(b.finish("court-official-hat"));
    }
  }
  function update(time, active = "") {
    const rise = THREE.MathUtils.smoothstep(time, 7.0, 9.4);
    const turn = THREE.MathUtils.smoothstep(time, 113, 116.5);
    for (const [id, actor] of actors) {
      actor.pose(
        id === "qi" ? rise : actor.person.standing ? 1 : 0,
        time,
        id === active,
      );
      if (id === "qi") {
        actor.root.position.x = THREE.MathUtils.lerp(SEATS.qi[0], 2.18, rise);
        actor.root.position.z = THREE.MathUtils.lerp(SEATS.qi[2], 0.15, rise);
        const forward = THREE.MathUtils.lerp(
          -Math.PI / 2,
          -Math.PI + 0.2,
          rise,
        );
        actor.root.rotation.y = THREE.MathUtils.lerp(
          forward,
          -Math.PI * 1.5,
          turn,
        );
        actor.head.rotation.y = turn * 0.15;
      }
    }
  }
  return { group, actors, update };
}
