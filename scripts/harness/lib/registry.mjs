// The check registry: validation and the (check x viewport) job list for a run. Pure: unit-tested in registry.test.mjs.
//
// A check is { name, modes, viewports?, seed?, run(page, ctx) }:
//   name       kebab-case, unique.
//   modes      the run modes it supports: 'preview' (production build), 'dev' (Vite dev server). A check that needs a
//              DEV-only hook (window.__crashTest, a dynamic import of a src module) declares only 'dev'.
//   viewports  BOTH_VIEWPORTS (390x844 and 360x640) or DEFAULT_VIEWPORTS (390x844); default DEFAULT_VIEWPORTS.
//   seed       optional localStorage entries written before the app boots ({ key: stringValue }).
//   boot       'menu' (default: tap through the splashes, wait for the main menu), 'natural' (no taps) or 'none' (the check boots).
//   weight     optional rough cost (about seconds on a CI runner). Used to start heavy jobs first when jobs run in parallel and
//              to balance --shard slices. Default 1.
//   run        async (page, ctx). ctx.expect(ok, label, detail) records an assertion; a throw is a failure too.

import { MODES } from './args.mjs';

export const DEFAULT_VIEWPORTS = [{ width: 390, height: 844, label: '390x844' }];
export const BOTH_VIEWPORTS = [...DEFAULT_VIEWPORTS, { width: 360, height: 640, label: '360x640' }];
export const SMALL_VIEWPORTS = [BOTH_VIEWPORTS[1]];

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function validateChecks(checks) {
  const seen = new Set();
  for (const c of checks) {
    if (typeof c.name !== 'string' || !NAME_RE.test(c.name)) throw new Error(`Check name "${c.name}" must be kebab-case`);
    if (seen.has(c.name)) throw new Error(`Duplicate check name "${c.name}"`);
    seen.add(c.name);
    if (typeof c.run !== 'function') throw new Error(`Check "${c.name}" needs a run(page, ctx) function`);
    if (!Array.isArray(c.modes) || c.modes.length === 0) throw new Error(`Check "${c.name}" must declare at least one mode`);
    for (const m of c.modes) if (!MODES.includes(m)) throw new Error(`Check "${c.name}" declares an unknown mode "${m}"`);
  }
}

/** @returns {{check: object, viewport: {width: number, height: number, label: string}}[]} */
export function expandJobs(checks, { mode, only = [], exclusive = false }) {
  validateChecks(checks);
  const names = checks.map((c) => c.name);
  for (const name of only) {
    const c = checks.find((x) => x.name === name);
    if (!c) throw new Error(`Unknown check "${name}". Checks: ${names.join(', ')}`);
    if (!c.modes.includes(mode)) throw new Error(`Check "${name}" does not run in ${mode} mode (it needs: ${c.modes.join(', ')})`);
  }
  const jobs = [];
  for (const check of checks) {
    if (!check.modes.includes(mode)) continue;
    if (exclusive && check.modes.length > 1) continue; // runs in every mode: not specific to this one
    if (only.length > 0 && !only.includes(check.name)) continue;
    for (const viewport of check.viewports ?? DEFAULT_VIEWPORTS) jobs.push({ check, viewport });
  }
  if (jobs.length === 0) throw new Error(`No checks to run in ${mode} mode`);
  return jobs;
}

/**
 * The i-th of n slices of a job list, balanced by weight (a job's check.weight, default 1): each job, heaviest first, goes to the
 * least loaded slice. Deterministic (ties are broken by position in the list), and inside a slice the registry order is kept.
 * An empty slice is fine: a small list can have fewer jobs than runners.
 */
export function shardJobs(jobs, { index, total }) {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(index) || index < 1 || index > total) {
    throw new Error(`shard ${index}/${total} is not a valid slice (need 1 <= index <= total)`);
  }
  const weight = (job) => job.check.weight ?? 1;
  const loads = new Array(total).fill(0);
  const slices = Array.from({ length: total }, () => []);
  const heaviestFirst = jobs.map((job, position) => ({ job, position })).sort((a, b) => weight(b.job) - weight(a.job) || a.position - b.position);
  for (const { job, position } of heaviestFirst) {
    const target = loads.indexOf(Math.min(...loads));
    loads[target] += weight(job);
    slices[target].push({ job, position });
  }
  return slices[index - 1].sort((a, b) => a.position - b.position).map(({ job }) => job);
}
