// Duck-typed contracts between the platform wiring and the scenes (D-11). The platform layer never imports a
// scene class: it only checks these shapes at runtime, so a scene that drops a member degrades to "Back does
// nothing" instead of throwing inside the native back-button handler.

// Why the pause was requested: the Back router, the lifecycle hooks (background, P00-T11), or the Endless HUD button.
export type PauseReason = 'back' | 'background' | 'button';

// What PauseScene asks its caller to do. CONTINUE is handled by PauseScene itself (it resumes the caller).
export type PauseAction = 'restart' | 'home';

// GameScene and EndlessScene.
export interface Pausable {
  // True once the run has won / died / is leaving (GameScene) or is over (EndlessScene).
  readonly gameplayEnded: boolean;
  // Stops the hum, releases the attractor and opens PauseScene; a no-op once gameplayEnded or when already paused.
  requestPause(reason: PauseReason): void;
}

// Overlay scenes (SettingsScene, PauseScene): close() resumes the scene beneath and stops the overlay.
export interface Dismissable {
  close(): void;
}

export function isPausable(s: unknown): s is Pausable {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as { gameplayEnded?: unknown; requestPause?: unknown };
  return typeof o.gameplayEnded === 'boolean' && typeof o.requestPause === 'function';
}

export function isDismissable(s: unknown): s is Dismissable {
  return typeof s === 'object' && s !== null && typeof (s as { close?: unknown }).close === 'function';
}
