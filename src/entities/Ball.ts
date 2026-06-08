import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { RawMatter } from '../utils/matter';
import { CosmeticStore } from '../utils/CosmeticStore';
import { reducedMotionActive } from '../utils/a11y';
import type { SkinStyle, TrailStyleName } from '../utils/cosmetics';
import type { Vec2 } from '../types';

// Linear interpolate two 0xRRGGBB colors (no Phaser dependency).
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export class Ball {
  readonly body: MatterJS.BodyType;
  readonly graphics: Phaser.GameObjects.Graphics;
  private readonly trailGraphics: Phaser.GameObjects.Graphics;
  private readonly trail: Array<{ x: number; y: number }> = [];
  private readonly fill: number; // equipped cosmetic colors
  private readonly glow: number;
  private readonly accent: number;
  private readonly skinStyle: SkinStyle;
  private readonly animated: boolean; // animated/void styles redraw each frame
  private readonly trailStyle: TrailStyleName;
  private readonly trailColors: number[]; // resolved palette (>=1 color)
  private phase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, startVelocity: Vec2 = { x: 0, y: 0 }) {
    const skin = CosmeticStore.equipped('skin');
    this.fill = skin.fill ?? PHYSICS.COLOR_BALL;
    this.glow = skin.glow ?? PHYSICS.COLOR_BALL_GLOW;
    this.accent = skin.accent ?? this.glow;
    this.skinStyle = skin.skinStyle ?? 'solid';
    this.animated = (this.skinStyle === 'animated' || this.skinStyle === 'void') && !reducedMotionActive();
    const trailCfg = CosmeticStore.equipped('trail').trail;
    this.trailStyle = trailCfg?.style ?? 'comet';
    this.trailColors = trailCfg && trailCfg.colors.length ? trailCfg.colors : [this.glow];
    this.body = scene.matter.add.circle(x, y, PHYSICS.BALL_RADIUS, {
      restitution: PHYSICS.BALL_RESTITUTION,
      friction: PHYSICS.BALL_FRICTION,
      frictionAir: PHYSICS.BALL_FRICTION_AIR,
      label: 'ball',
    });

    RawMatter.Body.setVelocity(this.body, {
      x: startVelocity.x || PHYSICS.BALL_START_VX,
      y: startVelocity.y || PHYSICS.BALL_START_VY,
    });

    // Trail is drawn beneath the ball (added to scene first). Additive blend +
    // the longer trail give the star a glowing "comet" tail (esp. on fast moves).
    this.trailGraphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.graphics = scene.add.graphics();
    this.draw();
  }

  // Drawn in local space (0,0); the graphics object is positioned at the body each
  // frame. `phase` animates the animated/void styles. All vector — cheap.
  private draw(phase = 0): void {
    const g = this.graphics;
    const r = PHYSICS.BALL_RADIUS;
    const acc = this.accent;
    const s = Math.sin(phase * 2);
    g.clear();
    g.lineStyle(3, this.glow, 0.35); // outer glow ring (every style)
    g.strokeCircle(0, 0, r + 7);

    switch (this.skinStyle) {
      case 'ringed':
        g.fillStyle(this.fill, 1);
        g.fillCircle(0, 0, r);
        g.lineStyle(2, acc, 0.7);
        g.strokeCircle(0, 0, r - 3);
        break;
      case 'dualtone':
        g.fillStyle(this.fill, 1);
        g.fillCircle(0, 0, r);
        g.fillStyle(acc, 0.9); // a two-tone accent lobe
        g.fillCircle(r * 0.28, -r * 0.28, r * 0.55);
        break;
      case 'void':
        g.fillStyle(this.fill, 1); // dark body
        g.fillCircle(0, 0, r);
        g.fillStyle(acc, 0.18 + 0.12 * s); // inner accretion glow (pulses)
        g.fillCircle(0, 0, r * 0.55);
        g.lineStyle(2.5, this.glow, 0.85 + 0.1 * s); // bright event-horizon rim
        g.strokeCircle(0, 0, r);
        break;
      case 'animated':
        g.fillStyle(this.fill, 1);
        g.fillCircle(0, 0, r);
        g.lineStyle(2, acc, 0.45 + 0.25 * (0.5 + 0.5 * s)); // pulsing corona
        g.strokeCircle(0, 0, r + 3 + 3 * s);
        break;
      default: // solid
        g.fillStyle(this.fill, 1);
        g.fillCircle(0, 0, r);
    }
    g.fillStyle(0xffffff, 0.85); // shared core highlight
    g.fillCircle(-r * 0.3, -r * 0.3, r * 0.2);
  }

  update(): void {
    const bx = this.body.position.x;
    const by = this.body.position.y;

    // Newest position at front; drop the oldest beyond TRAIL_LENGTH.
    this.trail.unshift({ x: bx, y: by });
    if (this.trail.length > PHYSICS.TRAIL_LENGTH) {
      this.trail.pop();
    }

    this.drawTrail();

    if (this.animated) {
      this.phase += 0.08;
      this.draw(this.phase); // animated/void skins breathe each frame
    }
    this.graphics.setPosition(bx, by);
  }

  // Styled comet tail. `comet/fire/ice/void/galaxy` taper soft circles (per-style
  // color); `lightning` draws a jagged electric bolt between trail points. Vector +
  // additive, within the trail-length budget.
  private drawTrail(): void {
    const g = this.trailGraphics;
    const cols = this.trailColors;
    g.clear();

    if (this.trailStyle === 'lightning') {
      for (let i = 1; i < this.trail.length; i++) {
        const t = 1 - i / PHYSICS.TRAIL_LENGTH;
        const a = this.trail[i - 1];
        const b = this.trail[i];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        const jolt = (i % 2 === 0 ? 1 : -1) * 5 * t;
        const jx = mx + (nx / len) * jolt;
        const jy = my + (ny / len) * jolt;
        g.lineStyle(2.5, lerpColor(cols[0], cols[cols.length - 1], i / this.trail.length), t * PHYSICS.TRAIL_MAX_ALPHA * 3);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(jx, jy);
        g.lineTo(b.x, b.y);
        g.strokePath();
      }
      return;
    }

    this.trail.forEach((pos, i) => {
      const t = 1 - i / PHYSICS.TRAIL_LENGTH; // 1 = newest, → 0 = oldest
      let color: number;
      let radius = PHYSICS.BALL_RADIUS * t * 0.55;
      let alpha = t * PHYSICS.TRAIL_MAX_ALPHA;
      switch (this.trailStyle) {
        case 'galaxy':
          color = cols[i % cols.length]; // shimmer through the palette
          break;
        case 'fire':
          color = lerpColor(cols[0], cols[cols.length - 1], t); // hot core → cooler tail
          radius *= 1.15;
          break;
        case 'ice':
          color = lerpColor(cols[0], cols[cols.length - 1], 1 - t);
          alpha *= 1.2;
          break;
        case 'void':
          color = lerpColor(cols[0], cols[cols.length - 1], t);
          radius *= 1.3;
          alpha *= 0.85;
          break;
        default: // comet
          color = cols[0];
      }
      g.fillStyle(color, alpha);
      g.fillCircle(pos.x, pos.y, radius);
    });
  }

  destroy(): void {
    this.trailGraphics.destroy();
    this.graphics.destroy();
  }
}
