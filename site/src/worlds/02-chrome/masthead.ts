import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import gsap from 'gsap';
import { mulberry32 } from '../../shared/rng';
import { isSoftwareRenderer } from '../../shared/gpu';

// THE LIVE MASTHEAD — "CHROME, and the O never sets."
// Five milled Zodiak-700 letters + one marching-cubes molten O with a carved
// counter. Metalness-1 chrome lit by ONE studio HDRI (zero lamps — the room
// does the lighting). 6 draw calls. Metric layout, never eyeballed.

type ThemeName = 'day' | 'night';

export interface MastheadHandle {
  setTheme: (t: ThemeName) => void;
  dispose: () => void;
}

const CAP = 0.7; // Zodiak-Bold cap height at size 1.0 (verified: 700/1000 upm)
const GLYPH_H = 0.84; // cap + bevel + idle breathing — what the camera must clear
const DEPTH = 0.34;
const BEVEL_T = 0.09;
const BEVEL_S = 0.05;
const TRACKING = 0.02;
const O_SLOT = 0.76; // the O's advance share of the word
const VFOV = 12; // telephoto-flat, editorial
const TAN_HALF = Math.tan(THREE.MathUtils.degToRad(VFOV / 2));

export async function mountMasthead(
  wrap: HTMLElement,
  section: HTMLElement,
  initialTheme: ThemeName,
): Promise<MastheadHandle | null> {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null; // rung 3: the CSS fallback in the DOM stays visible
  }
  const software = isSoftwareRenderer(renderer.getContext());
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = software || reduced;

  renderer.setPixelRatio(still ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = initialTheme === 'night' ? 0.95 : 1.15;
  renderer.domElement.style.pointerEvents = 'none';
  wrap.appendChild(renderer.domElement);

  // ── Assets: the 5-glyph font + the studio HDRI ──
  const [font, hdr] = await Promise.all([
    new FontLoader().loadAsync('/type/zodiak-bold-chrme.typeface.json'),
    new HDRLoader().loadAsync('/hdri/studio_small_08_1k.hdr'),
  ]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(hdr);
  hdr.dispose();
  pmrem.dispose();

  const scene = new THREE.Scene();
  scene.environment = envRT.texture;
  scene.background = null; // the page IS the backdrop

  const camera = new THREE.PerspectiveCamera(VFOV, 1, 0.1, 60);
  camera.position.set(0, 0, 5.37);
  camera.lookAt(0, 0, 0);

  const material = new THREE.MeshStandardMaterial({
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: initialTheme === 'night' ? 1.0 : 1.25,
  });

  // ── The word: metric layout, re-centered ──
  const word = new THREE.Group();
  const letters: { mesh: THREE.Mesh; homeX: number; band: number; phase: number; speed: number; sclPhase: number }[] = [];
  const rnd = mulberry32(0x5eed02);
  let cursor = 0;
  let oSlotX = 0;

  for (const ch of ['C', 'H', 'R', 'O', 'M', 'E']) {
    if (ch === 'O') {
      oSlotX = cursor + O_SLOT / 2;
      cursor += O_SLOT + TRACKING;
      continue;
    }
    const geo = new TextGeometry(ch, {
      font,
      size: 1,
      depth: DEPTH,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: BEVEL_T,
      bevelSize: BEVEL_S,
      bevelSegments: 5,
    });
    geo.computeBoundingBox();
    const w = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.x = cursor - geo.boundingBox!.min.x;
    cursor += w + TRACKING;
    word.add(mesh);
    letters.push({
      mesh,
      homeX: mesh.position.x,
      band: THREE.MathUtils.degToRad(5 + rnd() * 3),
      phase: rnd() * Math.PI * 2,
      speed: 0.6 + rnd() * 0.5, // ~±1°/s inside the seeded band
      sclPhase: rnd() * Math.PI * 2,
    });
  }
  const span = cursor - TRACKING;
  const mid = span / 2;
  for (const l of letters) l.mesh.position.x -= mid;
  oSlotX -= mid;

  // ── The O: molten ring, counter carved by one fixed negative charge ──
  const cores = navigator.hardwareConcurrency ?? 8;
  const res = cores < 4 ? 28 : 36;
  const mc = new MarchingCubes(res, material, false, false, 20000);
  mc.scale.set(CAP, CAP, DEPTH + 2 * BEVEL_T);
  mc.position.set(oSlotX, CAP / 2, (DEPTH + 2 * BEVEL_T) / 2 - BEVEL_T);
  mc.isolation = 80;
  word.add(mc);

  const charges = Array.from({ length: 5 }, (_, i) => ({
    phase: rnd() * Math.PI * 2,
    speed: (0.4 + rnd() * 0.5) * (i % 2 === 0 ? 1 : -1), // mixed directions — molten, not rotating
    radius: 0.24 + rnd() * 0.08,
    wobble: 0.04 + rnd() * 0.04,
  }));
  const field = { strength: 1, splash: 1, agitation: 0 };

  // Fit once: the molten O's outer diameter equals cap height EXACTLY —
  // a sibling among siblings, never a pendant. Also recentres the blob on
  // its slot (the charge ring wanders off-center).
  const fitO = () => {
    mc.geometry.computeBoundingBox();
    const bb = mc.geometry.boundingBox!;
    const wx = (bb.max.x - bb.min.x) * mc.scale.x;
    const wy = (bb.max.y - bb.min.y) * mc.scale.y;
    const fit = CAP / Math.max(wx, wy);
    mc.scale.x *= fit;
    mc.scale.y *= fit;
    mc.position.x -= ((bb.max.x + bb.min.x) / 2) * mc.scale.x;
    mc.position.y -= ((bb.max.y + bb.min.y) / 2) * mc.scale.y;
  };

  word.position.y = -CAP / 2;
  scene.add(word);

  // Hit proxy in the O slot — never raycast the live metaball.
  const proxy = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.18, 8, 24), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.copy(mc.position);
  word.add(proxy);

  // ── Camera fit: height fits by glyph height 62%, width by the true span ──
  const fitZ = () => {
    const { clientWidth: w, clientHeight: h } = wrap;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const zH = GLYPH_H / 0.62 / 2 / TAN_HALF;
    const zW = (span * 1.04) / 2 / TAN_HALF / camera.aspect;
    camera.position.z = Math.max(zH, zW);
    camera.updateProjectionMatrix();
  };
  fitZ();
  const ro = new ResizeObserver(fitZ);
  ro.observe(wrap);

  // ── Pointer: molten inertia + agitation + the splash ──
  const pointer = { x: 0, y: 0 };
  let lastPX = 0;
  let lastPY = 0;
  const onPointer = (e: PointerEvent) => {
    const r = section.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    const dv = Math.hypot(nx - lastPX, ny - lastPY);
    field.agitation = Math.min(0.8, field.agitation + dv * 2.2);
    lastPX = nx;
    lastPY = ny;
    pointer.x = nx;
    pointer.y = ny;
  };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onClick = (e: MouseEvent) => {
    const r = wrap.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(proxy, false).length) {
      gsap.killTweensOf(field, 'splash');
      gsap.fromTo(field, { splash: 1.67 }, { splash: 1, duration: 0.9, ease: 'chrome' });
    }
  };
  if (!still) {
    section.addEventListener('pointermove', onPointer);
    section.addEventListener('click', onClick);
  }

  // ── Frame composition (shared by the loop and the still path) ──
  const compose = (t: number) => {
    // Letters: seeded float grammar.
    for (const l of letters) {
      l.mesh.rotation.z = Math.sin(t * l.speed + l.phase) * l.band;
      const s = 1 + Math.sin((t * 2 * Math.PI) / 9 + l.sclPhase) * 0.05;
      l.mesh.scale.setScalar(s);
      // Pointer: global tilt + proximity dip, viscous lerp.
      const worldX = l.homeX - mid;
      const prox = Math.max(0, 1 - Math.abs(worldX - pointer.x * (span / 2)) / 2.2);
      const targetY = pointer.x * 0.14 + prox * pointer.y * -0.14;
      l.mesh.rotation.y += (targetY - l.mesh.rotation.y) * 0.06;
    }
    // The O: five ring charges + the carving center.
    mc.reset();
    const agit = 1 + field.agitation;
    for (const c of charges) {
      const a = c.phase + t * c.speed * agit;
      mc.addBall(
        0.5 + Math.cos(a) * c.radius,
        0.5 + Math.sin(a) * c.radius,
        0.5 + Math.sin(t * 0.7 + c.phase * 2) * c.wobble,
        0.9 * field.strength * field.splash,
        12,
      );
    }
    mc.addBall(0.5, 0.5, 0.5, -0.55 * field.splash, 12);
    mc.update();
    field.agitation *= 0.94; // ~1.2s decay at 60fps
  };

  const renderOnce = () => renderer.render(scene, camera);

  // ── Entrance pour (live only) ──
  if (!still) {
    letters.forEach((l, i) => {
      gsap.from(l.mesh.position, { y: -1.2, duration: 1.1, delay: i * 0.07, ease: 'chrome' });
      gsap.from(l.mesh.rotation, { x: THREE.MathUtils.degToRad(25), duration: 1.1, delay: i * 0.07, ease: 'chrome' });
    });
    gsap.fromTo(field, { strength: 0 }, { strength: 1, duration: 1.4, ease: 'chrome' });
  }

  // ── Loop / still ──
  const clock = new THREE.Clock();
  let raf = 0;
  let visible = true;
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    void dt;
    compose(clock.getElapsedTime());
    renderOnce();
    if (visible) raf = requestAnimationFrame(loop);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      if (still) return;
      const on = entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.15;
      if (on && !visible) {
        visible = true;
        clock.getDelta();
        loop();
      } else if (!on && visible) {
        visible = false;
        cancelAnimationFrame(raf);
      }
    },
    { threshold: [0, 0.15, 0.5] },
  );
  io.observe(section);

  const onVis = () => {
    if (still) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (visible) {
      clock.getDelta();
      loop();
    }
  };
  document.addEventListener('visibilitychange', onVis);

  const onLost = (e: Event) => {
    e.preventDefault();
    renderer.domElement.style.visibility = 'hidden'; // a lost context paints WHITE
    wrap.classList.remove('is-live');
  };
  const onRestored = () => {
    renderer.domElement.style.visibility = 'visible';
    wrap.classList.add('is-live');
    if (still) {
      compose(2.5);
      renderOnce();
    } else {
      loop();
    }
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  // First frame: compose the seeded sculptural moment, fit the O to its
  // siblings, then either hold it as the poster (still path) or start moving.
  wrap.classList.add('is-live');
  compose(2.5);
  fitO();
  if (still) {
    renderOnce();
  } else {
    loop();
  }

  return {
    setTheme: (t: ThemeName) => {
      const exposure = t === 'night' ? 0.95 : 1.15;
      const env = t === 'night' ? 1.0 : 1.25;
      if (still) {
        renderer.toneMappingExposure = exposure;
        material.envMapIntensity = env;
        compose(2.5);
        renderOnce();
      } else {
        gsap.to(renderer, { toneMappingExposure: exposure, duration: 0.8, ease: 'power1.inOut' });
        gsap.to(material, { envMapIntensity: env, duration: 0.8, ease: 'power1.inOut' });
      }
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (!still) {
        section.removeEventListener('pointermove', onPointer);
        section.removeEventListener('click', onClick);
      }
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      for (const l of letters) l.mesh.geometry.dispose();
      mc.geometry.dispose();
      proxy.geometry.dispose();
      material.dispose();
      envRT.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
