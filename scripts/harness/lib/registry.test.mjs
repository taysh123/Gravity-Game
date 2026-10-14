import { describe, expect, it } from 'vitest';
import { BOTH_VIEWPORTS, DEFAULT_VIEWPORTS, SMALL_VIEWPORTS, expandJobs, shardJobs, validateChecks } from './registry.mjs';

const run = async () => {};
const a = { name: 'a', modes: ['preview', 'dev'], viewports: BOTH_VIEWPORTS, run };
const b = { name: 'b', modes: ['dev'], run };
const c = { name: 'c', modes: ['preview'], viewports: DEFAULT_VIEWPORTS, run };

describe('viewports', () => {
  it('are the two the project verifies: 390x844 and 360x640', () => {
    expect(DEFAULT_VIEWPORTS.map((v) => v.label)).toEqual(['390x844']);
    expect(BOTH_VIEWPORTS.map((v) => v.label)).toEqual(['390x844', '360x640']);
    expect(BOTH_VIEWPORTS[1]).toMatchObject({ width: 360, height: 640 });
    expect(SMALL_VIEWPORTS).toEqual([BOTH_VIEWPORTS[1]]);
  });
});

describe('expandJobs: one job per check and viewport, filtered by the run mode', () => {
  it('keeps only the checks that declare the mode', () => {
    expect(expandJobs([a, b, c], { mode: 'preview' }).map((j) => `${j.check.name}@${j.viewport.label}`)).toEqual([
      'a@390x844',
      'a@360x640',
      'c@390x844',
    ]);
    expect(expandJobs([a, b, c], { mode: 'dev' }).map((j) => `${j.check.name}@${j.viewport.label}`)).toEqual([
      'a@390x844',
      'a@360x640',
      'b@390x844',
    ]);
  });

  it('defaults a check without viewports to 390x844 only', () => {
    expect(expandJobs([b], { mode: 'dev' }).map((j) => j.viewport.label)).toEqual(['390x844']);
  });

  it('narrows to the names given in only, in registry order', () => {
    expect(expandJobs([a, b, c], { mode: 'dev', only: ['b', 'a'] }).map((j) => j.check.name)).toEqual(['a', 'a', 'b']);
  });

  it('with exclusive, keeps only the checks whose ONLY mode is the chosen one (the ones that need a DEV-only hook)', () => {
    expect(expandJobs([a, b, c], { mode: 'dev', exclusive: true }).map((j) => j.check.name)).toEqual(['b']);
    expect(expandJobs([a, b, c], { mode: 'preview', exclusive: true }).map((j) => j.check.name)).toEqual(['c']);
  });

  it('with exclusive, also keeps a check that names the mode in controlModes: its run there is the positive control for what it asserts elsewhere', () => {
    const d = { name: 'd', modes: ['preview', 'dev'], controlModes: ['dev'], run };
    expect(expandJobs([a, b, c, d], { mode: 'dev', exclusive: true }).map((j) => j.check.name)).toEqual(['b', 'd']);
    expect(expandJobs([a, b, c, d], { mode: 'preview', exclusive: true }).map((j) => j.check.name)).toEqual(['c']);
  });

  it('refuses an unknown name instead of running nothing and passing', () => {
    expect(() => expandJobs([a], { mode: 'dev', only: ['zzz'] })).toThrow(/Unknown check "zzz".*a/);
  });

  it('refuses a check named in only that does not run in the chosen mode', () => {
    expect(() => expandJobs([a, b], { mode: 'preview', only: ['b'] })).toThrow(/"b" does not run in preview mode \(it needs: dev\)/);
  });

  it('an empty selection is an error: a green run with no checks proves nothing', () => {
    expect(() => expandJobs([b], { mode: 'preview' })).toThrow(/No checks to run in preview mode/);
  });
});

describe('validateChecks', () => {
  it('accepts well-formed checks', () => {
    expect(() => validateChecks([a, b, c])).not.toThrow();
  });

  it('rejects a duplicate name', () => {
    expect(() => validateChecks([a, { ...a }])).toThrow(/Duplicate check name "a"/);
  });

  it('rejects a missing run function, a bad name and a bad mode', () => {
    expect(() => validateChecks([{ name: 'x', modes: ['dev'] }])).toThrow(/"x" needs a run\(page, ctx\) function/);
    expect(() => validateChecks([{ name: 'Bad Name', modes: ['dev'], run }])).toThrow(/kebab-case/);
    expect(() => validateChecks([{ name: 'x', modes: ['prod'], run }])).toThrow(/"x".*mode "prod"/);
    expect(() => validateChecks([{ name: 'x', modes: [], run }])).toThrow(/"x" must declare at least one mode/);
  });

  it('accepts controlModes that are a subset of modes and rejects any other', () => {
    expect(() => validateChecks([{ name: 'x', modes: ['preview', 'dev'], controlModes: ['dev'], run }])).not.toThrow();
    expect(() => validateChecks([{ name: 'x', modes: ['preview'], controlModes: ['dev'], run }])).toThrow(/"x" controlModes.*"dev".*not in its modes/);
  });
});

describe('shardJobs: split the job list across n runners, balanced by weight', () => {
  const job = (name, weight, viewport = '390x844') => ({ check: { name, weight }, viewport: { label: viewport } });
  const jobs = [job('a', 10), job('b', 9), job('c', 8), job('d', 1), job('e', 1)];
  const names = (list) => list.map((j) => j.check.name);

  it('gives the heaviest job to the least loaded shard first (greedy), then fills up', () => {
    expect(names(shardJobs(jobs, { index: 1, total: 2 }))).toEqual(['a', 'd', 'e']); // 10 + 1 + 1
    expect(names(shardJobs(jobs, { index: 2, total: 2 }))).toEqual(['b', 'c']); // 9 + 8
  });

  it('covers every job exactly once across the shards', () => {
    const all = [1, 2, 3].flatMap((index) => names(shardJobs(jobs, { index, total: 3 })));
    expect([...all].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('keeps registry order inside a shard', () => {
    expect(names(shardJobs(jobs, { index: 1, total: 2 }))).toEqual(['a', 'd', 'e']);
    const mixed = [job('x', 1), job('y', 50), job('z', 1)];
    expect(names(shardJobs(mixed, { index: 2, total: 2 }))).toEqual(['x', 'z']);
  });

  it('treats a job with no weight as 1, and tells equal weights apart by position so the split is stable', () => {
    const flat = [job('p'), job('q'), job('r'), job('s')];
    expect(names(shardJobs(flat, { index: 1, total: 2 }))).toEqual(['p', 'r']);
    expect(names(shardJobs(flat, { index: 2, total: 2 }))).toEqual(['q', 's']);
  });

  it('one shard is the whole list; an empty shard is an empty list, not an error', () => {
    expect(names(shardJobs(jobs, { index: 1, total: 1 }))).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(shardJobs([job('only', 5)], { index: 2, total: 3 })).toEqual([]);
  });

  it('refuses an index outside 1..total', () => {
    expect(() => shardJobs(jobs, { index: 0, total: 2 })).toThrow(/shard/);
    expect(() => shardJobs(jobs, { index: 3, total: 2 })).toThrow(/shard/);
  });
});
