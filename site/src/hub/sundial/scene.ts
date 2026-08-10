import * as THREE from 'three';
import gsap from 'gsap';
import { DAY, NIGHT, initialTheme, type Pose, type Theme } from './poses';
import { makeTooth, makeMottle, makeHalo, makeNumerals } from './textures';
import { isSoftwareRenderer } from '../../shared/gpu';

// SUNDIAL — the toy-box relief wall.
// A Girard-style painted-wood relief: five oversized toy shapes (one per
// brand token) on a deep cobalt wall, lit by one real traveling sun.
// Day/night is the concept: the switch is a 1.6s solstice sweep where every
// cast shadow physically rotates. Full spec: workflow wf_6a8eda3c synthesis.

const H = 2; // frame height in world units; width = H * aspect
const FILLET = 0.008 * H;

interface ShapeRig {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  key: 'sun' | 'bar' | 'arch' | 'ring' | 'peg';
}

export interface SundialHandle {
  setTheme: (t: Theme, animate: boolean) => void;
  theme: () => Theme;
  dispose: () => void;
}

export function mountSundial(container: HTMLElement): SundialHandle {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  const software = isSoftwareRenderer(renderer.getContext());
  const still = reduced || software;

  renderer.setPixelRatio(still ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the 5 brand hexes on-hue (ACES shifts amber/vermilion)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // PCFSoft ignores radius; VSM gives the soft penumbra
  renderer.shadowMap.autoUpdate = false; // beats/sweep/parallax flag updates explicitly
  renderer.domElement.className = 'poster-canvas';
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 0.4s ease-out';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 20);
  camera.position.set(0, 0, 5.14);
  camera.lookAt(0, 0, 0);

  // ── Lights ──
  const key = new THREE.DirectionalLight(DAY.keyColor, DAY.keyIntensity);
  key.position.copy(DAY.keyPos);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.blurSamples = 8;
  key.shadow.bias = -0.0001;
  // Ortho frustum sized for the NIGHT pose so lengthened shadows never clip.
  key.shadow.camera.left = -2.1;
  key.shadow.camera.right = 2.1;
  key.shadow.camera.top = 1.35;
  key.shadow.camera.bottom = -1.35;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiIntensity);
  scene.add(hemi);

  // ── Shared textures ──
  const tooth = makeTooth();
  const mottle = makeMottle();
  const haloTex = makeHalo();
  const numerals = makeNumerals();

  const paintedMat = (color: number, roughness: number) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      roughnessMap: tooth,
      bumpMap: tooth,
      bumpScale: 0.01,
    });

  // ── Wall ──
  const wallMat = paintedMat(DAY.wall, 0.9);
  wallMat.map = mottle;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), wallMat);
  wall.receiveShadow = true;
  wall.matrixAutoUpdate = false;
  wall.updateMatrix();
  scene.add(wall);

  // ── Frame-relative placement ──
  // Composition %: x_w = (x/100 − .5)·W, y_w = (.5 − y/100)·H·… (H=2)
  let W = 3.26; // updated on resize
  const fx = (xPct: number) => (xPct / 100 - 0.5) * W;
  const fy = (yPct: number) => (0.5 - yPct / 100) * H;

  const shapes: ShapeRig[] = [];
  const anchors: { rig: ShapeRig; x: number; y: number; portrait?: { x: number; y: number; hide?: boolean } }[] = [];

  const addShape = (
    key2: ShapeRig['key'],
    geo: THREE.BufferGeometry,
    color: number,
    roughness: number,
    xPct: number,
    yPct: number,
    z: number,
    opts: { rotZ?: number; portrait?: { x: number; y: number; hide?: boolean } } = {},
  ): ShapeRig => {
    const mat = paintedMat(color, roughness);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    if (opts.rotZ) group.rotation.z = opts.rotZ;
    group.position.z = z;
    scene.add(group);
    const rig = { group, mat, key: key2 };
    shapes.push(rig);
    anchors.push({ rig, x: xPct, y: yPct, portrait: opts.portrait });
    return rig;
  };

  // Sun disc — Ø 62%H, cropped top-right; cylinder relief 0.12 with filleted edge.
  const sunR = 0.31 * H;
  const sunGeo = filletedDisc(sunR, 0.12, FILLET);
  const sunRig = addShape('sun', sunGeo, DAY.sun, 0.82, 82, 16, 0.06, { portrait: { x: 76, y: 12 } });
  const sunMat = sunRig.mat;
  sunMat.emissive = new THREE.Color(0xffe9c0);
  sunMat.emissiveIntensity = 0;

  // Cobalt bar — stadium, 9%H tall, rot −3°, right end cropped. "01"
  const barGeo = stadium(0.36 * W * 0.32 * 2, 0.09 * H, 0.1, FILLET);
  addShape('bar', barGeo, DAY.bar, 0.88, 80, 88, 0.05, { rotZ: -0.052, portrait: { x: 0, y: 0, hide: true } });

  // Vermilion arch — half-torus, legs exit bottom edge. "02"
  const archR = 0.16 * W;
  const archGeo = new THREE.TorusGeometry(archR, 0.104, 20, 48, Math.PI);
  addShape('arch', archGeo, DAY.arch, 0.85, 18, 100, 0.104, { portrait: { x: 26, y: 100 } });

  // Violet ring — outer Ø 30%H, cropped left. "03"
  const ringGeo = new THREE.TorusGeometry(0.15 * H, 0.09, 20, 48);
  addShape('ring', ringGeo, DAY.ring, 0.86, 5, 40, 0.09, { portrait: { x: 3, y: 38 } });

  // Red peg — Ø 7%H cylinder. "04" — the only uncropped shape.
  const pegGeo = filletedDisc(0.035 * H, 0.1, FILLET);
  addShape('peg', pegGeo, DAY.peg, 0.84, 26, 79, 0.05, { portrait: { x: 70, y: 82 } });

  // ── Numeral decals: stamped, rotate with their shape ──
  const decalMat = (n: number) => {
    const m = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      alphaMap: numerals.tex,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const [u, v] = numerals.uv(n);
    m.alphaMap = numerals.tex.clone();
    m.alphaMap.repeat.set(0.5, 0.5);
    m.alphaMap.offset.set(u, v);
    m.alphaMap.needsUpdate = true;
    return m;
  };
  const stamp = (rig: ShapeRig, n: number, size: number, x: number, y: number, zTop: number) => {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(size, size), decalMat(n));
    d.position.set(x, y, zTop + 0.002);
    rig.group.add(d);
  };
  stamp(shapes[1], 1, 0.035 * H, -0.15, 0, 0.1); // bar 01
  stamp(shapes[2], 2, 0.035 * H, 0, archR - 0.02, 0.104 + 0.104); // arch 02 near apex
  stamp(shapes[3], 3, 0.035 * H, 0.15 * H - 0.005, 0, 0.09 + 0.09); // ring 03 on the rim
  stamp(shapes[4], 4, 0.02 * H, 0, 0, 0.1 + 0.002); // peg 04

  // ── Night cast: eclipse disc, halo, 4 stars ──
  const eclipseMat = new THREE.MeshStandardMaterial({ color: DAY.wall, roughness: 0.9, metalness: 0 });
  const eclipse = new THREE.Mesh(new THREE.CircleGeometry(sunR * 1.016, 96), eclipseMat);
  eclipse.position.z = 0.125; // just above the sun face
  sunRig.group.add(eclipse);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false }));
  halo.scale.setScalar(0.45 * H * 2.2);
  halo.position.z = 0.2;
  sunRig.group.add(halo);

  const STAR_POS: [number, number][] = [
    [40, 22],
    [47, 18],
    [54, 17],
    [61, 20],
  ];
  const starGeo = new THREE.CircleGeometry(0.0075 * H, 12);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffe9c0, transparent: true, opacity: 0 });
  const stars: THREE.Mesh[] = STAR_POS.map(() => {
    const s = new THREE.Mesh(starGeo, starMat.clone());
    s.position.z = 0.01;
    scene.add(s);
    return s;
  });

  // ── State ──
  let theme: Theme = initialTheme();
  const pose = { t: theme === 'night' ? 1 : 0 }; // 0 = day, 1 = night
  const colA = new THREE.Color();
  const colB = new THREE.Color();

  const shapeDayNight: Record<ShapeRig['key'], [number, number]> = {
    sun: [DAY.sun, NIGHT.sun],
    bar: [DAY.bar, NIGHT.bar],
    arch: [DAY.arch, NIGHT.arch],
    ring: [DAY.ring, NIGHT.ring],
    peg: [DAY.peg, NIGHT.peg],
  };

  const lerpPose = (t: number) => {
    // Light rig (linear-space color lerp).
    key.position.lerpVectors(DAY.keyPos, NIGHT.keyPos, t);
    key.color.copy(colA.set(DAY.keyColor)).lerp(colB.set(NIGHT.keyColor), t);
    key.intensity = THREE.MathUtils.lerp(DAY.keyIntensity, NIGHT.keyIntensity, t);
    hemi.color.copy(colA.set(DAY.hemiSky)).lerp(colB.set(NIGHT.hemiSky), t);
    hemi.groundColor.copy(colA.set(DAY.hemiGround)).lerp(colB.set(NIGHT.hemiGround), t);
    hemi.intensity = THREE.MathUtils.lerp(DAY.hemiIntensity, NIGHT.hemiIntensity, t);
    // Albedos.
    wallMat.color.copy(colA.set(DAY.wall)).lerp(colB.set(NIGHT.wall), t);
    eclipseMat.color.copy(wallMat.color);
    for (const s of shapes) {
      const [d, n] = shapeDayNight[s.key];
      s.mat.color.copy(colA.set(d)).lerp(colB.set(n), t);
    }
    renderer.shadowMap.needsUpdate = true;
  };

  const applyInstant = (t: Theme) => {
    pose.t = t === 'night' ? 1 : 0;
    lerpPose(pose.t);
    const p: Pose = t === 'night' ? NIGHT : DAY;
    sunMat.emissiveIntensity = p.crescent;
    (halo.material as THREE.SpriteMaterial).opacity = p.halo;
    for (const s of stars) (s.material as THREE.MeshBasicMaterial).opacity = p.stars;
    eclipse.position.x = p.eclipse === 1 ? sunR * 0.42 : sunR * 2.6;
    document.documentElement.dataset.theme = t;
  };

  // ── Solstice sweep (1.6s) ──
  let sweeping = false;
  const sweep = (to: Theme) => {
    if (sweeping) return;
    sweeping = true;
    const night = to === 'night';
    const tl = gsap.timeline({
      onComplete: () => {
        sweeping = false;
        renderer.shadowMap.needsUpdate = true;
      },
    });
    // Light + albedo sweep.
    tl.to(pose, { t: night ? 1 : 0, duration: 1.0, ease: 'power3.inOut', onUpdate: () => lerpPose(pose.t) }, 0.1);
    // Page chrome flips at the midpoint (CSS transition handles the rest).
    tl.add(() => {
      document.documentElement.dataset.theme = to;
    }, 0.4);
    if (night) {
      tl.to(eclipse.position, { x: sunR * 0.42, duration: 0.7, ease: 'power2.inOut' }, 0.7);
      tl.to(sunMat, { emissiveIntensity: NIGHT.crescent, duration: 0.4, ease: 'power1.out' }, 1.0);
      tl.to(halo.material, { opacity: NIGHT.halo, duration: 0.4, ease: 'power1.out' }, 1.0);
      stars.forEach((s, i) => {
        const m = s.material as THREE.MeshBasicMaterial;
        tl.to(m, { opacity: 1, duration: 0.08 }, 1.2 + i * 0.08);
        tl.fromTo(s.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, duration: 0.24, ease: 'back.out(1.4)' }, 1.28 + i * 0.08);
      });
    } else {
      [...stars].reverse().forEach((s, i) => {
        tl.to(s.material as THREE.MeshBasicMaterial, { opacity: 0, duration: 0.15 }, 0.1 + i * 0.06);
      });
      tl.to(sunMat, { emissiveIntensity: 0, duration: 0.4, ease: 'power1.in' }, 0.2);
      tl.to(halo.material, { opacity: 0, duration: 0.4 }, 0.2);
      tl.to(eclipse.position, { x: sunR * 2.6, duration: 0.7, ease: 'power2.inOut' }, 0.2);
    }
  };

  const setTheme = (t: Theme, animate: boolean) => {
    if (t === theme && animate) return;
    theme = t;
    localStorage.setItem('hub-theme', t);
    if (!animate || reduced || still) {
      applyInstant(t);
      if (still) requestAnimationFrame(renderOnce);
    } else {
      sweep(t);
    }
  };

  // OS-level scheme changes drive the theme live (until user explicitly chose).
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onScheme = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem('hub-theme')) setTheme(e.matches ? 'night' : 'day', true);
  };
  mq.addEventListener('change', onScheme);

  // ── Metronome: first beat ~2.2s in (right after the entrance settles),
  // then one beat / 7s walking 01→04, 1.8s power2.inOut. The old 12s cadence
  // read as "nothing moves" — a relief this still needs a pulse you can catch.
  const BEAT_MS = 7000;
  let beatIdx = 0;
  let beatTimer: ReturnType<typeof setTimeout> | null = null;
  const beat = () => {
    const rig = shapes[1 + (beatIdx % 4)]; // bar, arch, ring, peg
    beatIdx++;
    const ease = 'power2.inOut';
    const dur = 1.8;
    const flagShadows = () => (renderer.shadowMap.needsUpdate = true);
    switch (rig.key) {
      case 'bar': {
        const dx = 0.04 * W * (beatIdx % 2 === 1 ? 1 : -1);
        gsap.to(rig.group.position, { x: rig.group.position.x + dx, duration: dur, ease, onUpdate: flagShadows });
        break;
      }
      case 'arch':
        gsap.to(rig.group.scale, { z: 1.06, duration: dur / 2, ease, yoyo: true, repeat: 1, onUpdate: flagShadows });
        break;
      case 'ring':
        gsap.to(rig.group.rotation, { z: rig.group.rotation.z + Math.PI / 2, duration: dur, ease, onUpdate: flagShadows });
        break;
      case 'peg':
        gsap.to(rig.group.rotation, { z: rig.group.rotation.z + Math.PI, duration: dur, ease, onUpdate: flagShadows });
        break;
    }
  };

  // Self-scheduling beats: first one early, then a steady cadence — never
  // two timers alive at once (IO enter + init both call startBeats).
  const scheduleBeat = (delay: number) => {
    beatTimer = setTimeout(() => {
      beat();
      scheduleBeat(BEAT_MS);
    }, delay);
  };
  const startBeats = () => {
    if (!beatTimer && !reduced) scheduleBeat(2200);
  };
  const stopBeats = () => {
    if (beatTimer) {
      clearTimeout(beatTimer);
      beatTimer = null;
    }
  };

  // Night micro-event: every 20–40s one star dims 25% and recovers.
  let starTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleStarBlink = () => {
    starTimer = setTimeout(() => {
      if (theme === 'night' && !sweeping) {
        const s = stars[beatIdx % stars.length];
        const m = s.material as THREE.MeshBasicMaterial;
        gsap.to(m, { opacity: 0.75, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 });
      }
      scheduleStarBlink();
    }, 20000 + (beatIdx % 5) * 5000);
  };

  // ── Ambient + parallax ──
  const pointer = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let lastPointer = -Infinity; // no pointer yet → the idle sway owns the camera
  const onPointer = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    lastPointer = performance.now();
  };
  container.addEventListener('pointermove', onPointer);

  const clock = new THREE.Clock();
  let raf = 0;
  const renderOnce = () => renderer.render(scene, camera);
  const loop = () => {
    const t = clock.getElapsedTime();
    // The sundial's hour-hand: the key light drifts in a slow arc (28s + 43s
    // sines, ±~7° azimuth swing) so every cast shadow visibly crawls across
    // the wall. This — not decoration — is what a sundial does.
    if (!sweeping) {
      const a = Math.sin((t * 2 * Math.PI) / 28) * 0.085 + Math.sin((t * 2 * Math.PI) / 43) * 0.035;
      key.position.lerpVectors(DAY.keyPos, NIGHT.keyPos, pose.t);
      const bx = key.position.x;
      const by = key.position.y;
      key.position.x = bx * Math.cos(a) - by * Math.sin(a);
      key.position.y = bx * Math.sin(a) + by * Math.cos(a);
      key.intensity = THREE.MathUtils.lerp(DAY.keyIntensity, NIGHT.keyIntensity, pose.t) * (1 + Math.sin((t * 2 * Math.PI) / 19) * 0.03);
    }
    // Sun ambient rotation: at night it slowly orbits the eclipse crescent.
    sunRig.group.rotation.z = t * 0.02;
    // Camera parallax — pointer-driven when present; after 4s of stillness a
    // slow lissajous sway takes over so the relief never sits frozen (this is
    // also the touch answer: phones get the sway, no gyro permission needed).
    const idle = performance.now() - lastPointer > 4000;
    const tx = idle ? Math.sin((t * 2 * Math.PI) / 23) * 0.55 : pointer.x;
    const ty = idle ? Math.cos((t * 2 * Math.PI) / 31) * 0.4 : pointer.y;
    smooth.x += (tx - smooth.x) * 0.045;
    smooth.y += (ty - smooth.y) * 0.045;
    camera.position.x = smooth.x * 0.062;
    camera.position.y = -smooth.y * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.shadowMap.needsUpdate = true; // the crawl moves shadows every frame
    renderOnce();
    raf = requestAnimationFrame(loop);
  };

  // ── Layout ──
  const layout = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    W = H * camera.aspect;
    const portrait = camera.aspect < 0.8;
    for (const a of anchors) {
      const p = portrait && a.portrait ? a.portrait : a;
      a.rig.group.visible = !(portrait && a.portrait?.hide);
      a.rig.group.position.x = fx(p.x);
      a.rig.group.position.y = fy(p.y);
    }
    const starXs = portrait ? [36, 45, 55, 64] : [40, 47, 54, 61];
    stars.forEach((s, i) => {
      s.position.x = fx(starXs[i]);
      s.position.y = fy(STAR_POS[i][1]);
    });
    renderer.shadowMap.needsUpdate = true;
    if (still) requestAnimationFrame(renderOnce);
  };
  const ro = new ResizeObserver(layout);
  ro.observe(container);
  layout();

  // ── Visibility / degrade ──
  const io = new IntersectionObserver(([entry]) => {
    if (still) return;
    if (entry?.isIntersecting) {
      loop();
      startBeats();
    } else {
      cancelAnimationFrame(raf);
      stopBeats();
    }
  });
  io.observe(container);

  const onLost = (e: Event) => {
    e.preventDefault();
    renderer.domElement.style.opacity = '0';
  };
  const onRestored = () => {
    renderer.domElement.style.opacity = '1';
    applyInstant(theme);
    requestAnimationFrame(renderOnce);
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  // First paint: scheme-correct, no transition (rule zero).
  applyInstant(theme);
  renderer.domElement.style.opacity = '1';
  if (still) {
    requestAnimationFrame(renderOnce);
  } else {
    loop();
    if (!reduced) {
      startBeats();
      scheduleStarBlink();
    }
  }

  return {
    setTheme,
    theme: () => theme,
    dispose: () => {
      cancelAnimationFrame(raf);
      stopBeats();
      if (starTimer) clearTimeout(starTimer);
      ro.disconnect();
      io.disconnect();
      mq.removeEventListener('change', onScheme);
      container.removeEventListener('pointermove', onPointer);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      for (const t of [tooth, mottle, haloTex, numerals.tex]) t.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

// Disc with a filleted rim: lathe profile (face → fillet → side). The 0.008H
// fillet is load-bearing — it catches the raking key as an edge highlight,
// the difference between painted relief and extruded primitive.
function filletedDisc(radius: number, depth: number, fillet: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(0.0001, depth));
  pts.push(new THREE.Vector2(radius - fillet, depth));
  const N = 5;
  for (let i = 1; i <= N; i++) {
    const a = (i / N) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - fillet + Math.sin(a) * fillet, depth - fillet + Math.cos(a) * fillet));
  }
  pts.push(new THREE.Vector2(radius, 0));
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.rotateX(Math.PI / 2);
  return geo;
}

// Stadium (rounded bar) with soft edges via extrude bevel.
function stadium(width: number, height: number, depth: number, fillet: number): THREE.BufferGeometry {
  const r = height / 2;
  const s = new THREE.Shape();
  const hw = width / 2 - r;
  s.absarc(-hw, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  s.absarc(hw, 0, r, Math.PI * 1.5, Math.PI / 2, false);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: depth - fillet * 2,
    bevelEnabled: true,
    bevelThickness: fillet,
    bevelSize: fillet,
    bevelSegments: 3,
    curveSegments: 32,
  });
  return geo;
}
