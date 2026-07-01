import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { SPLASH } from '../config/splash.config';
import { FX } from '../config/fx.config';
import type { WorldTheme } from '../config/worldThemes';
import { reducedMotionActive } from '../utils/a11y';
import { clamp } from '../utils/MathUtils';
import { mulberry32 } from '../utils/endless';
import { dueForComet, cometProgress, pickCometPath, type CometPath } from '../utils/comets';

interface ActiveComet {
  path: CometPath;
  bornMs: number;
}

// Shared cosmic backdrop: a deep-space fill, two parallax star layers, a few
// additive nebula glows, and a pooled comet layer. Reused by the intro splash,
// main menu, level select, and gameplay so the world feels continuous and
// alive. Performance: 2 TileSprites + N glow sprites + 1 pooled Graphics (the
// comets — vector strokes, never particles/bodies) — no per-frame primitive
// redraw beyond that one Graphics, well within the perf budget.
export class CosmicBackground {
  private readonly scene: Phaser.Scene;
  private readonly farStars: Phaser.GameObjects.TileSprite;
  private readonly nearStars: Phaser.GameObjects.TileSprite;
  private readonly nebula: Phaser.GameObjects.Image[] = [];
  private readonly nebulaBase: { x: number; y: number }[] = [];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private elapsed = 0; // seconds — drives the existing star drift / nebula breathing
  private elapsedMs = 0; // ms — comet scheduling/animation timebase (kept separate, never mixed)
  private readonly intensity: number;

  // Pooled comet layer: one Graphics, additive blend, cleared + redrawn each
  // frame, hard-capped at FX.COMET_MAX_ACTIVE. RNG is a fixed, non-Math.random
  // deterministic source so cadence is reproducible; comets still vary because
  // they are gated by elapsed time.
  private readonly cometG: Phaser.GameObjects.Graphics;
  private readonly cometTint: number;
  private readonly cometRng: () => number;
  private cometLastMs = 0;
  private cometGapMs: number;
  private activeComets: ActiveComet[] = [];

  // Press-reactive nebula pulse: raw 0..1 value with a linear decay to rest over
  // NEBULA_PULSE_MS; the visual contribution is eased (ease-out) in update().
  private pulseT = 0;

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
      this.nebulaBase.push({ x: nx, y: ny });
      this.objects.push(glow);
    }

    // Pooled comet layer — sits between the far and near star layers/nebula so a
    // streak reads as part of the depth stack, not an overlay. Additive blend,
    // one Graphics, cleared + redrawn every frame in update().
    this.cometTint = theme?.starTint ?? FX.COMET_TINT;
    this.cometRng = mulberry32(Math.floor(scene.game.loop.time) + 1);
    this.cometGapMs = FX.COMET_MIN_GAP_MS + this.cometRng() * (FX.COMET_MAX_GAP_MS - FX.COMET_MIN_GAP_MS);
    this.cometG = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(-88);
    this.objects.push(this.cometG);
  }

  // Drift the star layers, gently animate the nebula (+ press-reactive pulse),
  // and advance the comet pool. Call from scene.update().
  update(): void {
    const deltaMs = this.scene.game.loop.delta;
    const dt = deltaMs / 1000;
    this.elapsed += dt;
    this.elapsedMs += deltaMs;
    this.farStars.tilePositionY -= SPLASH.STAR_DRIFT_SPEED * 0.4 * dt;
    this.nearStars.tilePositionY -= SPLASH.STAR_DRIFT_SPEED * dt;

    // Press-reactive pulse: raw pulseT decays linearly to rest over NEBULA_PULSE_MS;
    // its visual contribution below is shaped with a quadratic ease-out so the swell
    // decelerates as it settles. pulse() no-ops under reduced-motion, so this stays 0.
    if (this.pulseT > 0) {
      this.pulseT = Math.max(0, this.pulseT - deltaMs / FX.NEBULA_PULSE_MS);
    }
    const pulseEase = this.pulseT * (2 - this.pulseT); // quadratic ease-out on the decay

    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    this.nebula.forEach((n, i) => {
      n.rotation += 0.00015 * (i + 1);
      n.setAlpha(
        SPLASH.NEBULA_ALPHA *
          this.intensity *
          (0.85 + 0.15 * Math.sin(this.elapsed * 0.5 + i)) *
          (1 + pulseEase * FX.NEBULA_PULSE_GAIN),
      );
      // Third, subtle parallax motion: a tiny press-reactive nudge away from
      // each glow's base position — the nebula "swells" outward on a press.
      const base = this.nebulaBase[i];
      const bdx = base.x - cx;
      const bdy = base.y - cy;
      const blen = Math.hypot(bdx, bdy) || 1;
      const nudge = pulseEase * FX.NEBULA_PULSE_PARALLAX_PX;
      n.setPosition(base.x + (bdx / blen) * nudge, base.y + (bdy / blen) * nudge);
    });

    this.updateComets();
  }

  // Press-reactive nebula swell — call on cause (e.g. attractor spawn). A new
  // press supersedes (never stacks past 1) an in-progress decay. Reduced-motion
  // keeps the existing calm drift and treats this as a no-op.
  pulse(strength01: number): void {
    if (reducedMotionActive()) return;
    this.pulseT = Math.max(this.pulseT, clamp(strength01, 0, 1));
  }

  // Schedule + redraw the pooled comet layer. One Graphics, cleared and
  // redrawn every frame — cheap vector strokes, never particles/bodies.
  // Reduced-motion: spawn nothing and drain any already-active comets.
  private updateComets(): void {
    if (reducedMotionActive()) {
      if (this.activeComets.length) this.activeComets.length = 0;
      this.cometG.clear();
      return;
    }

    const { width, height } = this.scene.scale;
    // Cadence relies on the invariant COMET_MIN_GAP_MS (4200) > COMET_MAX_LIFE_MS
    // (1600): a comet always finishes before the next is due, so we never actually
    // sit at the COMET_MAX_ACTIVE cap. If that invariant is ever broken, advance
    // cometLastMs even when at cap so a freed slot can't spawn with no fresh gap.
    if (
      this.activeComets.length < FX.COMET_MAX_ACTIVE &&
      dueForComet(this.cometLastMs, this.elapsedMs, this.cometGapMs)
    ) {
      const path = pickCometPath(this.cometRng, width, height, FX.COMET_MIN_LIFE_MS, FX.COMET_MAX_LIFE_MS);
      this.activeComets.push({ path, bornMs: this.elapsedMs });
      this.cometLastMs = this.elapsedMs;
      this.cometGapMs = FX.COMET_MIN_GAP_MS + this.cometRng() * (FX.COMET_MAX_GAP_MS - FX.COMET_MIN_GAP_MS);
    }

    this.cometG.clear();
    this.activeComets = this.activeComets.filter((c) => {
      const p = cometProgress(c.bornMs, this.elapsedMs, c.path.lifeMs);
      if (p >= 1) return false;
      const hx = c.path.x0 + (c.path.x1 - c.path.x0) * p;
      const hy = c.path.y0 + (c.path.y1 - c.path.y0) * p;
      const a = Math.sin(p * Math.PI) * FX.COMET_ALPHA; // fade in then out
      const dx = c.path.x1 - c.path.x0;
      const dy = c.path.y1 - c.path.y0;
      const len = Math.hypot(dx, dy) || 1;
      this.cometG.lineStyle(2, this.cometTint, a);
      this.cometG.lineBetween(hx, hy, hx - (dx / len) * FX.COMET_TAIL_LEN, hy - (dy / len) * FX.COMET_TAIL_LEN);
      this.cometG.fillStyle(this.cometTint, a);
      this.cometG.fillCircle(hx, hy, FX.COMET_HEAD_R);
      return true;
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
    this.nebulaBase.length = 0;
    this.activeComets.length = 0;
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
