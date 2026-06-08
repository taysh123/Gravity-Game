import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { RawMatter } from '../utils/matter';
import { CosmeticStore } from '../utils/CosmeticStore';
import { reducedMotionActive } from '../utils/a11y';
import type { SkinStyle } from '../utils/cosmetics';
import type { Vec2 } from '../types';

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
  private phase = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, startVelocity: Vec2 = { x: 0, y: 0 }) {
    const skin = CosmeticStore.equipped('skin');
    this.fill = skin.fill ?? PHYSICS.COLOR_BALL;
    this.glow = skin.glow ?? PHYSICS.COLOR_BALL_GLOW;
    this.accent = skin.accent ?? this.glow;
    this.skinStyle = skin.skinStyle ?? 'solid';
    this.animated = (this.skinStyle === 'animated' || this.skinStyle === 'void') && !reducedMotionActive();
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

    // Each older segment is smaller and fainter — a soft taper behind the ball.
    this.trailGraphics.clear();
    this.trail.forEach((pos, i) => {
      const t = 1 - i / PHYSICS.TRAIL_LENGTH; // 1 = newest, → 0 = oldest
      const alpha = t * PHYSICS.TRAIL_MAX_ALPHA;
      const radius = PHYSICS.BALL_RADIUS * t * 0.55;
      this.trailGraphics.fillStyle(this.glow, alpha);
      this.trailGraphics.fillCircle(pos.x, pos.y, radius);
    });

    if (this.animated) {
      this.phase += 0.08;
      this.draw(this.phase); // animated/void skins breathe each frame
    }
    this.graphics.setPosition(bx, by);
  }

  destroy(): void {
    this.trailGraphics.destroy();
    this.graphics.destroy();
  }
}
