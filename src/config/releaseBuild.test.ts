import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GOOGLE_TEST_PUBLISHER, scanAssets } from '../../scripts/lib/releaseCheck.mjs';
import { readSyncedAssets } from '../../scripts/lib/releaseInputs.mjs';

// P00-T20 (fix pass 1): the release guard against REAL Vite builds, in their own file so they run in parallel with the CLI tests in
// releaseConfig.test.ts. Each build takes a few seconds; the tests are concurrent and use async child processes.
//
// Hermetic against the developer's machine:
//  - the child process gets an explicit environment: NODE_ENV and every VITE_UMP_* variable of the parent are removed, and only
//    the variables a test names are set;
//  - builds that must not read `.env*` files run through a generated config (see writeConfig) whose `envDir` is an empty temp
//    directory, so a `.env.local` holding VITE_UMP_* cannot change the result;
//  - nothing here depends on whether the owner has filled in the production ids: the refusal test is triggered by a debug variable
//    (refused whatever the ids are), and the positive test injects fake, valid production ids into the module as it is bundled.

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const VITE_BIN = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const VITE_API_URL = pathToFileURL(join(ROOT, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href;

const FAKE = { appId: 'ca-app-pub-1111222233334444~5555666677', rewardedAdId: 'ca-app-pub-1111222233334444/1234567890', interstitialAdId: 'ca-app-pub-1111222233334444/0987654321', key: 'goog_FAKEFAKEFAKE' };

let tmp = '';
let emptyEnvDir = '';

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'gravity-release-build-'));
  emptyEnvDir = join(tmp, 'empty-env-dir');
  mkdirSync(emptyEnvDir);
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

function childEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_ENV; // vitest sets NODE_ENV=test; a real build must see the default unless a test sets it
  delete env.VITE_UMP_DEBUG_GEOGRAPHY;
  delete env.VITE_UMP_TEST_DEVICE_IDS;
  return { ...env, ...extra };
}

function runVite(args: string[], extraEnv: Record<string, string> = {}): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VITE_BIN, ...args], { cwd: ROOT, env: childEnv(extraEnv) });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

/**
 * A generated Vite config: the repo's own vite.config.ts, with `.env*` files read only from `envDir` (default: an empty temp
 * directory, so none are read) and, optionally,
 *  - fakeProdIds: the production ids and key of monetization.config.ts replaced by fake but valid ones as the module is bundled
 *    (matched by shape, so it keeps working after the owner pastes the real ids), and
 *  - noGuard: the release guard plugin removed (the guard would refuse the fake ids' build for reasons unrelated to what is tested).
 */
function writeConfig(name: string, opts: { mode: string; fakeProdIds?: boolean; noGuard?: boolean; envDir?: string }): string {
  const file = join(tmp, `${name}.config.mjs`);
  const source = `
import { loadConfigFromFile, mergeConfig } from ${JSON.stringify(VITE_API_URL)};
const ROOT = ${JSON.stringify(ROOT)};
const loaded = await loadConfigFromFile({ command: 'build', mode: ${JSON.stringify(opts.mode)} }, ROOT + 'vite.config.ts', ROOT);
const base = loaded.config;
const plugins = (base.plugins ?? []).flat().filter((p) => p && !(${JSON.stringify(Boolean(opts.noGuard))} && p.name === 'gravity-release-guard'));
const fakeProdIds = {
  name: 'fake-prod-ids',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\\\/g, '/').endsWith('/src/config/monetization.config.ts')) return null;
    const next = code
      .replace(/export const ADMOB_PROD: AdmobIds = \\{[\\s\\S]*?\\};/, ${JSON.stringify(
        `export const ADMOB_PROD: AdmobIds = { appId: '${FAKE.appId}', rewardedAdId: '${FAKE.rewardedAdId}', interstitialAdId: '${FAKE.interstitialAdId}' };`,
      )})
      .replace(/export const REVENUECAT_API_KEY_PROD: string = '[^']*';/, ${JSON.stringify(`export const REVENUECAT_API_KEY_PROD: string = '${FAKE.key}';`)});
    if (!next.includes(${JSON.stringify(FAKE.appId)}) || !next.includes(${JSON.stringify(FAKE.key)})) {
      throw new Error('fake-prod-ids: ADMOB_PROD / REVENUECAT_API_KEY_PROD no longer match the expected shape in monetization.config.ts');
    }
    return { code: next, map: null };
  },
};
export default mergeConfig(
  { ...base, plugins },
  { root: ROOT, envDir: ${JSON.stringify(opts.envDir ?? emptyEnvDir)}, plugins: ${opts.fakeProdIds ? '[fakeProdIds]' : '[]'} },
);
`;
  writeFileSync(file, source);
  return file;
}

function files(outDir: string): Array<{ path: string; text: string }> {
  return readSyncedAssets(ROOT, outDir);
}

describe('a default-mode build (debug ids) against the asset scan', () => {
  it.concurrent('is flagged for Google\'s test publisher only, with nothing else baked in', async () => {
    const outDir = join(tmp, 'plain');
    const cfg = writeConfig('plain', { mode: 'production' });
    const r = await runVite(['build', '--config', cfg, '--outDir', outDir, '--emptyOutDir']);
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(scanAssets(files(outDir)).map((f) => f.id)).toEqual(['asset-google-test-id']);
  }, 180_000);

  it.concurrent('made with both debug variables set is flagged for the test publisher, the geography and the test devices', async () => {
    const outDir = join(tmp, 'debug');
    const cfg = writeConfig('debug', { mode: 'production' });
    const r = await runVite(['build', '--config', cfg, '--outDir', outDir, '--emptyOutDir'], { VITE_UMP_DEBUG_GEOGRAPHY: 'EEA', VITE_UMP_TEST_DEVICE_IDS: 'ABCDEF0123' });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(scanAssets(files(outDir)).map((f) => f.id)).toEqual(['asset-google-test-id', 'asset-debug-geography', 'asset-test-devices']);
  }, 180_000);

});

// Why the builds above are hermetic, and proof that the mechanism works. The generated config sets `envDir` (default: an empty temp
// directory), which is the only place Vite looks for `.env*` files. The contrast test shows Vite DOES read a `.env.local` from the
// envDir it is given (the geography is baked in and flagged); the second shows the same file is not read when the envDir is the empty
// directory. Dropping the `envDir:` line from the generated config makes the contrast test fail. Everything is written under `tmp`,
// never into the repository.
describe('the generated config\'s envDir decides which .env files a build reads', () => {
  const dirWithEnvLocal = (name: string): string => {
    const dir = mkdtempSync(join(tmp, `${name}-`));
    writeFileSync(join(dir, '.env.local'), 'VITE_UMP_DEBUG_GEOGRAPHY=EEA\n');
    return dir;
  };

  it.concurrent('contrast: a .env.local in the envDir IS read (the debug geography is baked in and flagged)', async () => {
    const outDir = join(tmp, 'envfile');
    const cfg = writeConfig('envfile', { mode: 'production', envDir: dirWithEnvLocal('env-with-file') });
    const r = await runVite(['build', '--config', cfg, '--outDir', outDir, '--emptyOutDir']);
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(scanAssets(files(outDir)).map((f) => f.id)).toEqual(['asset-google-test-id', 'asset-debug-geography']);
  }, 180_000);

  it.concurrent('the same .env.local in another directory is NOT read when the envDir is the empty temp dir (the override blocks it)', async () => {
    dirWithEnvLocal('env-elsewhere'); // exists on disk, but is not the envDir
    const outDir = join(tmp, 'envblocked');
    const cfg = writeConfig('envblocked', { mode: 'production' });
    const r = await runVite(['build', '--config', cfg, '--outDir', outDir, '--emptyOutDir']);
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(scanAssets(files(outDir)).map((f) => f.id)).toEqual(['asset-google-test-id']);
  }, 180_000);

  it('the generated config names its envDir and lives in the temp directory, never in the repository', () => {
    const cfg = writeConfig('envdir-pin', { mode: 'production', envDir: emptyEnvDir });
    const text = readFileSync(cfg, 'utf8');
    expect(text).toContain(`envDir: ${JSON.stringify(emptyEnvDir)}`);
    expect(cfg.startsWith(tmp)).toBe(true);
  });
});

describe('the release Vite build (vite build --mode release)', () => {
  it.concurrent('with the repo\'s own vite.config.ts is refused by the release guard, exits non-zero and writes no assets', async () => {
    // A debug variable is refused whatever ADMOB_PROD / the RevenueCat key hold, so this does not depend on the owner's state.
    const outDir = join(tmp, 'refused');
    const r = await runVite(['build', '--mode', 'release', '--outDir', outDir, '--emptyOutDir'], { VITE_UMP_DEBUG_GEOGRAPHY: 'EEA' });
    const out = `${r.stdout}\n${r.stderr}`;
    expect(r.status).not.toBe(0);
    expect(out).toContain('refused by the release guard');
    expect(out).toContain('VITE_UMP_DEBUG_GEOGRAPHY');
    expect(existsSync(outDir) ? readdirSync(outDir) : []).toEqual([]);
  }, 180_000);

  it.concurrent('is refused when NODE_ENV is not production (it would be a development bundle) and writes no assets', async () => {
    const outDir = join(tmp, 'refused-node-env');
    const r = await runVite(['build', '--mode', 'release', '--outDir', outDir, '--emptyOutDir'], { NODE_ENV: 'development' });
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}\n${r.stderr}`).toContain('NODE_ENV is not "production"');
    expect(existsSync(outDir) ? readdirSync(outDir) : []).toEqual([]);
  }, 180_000);

  it.concurrent('with fake but valid production ids holds the production ids and no Google test publisher, and ignores the debug variables', async () => {
    // The guard is removed in this generated config (it is covered above); what is pinned here is what the bundle contains.
    const outDir = join(tmp, 'release');
    const cfg = writeConfig('release', { mode: 'release', fakeProdIds: true, noGuard: true });
    const r = await runVite(['build', '--mode', 'release', '--config', cfg, '--outDir', outDir, '--emptyOutDir'], { VITE_UMP_DEBUG_GEOGRAPHY: 'EEA', VITE_UMP_TEST_DEVICE_IDS: 'ABCDEF0123' });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    const bundle = files(outDir);
    expect(bundle.length).toBeGreaterThan(0);
    const filesWith = (needle: string) => bundle.filter((f) => f.text.includes(needle)).map((f) => f.path);
    // a future import of ADMOB_TEST into app code would put Google's publisher back into the release bundle
    expect(filesWith(GOOGLE_TEST_PUBLISHER)).toEqual([]);
    expect(filesWith(FAKE.appId)).not.toEqual([]);
    expect(filesWith(FAKE.key)).not.toEqual([]);
    // the debug variables were set while building, yet nothing of them is in the release bundle
    expect(filesWith('ABCDEF0123')).toEqual([]);
    expect(scanAssets(bundle)).toEqual([]);
  }, 180_000);
});
