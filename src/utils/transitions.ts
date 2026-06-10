import Phaser from 'phaser';
import { SPLASH } from '../config/splash.config';

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
