// The motion law, kept free of Three.js on purpose: it is pure maths, so it can
// be tested on a machine with no GPU — which this one is. scene.ts consumes it.
//
// Five tracks read the SAME scroll scalar and ease toward their own targets at
// their own rates. The old page had one scrubbed timeline, so everything moved
// on a single curve; here the drift between non-harmonic rates is the
// non-linearity. Technique measured off obys (per-subsystem lerp, 0.05/0.1/0.15);
// applying it per subsystem rather than per input is ours.

export interface Track {
  name: string;
  value: number;
  target: number;
  /** Fraction of the remaining gap closed per 60th of a second. */
  rate: number;
}

export const makeTracks = (): Record<string, Track> => ({
  camera: { name: 'camera', value: 0, target: 0, rate: 0.045 },
  yaw: { name: 'yaw', value: 0, target: 0, rate: 0.075 },
  spread: { name: 'spread', value: 0, target: 0, rate: 0.11 },
  labels: { name: 'labels', value: 0, target: 0, rate: 0.16 },
  // 0.083, not 0.09: at 0.09 this was exactly 2x the camera rate, so the two
  // could re-synchronise and the tracks would visibly move as one. tracks.test
  // caught it, which is the reason that check exists.
  reveal: { name: 'reveal', value: 0, target: 0, rate: 0.083 },
});

/** Frame-rate independent approach, so the feel is identical at 30 and 144fps. */
export const advance = (t: Track, dt: number): number => {
  t.value += (t.target - t.value) * (1 - Math.pow(1 - t.rate, dt * 60));
  return t.value;
};

/**
 * Each track maps the same scroll position through a DIFFERENT shape, so they
 * diverge before their rates even get involved.
 */
export const retarget = (tracks: Record<string, Track>, v: number, stops: number): void => {
  const c = Math.max(0, Math.min(stops - 1, v));
  tracks.camera.target = c;
  tracks.yaw.target = Math.sin(c * 0.9) * 0.42;
  tracks.spread.target = c >= 1 && c < 2.6 ? 1 : 0;
  tracks.labels.target = c > 0.6 ? 1 : 0;
  tracks.reveal.target = Math.min(1, c / 1.4);
};
