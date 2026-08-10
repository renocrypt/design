// Is this machine too slow for live 3D?
//
// Six scenes hang their degrade ladder on this one boolean: pixel ratio, shadow
// maps, how many lights get built, and whether the page runs a loop at all. It
// has to be answerable BEFORE the scene is built, because a light that was never
// created cannot be added later.
//
// Rung one is the renderer string, and it mostly works — measured 2026-07-30 in
// Chrome 150, WEBGL_debug_renderer_info is present and honest, reporting
// "ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max)" on this machine and
// "…(SwiftShader Device (LLVM 10.0.0)), SwiftShader driver" when Chrome is forced
// onto software with --use-angle=swiftshader. Where the browser answers, believe it.
//
// The gap is where it does NOT answer: Firefox under resistFingerprinting returns
// null from getExtension, and some webviews mask the string to ''. The old code
// then tested '' against /swiftshader/, got false, and concluded "fast GPU" for
// everyone in that bucket — a rung with no trigger. CONCEPT.md § Adding a lane
// makes a firing trigger a hard rule, so rung two stops guessing and measures.
//
// Timing GPU work from the CPU needs a forced sync, which is what readPixels is
// doing below: it stalls until the queued draws have actually landed. Without it
// we would time the command buffer and every GPU on earth would look instant.

/** Probe target edge, px. Sized from the sweep below — fill rate is most of the signal. */
const SIZE = 512;
/** Fragment ALU iterations. Compile-time constant: GLSL ES 1.00 requires a fixed bound. */
const ITERS = 128;
/** Draws per timed window. */
const PASSES = 24;
/**
 * Milliseconds above which we take the still-frame rung.
 *
 * Measured 2026-07-30 across this exact workload, five timed windows each:
 *
 *   Apple M5 Max (ANGLE Metal)   median 1.0 ms, max 1.4 ms
 *   SwiftShader (forced, ANGLE)  median 110.5 ms, min 95.5 ms
 *
 * 10 sits in the empty decade between them — 7× of headroom under the fastest
 * software reading, 68× over the slowest hardware one. The threshold is not
 * trying to identify SwiftShader specifically; it asks whether this machine can
 * afford live 3D, so an old integrated GPU landing on the still frame is the
 * ladder working, not a false positive.
 */
const BUDGET_MS = 10;

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Deliberately ALU-heavy rather than a flat fill: at 48 iterations the two
// populations were only 8.5× apart, and software rasterisers close the gap
// faster on pure fill than on arithmetic. At 128 they are 110× apart.
const FRAG = `
precision highp float;
void main() {
  vec2 uv = gl_FragCoord.xy / ${SIZE}.0;
  float a = 0.0;
  for (int i = 0; i < ${ITERS}; i++) {
    a += sin(uv.x * float(i)) * cos(uv.y * float(i));
  }
  gl_FragColor = vec4(fract(a), 0.0, 0.0, 1.0);
}`;

const compile = (gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null => {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
};

/**
 * Time a fixed GPU workload on a throwaway context.
 *
 * Its own canvas on purpose: callers run this right after building their
 * THREE.WebGLRenderer, and three.js caches GL state aggressively. Probing through
 * the live context would leave it holding a program and buffer three does not know
 * it lost. The context is released the moment we have the number.
 *
 * Returns milliseconds, or null when the probe could not run — an inconclusive
 * probe must not be read as a slow one.
 */
const probeMs = (): number | null => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const gl = canvas.getContext('webgl', {
    antialias: false,
    depth: false,
    powerPreference: 'high-performance',
  }) as WebGLRenderingContext | null;
  if (!gl) return null;

  const release = () => gl.getExtension('WEBGL_lose_context')?.loseContext();

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = vs && fs ? gl.createProgram() : null;
  if (!vs || !fs || !prog) {
    release();
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    release();
    return null;
  }
  gl.useProgram(prog);

  // One oversized triangle rather than two quad triangles: no diagonal seam, one
  // fewer vertex, and the clip is free.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, SIZE, SIZE);

  const px = new Uint8Array(4);
  // Warm-up: the first draw pays for shader compilation, program upload and the
  // driver's lazy pipeline setup. Timing it would measure the compiler.
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

  const t0 = performance.now();
  for (let i = 0; i < PASSES; i++) gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const ms = performance.now() - t0;

  release();
  return ms;
};

let cached: boolean | null = null;

/**
 * True when this machine should get the still-frame rung instead of live 3D.
 *
 * Memoised: the answer cannot change within a page, and rung two costs a few
 * milliseconds of blocked main thread that nobody should pay twice.
 */
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  if (cached !== null) return cached;

  // Rung one: the browser tells us outright.
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (name) {
    return (cached = /swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(name));
  }

  // Rung two: it did not, so measure. An inconclusive probe defers to live 3D —
  // the failure we are guarding against is a slow page, not a missing one, and
  // the webglcontextlost guards still cover the rest.
  const ms = probeMs();
  return (cached = ms !== null && ms > BUDGET_MS);
}

/** Test seam: forget the memoised answer so the probe can be measured repeatedly. */
export function __resetGpuProbe(): void {
  cached = null;
}
