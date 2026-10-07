import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

// Local proxy to the native @capacitor/app plugin via the Capacitor bridge, by NAME, so the web build never
// bundles the package (it stays in package.json only for the synced Android module, like the other native
// plugins here). Only the members we use are declared: Back (backButton, toggleBackButtonHandler, minimizeApp) and
// the background/foreground events (pause, resume). Reached only through src/platform/lifecycle.ts, behind
// Capacitor.isNativePlatform().
export interface AppBridge {
  // pause / resume fire from the Activity's onPause / onResume (resume only after a first pause).
  addListener(eventName: 'backButton' | 'pause' | 'resume', listener: () => void): Promise<PluginListenerHandle>;
  // false = Android's own Back handling (the warm back-to-home exit with the system animation); true = JS router.
  toggleBackButtonHandler(options: { enabled: boolean }): Promise<void>;
  // Defensive only: moveTaskToBack. The app is never force-closed from JS.
  minimizeApp(): Promise<void>;
}

export const App = registerPlugin<AppBridge>('App');
