import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { PLATFORM } from '../config/platform.config';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import { sharedAudio } from '../utils/AudioSynth';
import { reducedMotionActive } from '../utils/a11y';
import type { Dismissable, PauseAction, PauseReason } from '../platform/pausable';

// Pause overlay launched on top of a paused GameScene / EndlessScene (D-11), the same way SettingsScene is:
// the caller does `scene.pause()` then `scene.launch('PauseScene', { caller })`. CONTINUE resumes the caller;
// RESTART and HOME hand the decision back to the caller through PLATFORM.PAUSE_ACTION_EVENT so it keeps owning
// its own teardown (triggerRestart / goHome / retry). SETTINGS opens SettingsScene over this overlay. Android
// Back (and Escape on the web) closes it via close(), see src/platform/lifecycle.ts. Gameplay never
// auto-resumes: only an explicit CONTINUE / Back does.
export class PauseScene extends Phaser.Scene implements Dismissable {
  private caller = 'GameScene';
  private closing = false;

  constructor() {
    super({ key: 'PauseScene' }); // PLATFORM.BACK.PAUSE_SCENE (pinned by platformConfig.test.ts)
  }

  create(data: { caller?: string; reason?: PauseReason }): void {
    this.caller = data?.caller ?? 'GameScene';
    this.closing = false; // reset: this scene is reused (singleton) across re-opens
    // Render above the launching scene regardless of scene-list order.
    this.scene.bringToTop();

    const U = PLATFORM.PAUSE_UI;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.rectangle(0, 0, width, height, 0x000000, THEME.SCRIM_ALPHA).setOrigin(0).setInteractive();

    const panelW = Math.min(width * U.PANEL_W_RATIO, U.PANEL_MAX_W);
    const btnW = panelW - U.PANEL_PAD_X * 2;
    const panelH = U.HEADER_H + U.PRIMARY_H + 3 * U.SECONDARY_H + 3 * U.BTN_GAP + U.PANEL_PAD_BOTTOM;
    const top = -panelH / 2;

    const card = this.add.container(cx, cy).setDepth(1);

    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);
    card.add(panel);

    const title = this.add
      .text(0, top + U.HEADER_H / 2, 'PAUSED', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: `${U.TITLE_SIZE_PX}px`,
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    title.setLetterSpacing(U.TITLE_SPACING_PX);
    card.add(title);

    let y = top + U.HEADER_H + U.PRIMARY_H / 2;
    const cont = new Button(this, 0, y, 'CONTINUE', () => this.close(), {
      width: btnW,
      height: U.PRIMARY_H,
      fontSize: U.PRIMARY_FONT_PX,
      fontFamily: THEME.FONT_DISPLAY,
      fill: THEME.ACCENT_PRIMARY,
      textColor: THEME.TEXT_ON_PRIMARY,
      glow: true,
    });
    card.add(cont.container);

    const secondary: Array<{ label: string; icon: 'restart' | 'settings' | 'home'; onClick: () => void }> = [
      { label: 'RESTART', icon: 'restart', onClick: () => this.act('restart') },
      { label: 'SETTINGS', icon: 'settings', onClick: () => this.openSettings() },
      { label: 'HOME', icon: 'home', onClick: () => this.act('home') },
    ];
    y += U.PRIMARY_H / 2 + U.BTN_GAP + U.SECONDARY_H / 2;
    secondary.forEach((s, i) => {
      const b = new Button(this, 0, y + i * (U.SECONDARY_H + U.BTN_GAP), s.label, s.onClick, {
        width: btnW,
        height: U.SECONDARY_H,
        fontSize: U.SECONDARY_FONT_PX,
        icon: s.icon,
      });
      card.add(b.container);
    });

    if (!reducedMotionActive()) {
      card.setScale(U.POP_FROM_SCALE);
      this.tweens.add({ targets: card, scale: 1, duration: U.POP_MS, ease: THEME.EASE_POP });
    }
  }

  // CONTINUE, and Android Back / Escape: resume the paused caller and close the overlay (exactly once).
  close(): void {
    if (this.closing) return;
    this.closing = true;
    try {
      sharedAudio().resume(); // audio unlock/resume; gameplay SFX are gated by the Sound setting as usual
    } catch {
      // audio unavailable: ignore
    }
    this.scene.resume(this.caller);
    this.scene.stop();
  }

  // RESTART / HOME: let the caller run its own teardown. The caller is resumed first because its leave path (camera
  // fade, scene restart) only progresses while the scene is stepping.
  private act(action: PauseAction): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.resume(this.caller);
    this.scene.get(this.caller)?.events.emit(PLATFORM.PAUSE_ACTION_EVENT, action);
    this.scene.stop();
  }

  // Idempotent: a double-tap must not pause this overlay twice (Settings' close() resumes it once).
  private openSettings(): void {
    if (this.closing || this.scene.isActive('SettingsScene')) return;
    this.scene.pause();
    this.scene.launch('SettingsScene', { caller: PLATFORM.BACK.PAUSE_SCENE });
  }
}
