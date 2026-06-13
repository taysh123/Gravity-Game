import { describe, it, expect } from 'vitest';
import { weekKey, generateRun, runScore, stardustForRun } from './endless';
import { CHUNKS } from '../config/endless/chunks';

describe('weekKey', () => {
  it('is stable within a 7-day bucket and changes the next week', () => {
    // Buckets are floor(daysSinceEpoch / 7) — epoch was a Thursday, so a bucket
    // starts on a Thursday. 2026-06-18 is a Thursday (a bucket start).
    const start = new Date(2026, 5, 18);
    const sameBucket = new Date(2026, 5, 24); // +6 days, still this bucket
    const nextBucket = new Date(2026, 5, 25); // +7 days, next bucket
    expect(weekKey(start)).toBe(weekKey(sameBucket));
    expect(weekKey(start)).not.toBe(weekKey(nextBucket));
  });
});

describe('generateRun', () => {
  it('is deterministic for a given seed', () => {
    const a = generateRun('gw100', 30).map((c) => c.id);
    const b = generateRun('gw100', 30).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('opens with an easy (tier-0) chunk', () => {
    for (const seed of ['gw1', 'gw2', 'gw3', 'gw50', 'gw999']) {
      expect(generateRun(seed, 10)[0].tier).toBe(0);
    }
  });

  it('ramps difficulty: hardest tiers only appear later, and do appear in a long run', () => {
    const run = generateRun('gw42', 90);
    const earlyMax = Math.max(...run.slice(0, 9).map((c) => c.tier)); // tier 3 gated until i>=9
    const overallMax = Math.max(...run.map((c) => c.tier));
    expect(earlyMax).toBeLessThanOrEqual(2);
    expect(overallMax).toBe(3); // a long run reaches the hardest tier
  });

  it('never gates a chunk above what the distance allows', () => {
    const run = generateRun('gw7', 60);
    run.forEach((c, i) => {
      const allowed = Math.min(Math.max(...CHUNKS.map((x) => x.tier)), Math.floor(i / 3));
      expect(c.tier).toBeLessThanOrEqual(allowed);
    });
  });

  it('avoids back-to-back repeats of the same chunk', () => {
    const run = generateRun('gw13', 50);
    let repeats = 0;
    for (let i = 1; i < run.length; i++) if (run[i].id === run[i - 1].id) repeats++;
    expect(repeats).toBe(0);
  });

  it('different seeds usually produce different runs', () => {
    const a = generateRun('gw100', 20).map((c) => c.id).join();
    const b = generateRun('gw200', 20).map((c) => c.id).join();
    expect(a).not.toBe(b);
  });

  it('never stacks the same family (tag) back-to-back', () => {
    for (const seed of ['gw1', 'gw42', 'gw777']) {
      const run = generateRun(seed, 80);
      for (let i = 1; i < run.length; i++) {
        expect(run[i].tag, `${seed} @${i} ${run[i].id} after ${run[i - 1].id}`).not.toBe(run[i - 1].tag);
      }
    }
  });

  it('tension/release: a hard chunk (tier >= 2) is always followed by an easy one', () => {
    const run = generateRun('gw42', 90);
    for (let i = 0; i < run.length - 1; i++) {
      if (run[i].tier >= 2) expect(run[i + 1].tier, `@${i}`).toBeLessThanOrEqual(1);
    }
  });

  it('a long run draws on plenty of variety (recency window spreads picks)', () => {
    const distinct = new Set(generateRun('gw7', 60).map((c) => c.id));
    expect(distinct.size).toBeGreaterThanOrEqual(12);
  });
});

describe('runScore', () => {
  it('rewards distance and stars, distance-dominant', () => {
    expect(runScore(0, 0)).toBe(0);
    expect(runScore(1000, 0)).toBe(100);
    expect(runScore(1000, 4)).toBe(200);
    expect(runScore(5000, 0)).toBeGreaterThan(runScore(0, 10)); // distance dominates
  });
});

describe('stardustForRun', () => {
  it('scales with score and is capped (cosmetic economy, never gameplay)', () => {
    expect(stardustForRun(0)).toBe(0);
    expect(stardustForRun(400)).toBe(10);
    expect(stardustForRun(100000)).toBe(60); // capped
    expect(stardustForRun(2000)).toBeGreaterThan(stardustForRun(800));
  });
});
