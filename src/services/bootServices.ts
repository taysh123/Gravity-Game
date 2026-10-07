// The one ordered boot function for everything that talks to a third party (D-10; TECHNICAL-ARCHITECTURE 5.1). BootScene starts it
// after Saves.hydrate() and does NOT await it: the menu never waits on consent, a network round trip or a native form.
//
//   1. Consent.resolve()           UMP: requestConsentInfo, the form when REQUIRED  (nothing was requested or logged before this)
//   2. Analytics.applyConsent(o)   the four Firebase Consent Mode types from the outcome (the manifest defaults them all to denied)
//   3. Crash.enable()              D-10.5: collection on once consent has resolved, in EVERY outcome (legal check = STATUS gate)
//   4. Ads.init(o)                 only when canRequestAds, with maxAdContentRating ParentalGuidance and no age tags (A-07, D-25)
//
// Crash.enable() is a synchronous fire-and-forget call and sits before the ad SDK on purpose: crash reporting must not depend on,
// or wait for, the ad SDK. Every step is isolated: a failure anywhere degrades (consent errors become "all denied") and never
// throws out of this function. IAP has its own init in main.ts and is not consent-gated (a purchase is not an ad).
import { Ads } from './Ads';
import { Analytics } from './Analytics';
import { Consent, type ConsentSeam } from './Consent';
import { CONSENT_DENIED, type ConsentOutcome } from './consentState';
import { Crash } from './Crash';

export interface BootDeps {
  consent: Pick<ConsentSeam, 'resolve' | 'showPrivacyOptions'>;
  analytics: { applyConsent(outcome: ConsentOutcome): Promise<void> };
  ads: { init(outcome: ConsentOutcome): Promise<void>; revoke(): void };
  crash: { enable(): void };
}

function defaultDeps(): BootDeps {
  return { consent: Consent, analytics: Analytics, ads: Ads, crash: Crash };
}

let started: Promise<ConsentOutcome> | null = null;

async function run(deps: BootDeps): Promise<ConsentOutcome> {
  let outcome: ConsentOutcome;
  try {
    outcome = await deps.consent.resolve();
  } catch {
    outcome = { ...CONSENT_DENIED }; // Consent.resolve never throws, but a fake or a future change must not break the order
  }
  try {
    await deps.analytics.applyConsent(outcome);
  } catch {
    // analytics must never break boot
  }
  try {
    deps.crash.enable();
  } catch {
    // reporting must never break boot
  }
  if (outcome.canRequestAds) {
    try {
      await deps.ads.init(outcome);
    } catch {
      // ads stay not ready; gameplay never depends on them
    }
  }
  return outcome;
}

// Runs once per app load when called without arguments (BootScene). Tests pass their own dependencies and get a fresh run.
export function bootServices(deps?: BootDeps): Promise<ConsentOutcome> {
  if (deps) return run(deps);
  if (!started) started = run(defaultDeps());
  return started;
}

// Settings > "Privacy choices": the UMP privacy options form, then the new answer is applied exactly like at boot. A withdrawal
// denies analytics and closes the ad gate (the SDK stays up for the session but nothing more is requested or shown); a grant
// reopens it. Never throws.
export async function openPrivacyChoices(deps: BootDeps = defaultDeps()): Promise<ConsentOutcome> {
  let outcome: ConsentOutcome;
  try {
    outcome = await deps.consent.showPrivacyOptions();
  } catch {
    outcome = { ...CONSENT_DENIED };
  }
  try {
    await deps.analytics.applyConsent(outcome);
  } catch {
    // analytics must never break the Settings row
  }
  try {
    if (outcome.canRequestAds) await deps.ads.init(outcome);
    else deps.ads.revoke();
  } catch {
    // ads stay as they were
  }
  return outcome;
}
