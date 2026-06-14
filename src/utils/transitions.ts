import Phaser from 'phaser';
import { SPLASH } from '../config/splash.config';
import { reducedMotionActive } from './a11y';

const { r, g, b } = SPLASH.FADE_RGB;

// Scenes currently mid-transition. Guards against double-tap / re-entrant
// navigation: two quick taps (or tapping a second button during the fade) would
// otherwise fire two scene starts → stuck / black / inconsistent on touch devices.
const transitioning = new WeakSet<Phaser.Scene>();

// Camera fade-in to the app background. Call at the top of a scene's create().
export function fadeIn(scene: Phaser.Scene, ms: number = SPLASH.SCENE_FADE_MS): void {
  scene.cameras.main.fadeIn(ms, r, g, b);
}

// Fade out, then start the next scene. One place to tune every transition.
// Re-entrancy-guarded: a second call is ignored, and input is disabled immediately
// so no further taps register while the scene is leaving.
export function fadeToScene(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  ms: number = SPLASH.SCENE_FADE_MS,
): void {
  if (transitioning.has(scene)) return;
  transitioning.add(scene);
  scene.input.enabled = false; // no further taps while leaving
  // Clear the mark when this scene shuts down — covers scene.start to any key and
  // restart of a reused scene (e.g. GameScene) whose instance persists.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => transitioning.delete(scene));
  const cam = scene.cameras.main;
  cam.fadeOut(ms, r, g, b);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}

// Cinematic "warp jump" between scenes — accelerating white star-streaks radiating
// from centre + an accent-tinted bloom, then start the next scene (whose fadeIn
// hands off smoothly). The reward for travelling to a world. Re-entrancy-guarded;
// reduced-motion falls back to a plain fade. Effect is a few cheap vector lines +
// one additive sprite — well within the perf budget.
export function warpToScene(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  accent: number = SPLASH.VORTEX_COLOR,
): void {
  if (reducedMotionActive()) {
    fadeToScene(scene, key, data);
    return;
  }
  if (transitioning.has(scene)) return;
  transitioning.add(scene);
  scene.input.enabled = false;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => transitioning.delete(scene));

  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;
  const reach = Math.max(width, height);
  const DEPTH = 9999;

  const bloom = scene.add
    .image(cx, cy, 'glow')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(accent)
    .setAlpha(0)
    .setScrollFactor(0)
    .setDepth(DEPTH)
    .setDisplaySize(90, 90);
  scene.tweens.add({ targets: bloom, alpha: 0.75, displayWidth: reach * 2.4, displayHeight: reach * 2.4, duration: 380, ease: 'Cubic.easeIn' });

  const streaks = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
  const seeds = Array.from({ length: 30 }, () => ({ a: Math.random() * Math.PI * 2, r0: 18 + Math.random() * 70 }));
  const obj = { t: 0 };
  scene.tweens.add({
    targets: obj,
    t: 1,
    duration: 430,
    ease: 'Cubic.easeIn',
    onUpdate: () => {
      streaks.clear();
      streaks.lineStyle(2, 0xffffff, 0.85 * (1 - obj.t * 0.25));
      for (const s of seeds) {
        const inner = s.r0 + obj.t * reach * 0.55;
        const outer = inner + 28 + obj.t * 180;
        streaks.beginPath();
        streaks.moveTo(cx + Math.cos(s.a) * inner, cy + Math.sin(s.a) * inner);
        streaks.lineTo(cx + Math.cos(s.a) * outer, cy + Math.sin(s.a) * outer);
        streaks.strokePath();
      }
    },
    onComplete: () => scene.scene.start(key, data),
  });
}
