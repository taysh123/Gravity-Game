import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { THEME } from '../config/theme.config';

// One-time first-play gesture demo: a glowing ghost dot that repeatedly presses
// near the ball and drags toward the goal, teaching "hold near the ball, drag to
// guide". Reduced-motion shows a static dot + arrow instead. Pairs with the
// bottom hint text (which supplies the words). Dismissed on first touch.
export class CoachMark {
  private readonly objs: Phaser.GameObjects.GameObject[] = [];
  private tween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    reduced: boolean,
  ) {
    const glow = scene.add
      .image(fromX, fromY, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffffff)
      .setAlpha(0.5)
      .setDisplaySize(64, 64)
      .setDepth(15);
    const core = scene.add.circle(fromX, fromY, 9, 0xffffff, 0.95).setDepth(16);
    core.setStrokeStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, 0.9);
    this.objs.push(glow, core);

    if (reduced) {
      // Static affordance: a short arrow from the ball toward the goal.
      const arrow = scene.add.graphics().setDepth(15);
      arrow.lineStyle(3, 0xffffff, 0.5);
      arrow.lineBetween(fromX, fromY, toX, toY);
      const ang = Math.atan2(toY - fromY, toX - fromX);
      const head = 12;
      arrow.lineBetween(toX, toY, toX - head * Math.cos(ang - 0.5), toY - head * Math.sin(ang - 0.5));
      arrow.lineBetween(toX, toY, toX - head * Math.cos(ang + 0.5), toY - head * Math.sin(ang + 0.5));
      this.objs.push(arrow);
      return;
    }

    // Loop: ghost presses at the ball, drags to the goal, fades, repeats.
    this.tween = scene.tweens.add({
      targets: [glow, core],
      x: toX,
      y: toY,
      alpha: { from: 0.95, to: 0 },
      duration: 1100,
      ease: THEME.EASE_SOFT,
      hold: 150,
      repeat: -1,
      repeatDelay: 550,
    });
  }

  destroy(): void {
    this.tween?.remove();
    this.objs.forEach((o) => o.destroy());
    this.objs.length = 0;
  }
}
