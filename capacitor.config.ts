import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wrap for the Android build. The web app (Vite `base: './'`, output to
// `dist/`) is loaded in a native WebView. All native plugins (AdMob, RevenueCat,
// Firebase) are guarded behind Capacitor.isNativePlatform() in the utils seams, so
// the web build stays the primary dev/test target and is unaffected by this file.
const config: CapacitorConfig = {
  appId: 'com.truestorylabs.gravityflow',
  appName: 'GRAVITY FLOW',
  webDir: 'dist',
  backgroundColor: '#0d0d1a', // cosmic deep-indigo (matches PHYSICS.COLOR_BACKGROUND)
  android: {
    backgroundColor: '#0d0d1a',
  },
};

export default config;
