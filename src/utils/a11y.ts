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

// Reads the safe-area insets via a one-off probe element so content stays clear of
// notches, camera cutouts, status/navigation bars and home indicators. On Android the
// Capacitor SystemBars plugin (insetsHandling 'css') injects --safe-area-inset-* on the
// page; elsewhere (iOS, browsers) the standard env(safe-area-inset-*) is used. Falls back
// to zeros on platforms that expose neither (most desktop browsers).
function insetExpr(edge: 'top' | 'right' | 'bottom' | 'left'): string {
  return `var(--safe-area-inset-${edge}, env(safe-area-inset-${edge}, 0px))`;
}

export function safeAreaInsets(): SafeAreaInsets {
  const zero: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === 'undefined') return zero;

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.top = insetExpr('top');
  probe.style.right = insetExpr('right');
  probe.style.bottom = insetExpr('bottom');
  probe.style.left = insetExpr('left');
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
