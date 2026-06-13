import { describe, it, expect } from 'vitest';
import { CHUNKS, type RunChunk } from './chunks';
import { PHYSICS } from '../physics.config';

const W = PHYSICS.PLAY_WIDTH;
const TAGS = new Set(['open', 'wall', 'saw', 'zone', 'magnet', 'beam']);
const MIN_LANE = 48; // a navigable gap must be at least this wide (ball ø32 + margin)

function inBounds(p: { x: number; y: number }, h: number): boolean {
  return p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= h;
}

// Widest free horizontal gap in [0,W] left by a set of x-intervals (the safe lane).
function widestGap(intervals: Array<[number, number]>): number {
  if (!intervals.length) return W;
  const merged = [...intervals].sort((a, b) => a[0] - b[0]);
  let gap = Math.max(0, merged[0][0]); // 0 → first interval
  let end = merged[0][1];
  for (let i = 1; i < merged.length; i++) {
    if (merged[i][0] > end) gap = Math.max(gap, merged[i][0] - end);
    end = Math.max(end, merged[i][1]);
  }
  return Math.max(gap, W - end); // last interval → W
}

// For each obstacle row, the union of obstacle x-spans overlapping that row must
// leave a navigable lane — i.e. static walls never fully block the chunk.
function safeLaneViolation(chunk: RunChunk): string | null {
  const obs = chunk.obstacles ?? [];
  for (const o of obs) {
    const oy0 = o.y - o.height / 2;
    const oy1 = o.y + o.height / 2;
    const sameRow = obs.filter((b) => b.y - b.height / 2 < oy1 && b.y + b.height / 2 > oy0);
    const intervals = sameRow.map((b) => [b.x - b.width / 2, b.x + b.width / 2] as [number, number]);
    if (widestGap(intervals) < MIN_LANE) return `obstacle row near y=${o.y} leaves no >=${MIN_LANE}px lane`;
  }
  return null;
}

describe('run chunks are structurally valid', () => {
  it('every chunk has a sane id / tier / tag / height and unique id', () => {
    const ids = new Set<string>();
    for (const c of CHUNKS) {
      expect(c.id, 'id').toBeTruthy();
      expect(ids.has(c.id), `duplicate id ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(c.tier, `${c.id} tier`).toBeGreaterThanOrEqual(0);
      expect(TAGS.has(c.tag), `${c.id} tag ${c.tag}`).toBe(true);
      expect(c.height, `${c.id} height`).toBeGreaterThan(0);
    }
  });

  it('all entities are within the chunk bounds and obstacles have positive size', () => {
    const errs: string[] = [];
    for (const c of CHUNKS) {
      (c.obstacles ?? []).forEach((o, i) => {
        if (o.width <= 0 || o.height <= 0) errs.push(`${c.id} obstacle[${i}] non-positive`);
        if (!inBounds(o, c.height)) errs.push(`${c.id} obstacle[${i}] out of bounds`);
      });
      (c.hazards ?? []).forEach((hz, i) => { if (!inBounds(hz, c.height)) errs.push(`${c.id} hazard[${i}] out of bounds`); });
      (c.gravityZones ?? []).forEach((z, i) => { if (!inBounds(z, c.height)) errs.push(`${c.id} zone[${i}] out of bounds`); });
      (c.magnets ?? []).forEach((m, i) => { if (!inBounds(m, c.height)) errs.push(`${c.id} magnet[${i}] out of bounds`); });
      (c.stars ?? []).forEach((s, i) => { if (!inBounds(s, c.height)) errs.push(`${c.id} star[${i}] out of bounds`); });
    }
    if (errs.length) throw new Error(`\n${errs.join('\n')}\n`);
    expect(errs).toEqual([]);
  });

  it('every chunk leaves a navigable safe lane (walls never fully block)', () => {
    const errs = CHUNKS.map((c) => safeLaneViolation(c)).filter(Boolean) as string[];
    if (errs.length) throw new Error(`\n${errs.join('\n')}\n`);
    expect(errs).toEqual([]);
  });

  it('the pool spans every tier from 0 to the max (a real ramp exists)', () => {
    const tiers = new Set(CHUNKS.map((c) => c.tier));
    const max = Math.max(...CHUNKS.map((c) => c.tier));
    for (let t = 0; t <= max; t++) expect(tiers.has(t), `missing tier ${t}`).toBe(true);
  });
});
