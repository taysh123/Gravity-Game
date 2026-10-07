import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { Analytics } from '../services/Analytics';
import { sessionStart } from '../services/analyticsEvents';
import { Saves } from '../platform/saves';

// V19: the boot time hydrate ADDS, i.e. how long Boot still waited for it after
// the fonts were ready (about 0 when hydrate settled first). A User Timing entry
// in every build (chrome://inspect on a device:
// performance.getEntriesByName('boot:saves-wait')), a console line in dev only.
function traceSavesWait(fontsAt: number): void {
  const waited = Math.max(0, performance.now() - fontsAt);
  try {
    performance.measure('boot:saves-wait', { start: fontsAt, duration: waited });
  } catch {
    // User Timing unavailable: diagnostics only
  }
  if (import.meta.env.DEV) console.info(`[saves] boot waited ${waited.toFixed(1)} ms for hydrate after the fonts`);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // External image assets load here; preload completes before create() runs.
  preload(): void {
    this.load.image(IMAGES.gravityFlowLogo.key, IMAGES.gravityFlowLogo.url);
    this.load.image(IMAGES.trueStoryLabsLogo.key, IMAGES.trueStoryLabsLogo.url);
  }

  create(): void {
    // Fires once per app load (this scene never restarts) — anchors D1/D7 retention.
    Analytics.track(sessionStart());
    this.generateSparkTexture();
    this.generateGlowTexture();
    // Wait for the custom fonts so the first text rendered to canvas isn't a
    // fallback (canvas text doesn't re-render on late font load), and for the
    // save hydrate main.ts started (D-12): every store reads localStorage
    // synchronously, so it must hold the restored data before any menu reads it.
    // Neither promise rejects; the catch is belt-and-braces so Boot always ends.
    const fontsReady = this.loadFonts().then(() => performance.now());
    void Promise.all([fontsReady, Saves.hydrate()])
      .then(([fontsAt]) => traceSavesWait(fontsAt))
      .catch(() => undefined)
      .then(() => this.scene.start('CompanySplashScene'));
  }

  private async loadFonts(): Promise<void> {
    try {
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (!fonts) return;
      await Promise.all([
        fonts.load('700 40px "Orbitron"'),
        fonts.load('600 40px "Orbitron"'),
        fonts.load('400 16px "Exo 2"'),
        fonts.load('500 16px "Exo 2"'),
        fonts.load('600 16px "Exo 2"'),
      ]);
      await fonts.ready;
    } catch {
      // Fall back to system fonts silently.
    }
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
