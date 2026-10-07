import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Crash is a thin seam over the native Crashlytics plugin, loaded lazily on first use. These tests pin two things.
// 1. The boot race: a report made while the plugin is still loading must be delivered once it is ready, not dropped. This matters
//    most for the earliest reports (the renderer-gone marker is already cleared by the time it is reported, so a lost report is
//    lost for good).
// 2. Consent-first (D-10.5): the manifest keeps Crashlytics collection OFF, init() never turns it on, and only enable() (called
//    by bootServices once consent has resolved, whatever the outcome) does, exactly once.

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
  // Holds the dynamic import of the plugin module until it resolves (the plugin is "still loading").
  loadGate?: Promise<void>;
  // Makes the dynamic import itself fail (the plugin is unavailable).
  loadFails?: boolean;
}

async function load(native: boolean, opts: LoadOptions = {}) {
  vi.resetModules();
  const plugin = {
    setEnabled: vi.fn(opts.setEnabled ?? (async () => {})),
    addLogMessage: vi.fn(async (_o: { message: string }) => {}),
    recordException: vi.fn(async (_o: { message: string }) => {}),
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
    expect(plugin.recordException).toHaveBeenCalledWith({ message: '[boot] boom' });
  });

  it('delivers a report made before init() ever started loading, and a log, in call order', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, { loadGate: gate.promise });
    Crash.log('level_start 1');
    Crash.recordError('first', 'a');
    Crash.recordError('second');
    gate.resolve();
    await flush();
    expect(plugin.addLogMessage).toHaveBeenCalledWith({ message: 'level_start 1' });
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
    expect(plugin.addLogMessage).toHaveBeenCalledTimes(1);
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
    expect(plugin.addLogMessage).not.toHaveBeenCalled();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
  });
});

describe('Crash consent-first collection (D-10.5)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('./native/firebaseCrashlytics');
  });

  it('init() and reports never turn collection on: the manifest default (off) stands until enable()', async () => {
    const { Crash, plugin } = await load(true);
    Crash.init();
    Crash.log('hello');
    Crash.recordError(new Error('before consent'), 'boot');
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    // Reports made before enable() still reach the plugin: Crashlytics keeps them on the device and sends them once collection
    // is enabled, so an early failure is not lost.
    expect(plugin.recordException).toHaveBeenCalledWith({ message: '[boot] before consent' });
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

describe('Crash (web / non-native)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
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
    Crash.log('hello');
    Crash.recordError(new Error('web boom'), 'ctx');
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    expect(plugin.addLogMessage).not.toHaveBeenCalled();
    expect(plugin.recordException).not.toHaveBeenCalled();
  });
});
