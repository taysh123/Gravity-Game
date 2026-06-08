import { registerPlugin } from '@capacitor/core';

// Local proxy to the native @capacitor-firebase/analytics plugin via the Capacitor
// bridge — by NAME, without importing the npm package's web implementation (which
// pulls the heavy `firebase` JS SDK and breaks the web bundle). On native the name
// resolves to the Android plugin synced from the npm dependency; on web this proxy
// is never invoked (callers guard with Capacitor.isNativePlatform()).
export interface FirebaseAnalyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  logEvent(options: { name: string; params?: Record<string, string | number> }): Promise<void>;
}

export const FirebaseAnalytics = registerPlugin<FirebaseAnalyticsPlugin>('FirebaseAnalytics');
