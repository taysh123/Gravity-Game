import { registerPlugin } from '@capacitor/core';

// Local proxy to the native @capacitor/preferences plugin via the Capacitor bridge, by NAME, so the web build never
// bundles the package (it stays in package.json only for the synced Android module, like the other native plugins
// here). On Android it is SharedPreferences "CapacitorStorage" (CapacitorStorage.xml, written with apply()). Only the
// members we use are declared. Reached only through src/platform/saves.ts, behind Capacitor.isNativePlatform().
export interface PreferencesBridge {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
}

export const Preferences = registerPlugin<PreferencesBridge>('Preferences');
