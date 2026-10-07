import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Crash is a thin seam over the native Crashlytics plugin, loaded lazily on first use. These tests pin the boot
// race: a report made while the plugin is still loading (or while setEnabled is pending) must be delivered once it
// is ready, not dropped. This matters most for the earliest reports (the renderer-gone marker is already cleared by
// the time it is reported, so a lost report is lost for good).

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

async function load(native: boolean, setEnabled: () => Promise<void> = async () => {}) {
  vi.resetModules();
  const plugin = {
    setEnabled: vi.fn(setEnabled),
    addLogMessage: vi.fn(async (_o: { message: string }) => {}),
    recordException: vi.fn(async (_o: { message: string }) => {}),
  };
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  vi.doMock('./native/firebaseCrashlytics', () => ({ FirebaseCrashlytics: plugin }));
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

  it('delivers a recordError made while setEnabled is still pending, once it resolves', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, () => gate.promise);
    Crash.init(); // starts loading the plugin
    await flush(); // plugin imported, setEnabled called and pending
    expect(plugin.setEnabled).toHaveBeenCalledTimes(1);

    Crash.recordError(new Error('boom'), 'boot');
    await flush();
    expect(plugin.recordException).not.toHaveBeenCalled(); // not ready yet, but also not dropped

    gate.resolve();
    await flush();
    expect(plugin.recordException).toHaveBeenCalledTimes(1);
    expect(plugin.recordException).toHaveBeenCalledWith({ message: '[boot] boom' });
  });

  it('delivers a report made before init() ever started loading, and a log, in call order', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, () => gate.promise);
    Crash.log('level_start 1');
    Crash.recordError('first', 'a');
    Crash.recordError('second');
    gate.resolve();
    await flush();
    expect(plugin.addLogMessage).toHaveBeenCalledWith({ message: 'level_start 1' });
    expect(plugin.recordException.mock.calls.map((c) => c[0])).toEqual([{ message: '[a] first' }, { message: 'second' }]);
  });

  it('initialises the plugin once however many calls arrive, before or after it is ready', async () => {
    const gate = deferred();
    const { Crash, plugin } = await load(true, () => gate.promise);
    Crash.init();
    Crash.log('one');
    Crash.recordError('two');
    Crash.recordError('three');
    gate.resolve();
    await flush();
    Crash.recordError('four'); // after ready
    await flush();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(1);
    expect(plugin.setEnabled).toHaveBeenCalledWith({ enabled: true });
    expect(plugin.recordException).toHaveBeenCalledTimes(3);
  });

  it('sends nothing, and does not throw or retry, when the plugin fails to initialise', async () => {
    const { Crash, plugin } = await load(true, async () => {
      throw new Error('plugin unavailable');
    });
    Crash.init();
    Crash.recordError('lost');
    Crash.log('lost');
    await flush();
    Crash.recordError('still lost');
    await flush();
    expect(plugin.recordException).not.toHaveBeenCalled();
    expect(plugin.addLogMessage).not.toHaveBeenCalled();
    expect(plugin.setEnabled).toHaveBeenCalledTimes(1);
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
    Crash.log('hello');
    Crash.recordError(new Error('web boom'), 'ctx');
    await flush();
    expect(plugin.setEnabled).not.toHaveBeenCalled();
    expect(plugin.addLogMessage).not.toHaveBeenCalled();
    expect(plugin.recordException).not.toHaveBeenCalled();
  });
});
