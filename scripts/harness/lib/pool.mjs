// A bounded worker pool for the jobs of a run. Pure scheduling: unit-tested in pool.test.mjs.
//
// Opt-in (--jobs=N, default 1). Software-rendered Chromium is CPU bound and its pages fought each other for the cores: on the
// 16-core development laptop three parallel lanes were several times SLOWER per job than one, so the default stays sequential
// and any use of --jobs in CI has to be measured there. Every wait in the harness is a game-state wait with a generous limit,
// never a timing assumption, so a slower frame rate under load makes a job slower, not wrong.

/**
 * Run `worker(item, index, lane)` over `items`, at most `concurrency` at a time; `lane` (0..concurrency-1) names the worker, so
 * a lane can own a resource (its own browser).  Results come back in the order of `items`.
 * `priority` (optional) decides the START order only: the highest first, so the long jobs do not end up last.
 */
export async function runPool(items, concurrency, worker, { priority } = {}) {
  const results = new Array(items.length);
  const order = items.map((_, i) => i);
  if (priority) order.sort((a, b) => priority(items[b]) - priority(items[a]) || a - b);
  let next = 0;
  const lane = async (laneIndex) => {
    for (;;) {
      const slot = next++;
      if (slot >= order.length) return;
      const i = order[slot];
      results[i] = await worker(items[i], i, laneIndex);
    }
  };
  const lanes = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, (_, laneIndex) => lane(laneIndex));
  const settled = await Promise.allSettled(lanes);
  const failed = settled.find((s) => s.status === 'rejected');
  if (failed) throw failed.reason;
  return results;
}
