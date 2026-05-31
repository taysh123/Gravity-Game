// Accessibility + device helpers for App-Store-quality presentation.
import { SettingsStore } from './SettingsStore';

// True when the OS requests reduced motion.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Effective reduced-motion state: the user's explicit setting overrides the OS;
// 'system' falls back to the OS preference. Scenes call this (not the raw
// prefersReducedMotion) so the in-app toggle takes effect.
export function reducedMotionActive(): boolean {
  const pref = SettingsStore.get().reduceMotion;
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return prefersReducedMotion();
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Reads the CSS env(safe-area-inset-*) values via a one-off probe element so
// content stays clear of notches / home indicators. Falls back to zeros on
// platforms that don't expose them (most desktop browsers).
export function safeAreaInsets(): SafeAreaInsets {
  const zero: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === 'undefined') return zero;

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.top = 'env(safe-area-inset-top, 0px)';
  probe.style.right = 'env(safe-area-inset-right, 0px)';
  probe.style.bottom = 'env(safe-area-inset-bottom, 0px)';
  probe.style.left = 'env(safe-area-inset-left, 0px)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets: SafeAreaInsets = {
    top: parseFloat(cs.top) || 0,
    right: parseFloat(cs.right) || 0,
    bottom: parseFloat(cs.bottom) || 0,
    left: parseFloat(cs.left) || 0,
  };
  probe.remove();
  return insets;
}

// Same insets converted into the game's logical coordinate space. The canvas is
// FIT-scaled, so CSS px must be divided by the display/game scale factor before
// they're used for in-game layout. scaleX/Y = displaySize / gameSize.
export function safeAreaInsetsScaled(scaleX: number, scaleY: number): SafeAreaInsets {
  const css = safeAreaInsets();
  const sx = scaleX || 1;
  const sy = scaleY || 1;
  return {
    top: css.top / sy,
    bottom: css.bottom / sy,
    left: css.left / sx,
    right: css.right / sx,
  };
}
