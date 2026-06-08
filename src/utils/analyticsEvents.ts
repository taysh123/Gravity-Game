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

// --- Economy / shop -------------------------------------------------------
export const shopOpen = (): AnalyticsEvent => ({ name: 'shop_open', params: {} });
export const cosmeticEquip = (id: string): AnalyticsEvent => ({ name: 'cosmetic_equip', params: sanitizeParams({ id }) });
export const purchase = (product: string): AnalyticsEvent => ({ name: 'purchase', params: sanitizeParams({ product }) });
export const restore = (): AnalyticsEvent => ({ name: 'restore', params: {} });

// --- Ads ------------------------------------------------------------------
export const rewardedShown = (): AnalyticsEvent => ({ name: 'rewarded_shown', params: {} });
export const rewardedEarned = (): AnalyticsEvent => ({ name: 'rewarded_earned', params: {} });
export const interstitialShown = (): AnalyticsEvent => ({ name: 'interstitial_shown', params: {} });
