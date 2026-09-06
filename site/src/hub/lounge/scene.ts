import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { isSoftwareRenderer } from '../../shared/gpu';
import { HERO_REVISION } from './revision';

export interface LoungeHandle {
  setPaused: (value: boolean) => void;
  setTheme: (night: boolean, animate?: boolean) => void;
  dispose: () => void;
}

/** A baked architectural room with matching daylight and practical-light atlases. */
export async function mountLounge(host: HTMLElement, signal: AbortSignal): Promise<LoungeHandle | null> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  if (isSoftwareRenderer(renderer.getContext())) {
    renderer.dispose(); renderer.forceContextLoss();
    host.dataset.mode = 'still';
    return null;
  }
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // The atlas already contains the authored color transform.
  renderer.domElement.className = 'poster-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const draco = new DRACOLoader();
  draco.setDecoderPath('/hero/draco/');
  draco.setDecoderConfig({ type: 'wasm' });
  draco.setWorkerLimit(1);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const results = await Promise.allSettled([
    loader.loadAsync(`/hero/lounge.glb?v=${HERO_REVISION}`),
    new THREE.TextureLoader().loadAsync(`/hero/lounge-atlas${small ? '-mobile' : ''}.webp?v=${HERO_REVISION}`),
    new THREE.TextureLoader().loadAsync(`/hero/lounge-atlas-night${small ? '-mobile' : ''}.webp?v=${HERO_REVISION}`),
  ]);
  draco.dispose();
  const model = results[0].status === 'fulfilled' ? results[0].value : null;
  const map = results[1].status === 'fulfilled' ? results[1].value : null;
  const nightMap = results[2].status === 'fulfilled' ? results[2].value : null;
  const releaseModel = () => model?.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
  if (!model || !map || !nightMap || !model.cameras[0] || signal.aborted || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    releaseModel(); map?.dispose(); nightMap?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    host.dataset.mode = 'still';
    return null;
  }
  for (const texture of [map, nightMap]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  }
  const mood = { value: document.documentElement.dataset.theme === 'night' ? 1 : 0 };
  const material = new THREE.MeshBasicMaterial({ map });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNightMap = { value: nightMap };
    shader.uniforms.uMood = mood;
    shader.fragmentShader = 'uniform sampler2D uNightMap;\nuniform float uMood;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      'vec4 dayColor = texture2D(map, vMapUv);\nvec4 nightColor = texture2D(uNightMap, vMapUv);\ndiffuseColor *= mix(dayColor, nightColor, uMood);');
  };
  material.customProgramCacheKey = () => 'lounge-lighting';
  const details: { material: THREE.MeshBasicMaterial; day: THREE.Color; night: THREE.Color }[] = [];
  model.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = Array.isArray(object.material) ? object.material : [object.material];
    if (object.userData.unbaked) {
      const source = original[0] as THREE.MeshStandardMaterial;
      const day = source.color.clone().multiplyScalar(object.userData.luminous ? 1 : .72);
      const night = object.userData.luminous
        ? new THREE.Color('#fff0ce')
        : day.clone().multiply(new THREE.Color(1, .84, .65));
      const flat = new THREE.MeshBasicMaterial({ color: day.clone().lerp(night, mood.value) });
      object.material = flat;
      details.push({ material: flat, day, night });
    } else object.material = material;
    original.forEach((m) => m.dispose());
  });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#467c6d');
  scene.add(model.scene);
  model.scene.updateMatrixWorld(true);
  const source = model.cameras[0] as THREE.PerspectiveCamera;
  const camera = source.clone();
  source.getWorldPosition(camera.position);
  source.getWorldQuaternion(camera.quaternion);
  const origin = camera.position.clone();
  const target = origin.clone().addScaledVector(source.getWorldDirection(new THREE.Vector3()), 11.4);
  const baseFov = source.fov;
  const sourceAspect = 1600 / 1100;
  const pointer = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  let paused = false, visible = true, lost = false, disposed = false, ticking = false;
  let frames = 0, elapsed = 0, last = 0, slow = 0, adaptiveStill = false;
  const interval = touch ? 1000 / 24 : 1000 / 30;
  const render = () => {
    if (lost || disposed) return;
    const before = performance.now();
    renderer.render(scene, camera);
    const duration = performance.now() - before;
    slow = duration > 28 ? slow + 1 : Math.max(0, slow - 1);
    frames++;
    host.dataset.ready = 'true';
    if (slow > 40) {
      adaptiveStill = true;
      host.dataset.mode = 'still';
      host.dispatchEvent(new Event('lounge-still'));
      sync();
    }
  };
  const tick = () => {
    const now = performance.now();
    if (now - last < interval - .5) return;
    const delta = Math.min((now - (last || now)) / 1000, .075);
    elapsed += delta;
    last = now;
    smooth.lerp(pointer, .065);
    camera.position.set(
      origin.x + smooth.x * .16 + Math.sin(elapsed * .25) * .035,
      origin.y - smooth.y * .07 + Math.sin(elapsed * .18) * .018,
      origin.z + Math.sin(elapsed * .13) * .025,
    );
    camera.lookAt(target);
    render();
  };
  const sync = () => {
    const next = !paused && !adaptiveStill && !document.hidden && visible && !lost && !disposed;
    if (next === ticking) return;
    ticking = next;
    last = 0;
    if (next) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };
  const resize = () => {
    if (disposed) return;
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    // Exactly match object-fit:cover on the initial still at every aspect ratio.
    camera.fov = camera.aspect > sourceAspect
      ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) * sourceAspect / camera.aspect))
      : baseFov;
    camera.updateProjectionMatrix();
    render();
  };
  const onPointer = (event: PointerEvent) => {
    if (touch || paused) return;
    const r = host.getBoundingClientRect();
    pointer.set((event.clientX - r.left) / r.width * 2 - 1, (event.clientY - r.top) / r.height * 2 - 1);
  };
  const leave = () => pointer.set(0, 0);
  const onLost = (event: Event) => {
    event.preventDefault(); lost = true;
    host.dataset.ready = 'false'; host.dataset.mode = 'fallback';
    host.dispatchEvent(new Event('lounge-unavailable'));
    sync();
  };
  const onRestored = () => {
    lost = false;
    host.dataset.mode = adaptiveStill ? 'still' : 'live';
    render(); sync();
    if (!adaptiveStill) host.dispatchEvent(new Event('lounge-available'));
  };
  const poster = host.closest<HTMLElement>('.poster')!;
  const sizing = new ResizeObserver(resize);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  sizing.observe(host); visibility.observe(host);
  poster.addEventListener('pointermove', onPointer, { passive: true });
  poster.addEventListener('pointerleave', leave);
  document.addEventListener('visibilitychange', sync);
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);
  host.dataset.mode = 'live';
  resize(); sync();

  const dispose = () => {
    if (disposed) return;
    disposed = true; sync();
    sizing.disconnect(); visibility.disconnect();
    poster.removeEventListener('pointermove', onPointer);
    poster.removeEventListener('pointerleave', leave);
    document.removeEventListener('visibilitychange', sync);
    renderer.domElement.removeEventListener('webglcontextlost', onLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
    gsap.killTweensOf(mood);
    releaseModel(); map.dispose(); nightMap.dispose(); material.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    host.dataset.ready = 'false';
    if (import.meta.env.DEV) Reflect.deleteProperty(window, '__LOUNGE__');
  };
  signal.addEventListener('abort', dispose, { once: true });
  if (import.meta.env.DEV) Object.assign(window, { __LOUNGE__: {
    stats: () => ({ frames, ticking, mode: host.dataset.mode, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, dpr: renderer.getPixelRatio(), texture: [map.image.width, map.image.height], aspect: camera.aspect, lighting: mood.value }),
    capture: () => { render(); return renderer.domElement.toDataURL('image/png'); },
  } });
  const applyMood = () => {
    details.forEach((detail) => detail.material.color.copy(detail.day).lerp(detail.night, mood.value));
    if (!ticking && visible && !document.hidden) render();
  };
  return {
    setPaused(value) { paused = value; sync(); },
    setTheme(night, animate = true) {
      if (disposed) return;
      gsap.killTweensOf(mood);
      if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        mood.value = night ? 1 : 0;
        applyMood();
      } else gsap.to(mood, { value: night ? 1 : 0, duration: .9, ease: 'power2.inOut', onUpdate: applyMood });
    },
    dispose,
  };
}
