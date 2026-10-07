/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
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
