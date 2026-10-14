// A production build exposes no debug handle. The Vite dev server sets window.__game and window.__Phaser for tooling and
// window.__crashTest for the frame-guard check (main.ts, import.meta.env.DEV; P00-T22 adds a corrupt-save hook); none of them may
// exist in the bundle a player runs. The preview run proves it twice:
//   1. at runtime: the page defines no window.__* global of its own (the harness's __harness* keys are ignored), so a hook added
//      without its DEV guard is caught whatever its name, as long as it follows the `__name` convention;
//   2. statically (P00-T21): no JS file under dist/ (what vite preview serves: every chunk, Phaser included) contains a DEV_HANDLES
//      name, so the hook code itself was stripped, not merely left uncalled. The scan is tied to the page: every script the page
//      loaded must be one of the scanned files. Same idea as web-store-copy's bundle scan.
//
// Both assert an ABSENCE, which would pass for ever if the scans found nothing. The dev run is their positive control
// (controlModes: ['dev'] puts it in the CI dev leg): the same global scan must find every DEV_HANDLES name, and the same text scan
// must find them all in the dev server's src/main.ts. constants.test.mjs checks that main.ts still defines them behind
// import.meta.env.DEV.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DEV_HANDLES } from '../lib/copy.mjs';
import { ROOT } from '../lib/server.mjs';

const harnessOwned = (key) => key.startsWith('__harness');
const NAMES = Object.values(DEV_HANDLES);
const DIST = path.join(ROOT, 'dist');

/** Every .js file under dir, recursively. */
function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

/** The DEV handle names that appear in a text. */
const namesIn = (text) => NAMES.filter((name) => text.includes(name));

/** The URLs of the scripts the page loaded (entry, chunks, module preloads). */
const loadedScripts = (page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => e.initiatorType === 'script' || /\.js(\?|$)/.test(e.name))
      .map((e) => e.name),
  );

export const debugHandles = {
  name: 'debug-handles',
  modes: ['preview', 'dev'],
  controlModes: ['dev'],
  weight: 6, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    const globals = await page.evaluate(() => Object.getOwnPropertyNames(window).filter((k) => k.startsWith('__')));
    const app = globals.filter((k) => !harnessOwned(k));
    if (ctx.mode === 'preview') {
      ctx.expect(app.length === 0, 'the production bundle defines no window.__* debug handle', `found: ${app.join(', ')}`);
      const files = jsFiles(DIST);
      const scanned = new Set(files.map((f) => path.basename(f)));
      const loaded = (await loadedScripts(page)).map((url) => new URL(url).pathname.split('/').pop());
      ctx.expect(
        files.length > 0 && loaded.length > 0 && loaded.every((name) => scanned.has(name)),
        `the dist/ scan covers what the page runs: every script it loaded (${loaded.length}) is one of the ${files.length} JS files under dist/`,
        JSON.stringify({ loaded, scanned: [...scanned] }),
      );
      const hits = files.flatMap((f) => namesIn(readFileSync(f, 'utf8')).map((name) => `${path.relative(ROOT, f)}: ${name}`));
      ctx.expect(hits.length === 0, `no JS file under dist/ contains a DEV-only handle name (${NAMES.join(', ')})`, hits.join(' | '));
      return;
    }
    const missing = NAMES.filter((name) => !app.includes(name));
    ctx.expect(missing.length === 0, `the dev server exposes ${NAMES.map((n) => `window.${n}`).join(', ')}`, `missing: ${missing.join(', ')}; found: ${app.join(', ')}`);
    const same = await page.evaluate(() => window.__game === window.__harnessGame);
    ctx.expect(same, 'window.__game is the same Phaser.Game the harness captured (the capture hook finds the real game)');
    const mainUrl = (await loadedScripts(page)).find((url) => /\/src\/main\.ts(\?|$)/.test(url));
    const mainText = mainUrl ? await page.evaluate(async (url) => (await fetch(url)).text(), mainUrl) : '';
    const found = namesIn(mainText);
    ctx.expect(found.length === NAMES.length, "positive control for the dist/ scan: the same text scan finds every handle name in the dev server's src/main.ts", `url: ${mainUrl}; found: ${found.join(', ')}`);
  },
};
