import Phaser from 'phaser';
import { IMAGES } from '../config/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // External image assets load here; preload completes before create() runs,
  // so the company logo is ready before its splash fade — no pop-in.
  preload(): void {
    this.load.image(IMAGES.trueStoryLogo.key, IMAGES.trueStoryLogo.url);
    this.load.image(IMAGES.gravityFlowLogo.key, IMAGES.gravityFlowLogo.url);
  }

  create(): void {
    this.generateSparkTexture();
    this.generateGlowTexture();
    // NOTE: start target flips to 'CompanySplashScene' once the splash chain
    // exists and is registered (build-order step 6). Until then, go straight
    // to the game so the app stays runnable at every commit.
    this.scene.start('GameScene');
  }

  // Runtime-generated particle texture — keeps the "no image assets" rule.
  // A small white disc; the emitter tints it per use.
  private generateSparkTexture(): void {
    const size = 8;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.generateTexture('spark', size, size);
    g.destroy();
  }

  // Soft white radial-gradient glow, generated once and shared by every splash
  // scene (tinted per use via setTint). A true radial gradient needs a canvas
  // context — Phaser Graphics can't draw one — so we use createCanvas.
  private generateGlowTexture(): void {
    const size = 256;
    const r = size / 2;
    const tex = this.textures.createCanvas('glow', size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
