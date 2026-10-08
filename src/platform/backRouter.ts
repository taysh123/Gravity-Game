// Pure Android Back routing (D-11, docs/roadmap/phases/P00-foundation.md section 3). A snapshot of the live
// scenes goes in, one action comes out; src/platform/lifecycle.ts executes the action. No Phaser, no Capacitor,
// no I/O, so every row of the table is unit-tested (backRouter.test.ts).
//
// Priority, top-down:
//   0. a full-screen ad is requested or on screen (Ads.isShowing(), P00-T19): none. Back must not walk away from the screen that is
//      waiting on the ad (the ad would play over the menu and its reward be dropped)
//   1. open overlay: PauseScene -> resume the gameplay scene beneath; any other overlay (Settings) -> close it
//   2. running GameScene / EndlessScene -> open PauseScene
//   3. ended run: Endless run-over -> MainMenuScene; won / dying / leaving level -> none
//   4. MainMenuScene -> system (the handler is disabled there, so Android does its own warm background exit)
//   5. sub-menu -> its parent from PLATFORM.PARENT_SCENE
//   6. splash or unknown scene -> none
// The router never exits the app: there is no exit action, and exitApp() is never called anywhere.
import { PLATFORM } from '../config/platform.config';

export type BackAction =
  // closeOverlay: key = the overlay to close. resume: key = the paused gameplay scene (its PauseScene closes).
  // pause: key = the gameplay scene to pause.
  | { type: 'closeOverlay' | 'pause' | 'resume'; key: string }
  | { type: 'toScene'; key: string }
  | { type: 'system' }
  | { type: 'none' };

export interface BackState {
  overlay: string | null; // topmost open overlay scene key (e.g. 'SettingsScene', 'PauseScene'), if any
  active: string; // the non-overlay scene the player is in (running, or paused beneath an overlay); '' if none
  gameplayEnded: boolean; // active gameplay scene has won / died / is leaving (Endless: run over)
  adShowing: boolean; // a full-screen ad is requested or on screen (Ads.isShowing())
  parents: Readonly<Record<string, string>>; // sub-menu -> parent, PLATFORM.PARENT_SCENE
}

const NONE: BackAction = { type: 'none' };
const SYSTEM: BackAction = { type: 'system' };

function isIn(list: readonly string[], key: string): boolean {
  return list.includes(key);
}

export function routeBack(s: BackState): BackAction {
  const B = PLATFORM.BACK;

  if (s.adShowing) return NONE;

  if (s.overlay !== null) {
    if (s.overlay === B.PAUSE_SCENE) return { type: 'resume', key: s.active };
    return { type: 'closeOverlay', key: s.overlay };
  }

  if (isIn(B.GAMEPLAY_SCENES, s.active)) {
    if (!s.gameplayEnded) return { type: 'pause', key: s.active };
    return isIn(B.ENDED_TO_MENU_SCENES, s.active) ? { type: 'toScene', key: B.MENU_SCENE } : NONE;
  }

  if (s.active === B.MENU_SCENE) return SYSTEM;

  // hasOwnProperty, not `in` / indexing alone: a scene key like 'constructor' must not resolve to a prototype member.
  if (Object.prototype.hasOwnProperty.call(s.parents, s.active)) return { type: 'toScene', key: s.parents[s.active] };

  return NONE;
}

// One scene as the wiring sees it (Phaser's sys.isActive() / sys.isPaused() plus the optional Pausable flag).
export interface SceneSnapshot {
  key: string;
  running: boolean;
  paused: boolean;
  gameplayEnded?: boolean;
}

// Scenes are listed bottom-to-top (Phaser scene-list order). The overlay is the first PLATFORM.BACK.OVERLAY_SCENES
// entry that is running (a paused overlay sits beneath a running one). The active scene is the topmost non-overlay
// scene that is running or paused.
export function deriveBackState(scenes: readonly SceneSnapshot[], parents: Readonly<Record<string, string>>, adShowing = false): BackState {
  const running = new Set(scenes.filter((s) => s.running).map((s) => s.key));
  const overlay = PLATFORM.BACK.OVERLAY_SCENES.find((key) => running.has(key)) ?? null;

  let active: SceneSnapshot | undefined;
  for (const s of scenes) {
    if ((s.running || s.paused) && !isIn(PLATFORM.BACK.OVERLAY_SCENES, s.key)) active = s;
  }

  return { overlay, active: active?.key ?? '', gameplayEnded: active?.gameplayEnded ?? false, adShowing, parents };
}
