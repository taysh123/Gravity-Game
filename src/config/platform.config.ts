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

  // Scene keys the Back router and its wiring treat specially (all must be registered in main.ts; the
  // scene keys are pinned by src/config/platformConfig.test.ts).
  BACK: {
    MENU_SCENE: 'MainMenuScene',
    // The pause overlay: Back on it resumes the gameplay scene underneath.
    PAUSE_SCENE: 'PauseScene',
    // Overlay scenes, topmost first (Settings can open over PauseScene). An open overlay takes Back before
    // anything beneath it.
    OVERLAY_SCENES: ['SettingsScene', 'PauseScene'] as readonly string[],
    // Scenes that implement the Pausable contract (requestPause + gameplayEnded, src/platform/pausable.ts).
    GAMEPLAY_SCENES: ['GameScene', 'EndlessScene'] as readonly string[],
    // Gameplay scenes whose ended run sends Back to the menu (Endless run-over). A won or dying level ignores
    // Back instead: its auto-advance / auto-restart is already in progress.
    ENDED_TO_MENU_SCENES: ['EndlessScene'] as readonly string[],
    // Startup splashes: Back is swallowed, never routed.
    INERT_SCENES: ['BootScene', 'CompanySplashScene', 'IntroSplashScene'] as readonly string[],
  },

  // PauseScene -> the scene it paused. The caller owns its own teardown (goHome, restart), so PauseScene only
  // resumes it or emits this event with a PauseAction ('restart' | 'home') on the caller's events.
  PAUSE_ACTION_EVENT: 'pause-action',

  // PauseScene / Endless pause-button layout. Touch targets stay at or above 44 px (CONTINUE at or above 48).
  PAUSE_UI: {
    PANEL_W_RATIO: 0.86,
    PANEL_MAX_W: 320,
    PANEL_PAD_X: 22,
    PANEL_PAD_BOTTOM: 24,
    HEADER_H: 68,
    TITLE_SIZE_PX: 20,
    TITLE_SPACING_PX: 2,
    PRIMARY_H: 56,
    SECONDARY_H: 48,
    PRIMARY_FONT_PX: 20,
    SECONDARY_FONT_PX: 17,
    BTN_GAP: 12,
    POP_FROM_SCALE: 0.85,
    POP_MS: 320,
    // Endless HUD pause button (top-right, below the safe-area inset).
    HUD_BUTTON_SIZE: 46,
    HUD_BUTTON_MARGIN: 8,
    HUD_SAFE_PAD: 12,
    HUD_DEPTH: 100,
  },

  // Opened from Settings via window.open(url, '_blank'). Must match the URL entered in Play Console.
  PRIVACY_POLICY_URL: 'https://taysh123.github.io/Gravity-Game/',

  // Every persisted key starts with this (e.g. 'gravity-flow:progress:v9'); the @capacitor/preferences
  // mirror lists and restores keys by this prefix.
  SAVE_PREFIX: 'gravity-flow:',
  // Kill switch for the Preferences mirror. false = stop mirroring writes and restoring on hydrate;
  // localStorage is never removed, so progress is safe either way. Keys written while it is off are
  // remembered locally, so turning it back on keeps them instead of the older mirror copies.
  SAVE_MIRROR_ENABLED: true,
  // Upper bound on how long BootScene waits for Saves.hydrate() (src/platform/saves.ts). The target is
  // <= 60 ms (V19); this only guards against a bridge that never answers. Past it the session runs on
  // localStorage alone and its writes are reconciled on the next launch.
  SAVE_HYDRATE_TIMEOUT_MS: 2500,
  // Save keys kept out of the Preferences mirror (localStorage only). ghost:v1 holds hundreds of KB of
  // best-run replay paths; mirroring it would make every SharedPreferences apply() rewrite that whole XML
  // and slow hydrate. Losing it on a WebView wipe only costs the ghost trails, never progress.
  SAVE_LOCAL_ONLY_KEYS: ['gravity-flow:ghost:v1'] as readonly string[],

  // Frame-error guard (src/platform/frameGuard.ts): this many uncaught frame errors inside the window
  // freeze the loop and show the "Tap to restart" overlay.
  FRAME_ERROR_BURST: 3,
  FRAME_ERROR_WINDOW_MS: 2000,

  // Crashlytics: non-fatal reports sent per session (deduplicated by message hash).
  CRASH_MAX_PER_SESSION: 5,

  // Pre-consent analytics queue length; the oldest event is dropped beyond this.
  ANALYTICS_QUEUE_MAX: 100,
} as const;
