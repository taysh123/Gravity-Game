// The one place that touches navigator.vibrate (D-11, P00-T11). GameScene (and any later caller) goes through
// Haptics.pulse so the kill switch, the player's Haptics setting and the "API may not exist" cases are handled once.
// On Android the Vibration API needs the VIBRATE permission (added in P00-T09) and a prior user tap; iOS Safari and
// desktop Firefox have no navigator.vibrate at all. @capacitor/haptics is intentionally not a dependency here.
import { PHYSICS } from '../config/physics.config';
import { SettingsStore } from '../utils/SettingsStore';

// True when this runtime exposes navigator.vibrate (says nothing about the player's setting).
function vibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export const Haptics = {
  available: vibrationSupported,

  // A duration in ms, or an on/off/on... pattern. Silent no-op when haptics are disabled (PHYSICS.HAPTICS_ENABLED or
  // the Settings toggle, re-read on every call) or unsupported; never throws.
  pulse(pattern: number | number[]): void {
    if (!PHYSICS.HAPTICS_ENABLED) return;
    if (!SettingsStore.get().haptics) return;
    if (!vibrationSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // the browser refused (no user activation, permission): haptics are best-effort feedback
    }
  },
};
