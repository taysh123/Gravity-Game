// Pure interstitial-eligibility gate (Wave 3 Task 1). No localStorage/Capacitor
// here — Ads.ts owns the impure glue (persisted cooldown, session counters,
// native gating) and resolves every field before calling in. Keeping this pure
// makes the retention rules directly testable without mocking storage/ads.
//
// Rules are evaluated most-protective-first, so exactly one reason is ever
// surfaced (and it's the strongest one that applies) — that reason feeds the
// `interstitial_suppressed` analytics event, making the cadence measurable.
import { INTERSTITIAL } from '../config/monetization.config';

export type InterstitialReason = 'ok' | 'premium' | 'capped' | 'grace' | 'flow';

export interface InterstitialDecision {
  show: boolean;
  reason: InterstitialReason;
}

export interface InterstitialContext {
  now: number;
  lastShownMs: number; // 0 = never shown (fresh install / first session)
  isPremium: boolean;
  sessionLevels: number; // campaign levels completed so far this session
  sessionElapsedMs: number; // ms since this session started
  flowProtected: boolean; // the just-finished win was a boss / 3★ / hot streak
}

export function interstitialDecision(ctx: InterstitialContext): InterstitialDecision {
  if (ctx.isPremium) return { show: false, reason: 'premium' };
  if (ctx.sessionLevels < INTERSTITIAL.GRACE_LEVELS || ctx.sessionElapsedMs < INTERSTITIAL.GRACE_MS) {
    return { show: false, reason: 'grace' };
  }
  if (ctx.flowProtected) return { show: false, reason: 'flow' };
  if (ctx.now - ctx.lastShownMs < INTERSTITIAL.MIN_GAP_MS) return { show: false, reason: 'capped' };
  return { show: true, reason: 'ok' };
}
