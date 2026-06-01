import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { RawMatter } from '../utils/matter';

// A static barrier that slides between two points (yoyo loop), opening/closing
// gaps — the timing mechanic. The body is moved via setPosition each frame so it
// acts as a moving wall the ball must time. A faint track telegraphs its path.
export class MovingPlatform {
  readonly body: MatterJS.BodyType;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly tween: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    toX: number,
    toY: number,
    width: number,
    height: number,
    durationMs: number,
    angle = 0,
  ) {
    this.body = scene.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      restitution: 0.4,
      friction: 0.05,
      label: 'platform',
      angle: Phaser.Math.DegToRad(angle),
    });

    // Faint track showing the travel path (telegraphs the motion).
    this.track = scene.add.graphics().setDepth(-2);
    this.track.lineStyle(2, PHYSICS.COLOR_OBSTACLE, 0.25);
    this.track.lineBetween(x, y, toX, toY);

    this.graphics = scene.add.graphics();
    this.graphics.fillStyle(PHYSICS.COLOR_OBSTACLE, 1);
    this.graphics.fillRect(-width / 2, -height / 2, width, height);
    this.graphics.lineStyle(1.5, 0x6a7a90, 0.6); // brighter edge signals "active/moving"
    this.graphics.strokeRect(-width / 2, -height / 2, width, height);
    this.graphics.setRotation(Phaser.Math.DegToRad(angle));
    this.graphics.setPosition(x, y);

    const proxy = { x, y };
    this.tween = scene.tweens.add({
      targets: proxy,
      x: toX,
      y: toY,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        RawMatter.Body.setPosition(this.body, { x: proxy.x, y: proxy.y });
        this.graphics.setPosition(proxy.x, proxy.y);
      },
    });
  }

  destroy(): void {
    this.tween.remove();
    this.graphics.destroy();
    this.track.destroy();
  }
}
