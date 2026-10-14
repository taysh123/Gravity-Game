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
  // localStorage is never removed, so progress is safe either way. Writes made while it is off are
  // remembered locally. When it is turned back on, a key that localStorage already held when the
  // mirror-off session started keeps its localStorage value (it is newer than the mirror's copy); a key
  // first created during a mirror-off session yields to the mirror, because it may be a default
  // regrown after a WebView wipe and must not replace the full copy.
  SAVE_MIRROR_ENABLED: true,
  // Upper bound on how long BootScene waits for Saves.hydrate() (src/platform/saves.ts). The target is
  // <= 60 ms (V19); this only guards against a bridge that never answers. Past it the session runs on
  // localStorage alone and its writes are reconciled on the next launch.
  SAVE_HYDRATE_TIMEOUT_MS: 2500,
  // Save keys kept out of the Preferences mirror (localStorage only). ghost:v1 holds hundreds of KB of
  // best-run replay paths; mirroring it would make every SharedPreferences apply() rewrite that whole XML
  // and slow hydrate. Losing it on a WebView wipe only costs the ghost trails, never progress.
  SAVE_LOCAL_ONLY_KEYS: ['gravity-flow:ghost:v1'] as readonly string[],

  // Renderer-crash recovery (D-11). MainActivity.java recreates the activity when the WebView's renderer
  // process dies, at most RENDERER_MAX_RECOVERIES times per process, and adds one to the String count under
  // RENDERER_GONE_KEY in the Capacitor Preferences file (SharedPreferences "CapacitorStorage"). Saves.hydrate()
  // reads and clears it and reports one non-fatal (src/platform/rendererGone.ts). The key is deliberately
  // outside SAVE_PREFIX: it is a native flag, not save data, so it is never mirrored into localStorage.
  // MainActivity.java repeats both values; src/platform/rendererGone.test.ts pins that they match.
  RENDERER_GONE_KEY: 'platform:rendererGone',
  RENDERER_MAX_RECOVERIES: 2,

  // Frame-error guard (src/platform/frameGuard.ts): this many uncaught frame errors inside the window
  // freeze the loop and show the "Tap to restart" overlay.
  FRAME_ERROR_BURST: 3,
  FRAME_ERROR_WINDOW_MS: 2000,
  // The frame guard's "Tap to restart" overlay (src/platform/errorOverlay.ts): plain DOM over the canvas, independent of Phaser,
  // because the game loop is what failed. A tap reloads the page. ID and the copy are mirrored by the boot-smoke harness
  // (scripts/harness/lib/copy.mjs ERROR_OVERLAY, pinned by constants.test.mjs).
  ERROR_OVERLAY: {
    ID: 'gf-error-overlay',
    TITLE: 'Something went wrong',
    ACTION: 'Tap to restart',
    // Opaque game background (#0d0d1a, as in main.ts and index.html): the stopped frame is hidden and the text keeps its contrast
    // (THEME.TEXT_PRIMARY about 16:1, THEME.TEXT_MUTED about 6:1).
    BACKGROUND: '#0d0d1a',
    Z_INDEX: 2147483647, // the CSS maximum: above the canvas and anything else on the page
    TITLE_FONT_PX: 20,
    TITLE_WEIGHT: '700',
    ACTION_FONT_PX: 16,
    GAP_PX: 12,
    SIDE_PAD_PX: 24,
  },

  // Crashlytics (src/services/Crash.ts): non-fatal reports sent per session; each distinct message is sent once (P00-T21 enforces both).
  CRASH_MAX_PER_SESSION: 5,
  // At most this many V8 frames go with a report (src/services/stackParse.ts). V8 records 10 by default; this bounds the bridge payload.
  CRASH_MAX_STACK_FRAMES: 32,
  // The `level` custom key of a scene that is not a level scene (menus, Gravity Run): src/services/crashContext.ts. Never a real level.
  CRASH_NO_LEVEL: 0,
  // The first level number: GameScene plays level 1 when a start names none, and the daily's index is 0-based, so the `level` key of a
  // daily is its index + this (src/services/crashContext.ts).
  CRASH_FIRST_LEVEL: 1,

  // Pre-consent analytics queue length; the oldest event is dropped beyond this.
  ANALYTICS_QUEUE_MAX: 100,
} as const;
