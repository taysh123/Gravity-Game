import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ADMOB_PROD, ADMOB_TEST, REVENUECAT_API_KEY_PROD, REVENUECAT_API_KEY_TEST, selectMonetizationIds } from './monetization.config';
import { RELEASE_MODE } from './build.config';
import { GOOGLE_TEST_PUBLISHER, checkRelease, parseLastUploadedVersionCode } from '../../scripts/lib/releaseCheck.mjs';
import { gatherReleaseInputs } from '../../scripts/lib/releaseInputs.mjs';

// P00-T20: release configuration guard. Three layers are pinned here:
//   1. which ids a build mode selects (selectMonetizationIds, and the real module under a stubbed MODE);
//   2. that the repo's own state is refused by the release check until the owner supplies real ids;
//   3. the Android side (manifest placeholder, Gradle failure) and the npm scripts, as source pins.
// The refusal logic itself (every reason) is tested in scripts/lib/releaseCheck.test.mjs.

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${ROOT}${rel}`, 'utf8');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('selectMonetizationIds: the build mode picks the ids', () => {
  const prod = {
    admob: { appId: 'ca-app-pub-1111222233334444~5555666677', rewardedAdId: 'ca-app-pub-1111222233334444/1234567890', interstitialAdId: 'ca-app-pub-1111222233334444/0987654321' },
    revenueCatApiKey: 'goog_AbCdEf',
  };

  it('the release mode is the literal "release" (vite build --mode release)', () => {
    expect(RELEASE_MODE).toBe('release');
  });

  it('release selects the production AdMob ids and the production RevenueCat key', () => {
    const s = selectMonetizationIds('release', prod);
    expect(s.admob).toEqual(prod.admob);
    expect(s.revenueCatApiKey).toBe('goog_AbCdEf');
  });

  it('every other mode selects the Google test ids and the test RevenueCat key, never the production values', () => {
    for (const mode of ['development', 'production', 'test', 'staging', 'Release', 'RELEASE', ' release', 'release ', '']) {
      const s = selectMonetizationIds(mode, prod);
      expect(s.admob).toEqual(ADMOB_TEST);
      expect(s.revenueCatApiKey).toBe(REVENUECAT_API_KEY_TEST);
    }
  });

  it('production (the default `vite build` mode) is NOT the release mode', () => {
    expect(selectMonetizationIds('production', prod).admob).toEqual(ADMOB_TEST);
  });

  it('release with unfilled production values selects the empty values (the release check then refuses them)', () => {
    const s = selectMonetizationIds('release', { admob: ADMOB_PROD, revenueCatApiKey: REVENUECAT_API_KEY_PROD });
    expect(s.admob).toBe(ADMOB_PROD);
    expect(s.revenueCatApiKey).toBe(REVENUECAT_API_KEY_PROD);
  });
});

describe('the test and production id sets', () => {
  it('ADMOB_TEST is entirely Google\'s public test ids', () => {
    for (const id of Object.values(ADMOB_TEST)) expect(id.startsWith(GOOGLE_TEST_PUBLISHER)).toBe(true);
    expect(ADMOB_TEST.appId).toMatch(/^ca-app-pub-\d{16}~\d{10}$/);
    expect(ADMOB_TEST.rewardedAdId).toMatch(/^ca-app-pub-\d{16}\/\d{10}$/);
    expect(ADMOB_TEST.interstitialAdId).toMatch(/^ca-app-pub-\d{16}\/\d{10}$/);
  });

  it('ADMOB_PROD never holds Google\'s test publisher (a copy-paste of ADMOB_TEST would ship test ads)', () => {
    for (const id of Object.values(ADMOB_PROD)) expect(id).not.toContain(GOOGLE_TEST_PUBLISHER);
  });

  it('the test RevenueCat key is empty: debug builds leave IAP unconfigured, as before', () => {
    expect(REVENUECAT_API_KEY_TEST).toBe('');
  });

  it('the production RevenueCat key is empty or a goog_ key, never anything else', () => {
    expect(REVENUECAT_API_KEY_PROD === '' || /^goog_\S+$/.test(REVENUECAT_API_KEY_PROD)).toBe(true);
  });
});

describe('the real module under each MODE (what a bundle really contains)', () => {
  it('under vitest (MODE=test) ADMOB is the test set and the RevenueCat key is the test key', async () => {
    const m = await import('./monetization.config');
    expect(m.ADMOB).toBe(m.ADMOB_TEST);
    expect(m.REVENUECAT.apiKey).toBe(m.REVENUECAT_API_KEY_TEST);
  });

  it('under MODE=development and MODE=production it is still the test set', async () => {
    for (const mode of ['development', 'production']) {
      vi.stubEnv('MODE', mode);
      vi.resetModules();
      const m = await import('./monetization.config');
      expect(m.ADMOB).toBe(m.ADMOB_TEST);
    }
  });

  it('under MODE=release it is the production set and the production RevenueCat key', async () => {
    vi.stubEnv('MODE', 'release');
    vi.resetModules();
    const m = await import('./monetization.config');
    expect(m.ADMOB).toBe(m.ADMOB_PROD);
    expect(m.REVENUECAT.apiKey).toBe(m.REVENUECAT_API_KEY_PROD);
    const expected = selectMonetizationIds('release', { admob: m.ADMOB_PROD, revenueCatApiKey: m.REVENUECAT_API_KEY_PROD });
    expect(m.ADMOB).toBe(expected.admob);
    expect(m.REVENUECAT.apiKey).toBe(expected.revenueCatApiKey);
  });

  it('the Remove-Ads product id does not depend on the mode', async () => {
    vi.stubEnv('MODE', 'release');
    vi.resetModules();
    const m = await import('./monetization.config');
    expect(m.REVENUECAT.removeAdsProductId).toBe('remove_ads');
  });
});

describe('UMP debug overrides never survive into a release build', () => {
  const DEBUG_ENV = { VITE_UMP_DEBUG_GEOGRAPHY: 'EEA', VITE_UMP_TEST_DEVICE_IDS: 'ABCDEF0123' };

  it('a debug build reads both variables (so initializeForTesting can be on there)', async () => {
    vi.stubEnv('MODE', 'development');
    for (const [k, v] of Object.entries(DEBUG_ENV)) vi.stubEnv(k, v);
    vi.resetModules();
    const { UMP_DEBUG } = await import('./consent.config');
    expect(UMP_DEBUG.geography).toBe(1);
    expect([...UMP_DEBUG.testDeviceIds]).toEqual(['ABCDEF0123']);
  });

  it('MODE=release ignores both variables even when they are set: initializeForTesting cannot be on', async () => {
    vi.stubEnv('MODE', 'release');
    for (const [k, v] of Object.entries(DEBUG_ENV)) vi.stubEnv(k, v);
    vi.resetModules();
    const { UMP_DEBUG } = await import('./consent.config');
    expect(UMP_DEBUG.geography).toBeUndefined();
    expect([...UMP_DEBUG.testDeviceIds]).toEqual([]);
  });
});

describe('the repo\'s own state against the release check', () => {
  const inputs = (env: Record<string, string | undefined> = {}) =>
    gatherReleaseInputs({ root: ROOT, env, admobProd: ADMOB_PROD, revenueCatApiKey: REVENUECAT_API_KEY_PROD });
  const gateOpen = Object.values(ADMOB_PROD).some((v) => v === '') || REVENUECAT_API_KEY_PROD === '';

  // The owner gate (docs/STATUS.md): while the real ids are not pasted into monetization.config.ts, a release is refused.
  // These two describes swap places by themselves when the owner fills the ids in, so the owner's edit never breaks a test.
  describe.runIf(gateOpen)('while the owner has not supplied the real ids', () => {
    it('refuses all three production AdMob ids and the RevenueCat key, with the file to edit', () => {
      const f = checkRelease(inputs());
      expect(f.filter((x: { id: string }) => x.id === 'admob-id-empty').map((x: { subject: string }) => x.subject)).toEqual(
        Object.entries(ADMOB_PROD).filter(([, v]) => v === '').map(([k]) => `ADMOB_PROD.${k}`),
      );
      expect(f.some((x: { id: string }) => x.id === 'revenuecat-key')).toBe(true);
      for (const x of f) expect(x.message).toContain('monetization.config.ts');
    });

    it('the versionCode itself is fine today (1000001 is above the uploaded code 1): only the ids block the release', () => {
      const ids = checkRelease(inputs()).map((x: { id: string }) => x.id);
      expect(ids).not.toContain('version-code-not-increasing');
      expect(ids).not.toContain('version-code-unknown');
      expect(ids).not.toContain('last-uploaded-unknown');
    });
  });

  describe.skipIf(gateOpen)('once the owner has supplied the real ids', () => {
    it('the release check passes on a clean environment', () => {
      expect(checkRelease(inputs())).toEqual([]);
    });
  });

  it('a debug-geography variable in the environment is refused whatever the ids are', () => {
    const f = checkRelease(inputs({ VITE_UMP_DEBUG_GEOGRAPHY: 'EEA', VITE_UMP_TEST_DEVICE_IDS: 'ABCDEF0123' }));
    const ids = f.map((x: { id: string }) => x.id);
    expect(ids).toContain('ump-debug-geography');
    expect(ids).toContain('ump-test-devices');
  });

  it('reads the versionCode from package.json (D-20) and the last upload from the marker in docs/STATUS.md', () => {
    const i = inputs();
    expect(i.versionCode).toBeGreaterThanOrEqual(1_000_001);
    expect(i.lastUploadedVersionCode).not.toBeNull();
    expect(parseLastUploadedVersionCode(read('docs/STATUS.md'))).toBe(i.lastUploadedVersionCode);
  });

  it('the last-uploaded marker exists exactly once in docs/STATUS.md, outside the generated facts block', () => {
    const status = read('docs/STATUS.md');
    expect(status.match(/last-uploaded-version-code:/g)).toHaveLength(1);
    const facts = /<!-- facts:start -->[\s\S]*<!-- facts:end -->/.exec(status)?.[0] ?? '';
    expect(facts).not.toContain('last-uploaded-version-code');
  });
});
