// P00-T20: the filesystem half of the release guard. Reads package.json (versionCode, D-20), docs/STATUS.md (the last uploaded
// versionCode) and the synced web assets, and hands them to the pure checks in ./releaseCheck.mjs. Shared by
// scripts/release-check.mjs and the release Vite build, so both see the same inputs.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLastUploadedVersionCode } from './releaseCheck.mjs';
import { deriveVersionCode } from './versionCode.mjs';

/** Where `npx cap sync android` copies dist/ (capacitor.config.ts webDir). */
export const SYNCED_ASSETS_DIR = 'android/app/src/main/assets/public';
/** The build-time debug overrides a release must not carry (src/vite-env.d.ts). */
export const DEBUG_ENV_KEYS = ['VITE_UMP_DEBUG_GEOGRAPHY', 'VITE_UMP_TEST_DEVICE_IDS'];

/**
 * Collects the inputs of checkRelease().
 * root: repo root. env: the variables a release build would see (Vite's loadEnv('release', root, 'VITE_') in the real callers; only
 * the debug keys are used). admobProd / revenueCatApiKey: ADMOB_PROD and REVENUECAT_API_KEY_PROD from monetization.config.ts.
 */
export function gatherReleaseInputs({ root, env, admobProd, revenueCatApiKey, admobAppIdArg }) {
  let versionCode = null;
  let versionCodeError;
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    versionCode = deriveVersionCode(pkg.version, pkg.androidBuild);
  } catch (err) {
    versionCodeError = err instanceof Error ? err.message : String(err);
  }
  let lastUploadedVersionCode = null;
  try {
    lastUploadedVersionCode = parseLastUploadedVersionCode(readFileSync(join(root, 'docs', 'STATUS.md'), 'utf8'));
  } catch {
    lastUploadedVersionCode = null; // unreadable STATUS.md: the check reports the missing marker
  }
  const debugEnv = {};
  for (const key of DEBUG_ENV_KEYS) debugEnv[key] = env?.[key];
  return { admobProd, revenueCatApiKey, env: debugEnv, versionCode, versionCodeError, lastUploadedVersionCode, admobAppIdArg };
}

/** Every .js file under the synced assets dir, as { path (relative to the dir, forward slashes), text }. Empty when not synced. */
export function readSyncedAssets(root) {
  const base = join(root, SYNCED_ASSETS_DIR);
  if (!existsSync(base)) return [];
  const files = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), relPath);
      else if (entry.isFile() && /\.(m?js)$/.test(entry.name)) files.push({ path: relPath, text: readFileSync(join(dir, entry.name), 'utf8') });
    }
  };
  walk(base, '');
  return files.sort((a, b) => (a.path < b.path ? -1 : 1));
}
