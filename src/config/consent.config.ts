// Consent and privacy constants (D-10, D-25; docs/roadmap/phases/P00-foundation.md Step 4). Read by services/Consent.ts,
// services/Ads.ts and scenes/SettingsScene.ts; the pure UMP mapping is services/consentState.ts.
import { IS_RELEASE_BUILD } from './build.config';

// The setExternalFlowActive() source raised around the native consent form and the privacy options form
// (src/platform/externalFlow.ts). While one of them is up Android pauses the Activity; this flag stops the pause overlay.
// FORM_WATCHDOG_MS: if a native form has not settled after this long, the consent source is cleared anyway (the form promise keeps
// running), so a form that never answers cannot hold the flag up, and the pause overlay down, for the whole session.
export const CONSENT = {
  EXTERNAL_FLOW_SOURCE: 'consent',
  FORM_WATCHDOG_MS: 120000,
} as const;

// D-10.5 (pending the owner's legal check, docs/STATUS.md): does Crashlytics collection follow the analytics_storage choice?
//   false (default): Crash.enable() runs in EVERY consent outcome, including after a refusal in the EEA.
//   true: bootServices and Settings > Privacy choices call Crash.enable() when the outcome grants analytics_storage and
//         Crash.disable() otherwise. Crashlytics persists the last setEnabled value across launches, so the player's last choice
//         applies from the next process start, until UMP answers again.
// Flipping this is a legal decision, not a tuning knob; the default ships as D-10.5 says.
export const CRASH_REQUIRES_ANALYTICS_CONSENT: boolean = false;

// UMP debug geography numbers, mirrored from @capacitor-community/admob 8.0.0 AdmobConsentDebugGeography
// (dist/esm/consent/consent-debug-geography.enum.d.ts). The web bundle never imports the plugin package, so the values live
// here; src/config/consentConfig.test.ts pins every one of them to the real enum.
export const UMP_DEBUG_GEOGRAPHY = {
  DISABLED: 0,
  EEA: 1,
  NOT_EEA: 2, // deprecated in the plugin, still accepted so an older checklist build command keeps working
  US: 3,
  OTHER: 4,
} as const;
export type UmpDebugGeography = (typeof UMP_DEBUG_GEOGRAPHY)[keyof typeof UMP_DEBUG_GEOGRAPHY];

// VITE_UMP_DEBUG_GEOGRAPHY: "EEA" | "US" | "OTHER" | "NOT_EEA" (anything else, including DISABLED, leaves the real geography).
// Case-insensitive, trimmed. Pure.
export function parseDebugGeography(raw: string | undefined): UmpDebugGeography | undefined {
  const key = (raw ?? '').trim().toUpperCase();
  if (key === '' || key === 'DISABLED') return undefined;
  return Object.prototype.hasOwnProperty.call(UMP_DEBUG_GEOGRAPHY, key) ? UMP_DEBUG_GEOGRAPHY[key as keyof typeof UMP_DEBUG_GEOGRAPHY] : undefined;
}

// VITE_UMP_TEST_DEVICE_IDS: comma-separated hashed device ids from logcat. Pure.
export function parseTestDeviceIds(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Debug-only overrides, read once from the build environment (typed in src/vite-env.d.ts). Both are undefined / empty in a
// normal build. P00-T20: a release build (`vite build --mode release`) never reads them, even if the variables are set, so
// Ads.init cannot call initializeForTesting there; `npm run release:check` and the release Vite build also REFUSE a release
// while either variable is set, so the mistake is reported instead of silently ignored.
export const UMP_DEBUG: { readonly geography: UmpDebugGeography | undefined; readonly testDeviceIds: readonly string[] } = IS_RELEASE_BUILD
  ? { geography: undefined, testDeviceIds: [] }
  : {
      geography: parseDebugGeography(import.meta.env.VITE_UMP_DEBUG_GEOGRAPHY),
      testDeviceIds: parseTestDeviceIds(import.meta.env.VITE_UMP_TEST_DEVICE_IDS),
    };

// Settings privacy rows (scenes/SettingsScene.ts). Taps stay >= THEME.MIN_TAP. The reset is a two-tap in-game confirm because
// native dialogs are unreliable in the WebView: the first tap arms it for RESET_CONFIRM_MS, the second runs it.
export const PRIVACY_UI = {
  LABEL_CHOICES: 'Privacy choices',
  LABEL_POLICY: 'Privacy policy',
  LABEL_RESET: 'Reset analytics data',
  LABEL_RESET_CONFIRM: 'Tap again to reset',
  TOAST_RESET_DONE: 'Analytics data reset',
  TOAST_RESET_FAILED: 'Could not reset analytics data',
  RESET_CONFIRM_MS: 4000,
  FONT_PX: 14,
  CONFIRM_COLOR: '#ffd166', // gold, the same accent as the pending chip: >= 4.5:1 on the glass panel
  LINK_W: 220,
  LINK_H: 44,
  SECTION_GAP_TOP: 8, // divider -> first privacy row
  SECTION_DIVIDER_GAP: 10, // last store row -> the divider above the privacy rows
} as const;
