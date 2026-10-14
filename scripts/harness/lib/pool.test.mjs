import { describe, expect, it } from 'vitest';
import { runPool } from './pool.mjs';

const tick = (ms = 1) => new Promise((r) => setTimeout(r, ms));

describe('runPool: a bounded number of workers over a list, results in list order', () => {
  it('returns every result in the order of the items, whatever order they finish in', async () => {
    const items = [30, 1, 15, 2];
    const out = await runPool(items, 3, async (ms) => {
      await tick(ms);
      return `done ${ms}`;
    });
    expect(out).toEqual(['done 30', 'done 1', 'done 15', 'done 2']);
  });

  it('never runs more than `concurrency` workers at once, and does use all of them', async () => {
    let inFlight = 0;
    let peak = 0;
    await runPool([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick(5);
      inFlight--;
    });
    expect(peak).toBe(3);
  });

  it('runs one at a time when concurrency is 1 (the sequential default for a small machine)', async () => {
    const order = [];
    await runPool(['a', 'b', 'c'], 1, async (x) => {
      order.push(`start ${x}`);
      await tick(2);
      order.push(`end ${x}`);
    });
    expect(order).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('starts the items in the order given by `priority` (heaviest first) but still returns list order', async () => {
    const started = [];
    const out = await runPool(
      ['light', 'heavy', 'medium'],
      1,
      async (x) => {
        started.push(x);
        return x.toUpperCase();
      },
      { priority: (x) => ({ light: 1, medium: 5, heavy: 10 })[x] },
    );
    expect(started).toEqual(['heavy', 'medium', 'light']);
    expect(out).toEqual(['LIGHT', 'HEAVY', 'MEDIUM']);
  });

  it('passes the item index to the worker', async () => {
    const out = await runPool(['x', 'y'], 2, async (item, i) => `${i}:${item}`);
    expect(out).toEqual(['0:x', '1:y']);
  });

  it('tells each worker which lane it runs on, and a lane never runs two items at once', async () => {
    const busy = new Set();
    const lanes = new Set();
    await runPool([1, 2, 3, 4, 5, 6], 2, async (_item, _i, lane) => {
      expect(busy.has(lane)).toBe(false);
      busy.add(lane);
      lanes.add(lane);
      await tick(3);
      busy.delete(lane);
    });
    expect([...lanes].sort()).toEqual([0, 1]);
  });

  it('rejects when a worker throws, after the in-flight ones have settled', async () => {
    await expect(
      runPool([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('handles an empty list and a concurrency larger than the list', async () => {
    expect(await runPool([], 4, async () => 1)).toEqual([]);
    expect(await runPool([1], 8, async (n) => n + 1)).toEqual([2]);
  });
});
