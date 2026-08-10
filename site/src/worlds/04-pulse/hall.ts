import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { mulberry32 } from '../../shared/rng';
import { makeGlowSprite, makeSpeckleCanvas, drawSpeckle } from './assets';
import { isSoftwareRenderer } from '../../shared/gpu';

// THE MACHINE HALL — one continuous 48-unit toy machine, filleted primitives
// only (nothing sharp, nothing downloaded). ONE shadow light tracks the
// pulse; at night the protagonist literally becomes the hall's light.
// NeutralToneMapping — ACES hue-shifts this red (the Sundial lesson).

type ThemeName = 'day' | 'night';

export interface HallHandle {
  isLive: boolean;
  warmup: () => void;
  run: () => void;
  setTheme: (t: ThemeName) => void;
  stationPose: (n: number, instant?: boolean) => void;
  birthPulse: () => void;
  travelTo: (n: number, onArrive: () => void) => void;
  beat: (n: number) => void;
  finale: () => void;
  reset: () => void;
  renderStill: (n: number) => void;
  dispose: () => void;
}

const WIRE_PTS: [number, number, number][] = [
  [0, 0.6, 0],
  [6, 0.6, -3],
  [12, 0.6, -4],
  [18, 0.6, 0],
  [24, 0.6, 3],
  [30, 0.6, 1],
  [36, 0.6, -3],
  [42, 0.6, -2],
  [48, 0.6, 0],
];

const STATION_POSES: { cam: [number, number, number]; look: [number, number, number] }[] = [
  { cam: [0, 0, 0], look: [0, 0, 0] }, // unused
  { cam: [-3.5, 3.2, 6.5], look: [0, 1.1, 0] },
  { cam: [9, 2.6, 5.5], look: [12, 1.4, -4] },
  { cam: [21, 3.4, 7], look: [24, 2.2, 3] },
  { cam: [33.5, 4.2, 5.5], look: [36, 0.9, -3] },
  { cam: [44, 2.8, 7.5], look: [48, 2.4, 0] },
];

const GOD_POSE = { cam: [24, 16, 26] as [number, number, number], look: [24, 1.5, 0] as [number, number, number] };

export function mountHall(canvas: HTMLCanvasElement, initialTheme: ThemeName): HallHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null; // rung 3: the diagram journey takes over
  }
  const software = isSoftwareRenderer(renderer.getContext());
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderer.setPixelRatio(software ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.autoUpdate = false; // dirty-flagged during travel/beats/retune

  const night0 = initialTheme === 'night';
  renderer.setClearColor(night0 ? 0x302c35 : 0x4b4a53);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(...STATION_POSES[1].cam);
  camera.lookAt(...STATION_POSES[1].look);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // ── Materials (seven shared, per the law) ──
  const matRed = new THREE.MeshStandardMaterial({ color: 0xe5262c, roughness: 0.35, metalness: 0 });
  const matPink = new THREE.MeshStandardMaterial({ color: 0xf9cfd1, roughness: 0.35, metalness: 0 });
  const matPlumDeep = new THREE.MeshStandardMaterial({ color: night0 ? 0x262230 : 0x302c35, roughness: 0.35, metalness: 0 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0 });
  const matGround = new THREE.MeshStandardMaterial({ color: night0 ? 0x38363f : 0x46454f, roughness: 0.9, metalness: 0 });
  const matBasicPink = new THREE.MeshBasicMaterial({ color: 0xfdd2d2 });
  const glowTex = new THREE.CanvasTexture(makeGlowSprite());
  const spriteMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity: night0 ? 0.8 : 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const tailMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const m of [matRed, matPink, matPlumDeep, matWhite]) m.envMapIntensity = night0 ? 0.15 : 0.25;

  const speckleCanvas = makeSpeckleCanvas();
  drawSpeckle(speckleCanvas, night0 ? '#38363f' : '#46454f');
  const speckleTex = new THREE.CanvasTexture(speckleCanvas);
  speckleTex.wrapS = speckleTex.wrapT = THREE.RepeatWrapping;
  speckleTex.repeat.set(8, 8);
  matGround.map = speckleTex;

  // ── Lights: ONE shadow key + hemisphere + the night-only protagonist ──
  const key = new THREE.DirectionalLight(0xffffff, night0 ? 0.9 : 2.2);
  key.position.set(8, 14, 6);
  key.castShadow = !software;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  const hemi = new THREE.HemisphereLight(0xfdd2d2, 0x302c35, software ? 0.6 : night0 ? 0.15 : 0.35);
  const pulseLight = new THREE.PointLight(0xfdd2d2, night0 ? 20 : 0, 14, 2);
  scene.add(key, key.target, hemi, pulseLight);

  // ── [1] Ground ──
  const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 64), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── [2] The pulse ──
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), matWhite.clone());
  pulse.material.emissive = new THREE.Color(0xfdd2d2);
  pulse.material.emissiveIntensity = night0 ? 2.2 : 1.2;
  pulse.castShadow = true;
  const glow = new THREE.Sprite(spriteMat);
  glow.scale.setScalar(night0 ? 3 : 2.2);
  pulse.add(glow);
  pulse.visible = false;
  scene.add(pulse);
  pulseLight.position.copy(pulse.position);
  scene.remove(pulseLight);
  pulse.add(pulseLight); // the night promise: the protagonist IS the light

  // ── [3] S1 button ──
  const basePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(2.1, 0),
    new THREE.Vector2(2.4, 0.25),
    new THREE.Vector2(2.4, 0.6),
    new THREE.Vector2(2.15, 0.8),
    new THREE.Vector2(0.01, 0.8),
  ];
  const base = new THREE.Mesh(new THREE.LatheGeometry(basePts, 48), matPlumDeep);
  const capPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(1.75, 0),
    new THREE.Vector2(2.0, 0.25),
    new THREE.Vector2(2.0, 0.65),
    new THREE.Vector2(1.75, 0.9),
    new THREE.Vector2(0.01, 0.9),
  ];
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capPts, 48), matRed);
  cap.position.y = 0.8;
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 10, 48), matWhite);
  capRing.rotation.x = Math.PI / 2;
  capRing.position.y = 1.72;
  base.castShadow = cap.castShadow = true;
  scene.add(base, cap, capRing);

  // ── [4] Wire + chevrons + pylons ──
  const curve = new THREE.CatmullRomCurve3(WIRE_PTS.map((p) => new THREE.Vector3(...p)));
  const wireLen = curve.getLength();
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.18, 8, false), matPlumDeep);
  scene.add(wire);

  const CHEVRONS = 60;
  const chevronMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.18), matBasicPink, CHEVRONS);
  chevronMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(chevronMesh);

  const PYLONS = 24;
  const pylonMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), matPlumDeep, PYLONS);
  pylonMesh.castShadow = true;
  const tmpM = new THREE.Matrix4();
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < PYLONS; i++) {
    const u = (i + 0.5) / PYLONS;
    curve.getPointAt(u, tmpV);
    tmpM.compose(new THREE.Vector3(tmpV.x, 0.42, tmpV.z), tmpQ.identity(), tmpS);
    pylonMesh.setMatrixAt(i, tmpM);
  }
  scene.add(pylonMesh);

  // ── [5] Heat tail (travel only) ──
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.6, 4, 12), tailMat);
  tail.visible = false;
  scene.add(tail);

  // ── [6] S2 arch ──
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 16, 48, Math.PI), matRed);
  arch.position.set(12, 0.6, -4);
  arch.castShadow = true;
  const foot1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.7, 4, 10), matPlumDeep);
  foot1.position.set(9, 0.35, -4);
  const foot2 = foot1.clone();
  foot2.position.set(15, 0.35, -4);
  scene.add(arch, foot1, foot2);

  // ── [7] S3 spring + platform + payload ──
  const helixPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * Math.PI * 10;
    helixPts.push(new THREE.Vector3(Math.cos(a) * 1.2, (i / 100) * 1.6, Math.sin(a) * 1.2));
  }
  const spring = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 200, 0.22, 8, false),
    matPink,
  );
  spring.position.set(24, 0.1, 3);
  spring.castShadow = true;
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32), matRed);
  platform.position.set(24, 1.85, 3);
  const payload = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.4, 1.4, 4, 0.2), matWhite);
  payload.position.set(24, 2.85, 3);
  payload.castShadow = true;
  scene.add(spring, platform, payload);

  // ── [8] S4 cradle + halos ──
  const bowlPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(1.6, 0),
    new THREE.Vector2(2.0, 0.4),
    new THREE.Vector2(2.05, 0.9),
    new THREE.Vector2(1.85, 1.1),
    new THREE.Vector2(1.6, 0.95),
    new THREE.Vector2(1.55, 0.5),
    new THREE.Vector2(0.01, 0.35),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 48), matPink);
  bowl.position.set(36, 0.55, -3);
  bowl.castShadow = true;
  const halos: THREE.Mesh[] = [];
  [0.6, 0.45, 0.3].forEach((op, i) => {
    const h = new THREE.Mesh(
      new THREE.TorusGeometry(1.2 + i * 0.55, 0.06, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false }),
    );
    h.rotation.x = Math.PI / 2;
    h.position.set(36, 1.0, -3);
    h.renderOrder = 5 + i;
    halos.push(h);
    scene.add(h);
  });
  scene.add(bowl);

  // ── [9] S5 screen + pixels + panes ──
  const slab = new THREE.Mesh(new RoundedBoxGeometry(0.6, 4, 6, 4, 0.15), matPlumDeep);
  slab.position.set(49.4, 2.4, 0);
  slab.castShadow = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.4), matBasicPink.clone());
  face.position.set(49.05, 2.4, 0);
  face.rotation.y = -Math.PI / 2;
  scene.add(slab, face);

  const PIX = 16 * 9;
  const pixelMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffff }), PIX);
  const pixelBase = new THREE.Color(0x3d3c47);
  const pixelLit = new THREE.Color(0xfdd2d2);
  {
    let i = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 16; c++) {
        tmpM.compose(
          new THREE.Vector3(49.02, 1.2 + r * 0.34, -2.6 + c * 0.34),
          tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
          tmpS,
        );
        pixelMesh.setMatrixAt(i, tmpM);
        pixelMesh.setColorAt(i, pixelBase);
        i++;
      }
    }
  }
  scene.add(pixelMesh);

  const panes: THREE.Mesh[] = [];
  [0.35, 0.5, 0.65].forEach((op, i) => {
    const pane = new THREE.Mesh(
      new RoundedBoxGeometry(0.05, 2, 3, 2, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false }),
    );
    const u = 0.9 + i * 0.03;
    curve.getPointAt(u, tmpV);
    pane.position.set(tmpV.x, 1.6, tmpV.z);
    const tan = curve.getTangentAt(u, new THREE.Vector3());
    pane.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI / 2;
    pane.renderOrder = 10 + i;
    panes.push(pane);
    scene.add(pane);
  });

  // ── [10] Confetti (hidden until the finale) ──
  const CONF = 80;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF);
  confetti.visible = false;
  const confVel = new Float32Array(CONF * 3);
  const confSpin = new Float32Array(CONF * 3);
  const confColors = [new THREE.Color(0xffffff), new THREE.Color(0xfdd2d2), new THREE.Color(0xe5262c)];
  {
    const rnd = mulberry32(4);
    for (let i = 0; i < CONF; i++) {
      confVel.set([(rnd() * 2 - 1) * 3, 4 + rnd() * 4, (rnd() * 2 - 1) * 2], i * 3);
      confSpin.set([(rnd() - 0.5) * 12, (rnd() - 0.5) * 12, (rnd() - 0.5) * 12], i * 3);
      confetti.setColorAt(i, confColors[i % 3]);
    }
  }
  scene.add(confetti);
  let confT = -1;

  // ── Pixel flicker + cascade schedules (seeded) ──
  const flicker = { next: 0, idx: 0 };
  const flickerRnd = mulberry32(4);
  let cascadeT = -1;
  const cascadeOrder = Array.from({ length: 9 }, (_, r) => r);
  {
    const rnd = mulberry32(4);
    for (let i = cascadeOrder.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cascadeOrder[i], cascadeOrder[j]] = [cascadeOrder[j], cascadeOrder[i]];
    }
  }

  // ── State ──
  const wireU = { u: 0 };
  let traveling = false;
  let currentStation = 1; // 1-based; stations sit at curve points 0/2/4/6/8
  const uFor = (n: number) => (n - 1) / 4;
  const pointer = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  const camGoal = { pos: new THREE.Vector3(...STATION_POSES[1].cam), look: new THREE.Vector3(...STATION_POSES[1].look), rate: 0.94 };
  const lookCur = new THREE.Vector3(...STATION_POSES[1].look);
  const parallax = new THREE.Vector3();
  let beatLock = false;
  let bobY = 1.28;

  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener('pointermove', onPointer);

  const onResize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  onResize();
  addEventListener('resize', onResize);

  const lerpRate = (base: number, dt: number) => 1 - Math.pow(base, 60 * dt);

  function placePulseAtStation(n: number): void {
    wireU.u = uFor(n);
    curve.getPointAt(wireU.u, tmpV);
    bobY = tmpV.y + 0.68;
    pulse.position.set(tmpV.x, bobY, tmpV.z);
  }

  function render(): void {
    renderer.render(scene, camera);
  }

  // ── Beats (exact choreography per the station table) ──
  function beat(n: number): void {
    beatLock = true;
    const done = () => (beatLock = false);
    if (reduced) {
      done();
      return;
    }
    renderer.shadowMap.needsUpdate = true;
    switch (n) {
      case 1: {
        gsap.to(cap.scale, { y: 0.82, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 });
        pulse.position.set(0, 2.2, 0);
        pulse.visible = true;
        pulse.scale.setScalar(0.001);
        const tl = gsap.timeline({ onComplete: done });
        tl.to(pulse.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'pulsePop' }, 0.2)
          .to(pulse.position, { y: 1.28, duration: 0.5, ease: 'pulsePop' }, 0.7);
        break;
      }
      case 2: {
        const tl = gsap.timeline({ onComplete: done });
        tl.to(pulse.position, { y: pulse.position.y + 1.6, duration: 0.4, ease: 'pulsePop' }, 0)
          .to(arch.scale, { y: 1.06, duration: 0.3, ease: 'pulsePop', yoyo: true, repeat: 1 }, 0.15)
          .to(pulse.position, { y: 1.28, duration: 0.4, ease: 'pulsePop' }, 0.4);
        break;
      }
      case 3: {
        const tl = gsap.timeline({ onComplete: done });
        tl.to(spring.scale, { y: 0.75, duration: 0.25, ease: 'power2.in' }, 0)
          .to(spring.scale, { y: 1.12, duration: 0.35, ease: 'pulsePop' }, 0.25)
          .to([pulse.position, payload.position], { y: '+=1.5', duration: 0.3, ease: 'pulsePop' }, 0.3)
          .to(spring.scale, { y: 1.0, duration: 0.9, ease: 'pulsePop' }, 0.6)
          .to([pulse.position, payload.position], { y: '-=1.5', duration: 0.35, ease: 'power2.in' }, 0.75)
          .to([pulse.scale, payload.scale], { y: 0.8, duration: 0.1, yoyo: true, repeat: 1 }, 1.1)
          .to([pulse.scale, payload.scale], { y: 1, duration: 0.3, ease: 'pulsePop' }, 1.2);
        break;
      }
      case 4: {
        const tl = gsap.timeline({ onComplete: done });
        tl.to(pulse.position, { y: 1.05, duration: 0.5, ease: 'pulsePop' }, 0)
          .add(() => {
            bobY = 1.05;
          }, 0.5)
          .to(pulse.scale, { y: 0.85, duration: 0.12, yoyo: true, repeat: 1 }, 0.5);
        halos.forEach((h, i) => {
          gsap.fromTo(
            h.scale,
            { x: 1, y: 1, z: 1 },
            { x: 1.25, y: 1.25, z: 1.25, duration: 0.45, ease: 'pulsePop', yoyo: true, repeat: 1, delay: i * 0.15 },
          );
          gsap.to(h.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.9, ease: 'pulseFade', delay: 0.9 + i * 0.15 });
        });
        tl.add(() => undefined, 1.8);
        break;
      }
      case 5: {
        const tl = gsap.timeline({ onComplete: done });
        panes.forEach((p, i) => {
          tl.to(p.material, { opacity: '+=0.2', duration: 0.15, yoyo: true, repeat: 1 }, i * 0.2);
        });
        tl.to(pulse.scale, { z: 0.1, duration: 0.4, ease: 'pulsePop' }, 0.5)
          .to(pulse.material, { opacity: 0, duration: 0.3 }, 0.6)
          .to(face.material.color, { r: 1, g: 1, b: 1, duration: 0.15, yoyo: true, repeat: 1 }, 0.7)
          .add(() => {
            cascadeT = 0;
          }, 0.8);
        break;
      }
      default:
        done();
    }
  }

  // ── Theme retune (the 800ms clock is the caller's) ──
  function setTheme(t: ThemeName): void {
    const night = t === 'night';
    const dur = 0.8;
    renderer.setClearColor(night ? 0x302c35 : 0x4b4a53);
    gsap.to(key, { intensity: night ? 0.9 : 2.2, duration: dur });
    gsap.to(hemi, { intensity: night ? 0.15 : 0.35, duration: dur });
    gsap.to(pulseLight, { intensity: night ? 20 : 0, duration: dur });
    gsap.to(pulse.material, { emissiveIntensity: night ? 2.2 : 1.2, duration: dur });
    gsap.to(spriteMat, { opacity: night ? 0.8 : 0.55, duration: dur });
    for (const m of [matRed, matPink, matPlumDeep, matWhite]) {
      gsap.to(m, { envMapIntensity: night ? 0.15 : 0.25, duration: dur });
    }
    gsap.to(matPlumDeep.color, { r: (night ? 0x26 : 0x30) / 255, g: (night ? 0x22 : 0x2c) / 255, b: (night ? 0x30 : 0x35) / 255, duration: dur });
    gsap.to(matGround.color, { r: (night ? 0x38 : 0x46) / 255, g: (night ? 0x36 : 0x45) / 255, b: (night ? 0x3f : 0x4f) / 255, duration: dur });
    drawSpeckle(speckleCanvas, night ? '#38363f' : '#46454f');
    speckleTex.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
    if (software) render();
  }

  // ── The loop ──
  const clock = new THREE.Clock();
  let raf = 0;
  let running = false;

  function loop(): void {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsedTime();

    // Travel: 3 u/s along the wire.
    if (traveling) {
      wireU.u += (3 * dt) / wireLen;
      const target = uFor(currentStation);
      if (wireU.u >= target) {
        wireU.u = target;
        traveling = false;
        tail.visible = false;
      }
      curve.getPointAt(wireU.u, tmpV);
      bobY = tmpV.y + 0.68;
      pulse.position.set(tmpV.x, bobY, tmpV.z);
      // Heat tail 0.8u behind.
      const ub = Math.max(0, wireU.u - 0.8 / wireLen);
      curve.getPointAt(ub, tmpV);
      tail.position.set(tmpV.x, tmpV.y + 0.68, tmpV.z);
      curve.getTangentAt(ub, tmpV);
      tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmpV.normalize());
      renderer.shadowMap.needsUpdate = true;
    }

    // Idle bob at stations.
    if (!traveling && pulse.visible && !reduced && !beatLock) {
      pulse.position.y = bobY + Math.sin((t * 2 * Math.PI) / 1.6) * 0.15;
    }

    // Chevron drift 0.12 u/s.
    for (let i = 0; i < CHEVRONS; i++) {
      const u = ((i * 0.8 + t * 0.12) % wireLen) / wireLen;
      curve.getPointAt(u, tmpV);
      const tan = curve.getTangentAt(u, new THREE.Vector3());
      tmpQ.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tan.normalize());
      tmpM.compose(new THREE.Vector3(tmpV.x, tmpV.y + 0.28, tmpV.z), tmpQ, tmpS);
      chevronMesh.setMatrixAt(i, tmpM);
    }
    chevronMesh.instanceMatrix.needsUpdate = true;

    // Pixel flicker (seeded schedule) + cascade.
    if (t > flicker.next && cascadeT < 0) {
      flicker.next = t + 0.4 + flickerRnd() * 1.2;
      const idx = Math.floor(flickerRnd() * PIX);
      pixelMesh.setColorAt(idx, flickerRnd() < 0.5 ? pixelBase : pixelLit);
      pixelMesh.instanceColor!.needsUpdate = true;
    }
    if (cascadeT >= 0) {
      cascadeT += dt;
      const rows = Math.min(9, Math.floor((cascadeT / 0.8) * 9) + 1);
      for (let r = 0; r < rows; r++) {
        const row = cascadeOrder[r];
        for (let c = 0; c < 16; c++) pixelMesh.setColorAt(row * 16 + c, pixelLit);
      }
      pixelMesh.instanceColor!.needsUpdate = true;
      if (cascadeT > 1) cascadeT = -1;
    }

    // Confetti.
    if (confT >= 0) {
      confT += dt;
      for (let i = 0; i < CONF; i++) {
        const vx = confVel[i * 3];
        const vz = confVel[i * 3 + 2];
        tmpQ.setFromEuler(new THREE.Euler(confSpin[i * 3] * confT, confSpin[i * 3 + 1] * confT, confSpin[i * 3 + 2] * confT));
        tmpM.compose(
          new THREE.Vector3(48 + vx * confT, 2.4 + confVel[i * 3 + 1] * confT - 4.5 * confT * confT, vz * confT),
          tmpQ,
          tmpS,
        );
        confetti.setMatrixAt(i, tmpM);
      }
      confetti.instanceMatrix.needsUpdate = true;
      if (confT > 1.2) {
        confT = -1;
        confetti.visible = false;
      }
    }

    // Camera: the measured lerps.
    smooth.x += (pointer.x - smooth.x) * 0.05;
    smooth.y += (pointer.y - smooth.y) * 0.05;
    parallax.set(smooth.x * 0.4, -smooth.y * 0.4, 0);
    const atStation = !traveling;
    camera.position.lerp(atStation ? tmpV.copy(camGoal.pos).add(parallax) : camGoal.pos, lerpRate(camGoal.rate, dt));
    lookCur.lerp(camGoal.look, lerpRate(camGoal.rate, dt));
    camera.lookAt(lookCur);

    // The key light tracks its hero.
    key.position.set(pulse.position.x + 8, pulse.position.y + 14, pulse.position.z + 6);
    key.target.position.copy(pulse.position);
    key.target.updateMatrixWorld();

    render();
    if (running) raf = requestAnimationFrame(loop);
  }

  function warmup(): void {
    render(); // one warm frame under the poster, dodges the cold-start hitch
  }

  function run(): void {
    if (running || software) return;
    running = true;
    clock.getDelta();
    loop();
  }

  const onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      running = false;
    } else {
      run();
    }
  };
  document.addEventListener('visibilitychange', onVis);

  const onLost = (e: Event) => {
    e.preventDefault();
    document.body.classList.add('is-fallback');
  };
  canvas.addEventListener('webglcontextlost', onLost);

  function renderStillFrame(n: number): void {
    // Software path: place everything, render exactly one frame.
    placePulseAtStation(n);
    pulse.visible = true;
    camera.position.set(...STATION_POSES[n].cam);
    lookCur.set(...STATION_POSES[n].look);
    camera.lookAt(lookCur);
    render();
  }

  return {
    isLive: !software,
    warmup,
    run,
    setTheme,
    stationPose: (n, instant) => {
      currentStation = n;
      const pose = STATION_POSES[n];
      camGoal.pos.set(...pose.cam);
      camGoal.look.set(...pose.look);
      camGoal.rate = 0.94;
      if (instant) {
        camera.position.copy(camGoal.pos);
        lookCur.copy(camGoal.look);
        camera.lookAt(lookCur);
      }
      placePulseAtStation(n);
    },
    birthPulse: () => {
      if (reduced) {
        pulse.visible = true;
        placePulseAtStation(1);
      } else {
        beat(1);
      }
    },
    travelTo: (n, onArrive) => {
      const arrive = () => {
        currentStation = n;
        camGoal.pos.set(...STATION_POSES[n].cam);
        camGoal.look.set(...STATION_POSES[n].look);
        camGoal.rate = 0.94;
        onArrive();
      };
      if (reduced || software) {
        placePulseAtStation(n);
        if (software) renderStillFrame(n);
        arrive();
        return;
      }
      currentStation = n;
      traveling = true;
      tail.visible = true;
      camGoal.pos.copy(pulse.position).add(new THREE.Vector3(0, 8, 8));
      camGoal.look.copy(pulse.position);
      camGoal.rate = 0.96;
      const check = setInterval(() => {
        if (!traveling) {
          clearInterval(check);
          arrive();
        }
      }, 60);
    },
    beat,
    finale: () => {
      camGoal.pos.set(...GOD_POSE.cam);
      camGoal.look.set(...GOD_POSE.look);
      camGoal.rate = 0.95;
      confetti.visible = true;
      confT = 0;
      if (software) render();
    },
    reset: () => {
      pulse.visible = true;
      pulse.material.opacity = 1;
      pulse.scale.setScalar(1);
      for (let i = 0; i < PIX; i++) pixelMesh.setColorAt(i, pixelBase);
      pixelMesh.instanceColor!.needsUpdate = true;
      halos.forEach((h) => h.scale.setScalar(1));
      wireU.u = 0;
      currentStation = 1;
      placePulseAtStation(1);
      camGoal.pos.set(...STATION_POSES[1].cam);
      camGoal.look.set(...STATION_POSES[1].look);
      camera.position.copy(camGoal.pos);
      lookCur.copy(camGoal.look);
      beatLock = false;
    },
    renderStill: (n) => renderStillFrame(n),
    dispose: () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('resize', onResize);
      removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('webglcontextlost', onLost);
      envRT.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
