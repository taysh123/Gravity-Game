import { describe, it, expect } from 'vitest';
import {
  sanitizeParams,
  levelStart,
  levelComplete,
  levelFail,
  dailyComplete,
  cosmeticEquip,
  purchase,
  sessionStart,
  dailyStart,
  achievementUnlocked,
  worldComplete,
  onboardingComplete,
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
  it('cosmeticEquip + purchase carry their id/product', () => {
    expect(cosmeticEquip('nebula').params).toEqual({ id: 'nebula' });
    expect(purchase('remove_ads').params).toEqual({ product: 'remove_ads' });
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
});
