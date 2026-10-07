// Platform-layer constants (D-11 / D-12: docs/roadmap/phases/P00-foundation.md §3). Back routing,
// save mirroring, the frame-error guard, crash reporting and the analytics queue read their numbers
// and ids from here, never from literals in scene or service code. Gameplay numbers stay in
// physics.config.ts.
export const PLATFORM = {
  // Android Back navigation (src/platform/backRouter.ts): the scene that Back returns to from a
  // sub-menu. Scenes absent from this map are handled explicitly by the router (overlays, gameplay,
  // splashes, and MainMenuScene, which hands Back to the system for the warm exit).
  PARENT_SCENE: {
    LevelSelectScene: 'WorldMapScene',
    WorldMapScene: 'MainMenuScene',
    AchievementsScene: 'MainMenuScene',
    CosmeticsScene: 'MainMenuScene',
    RunSelectScene: 'MainMenuScene',
    EndScene: 'MainMenuScene',
  } as Readonly<Record<string, string>>,

  // Opened from Settings via window.open(url, '_blank'). Must match the URL entered in Play Console.
  PRIVACY_POLICY_URL: 'https://taysh123.github.io/Gravity-Game/',

  // Every persisted key starts with this (e.g. 'gravity-flow:progress:v9'); the @capacitor/preferences
  // mirror lists and restores keys by this prefix.
  SAVE_PREFIX: 'gravity-flow:',
  // Kill switch for the Preferences mirror. false = stop mirroring writes and restoring on hydrate;
  // localStorage is never removed, so progress is safe either way.
  SAVE_MIRROR_ENABLED: true,

  // Frame-error guard (src/platform/frameGuard.ts): this many uncaught frame errors inside the window
  // freeze the loop and show the "Tap to restart" overlay.
  FRAME_ERROR_BURST: 3,
  FRAME_ERROR_WINDOW_MS: 2000,

  // Crashlytics: non-fatal reports sent per session (deduplicated by message hash).
  CRASH_MAX_PER_SESSION: 5,

  // Pre-consent analytics queue length; the oldest event is dropped beyond this.
  ANALYTICS_QUEUE_MAX: 100,
} as const;
