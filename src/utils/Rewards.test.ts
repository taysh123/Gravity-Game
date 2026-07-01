// TDD for Wave 2b Task 4: claimMilestoneRewards / claimCollectionRewards now
// RETURN what they claimed (instead of void) so GameScene can celebrate it —
// same RewardStore.claimedEver gate, same FragmentStore grant; only the
// return value is new. Idempotency (no double-grant on replay) is the
// correctness risk this suite guards.
//
// Store deps are mocked with a small in-memory claimed-set this test fully
// controls, rather than relying on the real localStorage-backed stores —
// this repo's Vitest env is 'node' (no real localStorage; see fx.test.ts for
// the same reasoning applied to the `phaser` import), and the real stores
// expose no reset hook, which would make idempotency tests order-dependent.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const claimed = new Set<string>();
vi.mock('./RewardStore', () => ({
  RewardStore: {
    claimedEver: (key: string) => claimed.has(key),
    claim: (key: string) => { claimed.add(key); },
    claimedToday: () => false,
  },
}));

const fragmentAdd = vi.fn();
vi.mock('./FragmentStore', () => ({
  FragmentStore: { add: (n: number) => fragmentAdd(n) },
}));

const analyticsTrack = vi.fn();
vi.mock('./Analytics', () => ({
  Analytics: { track: (e: unknown) => analyticsTrack(e) },
}));

// collectionComplete is normally driven by the real cosmetics catalog via
// CosmeticStore.ownedIds() — mocked directly so the test controls which
// collection(s) are "complete" without coupling to the current catalog data.
let completeIds: string[] = [];
vi.mock('./cosmeticsLogic', () => ({
  collectionComplete: (_owned: string[], cid: string) => completeIds.includes(cid),
}));
vi.mock('./CosmeticStore', () => ({
  CosmeticStore: { ownedIds: () => [] },
}));

import { claimMilestoneRewards, claimCollectionRewards } from './Rewards';

describe('claimMilestoneRewards', () => {
  beforeEach(() => {
    claimed.clear();
    fragmentAdd.mockClear();
    analyticsTrack.mockClear();
  });

  it('returns the milestone on the first call that crosses its threshold, and grants its Fragments', () => {
    const result = claimMilestoneRewards(30);
    expect(result).toEqual({ stars: 30, fr: 10 });
    expect(fragmentAdd).toHaveBeenCalledWith(10);
    expect(claimed.has('stars:30')).toBe(true);
  });

  it('returns null on re-call once already claimed (idempotent — no re-grant)', () => {
    expect(claimMilestoneRewards(30)).toEqual({ stars: 30, fr: 10 }); // first cross
    fragmentAdd.mockClear();
    const replay = claimMilestoneRewards(30); // same totalStars again (e.g. scene.restart replay)
    expect(replay).toBeNull();
    expect(fragmentAdd).not.toHaveBeenCalled();
  });

  it('returns null and grants nothing below the first threshold', () => {
    expect(claimMilestoneRewards(10)).toBeNull();
    expect(fragmentAdd).not.toHaveBeenCalled();
  });

  it('returns the HIGHEST milestone when several cross in one call, but still grants every one', () => {
    const result = claimMilestoneRewards(150); // crosses 30, 60, 100, 150 all at once
    expect(result).toEqual({ stars: 150, fr: 40 });
    expect(fragmentAdd).toHaveBeenCalledTimes(4);
    expect(fragmentAdd).toHaveBeenCalledWith(10);
    expect(fragmentAdd).toHaveBeenCalledWith(15);
    expect(fragmentAdd).toHaveBeenCalledWith(25);
    expect(fragmentAdd).toHaveBeenCalledWith(40);
    expect(claimed.has('stars:30')).toBe(true);
    expect(claimed.has('stars:150')).toBe(true);
  });

  it('only the newly-crossed milestone is granted on a later call past another threshold', () => {
    claimMilestoneRewards(30); // claims 30
    fragmentAdd.mockClear();
    const result = claimMilestoneRewards(60); // now crosses 60 only
    expect(result).toEqual({ stars: 60, fr: 15 });
    expect(fragmentAdd).toHaveBeenCalledTimes(1);
    expect(fragmentAdd).toHaveBeenCalledWith(15);
  });
});

describe('claimCollectionRewards', () => {
  beforeEach(() => {
    claimed.clear();
    fragmentAdd.mockClear();
    analyticsTrack.mockClear();
    completeIds = [];
  });

  it('returns a newly-completed collection id once, then [] on replay (idempotent)', () => {
    completeIds = ['classic'];
    const first = claimCollectionRewards();
    expect(first).toEqual(['classic']);
    expect(fragmentAdd).toHaveBeenCalledTimes(1);

    fragmentAdd.mockClear();
    const second = claimCollectionRewards(); // replay — still "complete", already claimed
    expect(second).toEqual([]);
    expect(fragmentAdd).not.toHaveBeenCalled();
  });

  it('returns every newly-completed collection id claimed in one call', () => {
    completeIds = ['classic', 'cyber'];
    const result = claimCollectionRewards();
    expect([...result].sort()).toEqual(['classic', 'cyber']);
    expect(fragmentAdd).toHaveBeenCalledTimes(2);
  });

  it('returns [] when nothing is complete', () => {
    expect(claimCollectionRewards()).toEqual([]);
    expect(fragmentAdd).not.toHaveBeenCalled();
  });
});
