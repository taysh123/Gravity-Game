import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

// Local proxy to the native @capacitor/app plugin via the Capacitor bridge, by NAME, so the web build never
// bundles the package (it stays in package.json only for the synced Android module, like the other native
// plugins here). Only the Back-related members we use are declared. Reached only through
// src/platform/lifecycle.ts, behind Capacitor.isNativePlatform().
export interface AppBridge {
  addListener(eventName: 'backButton', listener: () => void): Promise<PluginListenerHandle>;
  // false = Android's own Back handling (the warm back-to-home exit with the system animation); true = JS router.
  toggleBackButtonHandler(options: { enabled: boolean }): Promise<void>;
  // Defensive only: moveTaskToBack. The app is never force-closed from JS.
  minimizeApp(): Promise<void>;
}

export const App = registerPlugin<AppBridge>('App');
