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
import { ROTOR, PLINTH, STEP_DEG } from './layout';
import { advance, makeTracks, retarget } from './tracks';

export interface SceneHandle {
  frame(now: number): void;
  resize(): void;
  setScroll(v: number): void;
  /** `typed` sinks its cap, `lit` glows its lamp; either may be '' for a reset. */
  press(typed: string, lit: string, windows: number[]): void;
  /** Relight for the page's ground. The machine is the same object in both. */
  setTheme(mode: 'day' | 'night'): void;
  setReduced(on: boolean): void;
  drawCalls: number;
  dispose(): void;
}

// Recomposed for the taller case and the plinth: the hero sits near eye level
// so the machine reads as a chest on a table, not a floor plan.
const CAMERA_STOPS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [4.0, 2.5, 7.2], look: [0, 1.2, 0.1] },
  { pos: [1.1, 5.6, 4.6], look: [0, 1.6, -0.6] },
  { pos: [-3.4, 2.6, 5.0], look: [-0.2, 1.3, -0.4] },
  { pos: [0.2, 2.2, 4.3], look: [0, 1.5, 0.5] },
  { pos: [5.4, 3.8, 7.1], look: [0, 1.2, 0] },
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
    // Transparent, so the machine sits on whatever ground the page is using
    // instead of on a black plate that only agrees with one theme.
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
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
  // or it reads as a hole cut in the page. Night's fill dropped with the
  // redesign: at 0.5 it washed the wrinkle enamel up to plastic grey.
  const LIGHT = {
    night: { key: 1.7, keyHue: 0xfff1de, sky: 0x9fb6d8, ground: 0x0a0a0c, fill: 0.09, rim: 1.4, exposure: 1.0 },
    day: { key: 2.1, keyHue: 0xfff6ea, sky: 0xffffff, ground: 0xd8d2c4, fill: 1.15, rim: 0.7, exposure: 1.2 },
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

  // The machine finally stands on something: a shadow-catcher at the plinth's
  // base. The renderer stays transparent; only the shadow lands.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.45 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = PLINTH.y - PLINTH.h / 2;
  ground.receiveShadow = true;
  scene.add(ground);

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
  // The keystroke: one scalar from 1 to 0 drives both the cap and the lamp, so
  // they cannot drift out of step.
  const STROKE_S = 0.26;
  let stroke = 0;
  let held = '';
  let glowing = '';

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

    press(typed: string, lit: string, windows: number[]) {
      // Release whatever is still held, so a fast typist cannot strand a cap down
      // or leave two lamps burning.
      if (machine) {
        if (held) machine.setKeyTravel(held, 0);
        if (glowing) machine.setLamp(glowing, 0);
      }
      held = typed;
      glowing = lit;
      stroke = typed || lit ? 1 : 0;
      // Rotor angles are always exact multiples of 360/26 — the quantisation the
      // dial pole showed is what makes the motion read as mechanical.
      windows.forEach((w, i) => {
        rotorTargets[i] = -w * STEP_DEG * (Math.PI / 180);
      });
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

      machine.rotors.forEach((pivot, idx) => {
        const spread = tracks.spread.value * 0.62;
        pivot.position.x = (idx - 1) * (ROTOR.gap + spread);
        // The explode must clear the shroud it now rises out of: 0.84 just to
        // lift the flange bottoms over the fascia, and each rotor goes further.
        pivot.position.y = ROTOR.y + tracks.spread.value * (1.0 + idx * 0.18);
        // Approach the quantised target; the settle is what sells the detent.
        pivot.rotation.x += (rotorTargets[idx] - pivot.rotation.x) * (1 - Math.pow(1 - 0.14, dt * 60));
      });

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
      env?.dispose();
      renderer.dispose();
    },
  };

  return handle;
}
