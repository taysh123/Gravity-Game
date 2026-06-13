import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { SPLASH } from '../config/splash.config';
import type { WorldTheme } from '../config/worldThemes';

// Shared cosmic backdrop: a deep-space fill, two parallax star layers, and a
// few additive nebula glows. Reused by the intro splash, main menu, and level
// select so the world feels continuous. Performance: 2 TileSprites + N glow
// sprites — no per-frame primitive redraw, well within the perf budget.
export class CosmicBackground {
  private readonly scene: Phaser.Scene;
  private readonly farStars: Phaser.GameObjects.TileSprite;
  private readonly nearStars: Phaser.GameObjects.TileSprite;
  private readonly nebula: Phaser.GameObjects.Image[] = [];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private elapsed = 0;
  private readonly intensity: number;

  // intensity < 1 dims stars + nebula — used behind gameplay so the backdrop
  // never competes with the ball/goal/obstacles. An optional WorldTheme gives each
  // world a distinct palette (fill / nebula / star tint).
  constructor(scene: Phaser.Scene, intensity = 1, theme?: WorldTheme) {
    this.scene = scene;
    this.intensity = intensity;
    const { width, height } = scene.scale;
    const starAlphaMul = theme?.starAlpha ?? 1;
    const nebulaTints = theme?.nebulaTints ?? SPLASH.NEBULA_TINTS;

    const fill = scene.add
      .rectangle(0, 0, width, height, theme?.bgColor ?? PHYSICS.COLOR_BACKGROUND)
      .setOrigin(0)
      .setDepth(-100);
    this.objects.push(fill);

    ensureStarTexture(scene, 'stars-far', SPLASH.STAR_FAR_COUNT);
    ensureStarTexture(scene, 'stars-near', SPLASH.STAR_NEAR_COUNT);

    this.farStars = scene.add
      .tileSprite(0, 0, width, height, 'stars-far')
      .setOrigin(0)
      .setAlpha(SPLASH.STAR_FAR_ALPHA * intensity * starAlphaMul)
      .setDepth(-90);
    this.nearStars = scene.add
      .tileSprite(0, 0, width, height, 'stars-near')
      .setOrigin(0)
      .setAlpha(SPLASH.STAR_NEAR_ALPHA * intensity * starAlphaMul)
      .setDepth(-80);
    if (theme?.starTint !== undefined) {
      this.farStars.setTint(theme.starTint);
      this.nearStars.setTint(theme.starTint);
    }
    this.objects.push(this.farStars, this.nearStars);

    // Nebula glows spread across the screen, additive + low alpha so they read
    // as soft atmosphere rather than discrete blobs.
    for (let i = 0; i < SPLASH.NEBULA_COUNT; i++) {
      const nx = width * (0.2 + 0.3 * i);
      const ny = height * (0.25 + 0.22 * i);
      const tint = nebulaTints[i % nebulaTints.length];
      const glow = scene.add
        .image(nx, ny, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(tint)
        .setAlpha(SPLASH.NEBULA_ALPHA * intensity)
        .setScale(2.6 + i * 0.6)
        .setDepth(-85);
      this.nebula.push(glow);
      this.objects.push(glow);
    }
  }

  // Drift the star layers and gently animate the nebula. Call from scene.update().
  update(): void {
    const dt = this.scene.game.loop.delta / 1000;
    this.elapsed += dt;
    this.farStars.tilePositionY -= SPLASH.STAR_DRIFT_SPEED * 0.4 * dt;
    this.nearStars.tilePositionY -= SPLASH.STAR_DRIFT_SPEED * dt;
    this.nebula.forEach((n, i) => {
      n.rotation += 0.00015 * (i + 1);
      n.setAlpha(SPLASH.NEBULA_ALPHA * this.intensity * (0.85 + 0.15 * Math.sin(this.elapsed * 0.5 + i)));
    });
  }

  // Pin the whole backdrop to the screen (ignore camera scroll) — used by the
  // endless climb so the starfield stays put while the world scrolls past it.
  setScrollFactor(factor: number): void {
    this.objects.forEach((o) => {
      (o as Phaser.GameObjects.GameObject & { setScrollFactor?: (f: number) => void }).setScrollFactor?.(factor);
    });
  }

  destroy(): void {
    this.objects.forEach((o) => o.destroy());
    this.objects.length = 0;
    this.nebula.length = 0;
  }
}

// A small repeating tile of random faint stars, generated once per texture key.
function ensureStarTexture(scene: Phaser.Scene, key: string, count: number): void {
  if (scene.textures.exists(key)) return;
  const size = SPLASH.STAR_TILE;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.3 + 0.3;
    const a = Math.random() * 0.6 + 0.4;
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
}
