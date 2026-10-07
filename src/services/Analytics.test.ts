import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// The package root pulls in the firebase JS SDK (a peer dependency the web bundle deliberately lacks), so the enums come from their file.
import { ConsentStatus, ConsentType } from '@capacitor-firebase/analytics/dist/esm/definitions';
import { CONSENT_DENIED, consentModeSettings, type ConsentOutcome } from './consentState';

// Analytics is a thin seam over the native Firebase Analytics plugin, loaded lazily behind the native guard. These tests pin the
// consent half (D-10): applyConsent sets exactly the four Consent Mode types from the outcome, never throws, and does nothing on
// the web; resetData forwards to resetAnalyticsData and tells the caller when it failed.

const GRANTED: ConsentOutcome = { canRequestAds: true, privacyOptionsRequired: false, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' };

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => setTimeout(r, 0));
};

async function load(native: boolean, overrides: Partial<Record<'setConsent' | 'resetAnalyticsData' | 'logEvent', (o?: unknown) => Promise<void>>> = {}) {
  vi.resetModules();
  const plugin = {
    setEnabled: vi.fn(async () => {}),
    logEvent: vi.fn(overrides.logEvent ?? (async () => {})),
    setConsent: vi.fn(overrides.setConsent ?? (async () => {})),
    setCurrentScreen: vi.fn(async () => {}),
    resetAnalyticsData: vi.fn(overrides.resetAnalyticsData ?? (async () => {})),
  };
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  vi.doMock('./native/firebaseAnalytics', () => ({ FirebaseAnalytics: plugin }));
  const { Analytics } = await import('./Analytics');
  return { Analytics, plugin };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@capacitor/core');
  vi.doUnmock('./native/firebaseAnalytics');
});

describe('consentModeSettings (pure)', () => {
  it('maps the four outcome fields to the four Firebase types, in a fixed order', () => {
    expect(consentModeSettings(GRANTED)).toEqual([
      { type: 'ANALYTICS_STORAGE', status: 'GRANTED' },
      { type: 'AD_STORAGE', status: 'GRANTED' },
      { type: 'AD_USER_DATA', status: 'GRANTED' },
      { type: 'AD_PERSONALIZATION', status: 'GRANTED' },
    ]);
    expect(consentModeSettings(CONSENT_DENIED).every((s) => s.status === 'DENIED')).toBe(true);
  });

  it('each type follows its own field', () => {
    const mixed: ConsentOutcome = { ...GRANTED, analytics: 'granted', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'granted' };
    expect(consentModeSettings(mixed)).toEqual([
      { type: 'ANALYTICS_STORAGE', status: 'GRANTED' },
      { type: 'AD_STORAGE', status: 'DENIED' },
      { type: 'AD_USER_DATA', status: 'DENIED' },
      { type: 'AD_PERSONALIZATION', status: 'GRANTED' },
    ]);
  });

  it('uses the exact strings of the real @capacitor-firebase/analytics enums (the Android plugin rejects anything else)', () => {
    const types = consentModeSettings(GRANTED).map((s) => s.type);
    expect(types).toEqual([ConsentType.AnalyticsStorage, ConsentType.AdStorage, ConsentType.AdUserData, ConsentType.AdPersonalization]);
    expect(consentModeSettings(GRANTED)[0].status).toBe(ConsentStatus.Granted);
    expect(consentModeSettings(CONSENT_DENIED)[0].status).toBe(ConsentStatus.Denied);
  });
});

describe('Analytics.applyConsent (native)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('sets all four types from the outcome', async () => {
    const { Analytics, plugin } = await load(true);
    await Analytics.applyConsent(GRANTED);
    expect(plugin.setConsent.mock.calls.map((c) => c[0])).toEqual([
      { type: 'ANALYTICS_STORAGE', status: 'GRANTED' },
      { type: 'AD_STORAGE', status: 'GRANTED' },
      { type: 'AD_USER_DATA', status: 'GRANTED' },
      { type: 'AD_PERSONALIZATION', status: 'GRANTED' },
    ]);
  });

  it('denied outcome: all four DENIED (a withdrawal is written through, not skipped)', async () => {
    const { Analytics, plugin } = await load(true);
    await Analytics.applyConsent(CONSENT_DENIED);
    expect(plugin.setConsent).toHaveBeenCalledTimes(4);
    expect(plugin.setConsent.mock.calls.every((c) => (c[0] as { status: string }).status === 'DENIED')).toBe(true);
  });

  it('one setConsent rejecting does not stop the others and applyConsent still resolves', async () => {
    let n = 0;
    const { Analytics, plugin } = await load(true, {
      setConsent: async () => {
        n += 1;
        if (n === 2) throw new Error('native failure');
      },
    });
    await expect(Analytics.applyConsent(GRANTED)).resolves.toBeUndefined();
    expect(plugin.setConsent).toHaveBeenCalledTimes(4);
  });

  it('the plugin failing to load resolves without throwing', async () => {
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
    vi.doMock('./native/firebaseAnalytics', () => {
      throw new Error('plugin unavailable');
    });
    const { Analytics } = await import('./Analytics');
    await expect(Analytics.applyConsent(GRANTED)).resolves.toBeUndefined();
  });

  it('leaves event tracking alone: track() still logs through the plugin', async () => {
    const { Analytics, plugin } = await load(true);
    Analytics.track({ name: 'level_start', params: { level: 1 } });
    await flush();
    expect(plugin.logEvent).toHaveBeenCalledWith({ name: 'level_start', params: { level: 1 } });
  });
});

describe('Analytics.resetData', () => {
  it('native: forwards to resetAnalyticsData once', async () => {
    const { Analytics, plugin } = await load(true);
    await Analytics.resetData();
    expect(plugin.resetAnalyticsData).toHaveBeenCalledTimes(1);
  });

  it('native: a native failure rejects, so the Settings row can say it failed', async () => {
    const { Analytics } = await load(true, {
      resetAnalyticsData: async () => {
        throw new Error('native failure');
      },
    });
    await expect(Analytics.resetData()).rejects.toThrow();
  });
});

describe('Analytics (web / non-native)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('applyConsent and resetData never touch the plugin and resolve', async () => {
    const { Analytics, plugin } = await load(false);
    await expect(Analytics.applyConsent(GRANTED)).resolves.toBeUndefined();
    await expect(Analytics.resetData()).resolves.toBeUndefined();
    await flush();
    expect(plugin.setConsent).not.toHaveBeenCalled();
    expect(plugin.resetAnalyticsData).not.toHaveBeenCalled();
  });
});
