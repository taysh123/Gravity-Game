import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from '../../capacitor.config';
import viteConfig from '../../vite.config';

// P00-T09 guard for the static half of D-11 (docs/roadmap/DECISIONS.md). These pin the values that must never drift:
// the WebView floor and its error page, the system-bars style, and the web origin that every save lives under.

const root = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const server = (config.server ?? {}) as Record<string, unknown>;
const android = (config.android ?? {}) as Record<string, unknown>;

describe('capacitor.config.ts: origin guard', () => {
  // The WebView origin is https://localhost by default. localStorage (every save) is keyed by origin, so changing the
  // scheme or hostname orphans all existing progress. Leaving both unset keeps the defaults forever.
  it('never overrides androidScheme (default https keeps the origin)', () => {
    expect(server.androidScheme).toBeUndefined();
    expect(android.androidScheme).toBeUndefined();
    expect('androidScheme' in server).toBe(false);
  });

  it('never overrides hostname (default localhost keeps the origin)', () => {
    expect(server.hostname).toBeUndefined();
    expect('hostname' in server).toBe(false);
  });

  it('never points the WebView at a remote url (the app is served from the bundled assets)', () => {
    expect(server.url).toBeUndefined();
  });

  it('serves the Vite output directory', () => {
    expect(config.webDir).toBe('dist');
    expect(viteConfig.build?.outDir).toBe('dist');
  });
});

describe('capacitor.config.ts: WebView floor', () => {
  it('requires WebView 87 (the Chrome version Vite es2020 output needs)', () => {
    expect(config.android?.minWebViewVersion).toBe(87);
  });

  it('builds es2020 explicitly so the bundle matches the floor', () => {
    expect(viteConfig.build?.target).toBe('es2020');
  });

  it('shows a static update page on an older WebView', () => {
    expect(config.server?.errorPath).toBe('webview-update.html');
  });
});

describe('public/webview-update.html (server.errorPath target)', () => {
  const errorPath = config.server?.errorPath ?? '';
  const file = root(`public/${errorPath}`);

  it('exists under public/ so Vite copies it to dist/', () => {
    expect(existsSync(file)).toBe(true);
  });

  it('links to the Android System WebView page on Google Play', () => {
    const html = readFileSync(file, 'utf8');
    expect(html).toContain('market://details?id=com.google.android.webview');
  });

  it('names the WebView floor it enforces', () => {
    const html = readFileSync(file, 'utf8');
    expect(html).toContain(`${config.android?.minWebViewVersion} or newer`);
  });

  it('is self-contained: no external scripts, styles, fonts or images, no module scripts', () => {
    const html = readFileSync(file, 'utf8');
    expect(html).not.toMatch(/<script[^>]*\btype\s*=\s*["']module["']/i);
    expect(html).not.toMatch(/<(?:script|img|iframe|source|video|audio)\b[^>]*\bsrc\s*=/i);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/@import|url\(/i);
  });

  it('uses only ES5 syntax in its scripts (it runs on the WebView that cannot run our bundle)', () => {
    const html = readFileSync(file, 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    for (const code of scripts) {
      expect(code).not.toMatch(/=>/);
      expect(code).not.toMatch(/\b(?:const|let|class|async|await|yield)\b/);
      expect(code).not.toMatch(/`/);
      expect(code).not.toMatch(/\?\.|\?\?/);
      expect(code).not.toMatch(/\.\.\./);
    }
  });
});

describe('capacitor.config.ts: system bars', () => {
  it('uses light icons on the dark game and passes insets to the page as CSS variables', () => {
    expect(config.plugins?.SystemBars).toEqual({ style: 'DARK', insetsHandling: 'css' });
  });

  it('keeps the dark background colour in sync with the game', () => {
    expect(config.backgroundColor).toBe('#0d0d1a');
    expect(config.android?.backgroundColor).toBe('#0d0d1a');
  });
});
