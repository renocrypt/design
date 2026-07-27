import * as THREE from 'three';
import { mulberry32 } from '../../shared/rng';
import type { Poster } from './posters';

// The Formation Gallery — 32 seeded posters in an UNLIT shader (the wash is
// the lighting), five formations, per-frame lerp everything. No lights, no
// shadows, no HDRI — subtraction is the material.

type ThemeName = 'day' | 'night';

export interface GalleryHandle {
  setTheme: (t: ThemeName) => void;
  setV: (v: number, reduced: boolean) => void;
  setActive: (on: boolean) => void;
  onPick: ((k: number) => void) | null;
  dispose: () => void;
}

const PLANE_W = 1.414; // 512×724 → 2·aspect × 2
const PLANE_H = 2;
const R_SPHERE = 6.5;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uColor;
  uniform vec3 uWash;
  uniform vec3 uFog;
  uniform float uDist;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = mix(vec3(lum), tex.rgb, uColor);
    col = mix(col, uWash, 0.4);
    float fog = smoothstep(7.0, 14.0, uDist);
    col = mix(col, uFog, fog);
    gl_FragColor = vec4(col, tex.a * uOpacity);
  }
`;

// Five formations, positions precomputed — morphs read, never allocate.
function buildFormations(): Float32Array[] {
  const out: Float32Array[] = [];
  const sphere = new Float32Array(32 * 3);
  const ring = new Float32Array(32 * 3);
  const flower = new Float32Array(32 * 3);
  const cylinder = new Float32Array(32 * 3);
  const strip = new Float32Array(32 * 3);
  const jr = mulberry32(9001); // the ring's deterministic jitter

  for (let k = 0; k < 32; k++) {
    // I — Fibonacci sphere r 6.5.
    const y = 1 - (2 * (k + 0.5)) / 32;
    const theta = k * 2.399963;
    const rr = R_SPHERE * Math.sqrt(1 - y * y);
    sphere.set([rr * Math.cos(theta), R_SPHERE * y, rr * Math.sin(theta)], k * 3);

    // II — jittered ring r 5.2.
    const dr = (jr() * 2 - 1) * 0.7;
    const dy = (jr() * 2 - 1) * 1.1;
    const dt = (jr() * 2 - 1) * (Math.PI / 45);
    const a = (k / 32) * Math.PI * 2 + dt;
    ring.set([(5.2 + dr) * Math.cos(a), dy, (5.2 + dr) * Math.sin(a)], k * 3);

    // III — golden-angle flower (Vogel spiral, scale-matched).
    const rho = 1.15 * Math.sqrt(k + 1);
    const fa = k * 2.39996; // 137.50776° in radians
    flower.set([rho * Math.cos(fa), k % 2 === 0 ? 0.35 : -0.35, rho * Math.sin(fa)], k * 3);

    // IV — cylinder r 4.2, two turns.
    const ca = (k / 32) * Math.PI * 4;
    cylinder.set([4.2 * Math.cos(ca), -3.8 + (k / 31) * 7.6, 4.2 * Math.sin(ca)], k * 3);

    // V — the strip, spacing 4.
    strip.set([(k - 15.5) * 4, 0, 0], k * 3);
  }
  out.push(sphere, ring, flower, cylinder, strip);
  return out;
}

export const FORMATION_LABELS = [
  'FORMATION I — SPHERE (FIBONACCI, R 6.5)',
  'FORMATION II — RING (JITTERED, R 5.2)',
  'FORMATION III — FLOWER (GOLDEN ANGLE, 137.5°)',
  'FORMATION IV — CYLINDER (R 4.2, TWO TURNS)',
  'THE STRIP (SPACING 4)',
];

export function formationIndex(t: number): number {
  if (t < 0.2) return 0;
  if (t < 0.4) return 1;
  if (t < 0.6) return 2;
  if (t < 0.75) return 3;
  return 4;
}

export function mountGallery(
  holder: HTMLElement,
  posters: Poster[],
  initialTheme: ThemeName,
): GalleryHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null; // rung 2 takes over
  }
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const glName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software/i.test(glName)) {
    renderer.dispose();
    renderer.forceContextLoss();
    return null; // software renderer → rung-2 DOM strip, by design
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(initialTheme === 'night' ? 0x000000 : 0xffffff);
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 60);
  camera.position.set(0, 0, 10);

  const wash = new THREE.Color(initialTheme === 'night' ? 0x000000 : 0xffffff);
  const formations = buildFormations();
  const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H);

  interface Exhibit {
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
    uColor: number;
    uColorTarget: number;
    uOpacity: number;
  }

  const exhibits: Exhibit[] = posters.map((p) => {
    const tex = new THREE.CanvasTexture(p.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uMap: { value: tex },
        uColor: { value: 0 },
        uWash: { value: wash },
        uFog: { value: wash },
        uDist: { value: 10 },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = p.index; // FIXED at exhibit index — the measured policy
    const pos = new THREE.Vector3(formations[0][p.index * 3], formations[0][p.index * 3 + 1], formations[0][p.index * 3 + 2]);
    mesh.position.copy(pos);
    scene.add(mesh);
    return { mesh, pos, quat: mesh.quaternion.clone(), uColor: 0, uColorTarget: 0, uOpacity: 1 };
  });

  // ── State + temporaries (zero per-frame allocation) ──
  const pointer = { x: 0, y: 0 };
  const camTarget = { x: 0, y: 0 };
  let camX = 0;
  let vCurrent = 0;
  let yaw = 0;
  let reducedMotion = false;
  let active = true;
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-2, -2);
  let hovered: Exhibit | null = null;

  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
    if (vCurrent > 0.8 && vCurrent < 7) {
      ndc.set(pointer.x, -pointer.y);
    } else {
      ndc.set(-2, -2);
    }
  };
  const onClick = () => {
    if (hovered && vCurrent >= 6 && vCurrent < 7 && handle.onPick) {
      handle.onPick(hovered.mesh.renderOrder);
    }
  };
  addEventListener('pointermove', onPointer);
  addEventListener('click', onClick);

  const clock = new THREE.Clock();
  let raf = 0;

  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = THREE.MathUtils.clamp((vCurrent - 1) / 5, 0, 1);
    const fi = formationIndex(t);
    const inStrip = fi === 4;
    const targets = formations[fi];

    if (!reducedMotion && !inStrip) yaw += 0.02 * dt; // one revolution per ~5 min

    // Camera: parallax + strip pan.
    const panX = vCurrent >= 6 && vCurrent < 7 ? (vCurrent - 6.5) * 124 : 0;
    camTarget.x += ((inStrip ? panX : pointer.x * 0.4) - camTarget.x) * 0.15;
    camTarget.y += ((-pointer.y * 0.25) - camTarget.y) * 0.15;
    camX += ((inStrip ? panX : 0) - camX) * 0.1;
    camera.position.x = inStrip ? camX : camTarget.x;
    camera.position.y = camTarget.y;
    camera.lookAt(inStrip ? camX : 0, 0, 0);

    // Hover raycast (32 planes, one cast per frame — cheap).
    if (ndc.x > -1.5) {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(
        exhibits.map((e) => e.mesh),
        false,
      );
      hovered = hits.length ? exhibits[hits[0].object.renderOrder] : null;
    } else {
      hovered = null;
    }

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    for (const e of exhibits) {
      const k = e.mesh.renderOrder;
      // Target position (formation targets rotate by yaw; the strip does not).
      let tx = targets[k * 3];
      let ty = targets[k * 3 + 1];
      let tz = targets[k * 3 + 2];
      if (!inStrip) {
        const rx = tx * cosY + tz * sinY;
        const rz = -tx * sinY + tz * cosY;
        tx = rx;
        tz = rz;
      }
      e.pos.x += (tx - e.pos.x) * 0.05;
      e.pos.y += (ty - e.pos.y) * 0.05;
      e.pos.z += (tz - e.pos.z) * 0.05;
      e.mesh.position.copy(e.pos);

      // Orientation: billboard in formations, upright in the strip.
      if (inStrip) {
        tmpQ.identity();
      } else {
        tmpM.lookAt(e.pos, camera.position, UP);
        tmpQ.setFromRotationMatrix(tmpM);
      }
      e.quat.slerp(tmpQ, 0.05);
      e.mesh.quaternion.copy(e.quat);

      // Wash/fog distance + far-hemisphere fade (misordered fragments fade
      // before they can read as sorting errors — the measured policy).
      const dist = e.pos.distanceTo(camera.position);
      const fade = !inStrip && dist > 12.5 ? 0.3 : 1;
      e.uOpacity += (fade - e.uOpacity) * 0.05;

      // The color reveal: attention has inertia.
      e.uColorTarget = hovered === e ? 1 : 0;
      const rate = hovered === e ? 0.15 : 0.05;
      e.uColor += (e.uColorTarget - e.uColor) * rate;

      const u = e.mesh.material.uniforms;
      u.uDist.value = dist;
      u.uOpacity.value = e.uOpacity;
      u.uColor.value = e.uColor;
    }

    renderer.render(scene, camera);
    if (active) raf = requestAnimationFrame(loop);
  };

  const onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (active) {
      clock.getDelta();
      loop();
    }
  };
  document.addEventListener('visibilitychange', onVis);

  const onResize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  onResize();
  addEventListener('resize', onResize);

  const onLost = (e: Event) => {
    e.preventDefault();
    renderer.domElement.style.visibility = 'hidden';
    holder.style.background = document.documentElement.dataset.theme === 'night' ? '#000' : '#fff';
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);

  loop();

  const handle: GalleryHandle = {
    onPick: null,
    setTheme: (theme: ThemeName) => {
      const night = theme === 'night';
      wash.set(night ? 0x000000 : 0xffffff);
      renderer.setClearColor(night ? 0x000000 : 0xffffff);
    },
    setV: (v: number, reduced: boolean) => {
      vCurrent = v;
      reducedMotion = reduced;
    },
    setActive: (on: boolean) => {
      if (on === active) return;
      active = on;
      if (on) {
        clock.getDelta();
        loop();
      } else {
        cancelAnimationFrame(raf);
      }
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('resize', onResize);
      removeEventListener('pointermove', onPointer);
      removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      for (const e of exhibits) {
        e.mesh.material.uniforms.uMap.value.dispose();
        e.mesh.material.dispose();
      }
      geo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
  return handle;
}
