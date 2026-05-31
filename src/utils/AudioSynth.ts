// Synthesized Web Audio sounds. Zero assets, zero loading.
// All tones are soft sine waves at low gain — subtle feedback, not arcade effects.
export class AudioSynth {
  private readonly ctx: AudioContext;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  // Browsers suspend audio until a user gesture; call from a pointer handler.
  resume(): void {
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  // Sustained low hum while the gravity field is held. Idempotent — calling
  // again while already humming does nothing, so it's safe per pointerdown.
  startHum(): void {
    if (this.humOsc) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t); // low A — felt more than heard
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.035, t + 0.12); // gentle fade-in

    osc.start(t);
    this.humOsc = osc;
    this.humGain = gain;
  }

  // Fade the hum to silence and release the oscillator. Safe if not humming.
  stopHum(): void {
    if (!this.humOsc || !this.humGain) return;
    const osc = this.humOsc;
    const gain = this.humGain;
    this.humOsc = null;
    this.humGain = null;

    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.stop(t + 0.12);
  }

  // Soft low blip when the gravity field activates.
  playGravityActivate(): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(196, t);
    osc.frequency.exponentialRampToValueAtTime(294, t + 0.09);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Gentle rising tone when the ball settles into the goal.
  playGoalCapture(): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.3);
    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(0.09, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // ── Intro splash cues ────────────────────────────────────────────
  // These are scheduled on the context regardless of state; if audio is still
  // suspended (no prior user gesture) they simply make no sound — no errors.

  // Rising filtered-noise whoosh as the energy sphere crosses the screen.
  playWhoosh(durationSec = 0.7): void {
    const t = this.ctx.currentTime;
    const noise = this.createNoise(durationSec);
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(180, t);
    band.frequency.exponentialRampToValueAtTime(1400, t + durationSec);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + durationSec * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);

    noise.connect(band);
    band.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + durationSec);
  }

  // Deep downward "thoom" when the sphere is captured by the vortex.
  playVortexThoom(): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

    osc.start(t);
    osc.stop(t + 0.72);
  }

  // Bright ascending shimmer as the logo is revealed.
  playRevealChime(): void {
    const freqs = [659.25, 987.77, 1318.51]; // E5, B5, E6
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const t = this.ctx.currentTime + i * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.6);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  private createNoise(durationSec: number): AudioBufferSourceNode {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * durationSec));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  // Soft C-E-G ascending chord for level complete. Slow, warm, unobtrusive.
  playLevelComplete(): void {
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const t = this.ctx.currentTime + i * 0.15;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }
}
