import { Timeline } from "./narrative/timeline.js";
import { createUI } from "./ui/interface.js";
import { PEOPLE } from "./scene/people.js";

const timeline = new Timeline();
let theatre = null,
  previousExploring = false,
  lastShot = "wide",
  dirty = true;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ui = createUI(timeline, {
  explore(id) {
    if (theatre)
      theatre.director.explore(id ? theatre.cast.actors.get(id) : null);
  },
});

timeline.addEventListener("change", () => {
  dirty = true;
  if (!theatre) return;
  if (
    !timeline.exploring &&
    (previousExploring || lastShot !== timeline.cue.shot)
  ) {
    theatre.director.setShot(timeline.cue.shot, true);
    lastShot = timeline.cue.shot;
  }
  theatre.renderer.domElement.style.touchAction = timeline.exploring
    ? "none"
    : "pan-y";
  previousExploring = timeline.exploring;
});

async function start() {
  try {
    const { createTheatre } = await import("./renderer.js");
    theatre = await createTheatre(
      document.getElementById("canvas-wrap"),
      (value) => ui.progress(value),
      (label) => ui.setShot(label),
    );
    ui.ready(PEOPLE);
    let last = performance.now(),
      frames = 0,
      period = last,
      fps = 0;
    theatre.controls.addEventListener("change", () => {
      dirty = true;
    });
    theatre.renderer.domElement.addEventListener("needs-render", () => {
      dirty = true;
    });
    function render(now) {
      const delta = Math.min((now - last) / 1000, 0.075);
      last = now;
      timeline.tick(delta);
      if (theatre.controls.enabled) theatre.controls.update();
      if (timeline.playing || dirty) {
        theatre.render(
          timeline.time,
          timeline.cue.speaker,
          delta,
          reducedMotion,
        );
        dirty = false;
        frames++;
      }
      if (now - period >= 1000) {
        fps = (frames * 1000) / (now - period);
        frames = 0;
        period = now;
      }
    }
    theatre.renderer.setAnimationLoop(render);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) theatre.renderer.setAnimationLoop(null);
      else {
        last = performance.now();
        dirty = true;
        theatre.renderer.setAnimationLoop(render);
      }
    });
    // A small inspection surface for reproducible browser checks.
    window.__COURT__ = {
      timeline,
      theatre,
      getStatus: () => ({
        ready: true,
        time: timeline.time,
        playing: timeline.playing,
        exploring: timeline.exploring,
        cue: timeline.index,
        fps: Math.round(fps),
        ...theatre.info(),
      }),
    };
    document.documentElement.dataset.sceneReady = "true";
  } catch (error) {
    ui.error(error);
  }
}
start();
