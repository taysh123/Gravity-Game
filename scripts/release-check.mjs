#!/usr/bin/env node
// P00-T20 release guard CLI. Refuses a release that would ship test ids, the RevenueCat Test Store key or debug geography.
//
//   node scripts/release-check.mjs                    (npm run release:check) the configuration: production AdMob ids, the
//                                                     RevenueCat goog_ key, debug UMP variables, versionCode vs the last upload
//   node scripts/release-check.mjs --assets           (npm run release:check -- --assets) ONLY the synced web assets, after
//                                                     `npx cap sync android`: Google's test publisher, baked-in debug overrides
//   node scripts/release-check.mjs --config --assets  both
//   --admob-app-id <id>   also require the -PADMOB_APP_ID you are about to pass to Gradle to equal ADMOB_PROD.appId
//   --assets-dir <dir>    scan <dir> instead of android/app/src/main/assets/public
//
// Every failing item is listed, not just the first. Secrets are described, never printed. The same check runs inside the release
// Vite build (vite.config.ts, mode `release`). Sequence: docs/release/RUNBOOK.md section 6.
// Exit codes: 0 ok, 1 refused, 2 usage or tooling error.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { checkRelease, formatReport, scanAssets } from './lib/releaseCheck.mjs';
import { SYNCED_ASSETS_DIR, gatherReleaseInputs, readSyncedAssets } from './lib/releaseInputs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const USAGE = 'usage: node scripts/release-check.mjs [--config] [--assets] [--admob-app-id <id>] [--assets-dir <dir>]';

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { config: false, assets: false, admobAppId: undefined, assetsDir: SYNCED_ASSETS_DIR };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2);
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined || v === '' || v.startsWith('--')) throw new UsageError(`${flag} needs a value`);
      return v;
    };
    if (flag === '--config') opts.config = true;
    else if (flag === '--assets') opts.assets = true;
    else if (flag === '--admob-app-id') opts.admobAppId = value();
    else if (flag === '--assets-dir') opts.assetsDir = value();
    else throw new UsageError(`unknown argument "${argv[i]}"`);
  }
  if (!opts.config && !opts.assets) opts.config = true; // no mode flag: the configuration check
  return opts;
}

/** ADMOB_PROD and REVENUECAT_API_KEY_PROD from the real TypeScript config, through vite-node (as scripts/facts.mjs does). */
function loadProdIds() {
  const viteNode = join(ROOT, 'node_modules/vite-node/vite-node.mjs');
  if (!existsSync(viteNode)) throw new Error('node_modules/vite-node is missing; run `npm ci` first');
  const run = spawnSync(process.execPath, [viteNode, 'scripts/release/collect.ts'], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`scripts/release/collect.ts failed (exit ${run.status}):\n${run.stderr || run.stdout}`);
  const line = run.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) throw new Error(`scripts/release/collect.ts printed no JSON:\n${run.stdout}`);
  return JSON.parse(line);
}

function main(argv) {
  const opts = parseArgs(argv);
  const failures = [];
  const ok = [];
  if (opts.config) {
    const prod = loadProdIds();
    // Exactly what a release build would bake in: Vite's own env loading for mode `release` (process env + .env, .env.local,
    // .env.release, .env.release.local), VITE_ variables only.
    const env = loadEnv('release', ROOT, 'VITE_');
    const input = gatherReleaseInputs({ root: ROOT, env, admobProd: prod.admobProd, revenueCatApiKey: prod.revenueCatApiKey, admobAppIdArg: opts.admobAppId });
    const found = checkRelease(input);
    failures.push(...found);
    if (found.length === 0) ok.push(`configuration (AdMob ids, RevenueCat goog_ key, no debug UMP variables, versionCode ${input.versionCode} > last upload ${input.lastUploadedVersionCode})`);
  }
  if (opts.assets) {
    const files = readSyncedAssets(ROOT, opts.assetsDir);
    const found = scanAssets(files, opts.assetsDir);
    failures.push(...found);
    if (found.length === 0) ok.push(`${files.length} synced .js file${files.length === 1 ? '' : 's'} in ${opts.assetsDir} (no Google test publisher, no debug overrides)`);
  }
  const title = `release:check${opts.config && opts.assets ? '' : opts.assets ? ' --assets' : ''}`;
  if (failures.length > 0) {
    console.error(formatReport(failures, title));
    console.error('\nNothing was built or changed. Fix the items above, then run this check again.');
    return 1;
  }
  console.log(`${formatReport([], title)}: ${ok.join('; ')}`);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  if (err instanceof UsageError) console.error(`release:check: ${err.message}\n${USAGE}`);
  else console.error(`release:check: error: ${err?.message ?? err}`);
  process.exitCode = 2;
}
