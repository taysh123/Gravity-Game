// The one ordered boot function for everything that talks to a third party (D-10; TECHNICAL-ARCHITECTURE 5.1). BootScene starts it
// after Saves.hydrate() and does NOT await it: the menu never waits on consent, a network round trip or a native form.
//
//   1. Consent.resolve()           UMP: requestConsentInfo, the form when REQUIRED  (nothing was requested or logged before this)
//   2. Analytics.applyConsent(o)   the four Firebase Consent Mode types from the outcome (the manifest defaults them all to denied)
//   3. Crash.enable()              D-10.5: collection on once consent has resolved, in EVERY outcome (legal check = STATUS gate).
//                                  With CRASH_REQUIRES_ANALYTICS_CONSENT on: enable() only when analytics_storage is granted, else disable().
//   4. Ads.init(o)                 only when canRequestAds, with maxAdContentRating ParentalGuidance and no age tags (A-07, D-25)
//
// Crashlytics PERSISTS its last setEnabled value (and it overrides the manifest), so from the second launch collection is already
// on at process start, before step 1 answers; the call in step 3 sets the value the NEXT launch starts with. That is why the
// off-switch (disable) exists and why it is also sent when this session never enabled anything.
//
// Crash.enable() / disable() are synchronous fire-and-forget calls and sit before the ad SDK on purpose: crash reporting must not
// depend on, or wait for, the ad SDK. Every step is isolated: a failure anywhere degrades (consent errors become "all denied") and
// never throws out of this function. IAP has its own init in main.ts and is not consent-gated (a purchase is not an ad).
import { CONSENT, CRASH_REQUIRES_ANALYTICS_CONSENT } from '../config/consent.config';
import { Ads } from './Ads';
import { Analytics } from './Analytics';
import { Consent, type ConsentSeam } from './Consent';
import { CONSENT_DENIED, type ConsentOutcome } from './consentState';
import { Crash } from './Crash';

export interface BootDeps {
  consent: Pick<ConsentSeam, 'resolve' | 'showPrivacyOptions'>;
  analytics: { applyConsent(outcome: ConsentOutcome): Promise<void> };
  ads: { init(outcome: ConsentOutcome): Promise<void>; revoke(): void };
  crash: { enable(): void; disable(): void; log(message: string): void };
  // CRASH_REQUIRES_ANALYTICS_CONSENT (config), injected so both values are testable. false = D-10.5 default: enable in every outcome.
  crashRequiresAnalyticsConsent: boolean;
}

function defaultDeps(): BootDeps {
  return { consent: Consent, analytics: Analytics, ads: Ads, crash: Crash, crashRequiresAnalyticsConsent: CRASH_REQUIRES_ANALYTICS_CONSENT };
}

// Crashlytics collection for an outcome. Never throws.
function applyCrashCollection(deps: BootDeps, outcome: ConsentOutcome): void {
  try {
    if (!deps.crashRequiresAnalyticsConsent || outcome.analytics === 'granted') deps.crash.enable();
    else deps.crash.disable();
  } catch {
    // reporting must never break boot or the Settings row
  }
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
  applyCrashCollection(deps, outcome);
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

let privacyFlight: Promise<ConsentOutcome> | null = null;
// Counts the flows started. A flow is superseded once a newer one has started (its number is no longer the latest).
let privacyFlowSeq = 0;

// Settings > "Privacy choices": the UMP privacy options form, then the new answer is applied exactly like at boot. A withdrawal
// denies analytics and closes the ad gate (the SDK stays up for the session but nothing more is requested or shown); a grant
// reopens it. Never throws.
//
// Single-flight: closing and re-opening Settings mid-flow must not start a second flow (two forms, two unserialised applyConsent
// writes), so a call made while one is running returns that same promise. The flow never waits on the ad SDK (see runPrivacyChoices),
// so it ends when the native form does.
//
// Bounded by CONSENT.FORM_WATCHDOG_MS (the budget Consent.ts gives a native sheet). A form that never settles must not hand the same
// pending promise to every later tap for the rest of the session, so the slot is released when the flow settles OR when that budget
// has passed since it started, whichever comes first. Rule (pure, deterministic, pinned in bootServices.test.ts):
//   - release by timeout leaves one fixed-string breadcrumb through deps.crash.log (the step, never an error text);
//   - the released flow is NOT cancelled: if its form answers later, its answer is applied only if no newer flow has started
//     (a superseded flow changes nothing), and it never frees a newer flow's slot;
//   - the timer is cleared the moment the flow settles, so none is left behind.
export function openPrivacyChoices(deps: BootDeps = defaultDeps()): Promise<ConsentOutcome> {
  if (privacyFlight) return privacyFlight;
  const id = ++privacyFlowSeq;
  const superseded = (): boolean => id !== privacyFlowSeq;
  const watchdog = setTimeout(() => {
    if (privacyFlight !== flight) return; // already settled or already released
    privacyFlight = null;
    try {
      deps.crash.log('privacy choices: native form still pending, single-flight released');
    } catch {
      // a breadcrumb must never break the Settings row
    }
  }, CONSENT.FORM_WATCHDOG_MS);
  const flight: Promise<ConsentOutcome> = runPrivacyChoices(deps, superseded).finally(() => {
    clearTimeout(watchdog);
    if (privacyFlight === flight) privacyFlight = null; // never frees a newer flow's slot
  });
  privacyFlight = flight;
  return flight;
}

async function runPrivacyChoices(deps: BootDeps, superseded: () => boolean): Promise<ConsentOutcome> {
  let outcome: ConsentOutcome;
  try {
    outcome = await deps.consent.showPrivacyOptions();
  } catch {
    outcome = { ...CONSENT_DENIED };
  }
  if (superseded()) return outcome; // released by the watchdog and a newer flow has started: that flow owns the state now
  try {
    await deps.analytics.applyConsent(outcome);
  } catch {
    // analytics must never break the Settings row
  }
  if (superseded()) return outcome;
  // Only the opt-in flag touches Crashlytics here: with it off (D-10.5 default) the boot-time enable() stands and nothing changes.
  if (deps.crashRequiresAnalyticsConsent) applyCrashCollection(deps, outcome);
  try {
    if (outcome.canRequestAds) {
      // Fire and forget: AdMob.initialize can hang, and the Settings gate (SettingsScene) is held until this flow returns. A failure
      // leaves a breadcrumb that names the step, never the error text.
      void (async () => {
        try {
          await deps.ads.init(outcome);
        } catch {
          try {
            deps.crash.log('privacy choices: Ads.init failed');
          } catch {
            // a breadcrumb must never become an unhandled rejection
          }
        }
      })();
    } else deps.ads.revoke();
  } catch {
    // ads stay as they were
  }
  return outcome;
}
