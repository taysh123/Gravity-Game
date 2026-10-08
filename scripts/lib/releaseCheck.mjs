// P00-T20 release guard: the ONE implementation of "what a release build must not contain". Pure: no filesystem, no process,
// no clock. scripts/release-check.mjs (npm run release:check) and the release Vite build (vite.config.ts) both run it, and the
// gathering of its inputs is scripts/lib/releaseInputs.mjs. Tests: releaseCheck.test.mjs and src/config/releaseConfig.test.ts.
//
// A failure is { id, subject, message }: `id` is the stable reason, `subject` what is wrong (a config field, an env variable,
// a file), `message` says how to fix it. Secrets are never echoed: an RC key or a device id is described, not printed.

/** Google's public AdMob test publisher. Every test app id and test ad unit id starts with it. */
export const GOOGLE_TEST_PUBLISHER = 'ca-app-pub-3940256099942544';

const APP_ID_RE = /^ca-app-pub-(\d{16})~\d{10}$/;
const UNIT_ID_RE = /^ca-app-pub-(\d{16})\/\d{10}$/;
// A RevenueCat public Android SDK key is `goog_` plus the key body. An allowlist on purpose: a Test Store key (`test_...`,
// per the RevenueCat docs and blog), an App Store `appl_...` key, a secret `sk_...` key or a typo all fail the same way.
const REVENUECAT_ANDROID_KEY_RE = /^goog_\S+$/;

const ADMOB_FIELDS = [
  { field: 'appId', re: APP_ID_RE, shape: 'ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN', what: 'app id', where: 'AdMob console > Apps' },
  { field: 'rewardedAdId', re: UNIT_ID_RE, shape: 'ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN', what: 'rewarded ad unit id', where: 'AdMob console > Ad units' },
  { field: 'interstitialAdId', re: UNIT_ID_RE, shape: 'ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN', what: 'interstitial ad unit id', where: 'AdMob console > Ad units' },
];

const CONFIG_FILE = 'src/config/monetization.config.ts';

const fail = (id, subject, message) => ({ id, subject, message });
const blank = (v) => typeof v !== 'string' || v.trim() === '';

function checkAdmobProd(prod) {
  const out = [];
  const valid = {};
  for (const { field, re, shape, what, where } of ADMOB_FIELDS) {
    const subject = `ADMOB_PROD.${field}`;
    const value = prod?.[field];
    if (blank(value)) {
      out.push(fail('admob-id-empty', subject, `empty. Paste the real AdMob ${what} (${shape}, ${where}) into ADMOB_PROD in ${CONFIG_FILE}.`));
    } else if (value.includes(GOOGLE_TEST_PUBLISHER)) {
      out.push(fail('admob-id-test', subject, `uses Google's test publisher ${GOOGLE_TEST_PUBLISHER}, which serves test ads and earns nothing. Replace it with your real AdMob ${what} in ${CONFIG_FILE}.`));
    } else if (!re.test(value)) {
      out.push(fail('admob-id-malformed', subject, `is not an AdMob ${what} (expected ${shape}). Check ADMOB_PROD in ${CONFIG_FILE}: app ids contain "~", ad unit ids contain "/".`));
    } else {
      valid[field] = re.exec(value)[1];
    }
  }
  // Ad units must belong to the same publisher as the app id, or AdMob rejects every request.
  if (valid.appId !== undefined) {
    for (const field of ['rewardedAdId', 'interstitialAdId']) {
      if (valid[field] !== undefined && valid[field] !== valid.appId) {
        out.push(fail('admob-publisher-mismatch', `ADMOB_PROD.${field}`, `belongs to a different AdMob publisher than ADMOB_PROD.appId. Copy the ad unit from the same AdMob account as the app (${CONFIG_FILE}).`));
      }
    }
  }
  return out;
}

function checkAppIdArg(arg, prodAppId) {
  if (arg === undefined) return [];
  if (typeof arg === 'string' && arg.includes(GOOGLE_TEST_PUBLISHER)) {
    return [fail('admob-id-test', '-PADMOB_APP_ID', `is Google's test app id (${GOOGLE_TEST_PUBLISHER}). Pass the real AdMob app id: ./gradlew bundleRelease -PADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN.`)];
  }
  if (blank(prodAppId) || arg !== prodAppId) {
    return [fail('admob-app-id-arg-mismatch', '-PADMOB_APP_ID', `differs from ADMOB_PROD.appId in ${CONFIG_FILE}. The manifest and the code must carry the same app id; pass the one in ADMOB_PROD.`)];
  }
  return [];
}

function checkRevenueCatKey(key) {
  if (blank(key)) {
    return [fail('revenuecat-key', 'REVENUECAT_API_KEY_PROD', `empty, so every purchase would resolve "unavailable". Paste the public Google Play SDK key (starts with goog_, RevenueCat > API keys) into ${CONFIG_FILE}.`)];
  }
  if (REVENUECAT_ANDROID_KEY_RE.test(key)) return [];
  if (key.trim().startsWith('test_')) {
    return [fail('revenuecat-key', 'REVENUECAT_API_KEY_PROD', `is a RevenueCat Test Store key (test_ prefix). A Test Store key simulates purchases and must never ship. Use the public Google Play SDK key that starts with goog_ (${CONFIG_FILE}).`)];
  }
  return [fail('revenuecat-key', 'REVENUECAT_API_KEY_PROD', `must be a public Google Play SDK key that starts with goog_ followed by the key, with no spaces or quotes (${CONFIG_FILE}). Any other prefix (Test Store test_, App Store appl_, secret sk_) is refused.`)];
}

function checkDebugEnv(env) {
  const out = [];
  if (!blank(env?.VITE_UMP_DEBUG_GEOGRAPHY)) {
    out.push(fail('ump-debug-geography', 'VITE_UMP_DEBUG_GEOGRAPHY', 'is set. It forces a consent region and turns initializeForTesting on in Ads.init. Unset it (shell, .env, .env.local, .env.release) before a release build.'));
  }
  const devices = String(env?.VITE_UMP_TEST_DEVICE_IDS ?? '')
    .split(',')
    .filter((s) => s.trim() !== '');
  if (devices.length > 0) {
    out.push(fail('ump-test-devices', 'VITE_UMP_TEST_DEVICE_IDS', 'is set. It registers UMP test devices (and, with a debug region, turns initializeForTesting on). Unset it (shell, .env, .env.local, .env.release) before a release build.'));
  }
  return out;
}

function checkVersion({ versionCode, versionCodeError, lastUploadedVersionCode }) {
  const out = [];
  if (!Number.isInteger(versionCode)) {
    out.push(fail('version-code-unknown', 'versionCode', `could not be derived from package.json: ${versionCodeError ?? 'unknown error'}. Fix "version" / "androidBuild" (node scripts/version.mjs --check).`));
  }
  if (!Number.isInteger(lastUploadedVersionCode)) {
    out.push(fail('last-uploaded-unknown', 'last uploaded versionCode', 'has no readable marker: docs/STATUS.md needs exactly one <!-- last-uploaded-version-code: N --> comment (N a whole number) under Owner gates, so the release can be compared with what Play already holds.'));
  }
  if (Number.isInteger(versionCode) && Number.isInteger(lastUploadedVersionCode) && versionCode <= lastUploadedVersionCode) {
    out.push(fail('version-code-not-increasing', 'versionCode', `${versionCode} is not greater than the last uploaded versionCode ${lastUploadedVersionCode} (docs/STATUS.md). Play rejects it. Run node scripts/version.mjs --bump-build (androidBuild += 1) and commit.`));
  }
  return out;
}

/**
 * Everything a release must satisfy before it is built.
 * input: { admobProd: { appId, rewardedAdId, interstitialAdId }, revenueCatApiKey, env: { VITE_UMP_* },
 *          versionCode: number | null, versionCodeError?: string, lastUploadedVersionCode: number | null,
 *          admobAppIdArg?: string }   (admobAppIdArg: the -PADMOB_APP_ID the owner is about to pass, when known)
 * Returns the failures in a stable order; an empty array means the release may proceed.
 */
export function checkRelease(input) {
  return [
    ...checkAdmobProd(input.admobProd),
    ...checkAppIdArg(input.admobAppIdArg, input.admobProd?.appId),
    ...checkRevenueCatKey(input.revenueCatApiKey),
    ...checkDebugEnv(input.env),
    ...checkVersion(input),
  ];
}

// Heuristic for a baked-in debug override in a minified bundle: consent.config.ts builds
// `{ geography: parseDebugGeography(<env>), testDeviceIds: parseTestDeviceIds(<env>) }` and Vite inlines the env value, so a bundle
// made with a variable set reads `geography:cl("EEA")`. An unset variable reads `cl("")` or `hl()`. Property names survive minification.
const BAKED_ARG = String.raw`\s*[\w$.]+\(\s*(["'\x60])(?=[^"'\x60]*[^"'\x60\s])[^"'\x60]*\1\s*\)`;
const BAKED_GEOGRAPHY_RE = new RegExp(String.raw`\bgeography:${BAKED_ARG}`);
const BAKED_DEVICES_RE = new RegExp(String.raw`\btestDeviceIds:${BAKED_ARG}`);

const countOf = (text, needle) => text.split(needle).length - 1;

/**
 * Scan the synced web assets (android/app/src/main/assets/public/**\/*.js) for what must not be in a release AAB.
 * files: [{ path, text }]; where: the directory they came from, for the message. A debug bundle synced by mistake carries Google's test publisher in its AdMob ids.
 */
export function scanAssets(files, where = 'android/app/src/main/assets/public') {
  if (files.length === 0) {
    return [fail('asset-none', where, 'holds no .js files, so nothing was checked. Build and sync first: npm run build:release, then npx cap sync android.')];
  }
  const out = [];
  for (const { path, text } of files) {
    const testIds = countOf(text, GOOGLE_TEST_PUBLISHER);
    if (testIds > 0) {
      out.push(fail('asset-google-test-id', path, `contains Google's test publisher ${GOOGLE_TEST_PUBLISHER} (${testIds} time${testIds === 1 ? '' : 's'}): a debug web bundle was synced. Run npm run build:release, then npx cap sync android, then check again.`));
    }
    if (BAKED_GEOGRAPHY_RE.test(text)) {
      out.push(fail('asset-debug-geography', path, 'has a debug UMP geography baked in (VITE_UMP_DEBUG_GEOGRAPHY was set when it was built). Unset it, run npm run build:release, then npx cap sync android.'));
    }
    if (BAKED_DEVICES_RE.test(text)) {
      out.push(fail('asset-test-devices', path, 'has UMP test device ids baked in (VITE_UMP_TEST_DEVICE_IDS was set when it was built). Unset it, run npm run build:release, then npx cap sync android.'));
    }
  }
  return out;
}

/**
 * The last versionCode uploaded to Play, from the hand-edited marker in docs/STATUS.md:
 *   <!-- last-uploaded-version-code: 1 -->
 * Null when there is no marker, more than one, or the value is not a plain non-negative integer (fail closed).
 */
export function parseLastUploadedVersionCode(statusText) {
  const found = [...String(statusText).matchAll(/<!--\s*last-uploaded-version-code:\s*([^>]*?)\s*-->/g)];
  if (found.length !== 1) return null;
  const raw = found[0][1];
  if (!/^(0|[1-9]\d*)$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/** The text release-check prints and the release build throws. */
export function formatReport(failures, title) {
  if (failures.length === 0) return `${title}: OK`;
  const lines = failures.map((f, i) => `  ${i + 1}. ${f.subject}: ${f.message}`);
  return `${title}: REFUSED, ${failures.length} problem${failures.length === 1 ? '' : 's'}\n${lines.join('\n')}`;
}
