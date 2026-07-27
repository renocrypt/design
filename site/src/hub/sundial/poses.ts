import * as THREE from 'three';

// The two art-directed states of the Sundial wall, side by side.
// All numbers from the synthesized build spec (workflow wf_6a8eda3c).

export interface Pose {
  keyPos: THREE.Vector3;
  keyColor: number;
  keyIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  wall: number;
  sun: number;
  bar: number;
  arch: number;
  ring: number;
  peg: number;
  crescent: number; // emissive intensity of the sun disc
  halo: number; // halo opacity
  stars: number; // star opacity
  eclipse: number; // 0 = parked off-sun, 1 = carving the crescent
}

export const DAY: Pose = {
  keyPos: new THREE.Vector3(5.75, 4.31, 3.5),
  keyColor: 0xffeccf,
  keyIntensity: 2.6,
  hemiSky: 0xbcd6ff,
  hemiGround: 0xffd9a8,
  hemiIntensity: 0.55,
  wall: 0x08337f,
  sun: 0xffb200,
  bar: 0x0072e3,
  arch: 0xff4c24,
  ring: 0xab54f7,
  peg: 0xe5262c,
  crescent: 0,
  halo: 0,
  stars: 0,
  eclipse: 0,
};

export const NIGHT: Pose = {
  keyPos: new THREE.Vector3(-5.86, 4.92, 2.34),
  keyColor: 0xcfd7ff,
  keyIntensity: 1.1,
  hemiSky: 0x232c55,
  hemiGround: 0x493321,
  hemiIntensity: 0.28,
  wall: 0x100b26,
  sun: 0xffb200,
  bar: 0x1258c9,
  arch: 0xc73516,
  ring: 0x8a46cc,
  peg: 0xb81d20,
  crescent: 0.85,
  halo: 0.35,
  stars: 1,
  eclipse: 1,
};

export type Theme = 'day' | 'night';

export function initialTheme(): Theme {
  const stored = localStorage.getItem('hub-theme');
  if (stored === 'day' || stored === 'night') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}
