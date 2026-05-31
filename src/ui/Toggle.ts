import Phaser from 'phaser';
import { THEME } from '../config/theme.config';

const W = 52;
const H = 30;
const KNOB = 22;

// A toggle switch (track + sliding knob). Animates on change, calls back with
// the new value. Used by the settings overlay.
export class Toggle {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Arc;
  private value: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initial: boolean,
    onChange: (value: boolean) => void,
  ) {
    this.scene = scene;
    this.value = initial;

    this.track = scene.add.graphics();
    this.knob = scene.add.circle(0, 0, KNOB / 2, 0xffffff);

    this.container = scene.add.container(x, y, [this.track, this.knob]);
    this.container.setSize(W, H);
    // Generous hit area for an easy tap.
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-W / 2 - 8, -H / 2 - 8, W + 16, H + 16),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.container.input) this.container.input.cursor = 'pointer';

    this.render(false);
    this.container.on('pointerup', () => this.set(!this.value, onChange));
  }

  destroy(): void {
    this.container.destroy();
  }

  private set(value: boolean, onChange: (v: boolean) => void): void {
    this.value = value;
    this.render(true);
    onChange(value);
  }

  private render(animate: boolean): void {
    const on = this.value;
    this.track.clear();
    this.track.fillStyle(on ? THEME.ACCENT_PRIMARY : 0x2a2f48, on ? 0.9 : 1);
    this.track.fillRoundedRect(-W / 2, -H / 2, W, H, H / 2);
    if (!on) {
      this.track.lineStyle(1, THEME.HAIRLINE, THEME.HAIRLINE_ALPHA);
      this.track.strokeRoundedRect(-W / 2, -H / 2, W, H, H / 2);
    }
    const knobX = on ? W / 2 - KNOB / 2 - 3 : -W / 2 + KNOB / 2 + 3;
    if (animate) {
      this.scene.tweens.add({ targets: this.knob, x: knobX, duration: 160, ease: THEME.EASE });
    } else {
      this.knob.x = knobX;
    }
  }
}
