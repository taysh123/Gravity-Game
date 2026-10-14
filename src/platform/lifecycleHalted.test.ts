import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLATFORM } from '../config/platform.config';

// P00-T21 Task 5 review. When the frame guard has stopped the game and its DOM overlay is up (platform/errorOverlay.ts), the lifecycle must
// leave it that way: a foreground return gives no audio back, and Back restarts the page instead of being routed into a scene manager that is
// asleep with the loop (which would queue work that never runs, or background the app). lifecycle.ts imports Phaser and the app's audio /
// settings / transition modules, which do not load in Vitest's node environment, so those are mocked (the set lifecycleReport.test.ts uses).
// errorOverlay.ts, foreground.ts and the decision modules are real. A fresh module graph per test.

type Listener = (e?: { key?: string; repeat?: boolean }) => void;

const OVERLAY_ID = PLATFORM.ERROR_OVERLAY.ID;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => setTimeout(r, 0));
};

const MOCKED = ['phaser', '@capacitor/core', '../utils/native/app', '../utils/transitions', '../utils/AudioSynth', '../utils/SettingsStore', '../services/Crash'];

async function load({ native = false, overlayUp = false }: { native?: boolean; overlayUp?: boolean } = {}) {
  vi.resetModules();
  const state = { overlayUp };
  const docListeners = new Map<string, Listener>();
  const winListeners = new Map<string, Listener>();
  const appListeners = new Map<string, Listener>();
  const reload = vi.fn();
  const audio = { suspend: vi.fn(), resume: vi.fn() };
  const scenesConsulted = vi.fn();
  const refresh = vi.fn();
  const game = {
    scene: {
      getScenes: (): never[] => {
        scenesConsulted();
        return [];
      },
    },
    events: { once: (): void => undefined },
    scale: { refresh },
  };
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, fn: Listener): void => {
      docListeners.set(type, fn);
    },
    getElementById: (id: string): object | null => (state.overlayUp && id === OVERLAY_ID ? {} : null),
  };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', {
    addEventListener: (type: string, fn: Listener): void => {
      winListeners.set(type, fn);
    },
    location: { reload },
  });
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
  vi.doMock('../utils/AudioSynth', () => ({ sharedAudio: () => audio }));
  vi.doMock('../utils/SettingsStore', () => ({ SettingsStore: { get: () => ({ sound: true, music: true }) } }));
  vi.doMock('../services/Crash', () => ({ Crash: { recordError: () => undefined, log: () => undefined } }));
  const lifecycle = await import('./lifecycle');
  const foreground = await import('./foreground');
  const g = game as unknown as Parameters<typeof lifecycle.installLifecycle>[0];
  lifecycle.installLifecycle(g);
  lifecycle.installBackNavigation(g);
  await flush(); // the native listeners are registered once the (mocked) plugin import resolves
  return {
    lifecycle,
    foreground,
    state,
    audio,
    reload,
    refresh,
    scenesConsulted,
    appListeners,
    visibility: (v: DocumentVisibilityState): void => {
      doc.visibilityState = v;
      docListeners.get('visibilitychange')!();
    },
    escape: (): void => winListeners.get('keydown')!({ key: 'Escape', repeat: false }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const m of MOCKED) vi.doUnmock(m);
});

describe('a foreground return while the game is halted behind the error overlay', () => {
  it('the control: with no overlay, hidden suspends the audio and visible gives it back', async () => {
    const t = await load();
    t.visibility('hidden');
    t.visibility('visible');
    expect(t.audio.suspend).toHaveBeenCalledTimes(1);
    expect(t.audio.resume).toHaveBeenCalledTimes(1);
    expect(t.refresh).toHaveBeenCalledTimes(1);
  });

  it('with the overlay up, hidden still suspends and visible refits but never resumes the audio', async () => {
    const t = await load({ overlayUp: true });
    t.visibility('hidden');
    t.visibility('visible');
    expect(t.audio.suspend).toHaveBeenCalledTimes(1);
    expect(t.audio.resume).not.toHaveBeenCalled();
    expect(t.refresh).toHaveBeenCalledTimes(1);
  });

  it('the native pause / resume events are held to the same rule', async () => {
    const t = await load({ native: true, overlayUp: true });
    t.appListeners.get('pause')!();
    t.appListeners.get('resume')!();
    expect(t.audio.suspend).toHaveBeenCalledTimes(1);
    expect(t.audio.resume).not.toHaveBeenCalled();
  });

  it('it is the overlay, read each time: a return after the overlay is gone gives the audio back again', async () => {
    const t = await load({ overlayUp: true });
    t.visibility('hidden');
    t.visibility('visible');
    expect(t.audio.resume).not.toHaveBeenCalled();
    t.state.overlayUp = false;
    t.visibility('hidden');
    t.visibility('visible');
    expect(t.audio.resume).toHaveBeenCalledTimes(1);
  });

  it('the pause-overlay reader that services ask (Ads: give audio back after an ad?) says "up" while the error overlay is', async () => {
    const t = await load();
    expect(t.foreground.isPauseOverlayUp()).toBe(false);
    t.state.overlayUp = true;
    expect(t.foreground.isPauseOverlayUp()).toBe(true);
  });
});

describe('Back while the game is halted behind the error overlay', () => {
  it('the control: with no overlay, Escape goes to the router (the scene manager is consulted) and nothing reloads', async () => {
    const t = await load();
    t.escape();
    expect(t.scenesConsulted).toHaveBeenCalled();
    expect(t.reload).not.toHaveBeenCalled();
  });

  it('Escape restarts the page, once, without consulting the scene manager', async () => {
    const t = await load({ overlayUp: true });
    t.escape();
    t.escape();
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(t.scenesConsulted).not.toHaveBeenCalled();
  });

  it('handleBack() returns no routing action while it restarts', async () => {
    const t = await load({ overlayUp: true });
    expect(t.lifecycle.handleBack()).toEqual({ type: 'none' });
    expect(t.reload).toHaveBeenCalledTimes(1);
  });

  it('the native Back button does the same', async () => {
    const t = await load({ native: true, overlayUp: true });
    t.appListeners.get('backButton')!();
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(t.scenesConsulted).not.toHaveBeenCalled();
  });
});
