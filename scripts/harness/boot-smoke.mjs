#!/usr/bin/env node
// Boot smoke harness (P00-T24, V8): every scene boots in a real Chromium with zero console errors.
//
//   npm run smoke                   preview mode: npm run build, then vite preview (the shipped bundle). What CI runs.
//   npm run smoke -- --mode=dev     the Vite dev server (DEV-only hooks exist there)
//   npm run smoke -- --list | --only=a,b | --no-build | --headed | --help
//
// It starts the server on a free port, drives the game with Playwright (checks/ holds the named checks), prints a result
// table and exits 0 only when every check passed with no console.error, pageerror / unhandled rejection or failed
// same-origin request. Exit 1 = a check failed, 2 = the harness itself could not run. The server it starts is stopped by
// its own PID and tree on every exit path, including Ctrl-C (lib/server.mjs); nothing is ever killed by name.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { CHECKS } from './checks/index.mjs';
import { USAGE, parseArgs } from './lib/args.mjs';
import { launchBrowser } from './lib/browser.mjs';
import { runPool } from './lib/pool.mjs';
import { expandJobs, shardJobs } from './lib/registry.mjs';
import { formatAssertions, formatFailures, formatTable, summarise } from './lib/report.mjs';
import { runJob } from './lib/runner.mjs';
import { ROOT, buildApp, installCleanup, startServer } from './lib/server.mjs';

const say = (line = '') => console.log(line);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    say(USAGE);
    return 0;
  }
  const allJobs = expandJobs(CHECKS, { mode: args.mode, only: args.only, exclusive: args.exclusive });
  const jobs = args.shard ? shardJobs(allJobs, args.shard) : allJobs;
  if (args.list) {
    for (const j of jobs) say(`${j.check.name.padEnd(28)} ${j.viewport.label.padEnd(8)} ${j.check.modes.join(',')}`);
    return 0;
  }

  if (jobs.length === 0) {
    say(`[harness] shard ${args.shard.index}/${args.shard.total} has no jobs among the ${allJobs.length} selected: nothing to run`);
    return 0;
  }

  installCleanup();
  if (args.mode === 'preview') {
    if (args.build) {
      say('[harness] npm run build ...');
      await buildApp();
    } else if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
      throw new Error('--no-build was given but dist/index.html does not exist. Run npm run build first.');
    }
  }

  say(`[harness] starting ${args.mode === 'preview' ? 'vite preview (production build)' : 'the Vite dev server'} ...`);
  const server = await startServer({ mode: args.mode });
  say(`[harness] ${server.origin} (pid ${server.pid})`);
  let browsers = [];
  let results = [];
  const concurrency = args.jobs;
  try {
    // One browser per lane: every context of a browser shares one GPU process, and under software rendering that is a
    // single thread that parallel pages would queue behind. Separate browsers scale with the cores.
    const lanes = Math.min(concurrency, jobs.length);
    browsers = await Promise.all(Array.from({ length: lanes }, () => launchBrowser({ headed: args.headed })));
    say(`[harness] chromium ${browsers[0].version()}, ${jobs.length} jobs, ${lanes} at a time (one browser each)`);
    results = await runPool(
      jobs,
      concurrency,
      async (job, _index, lane) => {
        const result = await runJob({ browser: browsers[lane], job, mode: args.mode, origin: server.origin, artifactsDir: args.artifacts });
        say(`[harness] ${result.status}  ${result.check} @ ${result.viewport}  ${result.passed}/${result.total} assertions, ${result.signals.length} page errors, ${(result.ms / 1000).toFixed(1)}s`);
        return result;
      },
      { priority: (job) => job.check.weight ?? 1 },
    );
  } finally {
    await Promise.all(browsers.map((b) => b.close().catch(() => undefined)));
    await server.stop();
    say('[harness] server stopped');
  }

  if (args.verbose) {
    say();
    say(formatAssertions(results));
  }
  say();
  say(formatTable(results));
  const failures = formatFailures(results);
  if (failures) {
    say();
    say(failures);
  }
  const summary = summarise(results);
  say();
  say(summary.ok ? `SMOKE PASS: ${summary.pass}/${summary.total} jobs` : `SMOKE FAIL: ${summary.fail} of ${summary.total} jobs failed`);
  return summary.ok ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`[harness] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  },
);
