export class Ambience {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.level = null;
  }
  async toggle() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.level = this.context.createGain();
      this.level.gain.value = 0;
      this.level.connect(this.context.destination);
      for (const [i, frequency] of [110, 164.8138, 220].entries()) {
        const oscillator = this.context.createOscillator(),
          gain = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.012 / (1 + i * 0.4);
        oscillator.connect(gain).connect(this.level);
        oscillator.start();
        const lfo = this.context.createOscillator(),
          depth = this.context.createGain();
        lfo.frequency.value = 0.065 + i * 0.018;
        depth.gain.value = 0.003;
        lfo.connect(depth).connect(gain.gain);
        lfo.start();
      }
      const noise = this.context.createBuffer(
          1,
          this.context.sampleRate * 4,
          this.context.sampleRate,
        ),
        samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] = (Math.random() - 0.5) * 0.025;
      const source = this.context.createBufferSource(),
        filter = this.context.createBiquadFilter();
      source.buffer = noise;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 360;
      source.connect(filter).connect(this.level);
      source.start();
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    this.level.gain.setTargetAtTime(
      this.enabled ? 1 : 0,
      this.context.currentTime,
      0.45,
    );
    return this.enabled;
  }
  visibility(hidden) {
    if (!this.context) return;
    hidden ? this.context.suspend() : this.enabled && this.context.resume();
  }
}
