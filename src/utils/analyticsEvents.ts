// Pure analytics event taxonomy (no Capacitor/Firebase) so it's testable and the
// event shapes stay consistent. The Analytics seam (Analytics.ts) sends these to
// Firebase on native and console-logs them in web dev. Names/keys are snake_case
// and string values are truncated to Firebase's 100-char limit.
export interface AnalyticsEvent {
  name: string;
  params: Record<string, string | number>;
}

const MAX_STR = 100;

export function sanitizeParams(params: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'number' ? v : String(v).slice(0, MAX_STR);
  }
  return out;
}

// --- Funnel ---------------------------------------------------------------
export const levelStart = (level: number, world: number): AnalyticsEvent => ({
  name: 'level_start',
  params: { level, world },
});
export const levelComplete = (level: number, stars: number, timeMs: number): AnalyticsEvent => ({
  name: 'level_complete',
  params: { level, stars, time_ms: Math.round(timeMs) },
});
export const levelFail = (level: number, cause: string): AnalyticsEvent => ({
  name: 'level_fail',
  params: sanitizeParams({ level, cause }),
});
export const retry = (level: number): AnalyticsEvent => ({ name: 'retry', params: { level } });
export const worldStart = (world: number): AnalyticsEvent => ({ name: 'world_start', params: { world } });
export const dailyComplete = (streak: number): AnalyticsEvent => ({ name: 'daily_complete', params: { streak } });

// --- Retention funnel -----------------------------------------------------
export const sessionStart = (): AnalyticsEvent => ({ name: 'session_start', params: {} });
export const dailyStart = (index: number, modifier: string): AnalyticsEvent => ({
  name: 'daily_start',
  params: sanitizeParams({ index, modifier }),
});
export const worldComplete = (world: number): AnalyticsEvent => ({ name: 'world_complete', params: { world } });
export const achievementUnlocked = (id: string): AnalyticsEvent => ({ name: 'achievement_unlocked', params: sanitizeParams({ id }) });
// FTUE: fires once, the moment the first-ever campaign win beat is shown.
export const onboardingComplete = (): AnalyticsEvent => ({ name: 'onboarding_complete', params: {} });
// Win-streak momentum (consecutive campaign wins) — fired at each milestone count.
export const winStreak = (count: number): AnalyticsEvent => ({ name: 'win_streak', params: { count } });
// Fired when a live win-streak is broken by a death (never a manual restart).
export const streakBroken = (count: number): AnalyticsEvent => ({ name: 'streak_broken', params: { count } });
// Wave 2b Task 5 — comeback hooks: the daily login bonus (chest claim, carries
// the consecutive-login day) and streak protection (a held freeze token
// forgave a missed day, carries the streak it preserved).
export const loginBonus = (day: number): AnalyticsEvent => ({ name: 'login_bonus', params: { day } });
export const streakFrozen = (streak: number): AnalyticsEvent => ({ name: 'streak_frozen', params: { streak } });

// --- Economy / shop -------------------------------------------------------
// Wave 3 Task 3: the old `purchase` event fired at *attempt* — the first
// statement in IAP.buyRemoveAds/buyBundle, before the native dialog even opens
// — so it measured buy-button taps, not revenue. Replaced by a real lifecycle:
// purchaseInitiated (attempt) -> purchaseCompleted (gated on the real result) /
// purchaseFailed (cancel/throw/no-package, carries a reason). firstPurchase
// fires once, on the first-ever completion (persisted flag lives in IAP.ts).
// shopOpen now carries which tab the store opened on; storeTab fires on tab
// switches — the Bundles-tab switch is the strongest IAP-intent signal.
export const shopOpen = (tab: string): AnalyticsEvent => ({ name: 'shop_open', params: sanitizeParams({ tab }) });
export const storeTab = (tab: string): AnalyticsEvent => ({ name: 'store_tab', params: sanitizeParams({ tab }) });
// Wave 3 Task 4: the win-overlay spend nudge — shown fires every time the honest,
// cooldown-gated line renders (GameScene.showWinOverlay); tapped fires on its CTA.
export const storeNudgeShown = (): AnalyticsEvent => ({ name: 'store_nudge_shown', params: {} });
export const storeNudgeTapped = (): AnalyticsEvent => ({ name: 'store_nudge_tapped', params: {} });
export const cosmeticEquip = (id: string): AnalyticsEvent => ({ name: 'cosmetic_equip', params: sanitizeParams({ id }) });
export const purchaseInitiated = (product: string): AnalyticsEvent => ({ name: 'purchase_initiated', params: sanitizeParams({ product }) });
export const purchaseCompleted = (product: string): AnalyticsEvent => ({ name: 'purchase_completed', params: sanitizeParams({ product }) });
export const purchaseFailed = (product: string, reason: string): AnalyticsEvent => ({ name: 'purchase_failed', params: sanitizeParams({ product, reason }) });
export const firstPurchase = (product: string): AnalyticsEvent => ({ name: 'first_purchase', params: sanitizeParams({ product }) });
export const restore = (): AnalyticsEvent => ({ name: 'restore', params: {} });

// --- Ads ------------------------------------------------------------------
// `source` identifies which of the 4 opt-in rewarded surfaces fired the event
// (e.g. 'campaign_2x', 'endless_2x', 'endless_revive', 'free_fragments') so the
// previously-indistinguishable shown/earned events are attributable per-surface,
// and rewardedOffered (fired once when the offer button renders, not on tap)
// makes the offer → shown → earned funnel measurable.
export const rewardedShown = (source: string): AnalyticsEvent => ({ name: 'rewarded_shown', params: sanitizeParams({ source }) });
export const rewardedEarned = (source: string): AnalyticsEvent => ({ name: 'rewarded_earned', params: sanitizeParams({ source }) });
export const rewardedOffered = (source: string): AnalyticsEvent => ({ name: 'rewarded_offered', params: sanitizeParams({ source }) });
export const interstitialShown = (): AnalyticsEvent => ({ name: 'interstitial_shown', params: {} });
// Fired on every early-return from the interstitial gate (premium/grace/flow/capped)
// so the retention-first cadence is measurable, not just assumed.
export const interstitialSuppressed = (reason: string): AnalyticsEvent => ({
  name: 'interstitial_suppressed',
  params: sanitizeParams({ reason }),
});

// --- Rewarded loops -------------------------------------------------------
export const fragmentEarned = (amount: number, source: string): AnalyticsEvent => ({ name: 'fragment_earned', params: sanitizeParams({ amount, source }) });
export const hintUsed = (level: number): AnalyticsEvent => ({ name: 'hint_used', params: { level } });
export const rewardDoubleStardust = (amount: number): AnalyticsEvent => ({ name: 'reward_double_stardust', params: { amount } });
export const collectionComplete = (collection: string): AnalyticsEvent => ({ name: 'collection_complete', params: sanitizeParams({ collection }) });
