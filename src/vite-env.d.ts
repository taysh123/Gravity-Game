/// <reference types="vite/client" />

// Debug-only build overrides for the UMP consent flow (src/config/consent.config.ts). Unset in every normal build; the release
// guard that refuses a release build carrying either is P00-T20.
interface ImportMetaEnv {
  // "EEA" | "US" | "OTHER" | "NOT_EEA": makes the UMP SDK behave as if the test device is in that region.
  readonly VITE_UMP_DEBUG_GEOGRAPHY?: string;
  // Comma-separated hashed test device ids (printed by the UMP SDK in logcat).
  readonly VITE_UMP_TEST_DEVICE_IDS?: string;
}
