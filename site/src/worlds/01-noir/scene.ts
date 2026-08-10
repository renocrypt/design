import * as THREE from 'three';
import { isSoftwareRenderer } from '../../shared/gpu';

// Noir: a night drive. Two colors — charcoal air, bone light.
// Everything emissive-vs-dark; fog does the cinematography.
// Performance: instanced meshes only, no shadows, paused when hidden.

const CHARCOAL = 0x1a1c1c;
const BONE = 0xf9f4eb;

const DASH_COUNT = 24;
const POST_COUNT = 14;
const SPAN = 120; // how far the road content stretches ahead

export function mountNoirScene(container: HTMLElement): () => void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  const software = isSoftwareRenderer(renderer.getContext());
  const still = reduced || software;

  renderer.setPixelRatio(still ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CHARCOAL);
  scene.fog = new THREE.Fog(CHARCOAL, 6, 60);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0.9, 1.35, 0);
  camera.lookAt(0.4, 1.0, -12);

  // Road: barely-lit plane; the sheen comes from a low grazing light.
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(9, SPAN * 2),
    new THREE.MeshStandardMaterial({ color: 0x232626, roughness: 0.35, metalness: 0.1 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -SPAN / 2;
  scene.add(road);

  // Shoulder strips — slightly lighter than the road, catch the moon.
  const shoulderGeo = new THREE.PlaneGeometry(0.18, SPAN * 2);
  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x2e3131, roughness: 0.8 });
  for (const x of [-4.4, 4.4]) {
    const s = new THREE.Mesh(shoulderGeo, shoulderMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.001, -SPAN / 2);
    scene.add(s);
  }

  // Lane dashes: emissive bone, instanced, recycled as they pass the camera.
  const dashGeo = new THREE.BoxGeometry(0.14, 0.02, 1.6);
  const boneEmissive = new THREE.MeshStandardMaterial({
    color: CHARCOAL,
    emissive: BONE,
    emissiveIntensity: 1.0,
    roughness: 1,
  });
  const dashes = new THREE.InstancedMesh(dashGeo, boneEmissive, DASH_COUNT);
  scene.add(dashes);

  // Roadside posts with tiny bone lamps — instanced pair of meshes.
  const postGeo = new THREE.BoxGeometry(0.06, 1.0, 0.06);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2d2d, roughness: 0.9 });
  const posts = new THREE.InstancedMesh(postGeo, postMat, POST_COUNT);
  scene.add(posts);

  const lampGeo = new THREE.SphereGeometry(0.045, 10, 8);
  const lamps = new THREE.InstancedMesh(lampGeo, boneEmissive, POST_COUNT);
  scene.add(lamps);

  // A low moon: one dim bone directional + grazing fill for the road sheen.
  const moon = new THREE.DirectionalLight(BONE, 0.32);
  moon.position.set(-6, 3.5, -14);
  scene.add(moon);
  const graze = new THREE.DirectionalLight(BONE, 0.14);
  graze.position.set(4, 0.6, 2);
  scene.add(graze);
  scene.add(new THREE.AmbientLight(BONE, 0.05));

  // Oncoming car: two bone headlights (sprites fade in fog naturally) that
  // sweep past every few seconds — the scene's only event.
  const headlightTex = makeGlowTexture();
  const headMat = new THREE.SpriteMaterial({
    map: headlightTex,
    color: BONE,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const headL = new THREE.Sprite(headMat);
  const headR = new THREE.Sprite(headMat.clone());
  headL.scale.setScalar(1.4);
  headR.scale.setScalar(1.4);
  const car = new THREE.Group();
  car.add(headL, headR);
  headL.position.x = -0.55;
  headR.position.x = 0.55;
  car.position.set(-2.4, 0.65, -SPAN);
  scene.add(car);

  const dummy = new THREE.Object3D();
  const dashState = new Float32Array(DASH_COUNT);
  for (let i = 0; i < DASH_COUNT; i++) dashState[i] = -i * (SPAN / DASH_COUNT);
  const postState = new Float32Array(POST_COUNT);
  for (let i = 0; i < POST_COUNT; i++) postState[i] = -i * (SPAN / POST_COUNT);

  const placeDash = (i: number, z: number) => {
    dummy.position.set(0, 0.02, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  };
  const placePost = (i: number, z: number) => {
    const side = i % 2 === 0 ? -4.9 : 4.9;
    dummy.position.set(side, 0.5, z);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 1.05;
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
  };

  const SPEED = 9; // m/s — an unhurried night cruise
  let carT = -4; // seconds until the oncoming car enters

  const pointer = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener('pointermove', onPointer);

  const clock = new THREE.Clock();
  let raf = 0;

  const tick = (dt: number, t: number) => {
    for (let i = 0; i < DASH_COUNT; i++) {
      dashState[i] += SPEED * dt;
      if (dashState[i] > 4) dashState[i] -= SPAN;
      placeDash(i, dashState[i]);
    }
    dashes.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < POST_COUNT; i++) {
      postState[i] += SPEED * dt;
      if (postState[i] > 4) postState[i] -= SPAN;
      placePost(i, postState[i]);
    }
    posts.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;

    // Oncoming car cycle: approach, pass, reset with a pause.
    carT += dt;
    if (carT > 0) {
      const z = -SPAN + carT * (SPEED + 13);
      car.position.z = z;
      if (z > 6) carT = -(4 + Math.random() * 5);
    } else {
      car.position.z = -SPAN;
    }

    // Gentle cabin sway + pointer parallax on the camera only.
    camera.position.x = 0.9 + Math.sin(t * 0.5) * 0.05 + pointer.x * 0.22;
    camera.position.y = 1.35 + Math.sin(t * 0.9) * 0.02 - pointer.y * 0.1;
    camera.lookAt(0.4 + pointer.x * 0.6, 1.0 - pointer.y * 0.3, -12);
  };

  const render = () => renderer.render(scene, camera);
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    tick(dt, clock.elapsedTime);
    render();
    raf = requestAnimationFrame(loop);
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (still) {
      tick(1 / 60, 2.5);
      render();
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const onVisibility = () => {
    if (still) return;
    if (document.hidden) cancelAnimationFrame(raf);
    else loop();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Software renderers drop the context under memory pressure. A lost-context
  // canvas paints WHITE over the page, so hide it until the context returns,
  // then repaint the still frame (the loop repaints itself).
  const onLost = (e: Event) => {
    e.preventDefault();
    renderer.domElement.style.visibility = 'hidden';
  };
  const onRestored = () => {
    renderer.domElement.style.visibility = 'visible';
    if (still) {
      tick(1 / 60, 2.5);
      render();
    }
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  if (still) {
    // Compose a single readable frame: car mid-distance, dashes laid out.
    carT = 4.5;
    tick(1 / 60, 2.5);
    render();
  } else {
    loop();
  }

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    renderer.domElement.removeEventListener('webglcontextlost', onLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
    removeEventListener('pointermove', onPointer);
    headlightTex.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}

// Soft radial glow — drawn once, no asset download.
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(249,244,235,1)');
  g.addColorStop(0.25, 'rgba(249,244,235,0.55)');
  g.addColorStop(1, 'rgba(249,244,235,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
