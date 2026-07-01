// Pure FX gating. No Phaser side effects — just decisions the scene acts on.
import Phaser from 'phaser';

// Post-FX (bloom/vignette) requires the WebGL renderer.
export function fxCapable(rendererType: number): boolean {
  return rendererType === Phaser.WEBGL;
}

// True once a full window of fps samples averages below the threshold — the
// scene then tears down bloom so a weak GPU still holds framerate.
export function shouldDowngradeFx(
  samples: number[],
  threshold = 50,
  minSamples = 180,
): boolean {
  if (samples.length < minSamples) return false;
  const window = samples.slice(-minSamples);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  return avg < threshold;
}
