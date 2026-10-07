import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// P00-T18 / D-10: the source half of V10. A fresh install must start with every Consent Mode default denied, automatic screen
// reporting off and Crashlytics collection off, so that nothing is stored or sent on the first launch before bootServices has the UMP
// outcome. These are first-launch defaults only: Firebase consent and the Crashlytics switch are persisted by the SDKs and override
// them on later launches (TECHNICAL-ARCHITECTURE 4.3). The merged manifest (what Gradle really ships) is checked by hand per
// docs/roadmap/phases/P00-foundation.md V10; this pins the source it merges from.
// com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT is deliberately absent (obsolete since Mobile Ads SDK 18.1.0; see the manifest).

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');
const manifest = read('android/app/src/main/AndroidManifest.xml').replace(/<!--[\s\S]*?-->/g, ''); // comments never count

function metaData(name: string): string | undefined {
  const re = new RegExp(`<meta-data\\s+android:name="${name}"\\s+android:value="([^"]*)"\\s*/>`);
  return re.exec(manifest)?.[1];
}

describe('AndroidManifest.xml: consent-first Firebase defaults', () => {
  const OFF = [
    'google_analytics_default_allow_analytics_storage',
    'google_analytics_default_allow_ad_storage',
    'google_analytics_default_allow_ad_user_data',
    'google_analytics_default_allow_ad_personalization_signals',
    'google_analytics_automatic_screen_reporting_enabled',
    'firebase_crashlytics_collection_enabled',
  ];

  for (const name of OFF) {
    it(`${name} is declared exactly once and is false`, () => {
      expect(metaData(name)).toBe('false');
      expect(manifest.split(`android:name="${name}"`)).toHaveLength(2);
    });
  }

  it('all six sit inside <application> (meta-data outside it is ignored by Firebase)', () => {
    const app = /<application\b[\s\S]*<\/application>/.exec(manifest)?.[0] ?? '';
    for (const name of OFF) expect(app).toContain(`android:name="${name}"`);
  });
});

// The wiring that makes the manifest defaults meaningful. Source guards in the style of src/platform/saves.test.ts.
describe('consent-first wiring (source guards)', () => {
  it('BootScene starts bootServices after Saves.hydrate() and never awaits it', () => {
    const boot = read('src/scenes/BootScene.ts');
    expect(boot).toMatch(/Saves\.hydrate\(\)\.then\(\(\) => bootServices\(\)\)/);
    expect(boot).not.toMatch(/await\s+bootServices/);
    expect(boot).not.toMatch(/Promise\.all\([^)]*bootServices/);
  });

  it('Ads.ts neither asks for consent nor initialises on its own', () => {
    const ads = read('src/services/Ads.ts').replace(/\/\/.*$/gm, '');
    expect(ads).not.toMatch(/requestConsentInfo|showConsentForm|showPrivacyOptionsForm/);
    // initialize() is called from exactly one place: the single-flight initSdk behind Ads.init(outcome).
    expect(ads.match(/\.initialize\(/g) ?? []).toHaveLength(1);
  });

  it('Ads.ts sends no child-directed or under-age tag (D-25)', () => {
    const ads = read('src/services/Ads.ts').replace(/\/\/.*$/gm, '');
    expect(ads).not.toMatch(/tagForChildDirectedTreatment|tagForUnderAgeOfConsent/);
    const consent = read('src/services/Consent.ts').replace(/\/\/.*$/gm, '');
    expect(consent).not.toMatch(/tagForChildDirectedTreatment|tagForUnderAgeOfConsent/);
  });

  it('Crash.ts changes collection only through enable() and disable()', () => {
    const crash = read('src/services/Crash.ts').replace(/\/\/.*$/gm, '');
    expect(crash.match(/\.setEnabled\(/g) ?? []).toHaveLength(1); // the type declaration of setEnabled has no leading dot
    expect(crash.match(/setCollection\(/g) ?? []).toHaveLength(3); // its definition, enable() and disable(): nothing else calls it
    expect(/enable\(\): void \{\s*setCollection\(true\);/.test(crash)).toBe(true);
    expect(/disable\(\): void \{\s*setCollection\(false\);/.test(crash)).toBe(true);
  });

  // The native half of the real consent answer (see consentState.ts: canRequestAds is also true after "Do not consent").
  it('the ConsentSignals plugin reads the TCF keys from the default SharedPreferences file and is registered before super.onCreate', () => {
    const plugin = read('android/app/src/main/java/com/truestorylabs/gravityflow/ConsentSignalsPlugin.java');
    expect(plugin).toContain('@CapacitorPlugin(name = "ConsentSignals")');
    expect(plugin).toContain('context.getPackageName() + DEFAULT_PREFS_SUFFIX');
    expect(plugin).toContain('DEFAULT_PREFS_SUFFIX = "_preferences"');
    expect(plugin).toContain('"IABTCF_gdprApplies"');
    expect(plugin).toContain('"IABTCF_PurposeConsents"');
    expect(plugin).not.toMatch(/\.edit\(\)|\.putString\(|\.putInt\(/); // read-only
    const main = read('android/app/src/main/java/com/truestorylabs/gravityflow/MainActivity.java');
    const register = main.indexOf('registerPlugin(ConsentSignalsPlugin.class)');
    expect(register).toBeGreaterThan(-1);
    expect(register).toBeLessThan(main.indexOf('super.onCreate(savedInstanceState)'));
  });

  it('the JS bridge name matches the native plugin name and the keys the pure mapping documents', () => {
    expect(read('src/services/native/consentSignals.ts')).toContain("registerPlugin<ConsentSignalsPlugin>('ConsentSignals')");
    expect(read('src/services/consentState.ts')).toMatch(/IABTCF_PurposeConsents/);
  });

  // The name is the claim: every consent API is reached from the files listed and nowhere else under src/ (tests excluded, comments
  // stripped). A new caller means a new decision, so it has to be added here on purpose.
  describe('only the allowed files touch the consent calls', () => {
    const srcRoot = fileURLToPath(new URL('../', import.meta.url));
    const sources = (readdirSync(srcRoot, { recursive: true }) as string[])
      .map((f) => f.replace(/\\/g, '/'))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
      .map((file) => ({
        file,
        code: readFileSync(join(srcRoot, file), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|\s)\/\/.*$/gm, '$1'),
      }));
    const filesUsing = (pattern: RegExp): string[] => sources.filter((s) => pattern.test(s.code)).map((s) => s.file).sort();

    const RULES: Array<{ what: string; pattern: RegExp; allowed: string[]; mustInclude: string }> = [
      { what: 'the UMP calls (requestConsentInfo, showConsentForm, showPrivacyOptionsForm)', pattern: /\b(requestConsentInfo|showConsentForm|showPrivacyOptionsForm)\b/, allowed: ['services/Consent.ts', 'services/native/admob.ts'], mustInclude: 'services/Consent.ts' },
      { what: 'the Firebase Consent Mode write (setConsent)', pattern: /\bsetConsent\b/, allowed: ['services/Analytics.ts', 'services/native/firebaseAnalytics.ts'], mustInclude: 'services/Analytics.ts' },
      { what: 'Analytics.applyConsent', pattern: /\bapplyConsent\b/, allowed: ['services/Analytics.ts', 'services/bootServices.ts'], mustInclude: 'services/bootServices.ts' },
      { what: 'the native TCF read (ConsentSignals / getTcf)', pattern: /\b(ConsentSignals|getTcf)\b/, allowed: ['services/Consent.ts', 'services/native/consentSignals.ts'], mustInclude: 'services/Consent.ts' },
      { what: 'openPrivacyChoices', pattern: /\bopenPrivacyChoices\b/, allowed: ['scenes/SettingsScene.ts', 'services/bootServices.ts'], mustInclude: 'scenes/SettingsScene.ts' },
      { what: 'Consent.resolve / Consent.showPrivacyOptions (the seam methods)', pattern: /\b[Cc]onsent\.(resolve|showPrivacyOptions)\b/, allowed: ['services/bootServices.ts'], mustInclude: 'services/bootServices.ts' },
      { what: 'importing the Consent seam', pattern: /from '[^']*\/Consent'/, allowed: ['scenes/SettingsScene.ts', 'services/bootServices.ts'], mustInclude: 'services/bootServices.ts' },
    ];

    for (const rule of RULES) {
      it(`${rule.what}: ${rule.allowed.join(', ')} only`, () => {
        const hits = filesUsing(rule.pattern);
        expect(hits).toContain(rule.mustInclude); // the scan is not vacuous
        expect(hits.filter((f) => !rule.allowed.includes(f))).toEqual([]);
      });
    }

    it('Settings reaches the consent flow only through openPrivacyChoices, and reads the answer with Consent.current() alone', () => {
      const settings = sources.find((s) => s.file === 'scenes/SettingsScene.ts')?.code ?? '';
      expect(settings).toMatch(/\bopenPrivacyChoices\(/);
      expect(settings).toMatch(/\bConsent\.current\(/);
      expect(settings).not.toMatch(/\bConsent\.(?!current\b)\w+/);
    });

    it('the scan sees the whole tree (a guard against an empty or mis-rooted readdir)', () => {
      expect(sources.length).toBeGreaterThan(50);
      expect(sources.some((s) => s.file === 'scenes/GameScene.ts')).toBe(true);
    });
  });
});
