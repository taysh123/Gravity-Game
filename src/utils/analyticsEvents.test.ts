import { describe, it, expect } from 'vitest';
import {
  sanitizeParams,
  levelStart,
  levelComplete,
  levelFail,
  dailyComplete,
  cosmeticEquip,
  sessionStart,
  dailyStart,
  achievementUnlocked,
  worldComplete,
  onboardingComplete,
  winStreak,
  streakBroken,
  loginBonus,
  streakFrozen,
  interstitialSuppressed,
  rewardedShown,
  rewardedEarned,
  rewardedOffered,
  shopOpen,
  storeTab,
  purchaseInitiated,
  purchaseCompleted,
  purchaseFailed,
  firstPurchase,
} from './analyticsEvents';

describe('sanitizeParams', () => {
  it('keeps numbers, stringifies+truncates strings, drops null/undefined', () => {
    const long = 'x'.repeat(200);
    const out = sanitizeParams({ a: 5, b: long, c: null, d: undefined, e: true });
    expect(out.a).toBe(5);
    expect((out.b as string).length).toBe(100);
    expect('c' in out).toBe(false);
    expect('d' in out).toBe(false);
    expect(out.e).toBe('true');
  });
});

describe('event creators', () => {
  it('levelStart carries level + world', () => {
    expect(levelStart(5, 1)).toEqual({ name: 'level_start', params: { level: 5, world: 1 } });
  });
  it('levelComplete rounds time and uses snake_case params', () => {
    const e = levelComplete(3, 2, 4200.7);
    expect(e.name).toBe('level_complete');
    expect(e.params).toEqual({ level: 3, stars: 2, time_ms: 4201 });
  });
  it('levelFail records the cause', () => {
    expect(levelFail(7, 'timeout')).toEqual({ name: 'level_fail', params: { level: 7, cause: 'timeout' } });
  });
  it('dailyComplete carries the streak', () => {
    expect(dailyComplete(4).params).toEqual({ streak: 4 });
  });
  it('cosmeticEquip carries the id', () => {
    expect(cosmeticEquip('nebula').params).toEqual({ id: 'nebula' });
  });
  it('shopOpen sanitizes the tab', () => {
    expect(shopOpen('bundle')).toEqual({ name: 'shop_open', params: { tab: 'bundle' } });
  });
  it('storeTab sanitizes the tab', () => {
    expect(storeTab('bundle')).toEqual({ name: 'store_tab', params: { tab: 'bundle' } });
  });
  it('purchaseInitiated sanitizes the product', () => {
    expect(purchaseInitiated('remove_ads')).toEqual({ name: 'purchase_initiated', params: { product: 'remove_ads' } });
  });
  it('purchaseCompleted sanitizes the product', () => {
    expect(purchaseCompleted('starter_pack')).toEqual({ name: 'purchase_completed', params: { product: 'starter_pack' } });
  });
  it('purchaseFailed sanitizes the product + reason', () => {
    expect(purchaseFailed('remove_ads', 'cancelled_or_failed')).toEqual({
      name: 'purchase_failed',
      params: { product: 'remove_ads', reason: 'cancelled_or_failed' },
    });
  });
  it('firstPurchase sanitizes the product', () => {
    expect(firstPurchase('remove_ads')).toEqual({ name: 'first_purchase', params: { product: 'remove_ads' } });
  });
  it('sessionStart carries no params', () => {
    expect(sessionStart()).toEqual({ name: 'session_start', params: {} });
  });
  it('dailyStart sanitizes the modifier string', () => {
    expect(dailyStart(2, 'gemRush')).toEqual({ name: 'daily_start', params: { index: 2, modifier: 'gemRush' } });
  });
  it('achievementUnlocked sanitizes the id', () => {
    expect(achievementUnlocked('first_win')).toEqual({ name: 'achievement_unlocked', params: { id: 'first_win' } });
  });
  it('worldComplete carries the world number', () => {
    expect(worldComplete(3)).toEqual({ name: 'world_complete', params: { world: 3 } });
  });
  it('onboardingComplete carries no params', () => {
    expect(onboardingComplete()).toEqual({ name: 'onboarding_complete', params: {} });
  });
  it('winStreak carries the streak count', () => {
    expect(winStreak(5)).toEqual({ name: 'win_streak', params: { count: 5 } });
  });
  it('streakBroken carries the prior streak count', () => {
    expect(streakBroken(4)).toEqual({ name: 'streak_broken', params: { count: 4 } });
  });
  it('loginBonus carries the consecutive-login day', () => {
    expect(loginBonus(3)).toEqual({ name: 'login_bonus', params: { day: 3 } });
  });
  it('streakFrozen carries the streak count the freeze preserved', () => {
    expect(streakFrozen(6)).toEqual({ name: 'streak_frozen', params: { streak: 6 } });
  });
  it('interstitialSuppressed sanitizes the reason', () => {
    expect(interstitialSuppressed('grace')).toEqual({ name: 'interstitial_suppressed', params: { reason: 'grace' } });
  });
  it('rewardedShown sanitizes the surface source', () => {
    expect(rewardedShown('campaign_2x')).toEqual({ name: 'rewarded_shown', params: { source: 'campaign_2x' } });
  });
  it('rewardedEarned sanitizes the surface source', () => {
    expect(rewardedEarned('endless_revive')).toEqual({ name: 'rewarded_earned', params: { source: 'endless_revive' } });
  });
  it('rewardedOffered sanitizes the surface source', () => {
    expect(rewardedOffered('free_fragments')).toEqual({ name: 'rewarded_offered', params: { source: 'free_fragments' } });
  });
});
