import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wrap for the Android build. The web app (Vite `base: './'`, output to
// `dist/`) is loaded in a native WebView. All native plugins (AdMob, RevenueCat,
// Firebase) are guarded behind Capacitor.isNativePlatform() in the utils seams, so
// the web build stays the primary dev/test target and is unaffected by this file.
//
// NEVER set `server.androidScheme` or `server.hostname` here. The WebView origin
// (default https://localhost) keys localStorage, so changing either one orphans every
// player's saved progress. src/config/capacitorConfig.test.ts fails if either appears.
const config: CapacitorConfig = {
  appId: 'com.truestorylabs.gravityflow',
  appName: 'GRAVITY FLOW',
  webDir: 'dist',
  backgroundColor: '#0d0d1a', // cosmic deep-indigo (matches PHYSICS.COLOR_BACKGROUND)
  android: {
    backgroundColor: '#0d0d1a',
    // WebView floor (D-11). The es2020 bundle (vite.config.ts build.target) needs Chrome 87+;
    // Capacitor's default floor is 60, which would show a black screen on WebView 60-86.
    // Below this, Capacitor loads server.errorPath instead of the app.
    minWebViewVersion: 87,
  },
  server: {
    // Static ES5 page in public/ (Vite copies it to dist/). Capacitor plugins are not available on it.
    errorPath: 'webview-update.html',
  },
  plugins: {
    // Light icons on the dark game (DARK = light icons), and insets passed through to the page
    // as --safe-area-inset-* CSS variables (read by src/utils/a11y.ts). Edge-to-edge is
    // mandatory at targetSdk 36.
    SystemBars: {
      style: 'DARK',
      insetsHandling: 'css',
    },
  },
};

export default config;
