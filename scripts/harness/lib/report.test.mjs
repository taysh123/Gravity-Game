import { describe, expect, it } from 'vitest';
import { createRecorder, formatFailures, formatTable, summarise } from './report.mjs';

const pass = { check: 'scene-boot', viewport: '390x844', mode: 'preview', status: 'PASS', passed: 14, total: 14, signals: [], failures: [], ms: 12345 };
const fail = {
  check: 'hit-areas',
  viewport: '360x640',
  mode: 'preview',
  status: 'FAIL',
  passed: 40,
  total: 42,
  signals: [{ kind: 'console.error', text: 'kaboom', where: 'http://x/a.js:1' }],
  failures: [
    { label: 'MainMenu: PLAY', detail: 'MISS TL->Text "x"' },
    { label: 'Settings: close', detail: '' },
  ],
  ms: 800,
};

describe('createRecorder', () => {
  it('counts passed and failed assertions and keeps the failure label and detail', () => {
    const r = createRecorder();
    r.expect(true, 'ok one');
    r.expect(false, 'bad one', 'detail');
    r.expect(1 === 1, 'ok two', 'unused');
    expect(r.passed()).toBe(2);
    expect(r.total()).toBe(3);
    expect(r.failures()).toEqual([{ label: 'bad one', detail: 'detail' }]);
  });

  it('records an exception thrown by a check as a failure', () => {
    const r = createRecorder();
    r.fail('check threw', new Error('x is not a function'));
    expect(r.total()).toBe(1);
    expect(r.failures()[0]).toEqual({ label: 'check threw', detail: 'Error: x is not a function' });
  });

  it('an empty recorder has no assertions (a check that asserts nothing must not pass silently)', () => {
    expect(createRecorder().total()).toBe(0);
  });
});

describe('summarise', () => {
  it('is ok only when every job passed', () => {
    expect(summarise([pass])).toMatchObject({ ok: true, pass: 1, fail: 0 });
    expect(summarise([pass, fail])).toMatchObject({ ok: false, pass: 1, fail: 1 });
  });

  it('is not ok for an empty run', () => {
    expect(summarise([]).ok).toBe(false);
  });

  it('counts a job with page errors as failed even when all assertions passed', () => {
    const quiet = { ...pass, status: 'FAIL' };
    expect(summarise([quiet]).ok).toBe(false);
  });
});

describe('formatTable', () => {
  const table = formatTable([pass, fail]);
  const lines = table.split('\n');

  it('prints a header, a rule and one row per job', () => {
    expect(lines[0]).toMatch(/CHECK\s+VIEWPORT\s+MODE\s+ASSERTIONS\s+ERRORS\s+TIME\s+RESULT/);
    expect(lines[1]).toMatch(/^-+/);
    expect(lines).toHaveLength(4);
  });

  it('shows assertions as passed/total, the number of page errors and the time in seconds', () => {
    expect(lines[2]).toMatch(/scene-boot\s+390x844\s+preview\s+14\/14\s+0\s+12\.3s\s+PASS/);
    expect(lines[3]).toMatch(/hit-areas\s+360x640\s+preview\s+40\/42\s+1\s+0\.8s\s+FAIL/);
  });

  it('pads the columns so the rows line up', () => {
    expect(lines[2].indexOf('390x844')).toBe(lines[3].indexOf('360x640'));
  });
});

describe('formatFailures', () => {
  it('lists each failing job with its failed assertions and its page errors', () => {
    const text = formatFailures([pass, fail]);
    expect(text).toContain('hit-areas @ 360x640 (preview)');
    expect(text).toContain('MainMenu: PLAY');
    expect(text).toContain('MISS TL->Text "x"');
    expect(text).toContain('console.error: kaboom');
    expect(text).toContain('http://x/a.js:1');
    expect(text).not.toContain('scene-boot');
  });

  it('is empty when everything passed', () => {
    expect(formatFailures([pass])).toBe('');
  });

  it('truncates a very long page error so one stack does not flood the log', () => {
    const long = { ...fail, signals: [{ kind: 'pageerror', text: 'x'.repeat(5000), where: '' }], failures: [] };
    expect(formatFailures([long]).length).toBeLessThan(1500);
  });
});
