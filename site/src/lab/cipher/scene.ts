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
import { ROTOR, STEP_DEG } from './layout';
import { advance, makeTracks, retarget } from './tracks';

export interface SceneHandle {
  frame(now: number): void;
  resize(): void;
  setScroll(v: number): void;
  press(letter: string, windows: number[]): void;
  setReduced(on: boolean): void;
  drawCalls: number;
  dispose(): void;
}

const CAMERA_STOPS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [3.9, 3.15, 6.2], look: [0, 1.15, 0] },
  { pos: [1.1, 5.4, 4.5], look: [0, 1.5, -0.6] },
  { pos: [-3.2, 2.5, 4.9], look: [-0.2, 1.2, -0.4] },
  { pos: [0.2, 2.05, 4.15], look: [0, 1.35, 0.5] },
  { pos: [5.2, 3.6, 6.9], look: [0, 1.1, 0] },
];

const lerp3 = (a: number[], b: number[], t: number, out: THREE.Vector3): THREE.Vector3 =>
  out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

export function mountScene(
  canvas: HTMLCanvasElement,
  palette: Palette,
  hdriUrl: string,
  onReady: (ok: boolean) => void,
): SceneHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    onReady(false);
    return null;
  }
  // Software rasterisers report a SwiftShader/llvmpipe renderer string; this
  // machine is one, so the still-frame path below is what gets exercised here.
  const debug = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
  const gpuName = debug ? String(renderer.getContext().getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|software|basic render/i.test(gpuName);

  renderer.setPixelRatio(Math.min(devicePixelRatio, software ? 1 : 1.75));
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

  const key = new THREE.DirectionalLight(0xfff1de, 2.5);
  key.position.set(3.4, 6.2, 3.1);
  key.castShadow = !software;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.bias = -0.0006;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0x9fb6d8, 0x0a0a0c, 0.5));

  let machine: Machine | null = null;
  let env: THREE.Texture | null = null;
  const tracks = makeTracks();
  let reduced = false;
  let visible = true;
  let hidden = document.hidden;
  let lost = false;
  let shadowDirty = true;
  /** Software rasterisers render on demand only; a real GPU renders every frame. */
  let needsRender = true;
  let last = performance.now();
  const rotorTargets = [0, 0, 0];

  const build = () => {
    machine = buildMachine(palette, env);
    scene.add(machine.root);
    handle.drawCalls = machine.drawCalls;
    shadowDirty = needsRender = true;
    onReady(true);
  };

  // The HDRI is the single biggest lever on whether brass reads as metal, so it
  // is loaded before the machine; if it fails, the machine still builds unlit-ish
  // rather than not at all.
  import('three/examples/jsm/loaders/RGBELoader.js')
    .then(({ RGBELoader }) => new RGBELoader().loadAsync(hdriUrl))
    .then((hdr) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      pmrem.dispose();
      build();
    })
    .catch(build);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    canvas.classList.add('is-lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    shadowDirty = needsRender = true;
    canvas.classList.remove('is-lost');
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

    press(letter: string, windows: number[]) {
      void letter;
      // Rotor angles are always exact multiples of 360/26 — the quantisation the
      // dial pole showed is what makes the motion read as mechanical.
      windows.forEach((w, i) => {
        rotorTargets[i] = -w * STEP_DEG * (Math.PI / 180);
      });
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
        key.position.x = 3.4 + Math.sin(t / 19) * 0.9;
        key.position.z = 3.1 + Math.cos(t / 23) * 0.7;
      }
      camera.lookAt(look);

      machine.root.rotation.y = tracks.yaw.value;

      machine.rotors.forEach((pivot, idx) => {
        const spread = tracks.spread.value * 0.62;
        pivot.position.x = (idx - 1) * (ROTOR.gap + spread);
        pivot.position.y = ROTOR.y + tracks.spread.value * (0.3 + idx * 0.09);
        // Approach the quantised target; the settle is what sells the detent.
        pivot.rotation.x += (rotorTargets[idx] - pivot.rotation.x) * (1 - Math.pow(1 - 0.14, dt * 60));
      });

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
      env?.dispose();
      renderer.dispose();
    },
  };

  return handle;
}
