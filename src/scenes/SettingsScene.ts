import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { Toggle } from '../ui/Toggle';
import { IconButton } from '../ui/IconButton';
import { drawGlass } from '../ui/glass';
import { drawIcon, type IconName } from '../ui/icons';
import { sharedAudio } from '../utils/AudioSynth';
import { SettingsStore } from '../utils/SettingsStore';
import { reducedMotionActive } from '../utils/a11y';

interface Row {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

// Settings overlay launched on top of a paused caller scene (game or menu).
// Lightweight glass panel: Sound / Music / Haptics / Reduce Motion + close.
export class SettingsScene extends Phaser.Scene {
  private caller = 'MainMenuScene';

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(data: { caller?: string }): void {
    this.caller = data?.caller ?? 'MainMenuScene';
    // Render above the launching scene regardless of scene-list order
    // (the list places this before GameScene).
    this.scene.bringToTop();
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Scrim — taps outside the panel close the overlay.
    this.add
      .rectangle(0, 0, width, height, 0x000000, THEME.SCRIM_ALPHA)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.close());

    const s = SettingsStore.get();
    const rows: Row[] = [
      { icon: 'sound', label: 'Sound', value: s.sound, onChange: (v) => SettingsStore.set('sound', v) },
      {
        icon: 'music',
        label: 'Music',
        value: s.music,
        onChange: (v) => {
          SettingsStore.set('music', v);
          const audio = sharedAudio();
          audio.resume();
          if (v) audio.startAmbientPad();
          else audio.stopAmbientPad();
        },
      },
      { icon: 'haptics', label: 'Haptics', value: s.haptics, onChange: (v) => SettingsStore.set('haptics', v) },
      {
        icon: 'motion',
        label: 'Reduce Motion',
        value: reducedMotionActive(),
        onChange: (v) => SettingsStore.set('reduceMotion', v ? 'on' : 'off'),
      },
    ];

    const panelW = Math.min(width * 0.86, 340);
    const rowH = 58;
    const headerH = 64;
    const panelH = headerH + rows.length * rowH + 18;
    const left = -panelW / 2;
    const top = -panelH / 2;

    // Everything lives in one container so the panel pops as a unit.
    const card = this.add.container(cx, cy).setDepth(1);

    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);
    card.add(panel);

    const title = this.add
      .text(left + 22, top + 30, 'SETTINGS', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '20px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);
    title.setLetterSpacing(2);
    card.add(title);

    const close = new IconButton(this, panelW / 2 - 26, top + 26, 'close', () => this.close(), {
      size: 40,
      iconSize: 18,
      round: true,
    });
    card.add(close.container);

    rows.forEach((row, i) => {
      const ry = top + headerH + i * rowH + rowH / 2;

      const icon = this.add.graphics().setPosition(left + 32, ry);
      drawIcon(icon, row.icon, 22, THEME.ACCENT_CYAN);
      card.add(icon);

      const label = this.add
        .text(left + 58, ry, row.label, {
          fontFamily: THEME.FONT_BODY,
          fontSize: '17px',
          color: THEME.TEXT_PRIMARY,
        })
        .setOrigin(0, 0.5);
      card.add(label);

      const toggle = new Toggle(this, panelW / 2 - 44, ry, row.value, row.onChange);
      card.add(toggle.container);
    });

    if (!reducedMotionActive()) {
      card.setScale(0.85);
      this.tweens.add({ targets: card, scale: 1, duration: 320, ease: THEME.EASE_POP });
    }

    this.input.keyboard?.once('keydown-ESC', () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume(this.caller);
  }
}
