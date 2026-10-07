import { registerPlugin } from '@capacitor/core';

// Local proxy to the native @capacitor-firebase/analytics plugin via the Capacitor
// bridge — by NAME, without importing the npm package's web implementation (which
// pulls the heavy `firebase` JS SDK and breaks the web bundle). On native the name
// resolves to the Android plugin synced from the npm dependency; on web this proxy
// is never invoked (callers guard with Capacitor.isNativePlatform()).
//
// Consent strings are the plugin's ConsentType / ConsentStatus enum VALUES (@capacitor-firebase/analytics 8.5.2,
// dist/esm/definitions.d.ts); the Android plugin maps exactly these strings (FirebaseAnalyticsHelper.mapStringToConsentType
// and mapStringToConsentStatus, anything else is rejected). Pinned to the real enums by src/services/Analytics.test.ts.
export type FirebaseConsentType = 'ANALYTICS_STORAGE' | 'AD_STORAGE' | 'AD_USER_DATA' | 'AD_PERSONALIZATION';
export type FirebaseConsentStatus = 'GRANTED' | 'DENIED';

export interface FirebaseAnalyticsPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  logEvent(options: { name: string; params?: Record<string, string | number> }): Promise<void>;
  setConsent(options: { type: FirebaseConsentType; status: FirebaseConsentStatus }): Promise<void>;
  setCurrentScreen(options: { screenName: string | null; screenClassOverride?: string | null }): Promise<void>;
  resetAnalyticsData(): Promise<void>;
}

export const FirebaseAnalytics = registerPlugin<FirebaseAnalyticsPlugin>('FirebaseAnalytics');
