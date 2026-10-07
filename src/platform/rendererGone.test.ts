import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLATFORM } from '../config/platform.config';
import { consumeRendererGone, parseRendererGone } from './rendererGone';

// P00-T12 (D-11): renderer-crash recovery. MainActivity (Java) recreates the activity when the WebView's renderer
// process dies (at most PLATFORM.RENDERER_MAX_RECOVERIES per process) and leaves a count under
// PLATFORM.RENDERER_GONE_KEY in the Capacitor Preferences file. The next JS boot reads it through the Preferences
// mirror, clears it, and reports one non-fatal. Java is compiled by Gradle only (V6); the read/clear logic is pure
// and tested here; the kill-and-reload itself is a device test (V18).

const KEY = PLATFORM.RENDERER_GONE_KEY;

function fakeStore(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  const log: string[] = [];
  const store = {
    data,
    log,
    failGet: false,
    failRemove: false,
    get: async (k: string): Promise<string | null> => {
      log.push(`get ${k}`);
      if (store.failGet) throw new Error('bridge down');
      return data.get(k) ?? null;
    },
    remove: async (k: string): Promise<void> => {
      log.push(`remove ${k}`);
      if (store.failRemove) throw new Error('bridge refused remove');
      data.delete(k);
    },
  };
  return store;
}

describe('parseRendererGone', () => {
  it('reads the integer MainActivity wrote as a String', () => {
    expect(parseRendererGone('1')).toBe(1);
    expect(parseRendererGone('2')).toBe(2);
    expect(parseRendererGone('3')).toBe(3);
  });

  it('is 0 when absent or zero (nothing to report)', () => {
    expect(parseRendererGone(null)).toBe(0);
    expect(parseRendererGone('0')).toBe(0);
  });

  it('counts a present but unreadable value as one event (only MainActivity writes the key)', () => {
    for (const raw of ['', 'abc', '-1', '2.5', '1e3', ' 2']) expect(parseRendererGone(raw), JSON.stringify(raw)).toBe(1);
  });
});

describe('consumeRendererGone', () => {
  it('does nothing when the marker is absent', async () => {
    const store = fakeStore();
    const report = vi.fn();
    expect(await consumeRendererGone(store, KEY, report)).toBe(0);
    expect(store.log).toEqual([`get ${KEY}`]);
    expect(report).not.toHaveBeenCalled();
  });

  it('clears the marker and reports one non-fatal with the count', async () => {
    const store = fakeStore({ [KEY]: '2' });
    const report = vi.fn();
    expect(await consumeRendererGone(store, KEY, report)).toBe(2);
    expect(store.data.has(KEY)).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
    const [error, context] = report.mock.calls[0];
    expect(String(error)).toMatch(/^renderer_gone x2$/);
    expect(context).toBe('native');
  });

  it('clears first, then reports, so a report can never be repeated by a later boot', async () => {
    const store = fakeStore({ [KEY]: '1' });
    let markerWhenReported: string | null = 'unset';
    await consumeRendererGone(store, KEY, () => {
      markerWhenReported = store.data.get(KEY) ?? null;
    });
    expect(markerWhenReported).toBeNull();
  });

  it('clears a zero or unreadable marker; only a real event is reported', async () => {
    const zero = fakeStore({ [KEY]: '0' });
    const reportZero = vi.fn();
    expect(await consumeRendererGone(zero, KEY, reportZero)).toBe(0);
    expect(zero.data.has(KEY)).toBe(false);
    expect(reportZero).not.toHaveBeenCalled();

    const junk = fakeStore({ [KEY]: 'garbage' });
    const reportJunk = vi.fn();
    expect(await consumeRendererGone(junk, KEY, reportJunk)).toBe(1);
    expect(junk.data.has(KEY)).toBe(false);
    expect(String(reportJunk.mock.calls[0][0])).toBe('renderer_gone x1');
  });

  it('a failed clear keeps the marker for the next boot and reports the failure instead of the event', async () => {
    const store = fakeStore({ [KEY]: '2' });
    store.failRemove = true;
    const report = vi.fn();
    expect(await consumeRendererGone(store, KEY, report)).toBe(0);
    expect(store.data.get(KEY)).toBe('2');
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(expect.any(Error), 'saves.rendererGone');
  });

  it('a failed read is reported and never rejects', async () => {
    const store = fakeStore({ [KEY]: '2' });
    store.failGet = true;
    const report = vi.fn();
    expect(await consumeRendererGone(store, KEY, report)).toBe(0);
    expect(store.log).toEqual([`get ${KEY}`]);
    expect(report).toHaveBeenCalledWith(expect.any(Error), 'saves.rendererGone');
  });

  it('survives a reporter that throws', async () => {
    const store = fakeStore({ [KEY]: '1' });
    await expect(
      consumeRendererGone(store, KEY, () => {
        throw new Error('crashlytics down');
      }),
    ).resolves.toBe(1);
    expect(store.data.has(KEY)).toBe(false);
  });
});

describe('PLATFORM renderer-recovery constants', () => {
  it('the marker is a native flag: outside the save prefix, so it is never mirrored into localStorage', () => {
    expect(KEY).toBe('platform:rendererGone');
    expect(KEY.startsWith(PLATFORM.SAVE_PREFIX)).toBe(false);
  });

  it('allows exactly two recoveries per process (V18: the third dead renderer crashes normally)', () => {
    expect(PLATFORM.RENDERER_MAX_RECOVERIES).toBe(2);
  });
});

// The Java side has no unit tests (Gradle compiles it; V6). These pin the values and calls the JS side depends on.
describe('MainActivity.java stays in step with the platform config', () => {
  const file = (rel: string): string => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');
  const java = file('android/app/src/main/java/com/truestorylabs/gravityflow/MainActivity.java')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const constant = (name: string): string | undefined =>
    new RegExp(`static final (?:String|int) ${name}\\s*=\\s*("?)([^;"]+)\\1;`).exec(java)?.[2];

  it('uses the same marker key and recovery limit as PLATFORM', () => {
    expect(constant('RENDERER_GONE_KEY')).toBe(PLATFORM.RENDERER_GONE_KEY);
    expect(constant('RENDERER_MAX_RECOVERIES')).toBe(String(PLATFORM.RENDERER_MAX_RECOVERIES));
  });

  it('writes into the file @capacitor/preferences reads (default group, never reconfigured)', () => {
    expect(constant('PREFS_FILE')).toBe('CapacitorStorage');
    expect(java).toMatch(/getSharedPreferences\(\s*PREFS_FILE\s*,/);
    expect(file('capacitor.config.ts')).not.toMatch(/\bPreferences\s*:/);
  });

  it('stores the count as a String (the plugin reads it with getString), synchronously', () => {
    expect(java).toMatch(/\.putString\(\s*RENDERER_GONE_KEY\s*,/);
    expect(java).not.toMatch(/\.put(Int|Long)\(/);
    expect(java).toMatch(/\.commit\(\)/);
    expect(java).not.toMatch(/\.apply\(\)/);
  });

  it('adds the listener after super.onCreate, counts per process, recreates, and falls through past the limit', () => {
    const create = java.indexOf('super.onCreate(');
    expect(create).toBeGreaterThan(-1);
    expect(java.indexOf('addWebViewListener(')).toBeGreaterThan(create);
    expect(java).toMatch(/boolean onRenderProcessGone\(/);
    expect(java).toMatch(/private static int \w+\s*=\s*0;/);
    expect(java).toMatch(/\b(\w+)\+\+;[\s\S]*?\b\1\s*>\s*RENDERER_MAX_RECOVERIES/);
    expect(java).toMatch(/\brecreate\(\)/);
    expect(java).toMatch(/return false;/);
    expect(java).toMatch(/return true;/);
  });
});
