import { registerPlugin } from '@capacitor/core';
import type { StackFrame } from '../stackParse';

// Local proxy to the native @capacitor-firebase/crashlytics plugin via the Capacitor
// bridge — by NAME, avoiding the npm package's web implementation (firebase JS SDK).
// On native the name resolves to the synced Android plugin; on web it's never called.
// The method names are the native @PluginMethod names of FirebaseCrashlyticsPlugin.java (pinned by Crash.test.ts). P00-T21: the
// breadcrumb method is `log`; the `addLogMessage` this file declared before does not exist on Android.
export interface FirebaseCrashlyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  log(options: { message: string }): Promise<void>;
  setCustomKey(options: { key: string; value: string | number; type: 'string' | 'long' | 'double' }): Promise<void>;
  recordException(options: { message: string; stacktrace?: StackFrame[] }): Promise<void>;
}

export const FirebaseCrashlytics = registerPlugin<FirebaseCrashlyticsPlugin>('FirebaseCrashlytics');
