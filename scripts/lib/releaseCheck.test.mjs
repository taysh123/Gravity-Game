import { describe, expect, it } from 'vitest';
import {
  GOOGLE_TEST_PUBLISHER,
  checkRelease,
  formatReport,
  parseLastUploadedVersionCode,
  scanAssets,
} from './releaseCheck.mjs';

// P00-T20: the pure half of the release guard (scripts/release-check.mjs and the release Vite build both call it). Every refusal
// reason has a test here; the TypeScript side (selection per build mode, today's repo state) is src/config/releaseConfig.test.ts.

const GOOD_PROD = {
  appId: 'ca-app-pub-1111222233334444~5555666677',
  rewardedAdId: 'ca-app-pub-1111222233334444/1234567890',
  interstitialAdId: 'ca-app-pub-1111222233334444/0987654321',
};
const GOOD_KEY = 'goog_AbCdEfGhIjKlMnOpQrStUvWxYz';

/** An input that passes every check; each test breaks one thing. */
function good(over = {}) {
  return {
    admobProd: { ...GOOD_PROD },
    revenueCatApiKey: GOOD_KEY,
    env: {},
    versionCode: 1000001,
    versionCodeError: undefined,
    lastUploadedVersionCode: 1,
    admobAppIdArg: undefined,
    ...over,
  };
}

const ids = (failures) => failures.map((f) => f.id);
const only = (failures, id) => failures.filter((f) => f.id === id);

describe('checkRelease: the happy path', () => {
  it('accepts real-looking ids, a goog_ key, a clean env and a versionCode above the last upload', () => {
    expect(checkRelease(good())).toEqual([]);
  });

  it('accepts a matching -PADMOB_APP_ID', () => {
    expect(checkRelease(good({ admobAppIdArg: GOOD_PROD.appId }))).toEqual([]);
  });
});

describe('checkRelease: AdMob ids', () => {
  for (const field of ['appId', 'rewardedAdId', 'interstitialAdId']) {
    it(`refuses an empty ADMOB_PROD.${field}`, () => {
      const f = checkRelease(good({ admobProd: { ...GOOD_PROD, [field]: '' } }));
      const hit = only(f, 'admob-id-empty');
      expect(hit).toHaveLength(1);
      expect(hit[0].subject).toBe(`ADMOB_PROD.${field}`);
      expect(hit[0].message).toContain('src/config/monetization.config.ts');
    });

    it(`refuses a whitespace-only ADMOB_PROD.${field}`, () => {
      expect(ids(checkRelease(good({ admobProd: { ...GOOD_PROD, [field]: '   ' } })))).toContain('admob-id-empty');
    });

    it(`refuses Google's test publisher in ADMOB_PROD.${field}`, () => {
      const testId = field === 'appId' ? `${GOOGLE_TEST_PUBLISHER}~3347511713` : `${GOOGLE_TEST_PUBLISHER}/5224354917`;
      const f = checkRelease(good({ admobProd: { ...GOOD_PROD, [field]: testId } }));
      const hit = only(f, 'admob-id-test');
      expect(hit).toHaveLength(1);
      expect(hit[0].subject).toBe(`ADMOB_PROD.${field}`);
      expect(hit[0].message).toContain(GOOGLE_TEST_PUBLISHER);
    });
  }

  it('the test publisher is the one Google documents', () => {
    expect(GOOGLE_TEST_PUBLISHER).toBe('ca-app-pub-3940256099942544');
  });

  it('refuses a malformed app id (an ad unit id pasted into the app slot)', () => {
    const f = checkRelease(good({ admobProd: { ...GOOD_PROD, appId: GOOD_PROD.rewardedAdId } }));
    expect(only(f, 'admob-id-malformed')).toHaveLength(1);
    expect(only(f, 'admob-id-malformed')[0].subject).toBe('ADMOB_PROD.appId');
  });

  it('refuses a malformed ad unit id (an app id pasted into a unit slot)', () => {
    const f = checkRelease(good({ admobProd: { ...GOOD_PROD, rewardedAdId: GOOD_PROD.appId } }));
    expect(only(f, 'admob-id-malformed')[0].subject).toBe('ADMOB_PROD.rewardedAdId');
  });

  it('refuses ad units from a different publisher than the app id', () => {
    const f = checkRelease(good({ admobProd: { ...GOOD_PROD, interstitialAdId: 'ca-app-pub-9999888877776666/1234567890' } }));
    const hit = only(f, 'admob-publisher-mismatch');
    expect(hit).toHaveLength(1);
    expect(hit[0].subject).toBe('ADMOB_PROD.interstitialAdId');
  });

  it('lists every failing id, not just the first', () => {
    const f = checkRelease(good({ admobProd: { appId: '', rewardedAdId: '', interstitialAdId: '' } }));
    expect(only(f, 'admob-id-empty').map((x) => x.subject)).toEqual([
      'ADMOB_PROD.appId',
      'ADMOB_PROD.rewardedAdId',
      'ADMOB_PROD.interstitialAdId',
    ]);
  });

  it('refuses a -PADMOB_APP_ID that differs from ADMOB_PROD.appId (manifest and code would disagree)', () => {
    const f = checkRelease(good({ admobAppIdArg: 'ca-app-pub-1111222233334444~0000000000' }));
    expect(only(f, 'admob-app-id-arg-mismatch')).toHaveLength(1);
  });

  it('refuses a -PADMOB_APP_ID that is a Google test app id', () => {
    const f = checkRelease(good({ admobAppIdArg: `${GOOGLE_TEST_PUBLISHER}~3347511713` }));
    expect(ids(f)).toContain('admob-id-test');
    expect(only(f, 'admob-id-test')[0].subject).toBe('-PADMOB_APP_ID');
  });
});

describe('checkRelease: RevenueCat key', () => {
  it('refuses an empty key', () => {
    const f = only(checkRelease(good({ revenueCatApiKey: '' })), 'revenuecat-key');
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain('empty');
    expect(f[0].message).toContain('goog_');
  });

  it('refuses a whitespace-only key', () => {
    expect(ids(checkRelease(good({ revenueCatApiKey: '  ' })))).toContain('revenuecat-key');
  });

  it('refuses a bare "goog_" with nothing after it', () => {
    expect(ids(checkRelease(good({ revenueCatApiKey: 'goog_' })))).toContain('revenuecat-key');
  });

  it('refuses a Test Store key (test_ prefix, RevenueCat docs)', () => {
    const f = only(checkRelease(good({ revenueCatApiKey: 'test_AbCdEfGhIjKlMnOpQrStUvWxYz' })), 'revenuecat-key');
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain('Test Store');
  });

  it('refuses any other prefix (an App Store appl_ key, a secret sk_ key, a bare token)', () => {
    for (const key of ['appl_AbCdEf', 'sk_AbCdEf', 'AbCdEfGhIj', 'GOOG_AbCdEf']) {
      expect(ids(checkRelease(good({ revenueCatApiKey: key })))).toContain('revenuecat-key');
    }
  });

  it('refuses a goog_ key with whitespace or quotes pasted around it', () => {
    for (const key of [` ${GOOD_KEY}`, `${GOOD_KEY} `, `"${GOOD_KEY}"`, 'goog_ab cd']) {
      expect(ids(checkRelease(good({ revenueCatApiKey: key })))).toContain('revenuecat-key');
    }
  });

  it('never prints the key itself in the message', () => {
    const f = checkRelease(good({ revenueCatApiKey: 'test_SECRETSECRETSECRET' }));
    expect(JSON.stringify(f)).not.toContain('SECRETSECRETSECRET');
  });
});

describe('checkRelease: debug UMP overrides', () => {
  it('refuses VITE_UMP_DEBUG_GEOGRAPHY when set to a region', () => {
    for (const v of ['EEA', 'us', 'OTHER', 'NOT_EEA']) {
      const f = only(checkRelease(good({ env: { VITE_UMP_DEBUG_GEOGRAPHY: v } })), 'ump-debug-geography');
      expect(f).toHaveLength(1);
      expect(f[0].subject).toBe('VITE_UMP_DEBUG_GEOGRAPHY');
    }
  });

  it('refuses any non-empty value, even one the app would ignore (DISABLED, garbage): the variable must not be set', () => {
    for (const v of ['DISABLED', 'garbage', '0']) {
      expect(ids(checkRelease(good({ env: { VITE_UMP_DEBUG_GEOGRAPHY: v } })))).toContain('ump-debug-geography');
    }
  });

  it('accepts the variable unset, empty or whitespace-only', () => {
    for (const v of [undefined, '', '   ']) {
      expect(checkRelease(good({ env: { VITE_UMP_DEBUG_GEOGRAPHY: v } }))).toEqual([]);
    }
  });

  it('refuses VITE_UMP_TEST_DEVICE_IDS when it lists a device', () => {
    const f = only(checkRelease(good({ env: { VITE_UMP_TEST_DEVICE_IDS: 'ABCDEF0123, 4567' } })), 'ump-test-devices');
    expect(f).toHaveLength(1);
    expect(f[0].subject).toBe('VITE_UMP_TEST_DEVICE_IDS');
  });

  it('accepts a device-id variable that is empty or only commas and spaces', () => {
    for (const v of [undefined, '', ' , ,']) {
      expect(checkRelease(good({ env: { VITE_UMP_TEST_DEVICE_IDS: v } }))).toEqual([]);
    }
  });

  it('never prints the device ids in the message', () => {
    const f = checkRelease(good({ env: { VITE_UMP_TEST_DEVICE_IDS: 'DEVICE_HASH_123' } }));
    expect(JSON.stringify(f)).not.toContain('DEVICE_HASH_123');
  });

  it('names initializeForTesting: either variable would switch it on in Ads.init', () => {
    const f = checkRelease(good({ env: { VITE_UMP_DEBUG_GEOGRAPHY: 'EEA' } }));
    expect(only(f, 'ump-debug-geography')[0].message).toContain('initializeForTesting');
  });
});

describe('checkRelease: versionCode', () => {
  it('refuses a versionCode equal to the last uploaded one', () => {
    const f = only(checkRelease(good({ versionCode: 1000001, lastUploadedVersionCode: 1000001 })), 'version-code-not-increasing');
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain('1000001');
    expect(f[0].message).toContain('androidBuild');
  });

  it('refuses a versionCode below the last uploaded one', () => {
    expect(ids(checkRelease(good({ versionCode: 1000001, lastUploadedVersionCode: 1000005 })))).toContain('version-code-not-increasing');
  });

  it('accepts exactly one above', () => {
    expect(checkRelease(good({ versionCode: 1000002, lastUploadedVersionCode: 1000001 }))).toEqual([]);
  });

  it('refuses when the versionCode cannot be derived, and says why', () => {
    const f = only(checkRelease(good({ versionCode: null, versionCodeError: 'MINOR must be an integer 0-99' })), 'version-code-unknown');
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain('MINOR must be an integer 0-99');
  });

  it('refuses when docs/STATUS.md has no last-uploaded marker (fail closed)', () => {
    const f = only(checkRelease(good({ lastUploadedVersionCode: null })), 'last-uploaded-unknown');
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain('docs/STATUS.md');
    expect(f[0].message).toContain('last-uploaded-version-code');
  });
});

describe('checkRelease: every reason at once', () => {
  it('reports each failing item, in a stable order', () => {
    const f = checkRelease(
      good({
        admobProd: { appId: '', rewardedAdId: `${GOOGLE_TEST_PUBLISHER}/5224354917`, interstitialAdId: '' },
        revenueCatApiKey: '',
        env: { VITE_UMP_DEBUG_GEOGRAPHY: 'EEA', VITE_UMP_TEST_DEVICE_IDS: 'X' },
        versionCode: 1,
        lastUploadedVersionCode: 1,
      }),
    );
    expect(ids(f)).toEqual([
      'admob-id-empty',
      'admob-id-test',
      'admob-id-empty',
      'revenuecat-key',
      'ump-debug-geography',
      'ump-test-devices',
      'version-code-not-increasing',
    ]);
  });
});

describe('parseLastUploadedVersionCode', () => {
  it('reads the machine-readable marker', () => {
    expect(parseLastUploadedVersionCode('Last uploaded versionCode: **1** <!-- last-uploaded-version-code: 1 -->\n')).toBe(1);
    expect(parseLastUploadedVersionCode('x\n<!--last-uploaded-version-code:1000001-->\ny')).toBe(1000001);
  });

  it('is null when the marker is missing', () => {
    expect(parseLastUploadedVersionCode('# STATUS\nno marker here')).toBeNull();
  });

  it('is null when the value is not a plain non-negative integer', () => {
    for (const bad of ['abc', '', '-1', '1.5', '01', '1e3']) {
      expect(parseLastUploadedVersionCode(`<!-- last-uploaded-version-code: ${bad} -->`)).toBeNull();
    }
  });

  it('is null when two markers disagree or repeat (ambiguous)', () => {
    const two = '<!-- last-uploaded-version-code: 1 -->\n<!-- last-uploaded-version-code: 2 -->';
    expect(parseLastUploadedVersionCode(two)).toBeNull();
  });

  it('ignores the marker text when it is not an HTML comment', () => {
    expect(parseLastUploadedVersionCode('last-uploaded-version-code: 5')).toBeNull();
  });
});

describe('scanAssets (the synced web assets under android/app/src/main/assets/public)', () => {
  const clean = { path: 'assets/index-abc.js', text: 'const a={appId:"ca-app-pub-1111222233334444~5555666677"};geography:cl(""),testDeviceIds:hl()' };

  it('passes a clean release bundle', () => {
    expect(scanAssets([clean])).toEqual([]);
  });

  it('refuses a bundle holding Google\'s test publisher id, naming the file', () => {
    const f = scanAssets([clean, { path: 'assets/app-xyz.js', text: 'x={appId:"ca-app-pub-3940256099942544~3347511713"}' }]);
    expect(ids(f)).toEqual(['asset-google-test-id']);
    expect(f[0].subject).toBe('assets/app-xyz.js');
    expect(f[0].message).toContain('npm run build:release');
  });

  it('refuses a bundle with a debug geography baked in', () => {
    const f = scanAssets([{ path: 'assets/index.js', text: 'Ri={geography:cl("EEA"),testDeviceIds:hl()}' }]);
    expect(ids(f)).toEqual(['asset-debug-geography']);
  });

  it('refuses a bundle with test device ids baked in', () => {
    const f = scanAssets([{ path: 'assets/index.js', text: 'Ri={geography:cl(""),testDeviceIds:hl("ABCDEF0123")}' }]);
    expect(ids(f)).toEqual(['asset-test-devices']);
  });

  it('does not match an empty-string argument or a call without arguments', () => {
    expect(scanAssets([{ path: 'a.js', text: 'o={geography:cl(""),testDeviceIds:hl("")}' }])).toEqual([]);
    expect(scanAssets([{ path: 'a.js', text: 'o={geography:cl(void 0),testDeviceIds:hl()}' }])).toEqual([]);
  });

  it('reports each offending file separately, and a file once per reason', () => {
    const bad = 'a="ca-app-pub-3940256099942544/1";b="ca-app-pub-3940256099942544/2"';
    const f = scanAssets([
      { path: 'one.js', text: bad },
      { path: 'two.js', text: bad },
    ]);
    expect(f.map((x) => x.subject)).toEqual(['one.js', 'two.js']);
  });

  it('refuses an empty scan: no JS means nothing was synced, so nothing was checked', () => {
    const f = scanAssets([]);
    expect(ids(f)).toEqual(['asset-none']);
    expect(f[0].message).toContain('npx cap sync android');
  });
});

describe('formatReport', () => {
  it('prints a header, one numbered line per failure and the count', () => {
    const f = checkRelease(good({ revenueCatApiKey: '', admobProd: { ...GOOD_PROD, appId: '' } }));
    const text = formatReport(f, 'release:check');
    expect(text).toContain('release:check');
    expect(text).toContain('REFUSED');
    expect(text).toMatch(/\n\s*1\. /);
    expect(text).toMatch(/\n\s*2\. /);
    expect(text).toContain('2 problem');
  });

  it('prints an OK line when there is nothing to report', () => {
    expect(formatReport([], 'release:check')).toContain('OK');
  });
});
