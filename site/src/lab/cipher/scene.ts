// Renderer, lighting and the motion law.
//
// The motion law is the reason for the rebuild. The old page ran ONE scrubbed
// GSAP timeline over four sequential camera keyframes, which is why it felt
// linear: a single scalar drove a single curve. Here scroll normalises to
// v in [0,4] and is then read by five tracks that each ease toward their own
// target at their OWN rate. The rates are deliberately non-harmonic, so the
// tracks drift apart and nothing arrives together — the drift IS the
// non-linearity. Two more motions run off wall-clock, never touching scroll, so
// the machine is never completely still.
//
// Technique measured off experiment.obys.agency, which lerps per subsystem
// (0.05 planes, 0.1 scroll, 0.15 cursor) rather than per input; applying it per
// subsystem here is ours.

import * as THREE from 'three';
import { buildMachine, type Machine, type Palette } from './machine';
import { advance, makeTracks, retarget } from './tracks';
import { isSoftwareRenderer } from '../../shared/gpu';

export interface SceneHandle {
  frame(now: number): void;
  resize(): void;
  setScroll(v: number): void;
  /** `typed` sinks its cap, `lit` glows its lamp; either may be '' for a reset.
   *  Rotor positions are deliberately not passed: the model's rotors are sealed
   *  behind their cover, so stepping is shown in the readout, not in the mesh. */
  press(typed: string, lit: string): void;
  /** Relight for the page's ground. The machine is the same object in both. */
  setTheme(mode: 'day' | 'night'): void;
  setReduced(on: boolean): void;
  drawCalls: number;
  dispose(): void;
}

// Composed around the real machine: body 4.4 wide on the table, deck at 3.2,
// the open lid rising to 8.2 behind it.
//
// Every stop has to leave its chapter's copy column legible, and the copy
// alternates sides — hero left, then right, left, right, left. So each stop
// swings the machine to the OPPOSITE side, and the close-ups sit back far
// enough that the object stops covering the whole frame. The earlier set framed
// stops 1-3 at 2.3-2.65× the frame, which put dense keyboard detail under the
// body copy and made it unreadable.
//
// scene.verify.mjs imports this array and asserts the clearance, so these
// numbers cannot drift without a check failing. Exported for exactly that.
// Solved by stops.tune.mjs, which holds each stop's viewing ANGLE fixed — that
// angle is the art direction — and moves only the distance back along it and the
// aim along x. The hero keeps its original framing: its 20% overlap is the
// composition, the display face crossing the machine's dark lower body, and the
// copy there is 60px type rather than a paragraph.
export const CAMERA_STOPS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [7.5, 7.0, 14.0], look: [-1.1, 3.1, 0] },
  { pos: [2.0, 16.9, 10.6], look: [1.5, 2.4, -0.2] },
  { pos: [-17.5, 7.1, 23.4], look: [-2.1, 2.8, 0.2] },
  { pos: [0.5, 5.9, 13.0], look: [1.5, 2.9, 0.6] },
  { pos: [9.5, 6.8, 16.8], look: [-2.1, 3.2, 0] },
];

const lerp3 = (a: number[], b: number[], t: number, out: THREE.Vector3): THREE.Vector3 =>
  out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

export function mountScene(
  canvas: HTMLCanvasElement,
  palette: Palette,
  hdriUrl: string,
  glbUrl: string,
  onReady: (ok: boolean) => void,
): SceneHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    // Transparent, so the machine sits on whatever ground the page is using
    // instead of on a black plate that only agrees with one theme.
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
  } catch {
    onReady(false);
    return null;
  }
  // Renderer string first, timed GPU probe when the browser withholds it — see
  // shared/gpu.ts. The comment that used to sit here claimed this dev machine was
  // a software rasteriser; it is an Apple M5 Max, so the on-demand path below is
  // NOT what local development exercises. Force it with Chrome's
  // --use-angle=swiftshader if you need to see that rung.
  const software = isSoftwareRenderer(renderer.getContext());

  renderer.setPixelRatio(Math.min(devicePixelRatio, software ? 1 : 1.75));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Shadows are static except when the machine moves; the old build re-rendered
  // the whole 2048 map every frame for 31 casters.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 60);
  const look = new THREE.Vector3();

  // Two lighting poses. Night is a lit object in a dark room; day is the same
  // object on drafting paper, which needs a brighter bounce and less contrast
  // or it reads as a hole cut in the page. env is the HDRI's IBL, kept LOW:
  // the lesson of the plastic-grey rebuild was that a strong env washes the
  // wrinkle enamel flat.
  const LIGHT = {
    night: { key: 1.7, keyHue: 0xfff1de, sky: 0x9fb6d8, ground: 0x0a0a0c, fill: 0.09, rim: 1.4, exposure: 1.0, env: 0.22 },
    day: { key: 2.1, keyHue: 0xfff6ea, sky: 0xffffff, ground: 0xd8d2c4, fill: 1.15, rim: 0.7, exposure: 1.2, env: 0.55 },
  } as const;

  // Off to the side more than overhead: straight-down light turned the whole
  // deck into one broad specular sheet.
  const key = new THREE.DirectionalLight(LIGHT.night.keyHue, LIGHT.night.key);
  key.position.set(4.6, 5.6, 2.4);
  key.castShadow = !software;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.bias = -0.0006;
  scene.add(key);
  const fill = new THREE.HemisphereLight(LIGHT.night.sky, LIGHT.night.ground, LIGHT.night.fill);
  scene.add(fill);
  // Cool rim from behind-left, so the brass crowns and the case edges separate
  // from the void instead of dissolving into it.
  const rim = new THREE.DirectionalLight(0x8fb4e8, LIGHT.night.rim);
  rim.position.set(-4.5, 2.8, -4);
  scene.add(rim);

  // The machine stands on the page's ground: a shadow-catcher at the case's
  // base. The renderer stays transparent; only the shadow lands.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.45 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let machine: Machine | null = null;
  const tracks = makeTracks();
  let reduced = false;
  let visible = true;
  let hidden = document.hidden;
  let lost = false;
  let shadowDirty = true;
  /** Software rasterisers render on demand only; a real GPU renders every frame. */
  let needsRender = true;
  let last = performance.now();
  // The keystroke: one scalar from 1 to 0 drives both the cap and the lamp, so
  // they cannot drift out of step.
  const STROKE_S = 0.34;
  let stroke = 0;
  let held = '';
  let glowing = '';

  const build = async () => {
    machine = await buildMachine(glbUrl, palette);
    scene.add(machine.root);
    handle.drawCalls = machine.drawCalls;
    shadowDirty = needsRender = true;
    onReady(true);
  };

  // The HDRI is the single biggest lever on whether the paint and brass read as
  // real, so it loads before the machine; if it fails, the machine still builds
  // unlit-ish rather than not at all. The GLB loads in parallel.
  const hdri = import('three/examples/jsm/loaders/HDRLoader.js')
    .then(({ HDRLoader }) => new HDRLoader().loadAsync(hdriUrl))
    .then((hdr) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      scene.environmentIntensity = LIGHT.night.env;
      hdr.dispose();
      pmrem.dispose();
    })
    .catch(() => {});
  Promise.all([hdri, build()]).catch(() => onReady(false));

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    canvas.classList.add('is-lost');
    // Hand the page back to the Proof register. Without this the canvas is
    // hidden by .is-lost while data-webgl stays 'on', so the drawing stays
    // display:none too and a lost context leaves nothing on screen at all.
    delete document.documentElement.dataset.webgl;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    shadowDirty = needsRender = true;
    canvas.classList.remove('is-lost');
    document.documentElement.dataset.webgl = 'on';
  });
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(canvas);

  const handle: SceneHandle = {
    drawCalls: 0,

    setScroll(v: number) {
      retarget(tracks, v, CAMERA_STOPS.length);
      needsRender = true;
    },

    press(typed: string, lit: string) {
      // Release whatever is still held, so a fast typist cannot strand a cap down
      // or leave two lamps burning.
      if (machine) {
        if (held) machine.setKeyTravel(held, 0);
        if (glowing) machine.setLamp(glowing, 0);
      }
      held = typed;
      glowing = lit;
      stroke = typed || lit ? 1 : 0;
      shadowDirty = needsRender = true;
    },

    setTheme(mode: 'day' | 'night') {
      const p = LIGHT[mode];
      key.intensity = p.key;
      key.color.setHex(p.keyHue);
      fill.color.setHex(p.sky);
      fill.groundColor.setHex(p.ground);
      fill.intensity = p.fill;
      rim.intensity = p.rim;
      renderer.toneMappingExposure = p.exposure;
      scene.environmentIntensity = p.env;
      shadowDirty = needsRender = true;
    },

    setReduced(on: boolean) {
      reduced = on;
    },

    resize() {
      const w = canvas.clientWidth || innerWidth;
      const h = canvas.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      shadowDirty = needsRender = true;
    },

    frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (lost || !machine) return;
      if (!visible || hidden) return;
      // A software rasteriser paints once per change, not once per frame; a real
      // GPU runs continuously because the idle motions below need it to.
      if (software && !needsRender) return;
      needsRender = false;

      if (reduced) {
        Object.values(tracks).forEach((t) => (t.value = t.target));
      } else {
        Object.values(tracks).forEach((t) => advance(t, dt));
      }

      const c = tracks.camera.value;
      const i = Math.max(0, Math.min(CAMERA_STOPS.length - 2, Math.floor(c)));
      const f = Math.max(0, Math.min(1, c - i));
      lerp3(CAMERA_STOPS[i].pos, CAMERA_STOPS[i + 1].pos, f, camera.position);
      lerp3(CAMERA_STOPS[i].look, CAMERA_STOPS[i + 1].look, f, look);

      // Wall-clock motions, deliberately desynced from each other and from
      // scroll, so the object breathes even when the page is untouched.
      const t = now / 1000;
      if (!reduced) {
        camera.position.x += Math.sin(t / 31) * 0.16;
        camera.position.y += Math.cos(t / 19) * 0.09;
        key.position.x = 4.6 + Math.sin(t / 19) * 0.9;
        key.position.z = 2.4 + Math.cos(t / 23) * 0.7;
      }
      camera.lookAt(look);

      machine.root.rotation.y = tracks.yaw.value;

      // The anatomy explode: one scroll track fans the machine into its parts —
      // keys forward, lamps up, lid and cover peeling back. The rotors are
      // sealed inside the real machine's drums, so the explode shows the
      // object as a cabinet of components, not its wheel train.
      machine.explode(tracks.spread.value);

      if (stroke > 0) {
        if (reduced) {
          // No stroke, but the answer must still be readable: the lamp goes to
          // full and stays there until the next key clears it.
          stroke = 0;
          if (held) machine.setKeyTravel(held, 0);
          if (glowing) machine.setLamp(glowing, 1);
        } else {
          stroke = Math.max(0, stroke - dt / STROKE_S);
          if (held) machine.setKeyTravel(held, stroke);
          if (glowing) machine.setLamp(glowing, stroke);
          if (stroke === 0) held = glowing = '';
        }
        shadowDirty = true;
        needsRender = true;
      }

      if (shadowDirty && !software) {
        renderer.shadowMap.needsUpdate = true;
        shadowDirty = false;
      }
      renderer.render(scene, camera);
      // Tracks still settling, or idle motion running, means another frame is due.
      if (!software) return;
      const settling = Object.values(tracks).some((t) => Math.abs(t.target - t.value) > 0.001);
      if (settling) needsRender = true;
    },

    dispose() {
      machine?.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    },
  };

  return handle;
}
