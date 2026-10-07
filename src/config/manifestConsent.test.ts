import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// P00-T18 / D-10: the source half of V10. Firebase must start with every Consent Mode default denied, automatic screen reporting off
// and Crashlytics collection off, so that nothing is stored or sent before bootServices has the UMP outcome. The merged manifest
// (what Gradle really ships) is checked by hand per docs/roadmap/phases/P00-foundation.md V10; this pins the source it merges from.

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

  it('Crash.ts enables collection only inside enable()', () => {
    const crash = read('src/services/Crash.ts').replace(/\/\/.*$/gm, '');
    expect(crash.match(/\.setEnabled\(/g) ?? []).toHaveLength(1); // the type declaration of setEnabled has no leading dot
    expect(/enable\(\): void \{[\s\S]*?setEnabled\(\{ enabled: true \}\)/.test(crash)).toBe(true);
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

  it('only bootServices.ts, Settings and the Consent module touch the consent calls', () => {
    const settings = read('src/scenes/SettingsScene.ts');
    expect(settings).toMatch(/openPrivacyChoices/);
    expect(settings).not.toMatch(/showPrivacyOptionsForm|requestConsentInfo/); // it goes through bootServices.openPrivacyChoices
  });
});
