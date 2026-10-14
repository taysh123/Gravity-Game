import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLATFORM } from '../config/platform.config';

// Crash is a thin seam over the native Crashlytics plugin, loaded lazily on first use. These tests pin two things.
// 1. The boot race: a report made while the plugin is still loading must be delivered once it is ready, not dropped. This matters
//    most for the earliest reports (the renderer-gone marker is already cleared by the time it is reported, so a lost report is
//    lost for good).
// 2. Collection switch (D-10.5): the manifest default is OFF for a fresh install, init() never changes it, and only enable() /
//    disable() do, each making one native call per state change. Crashlytics PERSISTS the last setEnabled value and it overrides
//    the manifest, so from the second launch the persisted value is what applies at process start; disable() is the off-switch
//    bootServices uses when CRASH_REQUIRES_ANALYTICS_CONSENT is on and the outcome denies analytics_storage.

type Deferred = { promise: Promise<void>; resolve: () => void; reject: (e: Error) => void };

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Lets already-resolved promise chains (and their .then callbacks) run.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => setTimeout(r, 0));
};

interface LoadOptions {
  setEnabled?: () => Promise<void>;
  setCustomKey?: () => Promise<void>;
  // Holds the dynamic import of the plugin module until it resolves (the plugin is "still loading").
  loadGate?: Promise<void>;
  // Makes the dynamic import itself fail (the plugin is unavailable).
  loadFails?: boolean;
}

async function load(native: boolean, opts: LoadOptions = {}) {
  vi.resetModules();
  const plugin = {
    setEnabled: vi.fn(async (_o: { enabled: boolean }) => {
      await opts.setEnabled?.();
    }),
    log: vi.fn(async (_o: { message: string }) => {}),
    setCustomKey: vi.fn(async (_o: { key: string; value: string | number; type: string }) => {
      await opts.setCustomKey?.();
    }),
    recordException: vi.fn(async (_o: { message: string; stacktrace?: unknown[] }) => {}),
  };
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  vi.doMock('./native/firebaseCrashlytics', async () => {
    if (opts.loadGate) await opts.loadGate;
    if (opts.loadFails) throw new Error('plugin unavailable');
    return { FirebaseCrashlytics: plugin };
  });
  const { Crash } = await import('./Crash');
  return { Crash, plugin };
}

describe('Crash (native)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  it('delivers a recordError made while the plugin is still loading, once it is loaded', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    Crash.init(); // starts loading the plugin
    await flush();

    Crash.recordError(new Error('boom'), 'boot');
    await flush();
    expect(plugin.recordException).not.toHaveBeenCalled(); // not loaded yet, but also not dropped

    gate.resolve();
    await flush();
    expect(plugin.recordException).toHaveBeenCalledTimes(1);
    expect(plugin.recordException).toHaveBeenCalledWith(expect.objectContaining({ message: '[boot] boom' }));
  });

  it('delivers a report made before init() ever started loading, and a log, in call order', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    Crash.log('level_start 1');
    Crash.recordError('first', 'a');
    Crash.recordError('second');
    gate.resolve();
    await flush();
    expect(plugin.log).toHaveBeenCalledWith({ message: 'level_start 1' });
    expect(plugin.recordException.mock.calls.map((c) => c[0])).toEqual([{ message: '[a] first' }, { message: 'second' }]);
  });

  it('loads the plugin once however many calls arrive, before or after it is ready', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    Crash.init();
    Crash.log('one');
    Crash.recordError('two');
    Crash.recordError('three');
    gate.resolve();
    await flush();
    Crash.recordError('four'); // after ready
    await flush();
    expect(plugin.recordException).toHaveBeenCalledTimes(3);
    expect(plugin.log).toHaveBeenCalledTimes(1);
  });

  it('sends nothing, and does not throw or retry, when the plugin fails to load', async () => {
    const { Crash, plugin } = await load(true, { loadFails: true });
    Crash.init();
    Crash.recordError('lost');
    Crash.log('lost');
    Crash.enable();
    await flush();
    Crash.recordError('still lost');
    await flush();
    expect(plugin.recordException).not.toHaveBeenCalled();
    expect(plugin.log).not.toHaveBeenCalled();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
  });
});

describe('Crash collection switch (D-10.5)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  it('init() and reports never change collection: the manifest default (off on a fresh install) stands until enable() or disable()', async () => {
    const { Crash, plugin } = await load(true);
    Crash.init();
    Crash.log('hello');
    Crash.recordError(new Error('before consent'), 'boot');
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    // Reports made before enable() still reach the plugin: Crashlytics keeps them on the device and sends them once collection
    // is enabled, so an early failure is not lost.
    expect(plugin.recordException).toHaveBeenCalledWith(expect.objectContaining({ message: '[boot] before consent' }));
  });

  it('enable() turns collection on, once, however many times it is called', async () => {
    const { Crash, plugin } = await load(true);
    Crash.init();
    Crash.enable();
    Crash.enable();
    await flush();
    Crash.enable();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(1);
    expect(plugin.setEnabled).toHaveBeenCalledWith({ enabled: true });
  });

  it('enable() called before the plugin has loaded waits for it', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    Crash.enable();
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    gate.resolve();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledWith({ enabled: true });
  });

  it('enable() never throws when the native call rejects, and reporting still works', async () => {
    const { Crash, plugin } = await load(true, {
      setEnabled: async () => {
        throw new Error('native failure');
      },
    });
    expect(() => Crash.enable()).not.toThrow();
    await flush();
    Crash.recordError('after a failed enable');
    await flush();
    expect(plugin.recordException).toHaveBeenCalledWith({ message: 'after a failed enable' });
  });
});

describe('Crash.disable (the off-switch)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  it('disable() turns collection off through setEnabled({ enabled: false }), once, however many times it is called', async () => {
    const { Crash, plugin } = await load(true);
    Crash.init();
    Crash.disable();
    Crash.disable();
    await flush();
    Crash.disable();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(1);
    expect(plugin.setEnabled).toHaveBeenCalledWith({ enabled: false });
  });

  it('disable() is sent even if enable() never ran this session (the persisted value from an earlier launch may be on)', async () => {
    const { Crash, plugin } = await load(true);
    Crash.disable();
    await flush();
    expect(plugin.setEnabled.mock.calls.map((c) => c[0])).toEqual([{ enabled: false }]);
  });

  it('enable, disable, enable reach the plugin in that order, one call each (a withdrawal then a new grant in one session)', async () => {
    const { Crash, plugin } = await load(true);
    Crash.enable();
    Crash.disable();
    Crash.enable();
    await flush();
    expect(plugin.setEnabled.mock.calls.map((c) => c[0])).toEqual([{ enabled: true }, { enabled: false }, { enabled: true }]);
  });

  it('disable() called before the plugin has loaded waits for it', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    Crash.disable();
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    gate.resolve();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledWith({ enabled: false });
  });

  it('disable() never throws when the native call rejects, reporting still works, and the next disable() tries again', async () => {
    let fail = true;
    const { Crash, plugin } = await load(true, {
      setEnabled: async () => {
        if (fail) throw new Error('native failure');
      },
    });
    expect(() => Crash.disable()).not.toThrow();
    await flush();
    Crash.recordError('after a failed disable');
    await flush();
    expect(plugin.recordException).toHaveBeenCalledWith({ message: 'after a failed disable' });
    // A failed off-switch must not be remembered as done: the player withdrew, so the next call retries.
    fail = false;
    Crash.disable();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(2);
  });

  it('sends nothing, and does not throw, when the plugin fails to load', async () => {
    const { Crash, plugin } = await load(true, { loadFails: true });
    expect(() => Crash.disable()).not.toThrow();
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
  });
});

describe('Crash (web / non-native)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  it('never touches the native plugin; reports go to the dev console only', async () => {
    const { Crash, plugin } = await load(false);
    Crash.init();
    Crash.enable();
    Crash.disable();
    Crash.log('hello');
    Crash.setKeys({ scene: 'MainMenuScene' });
    Crash.recordError(new Error('web boom'), 'ctx');
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    expect(plugin.log).not.toHaveBeenCalled();
    expect(plugin.setCustomKey).not.toHaveBeenCalled();
    expect(plugin.recordException).not.toHaveBeenCalled();
  });
});

describe('Crash: a failed collection switch leaves a breadcrumb', () => {
  let warn: MockInstance;
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  // The breadcrumb is a console.warn of a FIXED string, deliberately not Crash.log / recordError: those are log /
  // recordException on the same Crashlytics plugin whose setEnabled just failed, so they would depend on the failing SDK (and a
  // failure inside them would loop back here). On Android the WebView console reaches logcat, which is where a tester looks.
  const SECRET = 'native failure with secret-detail user@example.com';

  it('a rejected enable() warns "crash: setEnabled on failed" once, with no error text, and never throws', async () => {
    const { Crash, plugin } = await load(true, {
      setEnabled: async () => {
        throw new Error(SECRET);
      },
    });
    expect(() => Crash.enable()).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toEqual(['crash: setEnabled on failed']);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-detail');
    // not routed through Crashlytics itself
    expect(plugin.log).not.toHaveBeenCalled();
    expect(plugin.recordException).not.toHaveBeenCalled();
  });

  it('a rejected disable() warns "crash: setEnabled off failed" once, with no error text, and never throws', async () => {
    const { Crash, plugin } = await load(true, {
      setEnabled: async () => {
        throw new Error(SECRET);
      },
    });
    expect(() => Crash.disable()).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toEqual(['crash: setEnabled off failed']);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-detail');
    expect(plugin.log).not.toHaveBeenCalled();
    expect(plugin.recordException).not.toHaveBeenCalled();
  });

  it('each failed attempt warns once, and the retry still runs', async () => {
    let fail = true;
    const { Crash, plugin } = await load(true, {
      setEnabled: async () => {
        if (fail) throw new Error(SECRET);
      },
    });
    Crash.disable();
    await flush();
    Crash.disable(); // retried because the first failure was forgotten; fails again
    await flush();
    expect(warn.mock.calls).toEqual([['crash: setEnabled off failed'], ['crash: setEnabled off failed']]);
    fail = false;
    Crash.disable();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(2); // a success warns nothing
  });

  it('a successful switch and a plugin that never loaded warn nothing', async () => {
    const ok = await load(true);
    ok.Crash.enable();
    await flush();
    expect(warn).not.toHaveBeenCalled();
    const broken = await load(true, { loadFails: true });
    broken.Crash.enable();
    await flush();
    expect(warn).not.toHaveBeenCalled();
  });

  it('a console.warn that itself throws cannot make the switch throw, reject unhandled, or block the retry', async () => {
    let fail = true;
    const { Crash, plugin } = await load(true, {
      setEnabled: async () => {
        if (fail) throw new Error(SECRET);
      },
    });
    warn.mockImplementation(() => {
      throw new Error('console unavailable');
    });
    expect(() => Crash.enable()).not.toThrow();
    await flush();
    fail = false;
    Crash.enable();
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(2);
  });
});

describe('Crash reports: stack traces, dedupe, per-session cap, custom keys, breadcrumbs (P00-T21)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  const BUNDLE = 'https://localhost/assets/index-abc.js';
  const withStack = (message: string): Error => {
    const e = new Error(message);
    e.stack = `Error: ${message}\n    at update (${BUNDLE}:1:2345)\n    at ${BUNDLE}:1:99`;
    return e;
  };

  it('sends the parsed V8 stack with the message', async () => {
    const { Crash, plugin } = await load(true);
    Crash.recordError(withStack('boom'), 'frame');
    await flush();
    expect(plugin.recordException).toHaveBeenCalledWith({
      message: '[frame] boom',
      stacktrace: [
        { functionName: 'update', fileName: 'assets/index-abc.js:1:2345', lineNumber: 1 },
        { functionName: '(anonymous)', fileName: 'assets/index-abc.js:1:99', lineNumber: 1 },
      ],
    });
  });

  it('a thrown string, or an Error without a stack, sends the message alone (no empty stacktrace)', async () => {
    const { Crash, plugin } = await load(true);
    const bare = new Error('no stack');
    bare.stack = undefined;
    Crash.recordError('a string');
    Crash.recordError(bare);
    await flush();
    expect(plugin.recordException.mock.calls.map((c) => c[0])).toEqual([{ message: 'a string' }, { message: 'no stack' }]);
  });

  it('an Error whose stack is not a string still reports its message (it must not throw and lose the report)', async () => {
    const { Crash, plugin } = await load(true);
    const odd = new Error('odd stack');
    (odd as unknown as { stack: unknown }).stack = { not: 'a string' };
    expect(() => Crash.recordError(odd, 'frame')).not.toThrow();
    await flush();
    expect(plugin.recordException.mock.calls.map((c) => c[0])).toEqual([{ message: '[frame] odd stack' }]);
  });

  it('sends each distinct message once per session; the same text under another context is another message', async () => {
    const { Crash, plugin } = await load(true);
    for (let i = 0; i < 3; i++) Crash.recordError(withStack('same'), 'frame');
    Crash.recordError(withStack('same'), 'window.onerror');
    await flush();
    expect(plugin.recordException.mock.calls.map((c) => c[0].message)).toEqual(['[frame] same', '[window.onerror] same']);
  });

  it('sends at most PLATFORM.CRASH_MAX_PER_SESSION reports per session, and a duplicate does not use up the cap', async () => {
    const { Crash, plugin } = await load(true);
    Crash.recordError('first');
    Crash.recordError('first');
    for (let i = 0; i < PLATFORM.CRASH_MAX_PER_SESSION + 3; i++) Crash.recordError(`distinct ${i}`);
    await flush();
    const sent = plugin.recordException.mock.calls.map((c) => c[0].message);
    expect(sent).toHaveLength(PLATFORM.CRASH_MAX_PER_SESSION);
    expect(sent[0]).toBe('first');
    expect(sent.slice(1)).toEqual(Array.from({ length: PLATFORM.CRASH_MAX_PER_SESSION - 1 }, (_, i) => `distinct ${i}`));
  });

  it('the cap and the dedupe also hold for reports made while the plugin is still loading', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    for (let i = 0; i < PLATFORM.CRASH_MAX_PER_SESSION + 2; i++) {
      Crash.recordError(`queued ${i}`);
      Crash.recordError(`queued ${i}`);
    }
    gate.resolve();
    await flush();
    expect(plugin.recordException).toHaveBeenCalledTimes(PLATFORM.CRASH_MAX_PER_SESSION);
  });

  it('pins the P0 spec value: 5 reports per session', () => {
    expect(PLATFORM.CRASH_MAX_PER_SESSION).toBe(5);
  });

  it('setKeys sends each key with its Crashlytics type, and only values that changed', async () => {
    const { Crash, plugin } = await load(true);
    Crash.setKeys({ scene: 'GameScene', level: 12, mode: 'campaign' });
    Crash.setKeys({ scene: 'GameScene', level: 12, mode: 'campaign' }); // nothing changed
    Crash.setKeys({ scene: 'PauseScene' }); // only the scene changed
    await flush();
    expect(plugin.setCustomKey.mock.calls.map((c) => c[0])).toEqual([
      { key: 'scene', value: 'GameScene', type: 'string' },
      { key: 'level', value: 12, type: 'long' },
      { key: 'mode', value: 'campaign', type: 'string' },
      { key: 'scene', value: 'PauseScene', type: 'string' },
    ]);
  });

  it('a number that is not an integer is sent as a double', async () => {
    const { Crash, plugin } = await load(true);
    Crash.setKeys({ ratio: 1.5 });
    await flush();
    expect(plugin.setCustomKey).toHaveBeenCalledWith({ key: 'ratio', value: 1.5, type: 'double' });
  });

  it('setKeys never throws when the native call rejects, and the same value is sent again next time', async () => {
    let fail = true;
    const { Crash, plugin } = await load(true, {
      setCustomKey: async () => {
        if (fail) throw new Error('native failure');
      },
    });
    expect(() => Crash.setKeys({ scene: 'MainMenuScene' })).not.toThrow();
    await flush();
    fail = false;
    Crash.setKeys({ scene: 'MainMenuScene' });
    await flush();
    expect(plugin.setCustomKey).toHaveBeenCalledTimes(2);
  });

  it('log() leaves a breadcrumb through the plugin method log', async () => {
    const { Crash, plugin } = await load(true);
    Crash.log('scene GameScene');
    await flush();
    expect(plugin.log).toHaveBeenCalledWith({ message: 'scene GameScene' });
  });
});

describe("the native seam uses the Android plugin's real method names (P00-T21)", () => {
  const java = readFileSync(
    fileURLToPath(
      new URL(
        '../../node_modules/@capacitor-firebase/crashlytics/android/src/main/java/io/capawesome/capacitorjs/plugins/firebase/crashlytics/FirebaseCrashlyticsPlugin.java',
        import.meta.url,
      ),
    ),
    'utf8',
  );
  const seam = readFileSync(fileURLToPath(new URL('./native/firebaseCrashlytics.ts', import.meta.url)), 'utf8');

  // Until P00-T21 the seam declared addLogMessage, which Android does not have: every breadcrumb was rejected and swallowed.
  it('every method the seam declares is a @PluginMethod of FirebaseCrashlyticsPlugin.java', () => {
    const declared = [...seam.matchAll(/^\s{2}(\w+)\(options/gm)].map((m) => m[1]);
    expect([...declared].sort()).toEqual(['log', 'recordException', 'setCustomKey', 'setEnabled']);
    for (const name of declared) expect(java).toMatch(new RegExp(`@PluginMethod\\s+public void ${name}\\(PluginCall call\\)`));
  });

  it('recordException reads the stacktrace array and setCustomKey reads the type (the shapes Crash.ts sends)', () => {
    expect(java).toContain('call.getArray("stacktrace", null)');
    expect(java).toContain('call.getString("type", "string")');
  });
});
