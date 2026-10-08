// Android platform wiring (D-11). Two halves, both with their decision logic pure and unit-tested:
//
// 1. Back (P00-T10). The routing decision is pure (backRouter.ts); this module reads the live Phaser scenes, executes
//    the resulting action, and registers the two inputs that mean "Back":
//      - native: the @capacitor/app `backButton` event (gesture and 3-button navigation, incl. predictive back)
//      - everywhere: the Escape key, so the same router can be driven from a desktop browser
//    exitApp() is never called: leaving the app is the system's warm background exit, which works because
//    MainMenuScene disables the handler (setBackHandlerEnabled).
//
// 2. Background / foreground (P00-T11). The decision is pure (lifecycleDecision.ts): hidden = pause live gameplay
//    behind the pause overlay + silence audio; visible = refit, resume audio unless the overlay is up, and never
//    auto-resume gameplay. Triggers: `visibilitychange` on every platform, plus the @capacitor/app `pause` / `resume`
//    events on native (Activity onPause / onResume, which also covers split-screen focus loss).
//
// The native plugin is dynamically imported behind Capacitor.isNativePlatform() (same pattern as Ads.ts), so the
// web bundle never loads it.
import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { PLATFORM } from '../config/platform.config';
import { fadeToScene } from '../utils/transitions';
import { sharedAudio } from '../utils/AudioSynth';
import { SettingsStore } from '../utils/SettingsStore';
import { Crash } from '../services/Crash';
import type { AppBridge } from '../utils/native/app';
import { routeBack, deriveBackState, type BackAction, type BackState, type SceneSnapshot } from './backRouter';
import { lifecycleDecision, deriveLifecycleScenes, type LifecycleActions, type Visibility } from './lifecycleDecision';
import { isExternalFlowActive } from './externalFlow';
import { notifyForeground, reportActivity, setPauseOverlayReader } from './foreground';
import { AD_EXTERNAL_FLOW_SOURCE } from '../config/monetization.config';
import { isDismissable, isPausable } from './pausable';

// Ads / purchase / consent flows raise this around the native sheet so the background pause ignores them
// (P00-T16 IAP, P00-T19 Ads). Re-exported so callers can import everything lifecycle-related from one place.
export { setExternalFlowActive, isExternalFlowActive } from './externalFlow';

let game: Phaser.Game | null = null;
let installed = false;
let lifecycleInstalled = false;

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
      // Plugin unavailable: no native listener can be registered. That leaves Back dead, NOT with the system:
      // AppPlugin's OnBackPressedCallback is enabled by default and, with no 'backButton' listener, it only walks
      // WebView history (there is none). The plugin ships in the synced Android project, so this is a broken build.
      app = null;
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
  // A full-screen ad is requested or on screen: Back does nothing. The ADS source of the external flow only (it is up exactly while
  // Ads.isShowing(); platform may not import services/Ads), so a stuck IAP or consent flag cannot swallow Back for good.
  const state = deriveBackState(snapshotScenes(game), PLATFORM.PARENT_SCENE, isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE));
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
    // Listener not registered: Back is dead until the next launch, not handed to the system (see ensureApp: the
    // plugin's callback is enabled by default and, without a listener, only walks WebView history).
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
      // plugin callback not ready: it stays as it is (enabled by default, so Back reaches the JS router)
    }
  });
}

// ── Background / foreground (P00-T11) ────────────────────────────────────────────────────────────────────────────

// A background pause has been requested but PauseScene has not launched yet. ScenePlugin.pause() / launch() are queued
// and applied at the start of the next scene-manager step, which does not run while the page is hidden. Until that
// step, the scene snapshot cannot see the overlay, so a second trigger in the same background period (native `pause`
// plus `visibilitychange`) must not open it twice, and the foreground path must not resume audio under an overlay
// that is about to appear. Cleared after the first step, by which time PauseScene is visible to the snapshot.
let pausePending = false;

function runLifecycle(visibility: Visibility): LifecycleActions | null {
  if (!game) return null;
  const g = game;
  const scenes = deriveLifecycleScenes(snapshotScenes(g));
  const settings = SettingsStore.get();
  const actions = lifecycleDecision({
    visibility,
    gameplayActive: scenes.gameplayKey !== null,
    pauseOverlayUp: scenes.pauseOverlayUp || pausePending,
    externalFlowActive: isExternalFlowActive(),
    adFlowActive: isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE),
    sound: settings.sound,
    music: settings.music,
  });

  // Hidden must always be silent: suspend FIRST, so nothing below (opening the pause overlay) can leave audio playing
  // behind a hidden app.
  if (actions.suspendAudio) {
    try {
      sharedAudio().suspend();
    } catch {
      // audio unavailable: nothing to suspend
    }
  }
  if (actions.requestPause && scenes.gameplayKey !== null) {
    const scene = g.scene.getScene(scenes.gameplayKey);
    if (isPausable(scene)) {
      try {
        scene.requestPause('background');
        pausePending = true;
        g.events.once(Phaser.Core.Events.POST_STEP, () => {
          pausePending = false;
        });
      } catch (e) {
        // Audio is already suspended above. Report and carry on (the foreground path still refits and resumes audio);
        // never rethrow into the visibilitychange / native pause listener. pausePending stays false: no overlay is
        // coming, so the foreground path must not wait for one.
        Crash.recordError(e, 'lifecycle.requestPause');
      }
    }
  }
  if (actions.refreshScale) g.scale.refresh();
  if (actions.resumeAudio) {
    try {
      sharedAudio().resume();
    } catch {
      // audio unavailable: ignore
    }
  }
  return actions;
}

// The app went to the background (Home, app switcher, screen off, another app on top, or a native ad covering the activity). Returns
// the actions taken (tests and the headless check read them). Idempotent: a second trigger in the same background period is harmless.
export function onBackground(): LifecycleActions | null {
  return runLifecycle('hidden');
}

// The app is visible again. Never resumes gameplay: the pause overlay stays until the player taps CONTINUE or Back.
// Foreground subscribers (src/platform/foreground.ts, e.g. the IAP customer-info refresh) are notified afterwards.
export function onForeground(): LifecycleActions | null {
  const actions = runLifecycle('visible');
  notifyForeground();
  return actions;
}

async function registerNativeLifecycle(): Promise<void> {
  if (!(await ensureApp()) || !app) return;
  try {
    // The native pause / resume are the activity state on Android (foreground.ts): AdMob's translucent AdActivity pauses ours while
    // the WebView can still report visible, and Ads' show timers must not run while an ad is on top.
    await app.addListener('pause', () => {
      onBackground();
      reportActivity('native', false);
    });
    await app.addListener('resume', () => {
      onForeground();
      reportActivity('native', true);
    });
  } catch {
    // listeners unavailable: visibilitychange still drives the contract
  }
}

// Called once from main.ts after the Phaser.Game exists; replaces the interim audio-only visibilitychange handler.
export function installLifecycle(g: Phaser.Game): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  game = g;
  // Lets services (Ads: give audio back after an ad?) ask what only the live scenes know.
  setPauseOverlayReader(() => pausePending || deriveLifecycleScenes(snapshotScenes(g)).pauseOverlayUp);
  document.addEventListener('visibilitychange', () => {
    const hidden = document.visibilityState === 'hidden';
    if (hidden) onBackground();
    else onForeground();
    reportActivity('visibility', !hidden); // the activity state on the web; on Android it is ignored once a native event was seen
  });
  void registerNativeLifecycle();
}
