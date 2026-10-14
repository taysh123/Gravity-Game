import { describe, expect, it } from 'vitest';
import { BOTH_VIEWPORTS, DEFAULT_VIEWPORTS, expandJobs, validateChecks } from './registry.mjs';

const run = async () => {};
const a = { name: 'a', modes: ['preview', 'dev'], viewports: BOTH_VIEWPORTS, run };
const b = { name: 'b', modes: ['dev'], run };
const c = { name: 'c', modes: ['preview'], viewports: DEFAULT_VIEWPORTS, run };

describe('viewports', () => {
  it('are the two the project verifies: 390x844 and 360x640', () => {
    expect(DEFAULT_VIEWPORTS.map((v) => v.label)).toEqual(['390x844']);
    expect(BOTH_VIEWPORTS.map((v) => v.label)).toEqual(['390x844', '360x640']);
    expect(BOTH_VIEWPORTS[1]).toMatchObject({ width: 360, height: 640 });
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
});
