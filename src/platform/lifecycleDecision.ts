// Pure background/foreground decision (D-11, P00-T11; docs/roadmap/phases/P00-foundation.md section 3). The wiring in
// lifecycle.ts reads the live scenes and settings, calls lifecycleDecision() and executes the returned actions. No
// Phaser, no Capacitor, no DOM, no I/O, so every row is unit-tested (lifecycle.test.ts).
//
// Contract:
//   hidden  -> pause live gameplay (open the pause overlay) unless an ad / purchase flow is in flight or an
//              overlay is already up; always suspend audio (AudioSynth.suspend: ctx.suspend() + hum off).
//   visible -> refit the canvas; resume audio only if Sound or Music is on AND the pause overlay is not up.
//   Gameplay is NEVER resumed here: only an explicit CONTINUE / Back on the overlay does that. There is no
//   "resume gameplay" action in the result type, so no input can produce one.
import { PLATFORM } from '../config/platform.config';
import type { SceneSnapshot } from './backRouter';

export type Visibility = 'hidden' | 'visible';

export interface LifecycleInput {
  visibility: Visibility;
  // A GameScene / EndlessScene is running and its run has not ended (won / dying / leaving / Endless run over).
  gameplayActive: boolean;
  // PauseScene is open (running, or paused beneath Settings), or its launch is already queued.
  pauseOverlayUp: boolean;
  // An ad, purchase or consent flow is in flight (src/platform/externalFlow.ts): the app only looks "hidden" because
  // a native sheet covers it, so the pause overlay must not open for it.
  externalFlowActive: boolean;
  sound: boolean;
  music: boolean;
}

export interface LifecycleActions {
  requestPause: boolean; // open PauseScene over the live gameplay scene (requestPause('background'))
  suspendAudio: boolean; // AudioSynth.suspend()
  refreshScale: boolean; // game.scale.refresh()
  resumeAudio: boolean; // AudioSynth.resume()
}

export function lifecycleDecision(i: LifecycleInput): LifecycleActions {
  if (i.visibility === 'hidden') {
    return {
      requestPause: i.gameplayActive && !i.pauseOverlayUp && !i.externalFlowActive,
      suspendAudio: true,
      refreshScale: false,
      resumeAudio: false,
    };
  }
  return {
    requestPause: false,
    suspendAudio: false,
    refreshScale: true,
    resumeAudio: !i.pauseOverlayUp && (i.sound || i.music),
  };
}

export interface AdAudioInput {
  wasWanted: boolean; // game audio was playing (wanted) when the ad took the screen
  foreground: boolean; // the app is in front right now (isAppForeground)
  pauseOverlayUp: boolean;
  sound: boolean;
  music: boolean;
}

// An ad just ended (P00-T19): may Ads give the game audio back itself? Only under the same conditions as the foreground path above:
// the app is in front, no pause overlay is up, Sound or Music is on. Otherwise the audio stays off here and comes back through the
// lifecycle's foreground path (hidden) or the overlay's CONTINUE (pause overlay), exactly as without an ad.
export function resumeAudioAfterAd(i: AdAudioInput): boolean {
  return i.wasWanted && i.foreground && !i.pauseOverlayUp && (i.sound || i.music);
}

export interface LifecycleScenes {
  // The gameplay scene to pause (running, run not ended), or null.
  gameplayKey: string | null;
  // PauseScene is running or paused (Settings open over it).
  pauseOverlayUp: boolean;
}

// Scenes are listed bottom-to-top (Phaser scene-list order), the same snapshot the Back router uses. A gameplay scene
// whose `gameplayEnded` is undefined does not implement the Pausable contract and cannot be paused, so it is not live.
// Settings alone (opened from the HUD over a paused level) is not the pause overlay: audio keeps playing there.
export function deriveLifecycleScenes(scenes: readonly SceneSnapshot[]): LifecycleScenes {
  let gameplayKey: string | null = null;
  for (const s of scenes) {
    if (s.running && s.gameplayEnded === false && PLATFORM.BACK.GAMEPLAY_SCENES.includes(s.key)) gameplayKey = s.key;
  }
  const pauseOverlayUp = scenes.some((s) => s.key === PLATFORM.BACK.PAUSE_SCENE && (s.running || s.paused));
  return { gameplayKey, pauseOverlayUp };
}
