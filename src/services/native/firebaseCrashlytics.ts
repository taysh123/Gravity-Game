import { registerPlugin } from '@capacitor/core';

// Local proxy to the native @capacitor-firebase/crashlytics plugin via the Capacitor
// bridge — by NAME, avoiding the npm package's web implementation (firebase JS SDK).
// On native the name resolves to the synced Android plugin; on web it's never called.
export interface FirebaseCrashlyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  addLogMessage(options: { message: string }): Promise<void>;
  recordException(options: { message: string }): Promise<void>;
}

export const FirebaseCrashlytics = registerPlugin<FirebaseCrashlyticsPlugin>('FirebaseCrashlytics');
