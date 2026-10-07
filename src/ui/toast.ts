import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { reducedMotionActive } from '../utils/a11y';
import { drawGlass } from './glass';

export type ToastTone = 'info' | 'error';

// One toast per scene: a new one replaces the one still showing.
const live = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();

// A short glass pill centred at `y` (default: near the bottom). It never captures input, honors reduced motion (a plain
// fade, no pop) and removes itself. Used for purchase / restore outcomes (P00-T17); the glass look is the shared
// drawGlass() panel, the same one the win overlay's achievement toast uses.
export function showToast(scene: Phaser.Scene, message: string, opts: { tone?: ToastTone; y?: number } = {}): void {
  live.get(scene)?.destroy();
  const error = opts.tone === 'error';
  const { width, height } = scene.scale;
  const maxW = Math.min(width * 0.92, THEME.TOAST_MAX_W);

  const text = scene.add
    .text(0, 0, message, {
      fontFamily: THEME.FONT_BODY,
      fontSize: `${THEME.TOAST_FONT_PX}px`,
      color: error ? THEME.TOAST_ERROR_COLOR : THEME.TEXT_PRIMARY,
      align: 'center',
      wordWrap: { width: maxW - THEME.TOAST_PAD_X * 2 },
    })
    .setOrigin(0.5);
  const w = Math.min(maxW, text.width + THEME.TOAST_PAD_X * 2);
  const h = text.height + THEME.TOAST_PAD_Y * 2;
  const bg = scene.add.graphics();
  drawGlass(bg, w, h, Math.min(h / 2, THEME.RADIUS));
  if (error) {
    bg.lineStyle(1, THEME.TOAST_ERROR_STROKE, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, Math.min(h / 2, THEME.RADIUS));
  }

  const y = Phaser.Math.Clamp(opts.y ?? height - 96, h / 2 + 8, height - h / 2 - 8);
  const toast = scene.add.container(width / 2, y, [bg, text]).setDepth(THEME.TOAST_DEPTH);
  live.set(scene, toast);
  toast.once(Phaser.GameObjects.Events.DESTROY, () => {
    if (live.get(scene) === toast) live.delete(scene);
  });

  const reduced = reducedMotionActive();
  toast.setAlpha(0);
  if (!reduced) toast.setScale(THEME.TOAST_POP_START_SCALE);
  scene.tweens.add({ targets: toast, alpha: 1, scale: 1, duration: THEME.TOAST_FADE_MS, ease: reduced ? 'Linear' : THEME.EASE_POP });
  const hold = Math.min(THEME.TOAST_HOLD_BASE_MS + message.length * THEME.TOAST_HOLD_PER_CHAR_MS, THEME.TOAST_HOLD_MAX_MS);
  scene.time.delayedCall(hold, () => {
    if (!toast.active) return;
    scene.tweens.add({ targets: toast, alpha: 0, duration: THEME.TOAST_FADE_MS, onComplete: () => toast.destroy() });
  });
}
