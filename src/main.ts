import Phaser from 'phaser';
import './styles/fonts.css';
import { BootScene } from './scenes/BootScene';
import { CompanySplashScene } from './scenes/CompanySplashScene';
import { IntroSplashScene } from './scenes/IntroSplashScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { CosmeticsScene } from './scenes/CosmeticsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { PauseScene } from './scenes/PauseScene';
import { GameScene } from './scenes/GameScene';
import { EndlessScene } from './scenes/EndlessScene';
import { RunSelectScene } from './scenes/RunSelectScene';
import { EndScene } from './scenes/EndScene';
import { Crash } from './services/Crash';
import { BUILD_LABEL, sceneCrashKeys, watchSceneCrashKeys, webViewVersion } from './services/crashContext';
import { IAP } from './services/IAP';
import { sharedAudio } from './utils/AudioSynth';
import { installBackNavigation, installLifecycle } from './platform/lifecycle';
import { installFrameGuard } from './platform/frameGuard';
import { showErrorOverlay } from './platform/errorOverlay';
import { Saves } from './platform/saves';

// Durable saves (D-12): start the Preferences -> localStorage hydrate before anything can read a store. BootScene
// awaits the same promise together with the fonts, so no scene runs on unhydrated data. Web: localStorage only.
const hydrated = Saves.hydrate();
// Crash reporting (Crashlytics on native; global error bridge everywhere).
Crash.init();
// Crashlytics custom keys that need no game (P00-T21): set now, so an early report (the renderer-gone non-fatal that hydrate raises)
// carries them too. The renderer and the scene keys follow at READY (installCrashContext).
Crash.setKeys({
  webview_ver: webViewVersion(navigator.userAgent),
  build: BUILD_LABEL,
});
// Purchases (D-09, native only): configure RevenueCat and reconcile the entitlement snapshot. After hydrate, so the
// snapshot it writes lands on hydrated data, after migration 2 has seeded it from the legacy premium flag. Never awaited:
// boot does not wait on the store.
void hydrated.then(() => IAP.init());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'app',
    autoRound: true, // integer canvas sizes — crisper render + no fractional hit-test drift
  },
  scene: [
    BootScene,
    CompanySplashScene,
    IntroSplashScene,
    MainMenuScene,
    LevelSelectScene,
    WorldMapScene,
    AchievementsScene,
    CosmeticsScene,
    SettingsScene,
    PauseScene,
    GameScene,
    EndlessScene,
    RunSelectScene,
    EndScene,
  ],
});

// Android Back (native backButton event) + Escape on the web both go through the pure router (D-11).
installBackNavigation(game);
// Background / foreground (D-11, P00-T11): hidden = pause overlay + silent, visible = refit, never auto-resume.
installLifecycle(game);

// Size the Phaser parent (#app) to the *visible* viewport. iOS Chrome resolves
// CSS 100dvh to the larger toolbar-hidden layout viewport, so FIT was scaling the
// canvas taller than the screen and CENTER_BOTH pushed its top off-screen (-66px
// observed). window.visualViewport reports the truly-visible area (excludes the
// browser toolbars), so the FIT canvas stays within it with a top >= 0. Re-fit on
// every viewport change (toolbar show/hide, rotation).
function syncViewport(): void {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  const app = document.getElementById('app');
  if (app) {
    app.style.width = `${w}px`;
    app.style.height = `${h}px`;
    if (vv) app.style.transform = `translateY(${Math.round(vv.offsetTop)}px)`;
  }
  game.scale.refresh();
}

// Crashlytics context (P00-T21): every report says which renderer it came from (webview_ver and build are set earlier, right after
// Crash.init) and which scene, level and mode were running; each scene start is also a breadcrumb (Crash.log). The mapping is pure
// (services/crashContext.ts). Installed from READY: the scenes exist by then (the SceneManager boots its queue on READY, before this
// listener runs). The keys follow START, not CREATE: Phaser emits CREATE only after create() returns, so a throw inside create()
// would be reported under the previous scene. RESUME and WAKE bring the keys back when an overlay closes over a scene.
function installCrashContext(g: Phaser.Game): void {
  Crash.setKeys({
    renderer: g.config.renderType === Phaser.WEBGL ? 'WebGL' : 'Canvas',
  });
  watchSceneCrashKeys(
    g.scene.getScenes(false),
    [Phaser.Scenes.Events.START, Phaser.Scenes.Events.RESUME, Phaser.Scenes.Events.WAKE],
    (key, data) => {
      Crash.setKeys(sceneCrashKeys(key, data));
      Crash.log(`scene ${key}`);
    },
  );
}

// Frame-loop error boundary (P00-T21, B-10). READY comes just before Game.start() binds this.step for the loop (Game.js
// texturesReady -> start), so the guard installed here wraps the step the loop really calls. Every exception inside a frame is
// caught, logged and reported; FRAME_ERROR_BURST of them within FRAME_ERROR_WINDOW_MS stop the loop behind the DOM overlay.
game.events.once(Phaser.Core.Events.READY, () => {
  installFrameGuard(game, {
    report: (error) => Crash.recordError(error, 'frame'),
    showOverlay: () => {
      try {
        sharedAudio().suspend(); // a stopped game must not keep playing its music under the overlay
      } catch {
        // audio unavailable: nothing to silence
      }
      showErrorOverlay();
    },
  });
  installCrashContext(game);
  syncViewport();
});
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', syncViewport);
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
// A couple of delayed passes catch iOS Chrome's toolbar settling after first paint.
setTimeout(syncViewport, 300);
setTimeout(syncViewport, 1200);

// Persistent audio unlock: on EVERY gesture, resume the (custom) shared AudioContext SYNCHRONOUSLY inside the DOM
// handler if it is suspended and audio is wanted (AudioSynth.resumeFromGesture, rule in utils/audioUnlock.ts). The
// Android WebView only unlocks audio when resume() runs inside a real gesture; Phaser dispatches its pointer events
// during the game step (not the gesture call stack), so resuming from a Phaser input callback can leave the context
// suspended. It must be persistent, not one-shot: after a background return (lifecycle suspend) the context is
// suspended again and only the next gesture can restart it. The first call also creates the context in the gesture.
const unlockAudio = (): void => {
  try {
    sharedAudio().resumeFromGesture();
  } catch {
    // audio unavailable — ignore
  }
};
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('touchend', unlockAudio, { capture: true });

// Dev-only handles for automated verification (Playwright). Stripped from prod builds.
if (import.meta.env.DEV) {
  const dev = window as unknown as { __game: Phaser.Game; __Phaser: typeof Phaser; __crashTest: (times?: number) => void };
  dev.__game = game;
  dev.__Phaser = Phaser;
  // P00-T21: the next `times` updates of the first running scene throw (default: every update, until the frame guard puts the loop
  // to sleep and shows its overlay). Drives scripts/harness/checks/crash-overlay.mjs in the dev-server run of the boot smoke.
  dev.__crashTest = (times = Number.POSITIVE_INFINITY): void => {
    const scene = game.scene.getScenes(true)[0];
    if (!scene) throw new Error('__crashTest: no running scene to throw in');
    let left = times;
    const boom = (): void => {
      if (left <= 0) {
        scene.sys.events.off(Phaser.Scenes.Events.UPDATE, boom);
        return;
      }
      left -= 1;
      throw new Error('__crashTest: injected frame error');
    };
    scene.sys.events.on(Phaser.Scenes.Events.UPDATE, boom);
  };
}
