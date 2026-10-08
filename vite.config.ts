/// <reference types="vitest" />
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// P00-T20: a release build (`vite build --mode release`, npm run build:release) runs the release guard first and stops with its
// list of problems if any: an empty or Google-test production AdMob id, a RevenueCat key that is not goog_, a debug UMP variable,
// a versionCode not above the last upload. It runs scripts/release-check.mjs, the same code as `npm run release:check`, so there is
// one implementation (it loads the TypeScript config through vite-node). Every other mode is untouched, and CI never builds in the
// release mode. Mode names are case-sensitive; only the exact 'release' selects the production ids (src/config/build.config.ts).
function releaseGuard(): Plugin {
  return {
    name: 'gravity-release-guard',
    apply: 'build',
    configResolved(config) {
      if (config.mode !== 'release') return;
      if (!config.isProduction) {
        throw new Error('Release build refused: NODE_ENV is not "production", so the bundle would be a development build. Unset NODE_ENV and run npm run build:release again.');
      }
      const root = fileURLToPath(new URL('.', import.meta.url));
      const run = spawnSync(process.execPath, ['scripts/release-check.mjs'], { cwd: root, encoding: 'utf8' });
      if (run.status !== 0) {
        throw new Error(`Release build refused by the release guard (scripts/release-check.mjs):\n${run.stderr || run.stdout}`);
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [releaseGuard()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
  build: {
    outDir: 'dist',
    // Explicit so it stays matched with capacitor.config.ts android.minWebViewVersion (87):
    // es2020 output (`?.`, `??`) needs Chrome 80+, and WebView 87 is the floor we enforce.
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
