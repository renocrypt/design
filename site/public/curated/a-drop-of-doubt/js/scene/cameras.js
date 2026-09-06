import * as THREE from "three/webgpu";

const SHOTS = {
  wide: {
    position: [0.1, 2.77, 8.35],
    target: [0, 1.2, -2.3],
    fov: 49,
    label: "The assembled court",
  },
  empress: {
    position: [0.34, 1.86, -3.18],
    target: [0, 1.77, -5.34],
    fov: 37,
    label: "The Empress",
  },
  qi: {
    position: [1.2, 1.76, -2.25],
    target: [2.18, 1.52, 0.13],
    fov: 38,
    label: "Noble Lady Qi",
  },
  zhen: {
    position: [-0.33, 1.57, -2.45],
    target: [-2.6, 1.26, -3.35],
    fov: 37,
    label: "Zhen Huan",
  },
  ning: {
    position: [-0.13, 1.58, -0.84],
    target: [-2.6, 1.3, -1.69],
    fov: 37,
    label: "Noble Lady Ning",
  },
  an: {
    position: [-0.1, 1.6, 0.81],
    target: [-2.6, 1.3, 0],
    fov: 38,
    label: "An Lingrong",
  },
  jing: {
    position: [0.08, 1.58, -0.87],
    target: [2.6, 1.29, -1.69],
    fov: 38,
    label: "Consort Jing",
  },
  hand: {
    position: [-1.69, 1.025, -2.34],
    target: [-2.37, 0.765, -3.11],
    fov: 35,
    label: "A moment of stillness",
  },
  reverse: {
    position: [0.1, 2.22, -4.6],
    target: [0.12, 1.28, 2.25],
    fov: 52,
    label: "Across the room",
  },
};

export class Director {
  constructor(camera, controls, onShot) {
    this.camera = camera;
    this.controls = controls;
    this.onShot = onShot;
    this.current = "";
    this.base = null;
    this.setShot("wide");
  }
  setShot(id, force = false) {
    if (this.current === id && !force) return;
    const shot = SHOTS[id] || SHOTS.wide;
    this.current = id;
    this.base = shot;
    this.controls.enabled = false;
    this.camera.position.set(...shot.position);
    this.camera.fov = shot.fov;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(...shot.target);
    this.camera.lookAt(this.controls.target);
    this.onShot?.(shot.label);
  }
  tick(time, drift = true) {
    if (this.controls.enabled) return;
    const shot = this.base;
    const shift = drift ? Math.sin(time * 0.065) * 0.035 : 0;
    this.camera.position.set(
      shot.position[0] + shift,
      shot.position[1],
      shot.position[2],
    );
    this.camera.lookAt(...shot.target);
  }
  explore(actor = null) {
    if (actor) {
      const target = actor.focus();
      const forward = new THREE.Vector3(0, 0.18, 2.35).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        actor.root.rotation.y,
      );
      this.camera.position.copy(target).add(forward);
      this.controls.target.copy(target);
      this.camera.fov = 40;
    } else {
      this.setShot("wide", true);
      this.controls.target.set(0, 1.18, -2.0);
    }
    const offset = this.camera.position.clone().sub(this.controls.target),
      az = Math.atan2(offset.x, offset.z);
    this.controls.minAzimuthAngle = az - (actor ? 1.05 : 0.43);
    this.controls.maxAzimuthAngle = az + (actor ? 1.05 : 0.43);
    this.controls.minPolarAngle = actor ? 1.08 : 1.29;
    this.controls.maxPolarAngle = 1.49;
    this.controls.minDistance = actor ? 0.65 : 6.3;
    this.controls.maxDistance = actor ? 3.5 : 10.2;
    this.controls.enablePan = false;
    this.controls.enabled = true;
    this.controls.update();
    this.camera.updateProjectionMatrix();
    this.onShot?.(actor ? actor.person.name : "Explore the court");
  }
}
