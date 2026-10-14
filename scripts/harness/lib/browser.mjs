// Chromium, one fresh context per job, and the failure-signal wiring. Playwright 1.63.0 (package.json, exact).
//
// Flags are the project's (CLAUDE.md): software rendering so the same run works on a GPU-less CI runner and a dev laptop.
// --enable-unsafe-swiftshader is the explicit opt-in recent Chromium wants before it will use SwiftShader for WebGL; without it
// a GPU-less Linux runner can end up on Phaser's Canvas renderer, which is not what a device runs. splash-boot asserts WebGL.
//
// HOW THE HARNESS REACHES THE GAME. The app exposes `window.__game` only in the Vite dev server (main.ts, import.meta.env.DEV);
// a production build exposes nothing, and the harness must test that build. So the harness does not rely on the app: it
// installs an init script (CAPTURE_GAME_SOURCE) in every page that waits for Phaser's own global to be assigned and wraps
// Game.prototype.step once to remember the first Game that steps, as `window.__harnessGame`. Nothing in the shipped code
// changes, so there is no hook to keep inert for players, no flag and no new data collection: the capture exists only inside
// a Playwright-controlled page. The same handle is used in both run modes, so a check is written once.

import { chromium } from 'playwright';
import {
  classifyConsoleMessage,
  classifyPageError,
  classifyRequestFailed,
  classifyResponse,
  classifySpaFallback,
  createSignalLog,
} from './signals.mjs';

export const CHROMIUM_ARGS = ['--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'];

export const CAPTURE_GAME_SOURCE = `(() => {
  let value;
  Object.defineProperty(window, 'Phaser', {
    configurable: true,
    get() { return value; },
    set(v) {
      value = v;
      try {
        const proto = v.Game.prototype;
        const step = proto.step;
        window.__harnessSceneLog = [];
        let last = '';
        proto.step = function (...args) {
          if (!window.__harnessGame) window.__harnessGame = this;
          const now = this.scene.getScenes(true).map((s) => s.scene.key).join('+');
          if (now !== last) {
            last = now;
            window.__harnessSceneLog.push(now);
          }
          return step.apply(this, args);
        };
      } catch (err) {
        window.__harnessHookError = String(err);
      }
    },
  });
})();`;

export function launchBrowser({ headed = false } = {}) {
  // channel 'chromium' = the full Chromium build (new headless), not the headless shell: the shell never asks for a favicon,
  // so it would hide the 404 a real browser logs. Installed by `npx playwright install chromium`.
  return chromium.launch({ headless: !headed, channel: 'chromium', args: CHROMIUM_ARGS });
}

/**
 * A fresh context + page at a viewport with the signal listeners attached.
 * `seed` ({ key: stringValue }) is written to localStorage before the app boots, only for keys not already present, so a
 * reload keeps what the game saved. Pass an existing `signals` log to make a second page of the same job report into it.
 */
export async function openPage(browser, { viewport, origin, seed = {}, signals = createSignalLog() }) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  await context.addInitScript(CAPTURE_GAME_SOURCE);
  if (Object.keys(seed).length > 0) {
    await context.addInitScript((entries) => {
      try {
        for (const [key, value] of Object.entries(entries)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
      } catch {
        // storage unavailable: the check will notice the missing state
      }
    }, seed);
  }
  const page = await context.newPage();
  page.on('console', (m) => signals.add(classifyConsoleMessage({ type: m.type(), text: m.text(), location: m.location() })));
  page.on('pageerror', (err) => signals.add(classifyPageError(err)));
  page.on('requestfailed', (r) => signals.add(classifyRequestFailed({ url: r.url(), failure: r.failure()?.errorText ?? 'failed' }, origin)));
  page.on('response', (r) => {
    signals.add(classifyResponse({ url: r.url(), status: r.status() }, origin));
    signals.add(classifySpaFallback({ url: r.url(), status: r.status(), resourceType: r.request().resourceType(), contentType: r.headers()['content-type'] }, origin));
  });
  page.on('crash', () => signals.add({ kind: 'page crash', text: 'the renderer process crashed', where: '' }));
  return { context, page, signals };
}
