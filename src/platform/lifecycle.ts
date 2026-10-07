// Android Back wiring (D-11, P00-T10). The routing decision is pure (backRouter.ts); this module reads the live
// Phaser scenes, executes the resulting action, and registers the two inputs that mean "Back":
//   - native: the @capacitor/app `backButton` event (gesture and 3-button navigation, incl. predictive back)
//   - everywhere: the Escape key, so the same router can be driven from a desktop browser
// The native plugin is dynamically imported behind Capacitor.isNativePlatform() (same pattern as Ads.ts), so the
// web bundle never loads it. exitApp() is never called: leaving the app is the system's warm background exit,
// which works because MainMenuScene disables the handler (setBackHandlerEnabled).
//
// P00-T11 extends this module with the background/foreground hooks.
import type Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { PLATFORM } from '../config/platform.config';
import { fadeToScene } from '../utils/transitions';
import type { AppBridge } from '../utils/native/app';
import { routeBack, deriveBackState, type BackAction, type BackState, type SceneSnapshot } from './backRouter';
import { isDismissable, isPausable } from './pausable';

let game: Phaser.Game | null = null;
let installed = false;

// NOTE: a Capacitor registerPlugin() proxy is thenable, so ensureApp() must NOT return the proxy (await would call
// proxy.then and throw "App.then() is not implemented"). It resolves to a boolean; callers use the module-scoped
// `app`.
let app: AppBridge | null = null;
let appReady: Promise<boolean> | null = null;

function ensureApp(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(false);
  appReady ??= (async () => {
    try {
      const m = await import('../utils/native/app');
      app = m.App;
    } catch {
      app = null; // plugin unavailable: Back stays with the system
    }
    return app !== null;
  })();
  return appReady;
}

function snapshotScenes(g: Phaser.Game): SceneSnapshot[] {
  return g.scene.getScenes(false).map((s) => ({
    key: s.scene.key,
    running: s.sys.isActive(),
    paused: s.sys.isPaused(),
    gameplayEnded: isPausable(s) ? s.gameplayEnded : undefined,
  }));
}

function execute(g: Phaser.Game, action: BackAction, state: BackState): void {
  switch (action.type) {
    case 'none':
      return;
    case 'system':
      // Normally unreachable on native: MainMenuScene disables the handler so Android handles Back itself. If it is
      // reached (first frames before the toggle lands), mirror Android's behaviour: background the app, never exit.
      void minimizeApp();
      return;
    case 'pause': {
      const scene = g.scene.getScene(action.key);
      if (isPausable(scene)) scene.requestPause('back');
      return;
    }
    case 'resume': {
      // PauseScene.close() resumes the gameplay scene beneath it.
      const scene = g.scene.getScene(PLATFORM.BACK.PAUSE_SCENE);
      if (isDismissable(scene)) scene.close();
      return;
    }
    case 'closeOverlay': {
      const scene = g.scene.getScene(action.key);
      if (isDismissable(scene)) scene.close();
      return;
    }
    case 'toScene': {
      const from = g.scene.getScene(state.active);
      if (from) fadeToScene(from, action.key);
      return;
    }
  }
}

// Route one Back press. Returns the action taken (tests and the headless check read it).
export function handleBack(): BackAction {
  if (!game) return { type: 'none' };
  const state = deriveBackState(snapshotScenes(game), PLATFORM.PARENT_SCENE);
  const action = routeBack(state);
  execute(game, action, state);
  return action;
}

async function minimizeApp(): Promise<void> {
  if (!(await ensureApp()) || !app) return;
  try {
    await app.minimizeApp();
  } catch {
    // nothing to do: the system keeps the app in the foreground
  }
}

async function registerNativeBack(): Promise<void> {
  if (!(await ensureApp()) || !app) return;
  try {
    await app.addListener('backButton', () => {
      handleBack();
    });
  } catch {
    // listener unavailable: Android keeps its default Back handling
  }
}

// Called once from main.ts after the Phaser.Game exists.
export function installBackNavigation(g: Phaser.Game): void {
  if (installed) return;
  installed = true;
  game = g;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.repeat) return;
    handleBack();
  });
  void registerNativeBack();
}

// Toggled calls are serialized so the last request always wins, even though the plugin is loaded asynchronously.
let toggleChain: Promise<void> = Promise.resolve();

// MainMenuScene: false so the system performs its own warm back-to-home exit (with the predictive-back animation);
// true again whenever the JS router must own Back. No-op on web.
export function setBackHandlerEnabled(enabled: boolean): void {
  if (!Capacitor.isNativePlatform()) return;
  toggleChain = toggleChain.then(async () => {
    if (!(await ensureApp()) || !app) return;
    try {
      await app.toggleBackButtonHandler({ enabled });
    } catch {
      // plugin callback not ready: leave Android's default
    }
  });
}
