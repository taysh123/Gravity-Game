// On-screen strings and storage keys the checks look for. Mirrors of values in src/ (the production bundle exposes no modules,
// so a check cannot import them); constants.test.mjs fails the moment one drifts from its source.

export const WEB_NOTE = 'Available in the Android app'; // PURCHASE_COPY.WEB_ONLY
export const POLICY_URL = 'https://taysh123.github.io/Gravity-Game/'; // PLATFORM.PRIVACY_POLICY_URL

export const PRIVACY = {
  policy: 'Privacy policy', // PRIVACY_UI.LABEL_POLICY
  choices: 'Privacy choices', // PRIVACY_UI.LABEL_CHOICES
  reset: 'Reset analytics data', // PRIVACY_UI.LABEL_RESET
  armed: 'Tap again to reset', // PRIVACY_UI.LABEL_RESET_CONFIRM
  done: 'Analytics data reset', // PRIVACY_UI.TOAST_RESET_DONE
};

/** The Settings toggles: the label on screen and the SettingsStore field it flips. */
export const SETTINGS_TOGGLES = [
  ['Sound', 'sound'],
  ['Music', 'music'],
  ['Haptics', 'haptics'],
  ['Reduce Motion', 'reduceMotion'],
];

/**
 * The rewarded-offer labels ad-offers-by-mode looks for. `literal` is the exact quoted string in the scene that draws it and `file`
 * where; constants.test.mjs fails if the scene no longer contains it, so a reworded label cannot turn the preview run's
 * "this offer is NOT shown" into an assertion about text that no longer exists.
 */
export const OFFERS = {
  winStardust: { label: '2× Stardust', literal: '`▶  2× Stardust', file: 'src/scenes/GameScene.ts' },
  winStreak: { label: 'On a streak — 2×', literal: "'▶  On a streak — 2× ✦'", file: 'src/scenes/GameScene.ts' },
  freeFragments: { label: 'Free Fragments', literal: "'Free Fragments'", file: 'src/scenes/CosmeticsScene.ts' },
  revive: { label: 'REVIVE', literal: "'▶ REVIVE'", file: 'src/scenes/EndlessScene.ts' },
  double: { label: '2× ✦', literal: "'▶ 2× ✦'", file: 'src/scenes/EndlessScene.ts' },
};

/** The window handles main.ts defines in the Vite dev server only (behind import.meta.env.DEV). */
export const DEV_HANDLES = { game: '__game', phaser: '__Phaser', crashTest: '__crashTest' };

/**
 * window.__crashTest (P00-T21). `message`: the Error main.ts throws inside update. `burst`: PLATFORM.FRAME_ERROR_BURST, the frame
 * errors within FRAME_ERROR_WINDOW_MS after which the guard stops the loop. `guardLog`: the console.error line the frame guard writes
 * for each one. `crashLog`: the dev console.error line Crash writes for the first report (later identical ones are deduplicated).
 */
export const CRASH_TEST = {
  message: '__crashTest: injected frame error',
  burst: 3,
  guardLog: '[frameGuard] Error: __crashTest: injected frame error',
  crashLog: '[crash] [frame] __crashTest: injected frame error',
};

/** The frame guard's DOM overlay (PLATFORM.ERROR_OVERLAY). */
export const ERROR_OVERLAY = { id: 'gf-error-overlay', title: 'Something went wrong', action: 'Tap to restart' };
