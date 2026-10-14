import { afterEach, describe, expect, it, vi } from 'vitest';

// P00-T21 fold-in (P00-T19 review). platform/lifecycle.ts reports the activity state (foreground.ts reportActivity, which the ad
// timers read) and notifies the foreground subscribers (the IAP refresh) AFTER its own background / foreground step. When that step
// threw (an unguarded g.scale.refresh() or snapshotScenes()), both were skipped, so the ad timers kept counting against an activity
// they believed was still resumed. Each listener now reports in a `finally`. The error is not swallowed: it still leaves the
// listener, where the global error bridge (Crash.init) records it.
//
// lifecycle.ts imports Phaser and the app's audio / settings / transition modules, which do not load in Vitest's node environment,
// so they are mocked. A fresh module graph per test (vi.resetModules) also resets foreground.ts's activity state.

type Listener = () => void;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => setTimeout(r, 0));
};

const BROKEN = 'scene manager gone';

// The scene manager throws: snapshotScenes() is the first thing the lifecycle step touches, on both paths.
const brokenGame = {
  scene: {
    getScenes: (): never => {
      throw new Error(BROKEN);
    },
  },
  events: { once: (): void => undefined },
  scale: { refresh: (): void => undefined },
};

const MOCKED = [
  'phaser',
  '@capacitor/core',
  '../utils/native/app',
  '../utils/transitions',
  '../utils/AudioSynth',
  '../utils/SettingsStore',
  '../services/Crash',
];

async function load(native: boolean) {
  vi.resetModules();
  const docListeners = new Map<string, Listener>();
  const appListeners = new Map<string, Listener>();
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, fn: Listener): void => {
      docListeners.set(type, fn);
    },
  };
  vi.stubGlobal('document', doc);
  vi.doMock('phaser', () => ({ default: { Core: { Events: { POST_STEP: 'poststep' } } } }));
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  vi.doMock('../utils/native/app', () => ({
    App: {
      addListener: async (name: string, fn: Listener) => {
        appListeners.set(name, fn);
        return { remove: async () => undefined };
      },
      toggleBackButtonHandler: async () => undefined,
      minimizeApp: async () => undefined,
    },
  }));
  vi.doMock('../utils/transitions', () => ({ fadeToScene: () => undefined }));
  vi.doMock('../utils/AudioSynth', () => ({ sharedAudio: () => ({ suspend: () => undefined, resume: () => undefined }) }));
  vi.doMock('../utils/SettingsStore', () => ({ SettingsStore: { get: () => ({ sound: true, music: true }) } }));
  vi.doMock('../services/Crash', () => ({ Crash: { recordError: () => undefined, log: () => undefined } }));
  const lifecycle = await import('./lifecycle');
  const foreground = await import('./foreground');
  lifecycle.installLifecycle(brokenGame as unknown as Parameters<typeof lifecycle.installLifecycle>[0]);
  await flush(); // the native listeners are registered once the (mocked) plugin import resolves
  return { foreground, doc, docListeners, appListeners };
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const m of MOCKED) vi.doUnmock(m);
});

describe('lifecycle: the activity state is reported even when the lifecycle step throws (P00-T21)', () => {
  it('web: a hidden visibilitychange whose step throws still reports the activity paused, and the error still leaves the listener', async () => {
    const { foreground, doc, docListeners } = await load(false);
    const onChange = docListeners.get('visibilitychange');
    expect(onChange).toBeDefined();
    doc.visibilityState = 'hidden';
    expect(() => onChange!()).toThrow(BROKEN);
    expect(foreground.isActivityResumed()).toBe(false);
  });

  it('web: the visible visibilitychange that follows also throws, yet reports resumed and still notifies the foreground subscribers', async () => {
    const { foreground, doc, docListeners } = await load(false);
    const onChange = docListeners.get('visibilitychange')!;
    const notified: string[] = [];
    foreground.onAppForeground(() => notified.push('foreground'));
    doc.visibilityState = 'hidden';
    expect(() => onChange()).toThrow(BROKEN);
    expect(foreground.isActivityResumed()).toBe(false);
    doc.visibilityState = 'visible';
    expect(() => onChange()).toThrow(BROKEN);
    expect(foreground.isActivityResumed()).toBe(true);
    expect(notified).toEqual(['foreground']);
  });

  it('Android: a native pause whose step throws still reports the activity paused', async () => {
    const { foreground, appListeners } = await load(true);
    const pause = appListeners.get('pause');
    expect(pause).toBeDefined();
    expect(() => pause!()).toThrow(BROKEN);
    expect(foreground.isActivityResumed()).toBe(false);
  });

  it('Android: a native resume whose step throws still reports resumed and notifies the foreground subscribers', async () => {
    const { foreground, appListeners } = await load(true);
    const notified: string[] = [];
    foreground.onAppForeground(() => notified.push('foreground'));
    expect(() => appListeners.get('pause')!()).toThrow(BROKEN);
    expect(() => appListeners.get('resume')!()).toThrow(BROKEN);
    expect(foreground.isActivityResumed()).toBe(true);
    expect(notified).toEqual(['foreground']);
  });
});
