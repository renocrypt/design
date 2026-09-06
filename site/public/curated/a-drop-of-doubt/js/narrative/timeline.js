import { CUES, DURATION } from "./cues.js";

export class Timeline extends EventTarget {
  constructor() {
    super();
    this.time = 0;
    this.playing = false;
    this.started = false;
    this.exploring = false;
    this.index = 0;
  }
  notify() {
    this.dispatchEvent(new Event("change"));
  }
  get cue() {
    return CUES[this.index];
  }
  play() {
    if (this.time >= DURATION) this.seek(0);
    this.started = true;
    this.exploring = false;
    this.playing = true;
    this.notify();
  }
  pause() {
    this.playing = false;
    this.notify();
  }
  toggle() {
    this.playing ? this.pause() : this.play();
  }
  seek(value) {
    this.time = Math.max(0, Math.min(DURATION, value));
    this.index = Math.max(
      0,
      CUES.findLastIndex((c) => c.start <= this.time),
    );
    if (this.time === DURATION) this.playing = false;
    this.notify();
  }
  step(direction) {
    this.started = true;
    this.exploring = false;
    this.seek(
      CUES[Math.max(0, Math.min(CUES.length - 1, this.index + direction))]
        .start,
    );
  }
  tick(delta) {
    if (this.playing) this.seek(this.time + delta);
  }
  explore() {
    this.started = true;
    this.playing = false;
    this.exploring = true;
    this.notify();
  }
}
