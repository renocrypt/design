import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMaterials, makeEnvironment } from "./scene/materials.js";
import { createHall } from "./scene/hall.js";
import { createCast } from "./scene/characters.js";
import { Director } from "./scene/cameras.js";
import { loadHeadLibrary } from "./scene/heads.js";

export async function createTheatre(container, onProgress, onShot) {
  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute(
    "aria-label",
    "A three-dimensional reconstruction of the assembled court in Jingren Palace",
  );
  container.appendChild(renderer.domElement);
  await renderer.init();
  onProgress(0.08);
  const m = await createMaterials((v) => onProgress(0.08 + v * 0.35));
  m.headLibrary = await loadHeadLibrary();
  onProgress(0.55);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#a29b87");
  scene.environment = makeEnvironment();
  scene.environmentIntensity = 0.62;
  scene.add(new THREE.HemisphereLight("#ded8c4", "#7b7566", 1.18));
  const key = new THREE.DirectionalLight("#ffefd0", 3.0);
  key.position.set(-3.6, 5.6, 2.5);
  key.target.position.set(0, 0.5, -2.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {
    left: -7,
    right: 7,
    top: 7,
    bottom: -7,
    near: 0.1,
    far: 22,
  });
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.025;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight("#dce6e1", 1.2);
  fill.position.set(5, 3.4, -1);
  scene.add(fill);
  const back = new THREE.DirectionalLight("#e6c897", 0.65);
  back.position.set(0, 4, -5.8);
  scene.add(back);
  const hall = createHall(m);
  scene.add(hall);
  onProgress(0.67);
  const cast = createCast(m);
  scene.add(cast.group);
  onProgress(0.83);
  const camera = new THREE.PerspectiveCamera(
    49,
    container.clientWidth / container.clientHeight,
    0.035,
    50,
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.5;
  const director = new Director(camera, controls, onShot);
  const resize = () => {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.domElement.dispatchEvent(new Event("needs-render"));
  };
  new ResizeObserver(resize).observe(container);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  onProgress(1);
  let drawCalls = 0,
    triangles = 0;
  return {
    renderer,
    scene,
    camera,
    controls,
    director,
    cast,
    resize,
    render(time, active, delta, reducedMotion = false) {
      cast.update(time, active);
      director.tick(time, !reducedMotion);
      renderer.render(scene, camera);
      drawCalls = renderer.info.render.drawCalls;
      triangles = renderer.info.render.triangles;
    },
    info() {
      return {
        backend: renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2",
        drawCalls,
        triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        gpuMemoryMiB: Math.round(renderer.info.memory.total / 1048576),
      };
    },
  };
}
