// UMP consent seam (D-10; TECHNICAL-ARCHITECTURE 4.3, data flow 5.1). Native only: the AdMob plugin is loaded by a dynamic import()
// inside the native guard, so the web bundle never loads it and a web boot resolves straight to "all denied" (there is no consent
// layer to ask).
//
//   resolve():  requestConsentInfo({ debugGeography?, testDeviceIdentifiers? }) -> showConsentForm() only when status is REQUIRED
//               -> ConsentOutcome (the pure mapping is consentState.ts). When the player has answered (OBTAINED) the answer itself
//               is read natively (IABTCF_PurposeConsents, the ConsentSignals plugin): UMP's canRequestAds is also true after
//               "Do not consent" (limited ads), so it cannot say whether analytics may be granted.
//   showPrivacyOptions(): showPrivacyOptionsForm(), then a fresh requestConsentInfo so a withdrawal is seen at once.
//
// Consent is never cached by the app (Google guidance): every launch asks again, and current() is only the last answer of this
// session. Nothing here throws: any failure (plugin missing, network, no form configured) is "all denied". Both forms raise the
// external-flow flag (src/platform/externalFlow.ts) for their duration and clear it in `finally`, because Android pauses the
// Activity while a native sheet is up and that must not open the game's Pause overlay.
//
// The AdMob plugin object is a thenable Capacitor proxy: it is only ever held in a variable and called, never returned from an
// async function (loadAdMob resolves the module namespace, which holds it as a property).
import { Capacitor } from '@capacitor/core';
import { CONSENT, UMP_DEBUG } from '../config/consent.config';
import { setExternalFlowActive } from '../platform/externalFlow';
import { CONSENT_DENIED, outcomeFromUmp, type ConsentOutcome, type TcfSignals } from './consentState';
import type { AdMobConsentInfo, AdMobConsentRequestOptions, AdMobPlugin } from './native/admob';

export type { ConsentOutcome } from './consentState';

export type ConsentApi = Pick<AdMobPlugin, 'requestConsentInfo' | 'showConsentForm' | 'showPrivacyOptionsForm'>;

export interface ConsentDeps {
  native: boolean;
  loadAdMob(): Promise<{ AdMob: ConsentApi }>;
  // The player's per-purpose answer as UMP stored it (null = could not be read). Only asked for when the status is OBTAINED.
  readTcf(): Promise<TcfSignals | null>;
  // Debug-only overrides (VITE_UMP_DEBUG_GEOGRAPHY / VITE_UMP_TEST_DEVICE_IDS). Empty in a normal build.
  debug: { readonly geography: number | undefined; readonly testDeviceIds: readonly string[] };
  setExternalFlow(active: boolean, source: string): void;
}

export interface ConsentSeam {
  resolve(): Promise<ConsentOutcome>;
  showPrivacyOptions(): Promise<ConsentOutcome>;
  current(): ConsentOutcome | null;
}

export function createConsent(deps: ConsentDeps): ConsentSeam {
  let current: ConsentOutcome | null = null;

  function requestOptions(): AdMobConsentRequestOptions {
    // Only the debug values, and only when set. Never tagForUnderAgeOfConsent (D-25: 13+, no age tags).
    const options: AdMobConsentRequestOptions = {};
    if (deps.debug.geography !== undefined) options.debugGeography = deps.debug.geography;
    if (deps.debug.testDeviceIds.length > 0) options.testDeviceIdentifiers = [...deps.debug.testDeviceIds];
    return options;
  }

  // Runs one native sheet with the external-flow flag up, and clears it however the sheet ends.
  async function inSheet<T>(show: () => Promise<T>): Promise<T> {
    deps.setExternalFlow(true, CONSENT.EXTERNAL_FLOW_SOURCE);
    try {
      return await show();
    } finally {
      deps.setExternalFlow(false, CONSENT.EXTERNAL_FLOW_SOURCE);
    }
  }

  function remember(outcome: ConsentOutcome): ConsentOutcome {
    current = outcome;
    return outcome;
  }

  // The outcome for an answered UMP info: an OBTAINED answer is refined by what the player really chose. A failed read is
  // "cannot verify" (null), which the mapping treats as nothing granted.
  async function outcomeOf(info: AdMobConsentInfo | null): Promise<ConsentOutcome> {
    if (info?.status !== 'OBTAINED') return outcomeFromUmp(info);
    let tcf: TcfSignals | null = null;
    try {
      tcf = await deps.readTcf();
    } catch {
      tcf = null;
    }
    return outcomeFromUmp(info, tcf);
  }

  return {
    async resolve(): Promise<ConsentOutcome> {
      if (!deps.native) return remember({ ...CONSENT_DENIED });
      let info: AdMobConsentInfo | null = null;
      try {
        const { AdMob } = await deps.loadAdMob();
        info = await AdMob.requestConsentInfo(requestOptions());
        if (info.status === 'REQUIRED') {
          try {
            // The plugin answers with status / canRequestAds / privacyOptionsRequirementStatus (no isConsentFormAvailable).
            const answered = await inSheet(() => AdMob.showConsentForm());
            info = { ...info, ...answered };
          } catch {
            // The form did not complete (none configured, dismissed by the system): stays REQUIRED, which maps to all denied.
          }
        }
      } catch {
        // Plugin missing or the request failed: info is whatever we have, null maps to all denied.
      }
      return remember(await outcomeOf(info));
    },

    async showPrivacyOptions(): Promise<ConsentOutcome> {
      if (!deps.native) return remember({ ...CONSENT_DENIED });
      const before = current;
      let info: AdMobConsentInfo | null = null;
      try {
        const { AdMob } = await deps.loadAdMob();
        try {
          await inSheet(() => AdMob.showPrivacyOptionsForm());
        } catch {
          // The sheet failed to show: nothing changed, but the answer is re-read below anyway.
        }
        // A fresh read, never a second consent form right after the options form.
        info = await AdMob.requestConsentInfo(requestOptions());
      } catch {
        // Could not re-read: deny (a withdrawal must never be missed) but keep the row so the player can try again.
        return remember({ ...CONSENT_DENIED, privacyOptionsRequired: before?.privacyOptionsRequired ?? false });
      }
      return remember(await outcomeOf(info));
    },

    current: () => current,
  };
}

export const Consent: ConsentSeam = createConsent({
  native: Capacitor.isNativePlatform(),
  loadAdMob: () => import('./native/admob'),
  readTcf: async () => {
    const m = await import('./native/consentSignals');
    const r = await m.ConsentSignals.getTcf(); // a method CALL on the plugin proxy is a real promise
    // The native side answers -1 when IABTCF_gdprApplies is not stored.
    return { gdprApplies: typeof r.gdprApplies === 'number' && r.gdprApplies >= 0 ? r.gdprApplies : null, purposeConsents: typeof r.purposeConsents === 'string' ? r.purposeConsents : '' };
  },
  debug: UMP_DEBUG,
  setExternalFlow: setExternalFlowActive,
});
