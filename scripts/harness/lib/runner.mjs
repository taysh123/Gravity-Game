// Runs one job (one check at one viewport) in its own browser context, so no job sees another's state.
//
// A job: open a page with the failure-signal listeners, boot the app to the main menu (unless the check boots itself),
// run the check, then close the context. Page failure signals (console.error, pageerror / unhandled rejection, failed
// same-origin request) are collected for the whole job and fail it even if every assertion passed.

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openPage } from './browser.mjs';
import { bootToMenu, frames } from './game.mjs';
import { createRecorder } from './report.mjs';

export async function runJob({ browser, job, mode, origin, artifactsDir = null }) {
  const { check, viewport } = job;
  const started = Date.now();
  const rec = createRecorder();
  const { context, page, signals } = await openPage(browser, { viewport, origin, seed: check.seed });
  const extras = [];

  const ctx = {
    mode,
    origin,
    viewport,
    signals,
    expect: rec.expect,
    /** Count something under a label; the totals are shown in the NOTES column of the result table. */
    tally: rec.tally,
    /** Record a list of { ok, label, detail } assertions. */
    record(assertions) {
      for (const a of assertions) rec.expect(a.ok, a.label, a.detail);
    },
    /** A second, fresh page of this job (own context and seed), booted to the main menu. Closed with the job. */
    async openPage({ seed = {} } = {}) {
      const extra = await openPage(browser, { viewport, origin, seed, signals });
      extras.push(extra);
      await extra.page.goto(`${origin}/`, { waitUntil: 'load' });
      await bootToMenu(extra.page);
      return extra.page;
    },
    /** Run fn as one named assertion that fails on a throw or on any page error raised while it ran. */
    async step(label, fn) {
      const mark = signals.mark();
      try {
        await fn();
      } catch (err) {
        rec.fail(label, err);
        return false;
      }
      const raised = signals.since(mark);
      return rec.expect(raised.length === 0, label, raised.map((s) => `${s.kind}: ${s.text}`).join(' | '));
    },
  };

  try {
    await page.goto(`${origin}/`, { waitUntil: 'load' });
    if (check.boot !== 'none') await bootToMenu(page, { skipSplashes: check.boot !== 'natural' });
    await check.run(page, ctx);
    await frames(page, 4).catch(() => undefined); // let a trailing async error surface before the listeners close
  } catch (err) {
    rec.fail('the check did not complete', err);
  } finally {
    signals.close();
    if (artifactsDir && (rec.failures().length > 0 || signals.size() > 0 || rec.total() === 0)) {
      // What the page looked like when the job failed. Best effort: a dead page has nothing to show.
      try {
        mkdirSync(artifactsDir, { recursive: true });
        await page.screenshot({ path: path.join(artifactsDir, `${check.name}-${viewport.label}-${mode}.png`) });
      } catch {
        // no screenshot
      }
    }
    for (const extra of extras) await extra.context.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }

  const list = signals.all();
  const failures = rec.failures();
  const empty = rec.total() === 0;
  return {
    check: check.name,
    viewport: viewport.label,
    mode,
    status: failures.length === 0 && list.length === 0 && !empty ? 'PASS' : 'FAIL',
    passed: rec.passed(),
    total: rec.total(),
    signals: list,
    failures,
    assertions: rec.all(),
    tallies: rec.tallies(),
    ms: Date.now() - started,
  };
}
