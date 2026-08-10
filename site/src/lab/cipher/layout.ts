// The machine's dimensions, in one place, because two things read them: the
// Three.js build and the SVG blueprint that stands in for it in the Proof
// register. One source means the drawing cannot drift from the object.
//
// The object changed: S5 is no longer built from primitives but from a real
// model — "Enigma Machine" by ASHISH (CC BY 4.0), split offline into 127 nodes
// (26 keys, 26 lamps, 75 static parts). These constants are MEASURED off that
// asset (slots.mjs, 2026-07-30), in the scene units machine.ts bakes at load:
// rotate +90° about Y so the operator's front faces +z, ×15, centred in x/z,
// floored so the case bottom is y=0.

/** Asset scale: source-model units → scene units (machine body is 4.38 wide). */
export const SCALE = 15;

/** Full footprint of the model, lid included. Front of the machine faces +z. */
export const CASE = { w: 4.383, d: 6.464, h: 8.18 } as const;
/** Machine body without the open lid standing behind it. */
export const BODY = { d: 5.14, h: 3.76, backZ: -1.91 } as const;
/** Keyboard deck height (cap tops ≈ 3.28, lampboard ≈ 3.29). */
export const DECK = 3.2;
/** Front face, where the plugboard and nameplate live. */
export const FRONT = CASE.d / 2;

/** Bakelite ring caps, measured: 0.37 pitch, ~0.27 diameter. */
export const KEY_R = 0.135;
/** Lampboard lenses, measured slightly smaller than the caps. */
export const LAMP_R = 0.12;
/** How far a key sinks when pressed: nearly half the cap, or the stroke
 *  reads as nothing at page distance (0.075 was ~2px on screen). */
export const KEY_TRAVEL = 0.13;

/** Keyboard rows, front to back — QWERTZ, as the machine was built. */
export const KEY_ROWS = ['PYXCVBNML', 'ASDFGHJK', 'QWERTZUIO'] as const;

/** Degrees per rotor step, and therefore the quantisation of the cipher. */
export const STEP_DEG = 360 / 26;

export interface Slot {
  letter: string;
  x: number;
  y: number;
  z: number;
}

/**
 * The 26 keys and 26 lamps, measured from the split model's node centroids.
 * Lamps sit behind their keys (smaller z), same x — the lampboard is the row
 * grammar repeated, offset toward the rotors, not a second keyboard.
 */
const SLOTS: (Slot & { kind: 'key' | 'lamp' })[] = [
  { kind: 'key', letter: 'A', x: -1.246, y: 3.214, z: 1.5 },
  { kind: 'key', letter: 'B', x: 0.364, y: 3.138, z: 1.902 },
  { kind: 'key', letter: 'C', x: -0.378, y: 3.141, z: 1.902 },
  { kind: 'key', letter: 'D', x: -0.504, y: 3.211, z: 1.5 },
  { kind: 'key', letter: 'E', x: -0.666, y: 3.274, z: 1.085 },
  { kind: 'key', letter: 'F', x: -0.133, y: 3.209, z: 1.5 },
  { kind: 'key', letter: 'G', x: 0.238, y: 3.207, z: 1.5 },
  { kind: 'key', letter: 'H', x: 0.609, y: 3.205, z: 1.5 },
  { kind: 'key', letter: 'I', x: 1.189, y: 3.265, z: 1.085 },
  { kind: 'key', letter: 'J', x: 0.98, y: 3.204, z: 1.5 },
  { kind: 'key', letter: 'K', x: 1.35, y: 3.202, z: 1.5 },
  { kind: 'key', letter: 'L', x: 1.476, y: 3.133, z: 1.902 },
  { kind: 'key', letter: 'M', x: 1.105, y: 3.134, z: 1.902 },
  { kind: 'key', letter: 'N', x: 0.734, y: 3.136, z: 1.902 },
  { kind: 'key', letter: 'O', x: 1.56, y: 3.263, z: 1.085 },
  { kind: 'key', letter: 'P', x: -1.491, y: 3.147, z: 1.902 },
  { kind: 'key', letter: 'Q', x: -1.407, y: 3.278, z: 1.085 },
  { kind: 'key', letter: 'R', x: -0.295, y: 3.272, z: 1.085 },
  { kind: 'key', letter: 'S', x: -0.875, y: 3.212, z: 1.5 },
  { kind: 'key', letter: 'T', x: 0.076, y: 3.271, z: 1.085 },
  { kind: 'key', letter: 'U', x: 0.818, y: 3.267, z: 1.085 },
  { kind: 'key', letter: 'V', x: -0.007, y: 3.14, z: 1.902 },
  { kind: 'key', letter: 'W', x: -1.036, y: 3.276, z: 1.085 },
  { kind: 'key', letter: 'X', x: -0.749, y: 3.143, z: 1.902 },
  { kind: 'key', letter: 'Y', x: -1.12, y: 3.145, z: 1.902 },
  { kind: 'key', letter: 'Z', x: 0.447, y: 3.269, z: 1.085 },
  { kind: 'lamp', letter: 'A', x: -1.245, y: 3.299, z: 0.209 },
  { kind: 'lamp', letter: 'B', x: 0.364, y: 3.292, z: 0.552 },
  { kind: 'lamp', letter: 'C', x: -0.377, y: 3.295, z: 0.552 },
  { kind: 'lamp', letter: 'D', x: -0.503, y: 3.295, z: 0.209 },
  { kind: 'lamp', letter: 'E', x: -0.665, y: 3.295, z: -0.138 },
  { kind: 'lamp', letter: 'F', x: -0.133, y: 3.293, z: 0.209 },
  { kind: 'lamp', letter: 'G', x: 0.238, y: 3.292, z: 0.209 },
  { kind: 'lamp', letter: 'H', x: 0.609, y: 3.29, z: 0.209 },
  { kind: 'lamp', letter: 'I', x: 1.189, y: 3.287, z: -0.138 },
  { kind: 'lamp', letter: 'J', x: 0.98, y: 3.288, z: 0.209 },
  { kind: 'lamp', letter: 'L', x: 1.477, y: 3.286, z: 0.552 },
  { kind: 'lamp', letter: 'K', x: 1.351, y: 3.286, z: 0.209 },
  { kind: 'lamp', letter: 'M', x: 1.106, y: 3.288, z: 0.552 },
  { kind: 'lamp', letter: 'N', x: 0.735, y: 3.29, z: 0.552 },
  { kind: 'lamp', letter: 'O', x: 1.56, y: 3.285, z: -0.138 },
  { kind: 'lamp', letter: 'P', x: -1.49, y: 3.3, z: 0.552 },
  { kind: 'lamp', letter: 'Q', x: -1.407, y: 3.299, z: -0.138 },
  { kind: 'lamp', letter: 'R', x: -0.294, y: 3.294, z: -0.138 },
  { kind: 'lamp', letter: 'S', x: -0.874, y: 3.297, z: 0.209 },
  { kind: 'lamp', letter: 'T', x: 0.076, y: 3.292, z: -0.138 },
  { kind: 'lamp', letter: 'U', x: 0.818, y: 3.288, z: -0.138 },
  { kind: 'lamp', letter: 'V', x: -0.006, y: 3.293, z: 0.552 },
  { kind: 'lamp', letter: 'W', x: -1.036, y: 3.297, z: -0.138 },
  { kind: 'lamp', letter: 'X', x: -0.748, y: 3.297, z: 0.552 },
  { kind: 'lamp', letter: 'Y', x: -1.119, y: 3.299, z: 0.552 },
  { kind: 'lamp', letter: 'Z', x: 0.447, y: 3.29, z: -0.138 },
];

/** Every key's deck position, by letter. */
export const keySlots = (): Slot[] => SLOTS.filter((s) => s.kind === 'key');

/** Every lamp's panel position, by letter. */
export const lampSlots = (): Slot[] => SLOTS.filter((s) => s.kind === 'lamp');
