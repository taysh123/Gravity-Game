import { registerPlugin } from '@capacitor/core';

// Local proxy to the app's OWN native plugin "ConsentSignals" (android/app/src/main/java/com/truestorylabs/gravityflow/
// ConsentSignalsPlugin.java, registered in MainActivity), by NAME like the other native seams. It reads what the UMP SDK stored for
// the IAB TCF v2 in the app's default SharedPreferences, which no installed plugin exposes (@capacitor/preferences reads its own
// "CapacitorStorage" file only). Reached only through src/services/Consent.ts, behind Capacitor.isNativePlatform().
export interface ConsentSignalsPlugin {
  getTcf(): Promise<{
    gdprApplies: number; // IABTCF_gdprApplies: 1 = TCF applies, 0 = it does not, -1 = not stored
    purposeConsents: string; // IABTCF_PurposeConsents ('' when not stored): one '0' / '1' per purpose, purpose 1 first
  }>;
}

export const ConsentSignals = registerPlugin<ConsentSignalsPlugin>('ConsentSignals');
