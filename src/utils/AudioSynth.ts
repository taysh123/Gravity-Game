// Synthesized Web Audio sounds. Zero assets, zero loading.
// All tones are soft sine waves at low gain — subtle feedback, not arcade effects.
import { SettingsStore } from './SettingsStore';

export class AudioSynth {
  private readonly ctx: AudioContext;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private pad: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private worldPad: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private currentThemeKey: string | null = null; // `${worldId}:${boss}` — continuity within a world

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  // SFX honor the Sound setting; the ambient pad honors the Music setting.
  private get sfxOn(): boolean {
    return SettingsStore.get().sound;
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
    if (!this.sfxOn) return;
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
    if (!this.sfxOn) return;
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
    if (!this.sfxOn) return;
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
    if (!this.sfxOn) return;
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
    if (!this.sfxOn) return;
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
    if (!this.sfxOn) return;
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

  // Bright two-note ping when a gem is collected.
  playGem(): void {
    if (!this.sfxOn) return;
    [880, 1320].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const t = this.ctx.currentTime + i * 0.07;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  // Rising tone per star in the win celebration (0,1,2 -> higher) — the ascending
  // "ding-ding-DING" that makes earning stars feel good.
  playStarTone(index: number): void {
    if (!this.sfxOn) return;
    const freqs = [659.25, 830.61, 1046.5]; // E5, G#5, C6
    const f = freqs[Math.min(Math.max(0, index), freqs.length - 1)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    const t = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  // Soft descending tone when the ball is lost. Distinct from the rising cues.
  playFail(): void {
    if (!this.sfxOn) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.35);

    osc.start(t);
    osc.stop(t + 0.37);
  }

  // Soft C-E-G ascending chord for level complete. Slow, warm, unobtrusive.
  playLevelComplete(): void {
    if (!this.sfxOn) return;
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

  // ── Ambient music pad (Music setting) ────────────────────────────
  // A soft, slowly-detuned low chord — cosmic ambience under the menus.
  startAmbientPad(): void {
    if (!SettingsStore.get().music) return;
    if (this.pad.length) return;
    const base = 55; // low A
    const ratios = [1, 1.5, 2.0]; // root, fifth, octave
    const t = this.ctx.currentTime;
    ratios.forEach((r, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = base * r * (1 + i * 0.002); // slight detune for warmth
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.022 / (i + 1), t + 2.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      this.pad.push({ osc, gain });
    });
  }

  stopAmbientPad(): void {
    if (!this.pad.length) return;
    const t = this.ctx.currentTime;
    this.pad.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.stop(t + 0.7);
    });
    this.pad = [];
  }

  // ── In-game per-world music bed (Music setting) ───────────────────
  // A distinct chord/mood per world; idempotent within a world (so it plays
  // continuously across level restarts). Boss = a tenser minor bed. Procedural
  // now; a real looping track can replace this behind the same call site later.
  startWorldTheme(worldId: number, boss = false): void {
    const key = `${worldId}:${boss}`;
    if (this.currentThemeKey === key) return; // already playing this world's bed
    this.stopWorldTheme();
    this.currentThemeKey = key;
    if (!SettingsStore.get().music) return;

    // Per-world base note + chord + waveform (mood). Boss overrides to a minor bed.
    const beds: Record<number, { base: number; ratios: number[]; type: OscillatorType }> = {
      1: { base: 55, ratios: [1, 1.5, 2], type: 'sine' },        // Foundations — calm A
      2: { base: 73.4, ratios: [1, 1.5, 2.25], type: 'triangle' }, // Currents — airy D
      3: { base: 87.3, ratios: [1, 1.5, 2], type: 'triangle' },    // Clockwork — F
      4: { base: 82.4, ratios: [1, 1.2, 1.5], type: 'sine' },      // Peril — minor, tense E
      5: { base: 65.4, ratios: [1, 1.5, 2], type: 'sine' },        // Wells — heavy C
      6: { base: 98, ratios: [1, 1.414, 2], type: 'triangle' },    // Rifts — unstable (tritone) G
      7: { base: 73.4, ratios: [1, 1.5, 2], type: 'sine' },        // Gates — clean D
      8: { base: 65.4, ratios: [1, 1.5, 2, 2.5], type: 'triangle' }, // Convergence — warm add9 C
    };
    const bed = boss ? { base: 55, ratios: [1, 1.19, 1.5], type: 'sawtooth' as OscillatorType } : (beds[worldId] ?? beds[1]);
    const t = this.ctx.currentTime;
    bed.ratios.forEach((r, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = bed.type;
      osc.frequency.value = bed.base * r * (1 + i * 0.0025); // slight detune for warmth/tension
      const target = (boss ? 0.03 : 0.02) / (i + 1);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(target, t + 2.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      this.worldPad.push({ osc, gain });
    });
  }

  stopWorldTheme(): void {
    this.currentThemeKey = null;
    if (!this.worldPad.length) return;
    const t = this.ctx.currentTime;
    this.worldPad.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.stop(t + 0.6);
    });
    this.worldPad = [];
  }

  // Triumphant rising arpeggio when a boss is cleared.
  playBossClear(): void {
    if (!this.sfxOn) return;
    const freqs = [392, 523.25, 659.25, 783.99, 1046.5]; // G4 C5 E5 G5 C6
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const t = this.ctx.currentTime + i * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }
}

// One shared AudioSynth + AudioContext for the whole app — avoids leaking
// contexts across scenes (browsers cap how many you can open).
let shared: AudioSynth | null = null;
export function sharedAudio(): AudioSynth {
  if (!shared) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    shared = new AudioSynth(new Ctor());
  }
  return shared;
}
