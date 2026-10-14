// Assertion recorder and the result table. Pure: unit-tested in report.test.mjs.
//
// A job result (one check at one viewport) is
//   { check, viewport, mode, status: 'PASS' | 'FAIL', passed, total, signals, failures, ms, tallies? }
// where `signals` are the page failure signals (console.error, pageerror, failed request ...) seen during the job and
// `failures` are the failed assertions. A job fails when either list is non-empty or it asserted nothing.

const MAX_TEXT = 400;
const clip = (s, n = MAX_TEXT) => (s.length > n ? `${s.slice(0, n)}... (+${s.length - n} chars)` : s);

export function createRecorder() {
  const rows = [];
  const counts = {};
  return {
    /** Record an assertion. `detail` is shown only when it fails. */
    expect(ok, label, detail = '') {
      rows.push({ ok: !!ok, label, detail: ok ? '' : String(detail) });
      return !!ok;
    },
    /** Record a failure for something that threw instead of returning. */
    fail(label, err) {
      const text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      rows.push({ ok: false, label, detail: text });
    },
    /** Count something under a label (what a probe tested, what it skipped), shown in the NOTES column of the table. */
    tally(category, n = 1) {
      if (n > 0) counts[category] = (counts[category] ?? 0) + n;
    },
    tallies: () => ({ ...counts }),
    all: () => rows.map((r) => ({ ...r })),
    passed: () => rows.filter((r) => r.ok).length,
    total: () => rows.length,
    failures: () => rows.filter((r) => !r.ok).map((r) => ({ label: r.label, detail: r.detail })),
  };
}

export function summarise(results) {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.length - pass;
  return { ok: results.length > 0 && fail === 0, pass, fail, total: results.length };
}

const COLUMNS = [
  ['CHECK', (r) => r.check],
  ['VIEWPORT', (r) => r.viewport],
  ['MODE', (r) => r.mode],
  ['ASSERTIONS', (r) => `${r.passed}/${r.total}`],
  ['ERRORS', (r) => String(r.signals.length)],
  ['TIME', (r) => `${(r.ms / 1000).toFixed(1)}s`],
  ['RESULT', (r) => r.status],
  // What the job counted (a probe's tested and skipped objects, by category), so a growing skip category shows in the log.
  ['NOTES', (r) => Object.entries(r.tallies ?? {}).map(([label, n]) => `${label} ${n}`).join(', ')],
];

export function formatTable(results) {
  const cells = results.map((r) => COLUMNS.map(([, get]) => get(r)));
  const widths = COLUMNS.map(([head], i) => Math.max(head.length, ...cells.map((row) => row[i].length)));
  const line = (row) => row.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  return [line(COLUMNS.map(([head]) => head)), widths.map((w) => '-'.repeat(w)).join('  '), ...cells.map(line)].join('\n');
}

export function formatFailures(results) {
  const blocks = [];
  for (const r of results) {
    if (r.status === 'PASS') continue;
    const lines = [`${r.check} @ ${r.viewport} (${r.mode})`];
    if (r.total === 0 && r.failures.length === 0 && r.signals.length === 0) lines.push('  no assertion was recorded: a check that asserts nothing cannot pass');
    for (const f of r.failures) lines.push(`  FAILED  ${clip(f.label)}${f.detail ? `\n          ${clip(f.detail)}` : ''}`);
    for (const s of r.signals) lines.push(`  ${s.kind}: ${clip(s.text)}${s.where ? `\n          at ${clip(s.where, 200)}` : ''}`);
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

/** --verbose: every assertion of every job, so the counts in the labels show how much was really exercised. */
export function formatAssertions(results) {
  return results
    .map((r) => {
      const rows = (r.assertions ?? []).map((a) => `  ${a.ok ? 'ok  ' : 'FAIL'}  ${clip(a.label, 200)}`);
      return [`${r.check} @ ${r.viewport} (${r.mode})`, ...rows].join('\n');
    })
    .join('\n\n');
}
