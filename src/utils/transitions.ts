import Phaser from 'phaser';
import { SPLASH } from '../config/splash.config';

const { r, g, b } = SPLASH.FADE_RGB;

// Camera fade-in to the app background. Call at the top of a scene's create().
export function fadeIn(scene: Phaser.Scene, ms: number = SPLASH.SCENE_FADE_MS): void {
  scene.cameras.main.fadeIn(ms, r, g, b);
}

// Fade out, then start the next scene. One place to tune every transition.
export function fadeToScene(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  ms: number = SPLASH.SCENE_FADE_MS,
): void {
  const cam = scene.cameras.main;
  cam.fadeOut(ms, r, g, b);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}
