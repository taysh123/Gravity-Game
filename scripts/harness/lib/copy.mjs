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
 * window.__crashTest (P00-T21). `message`: the Error main.ts throws inside update (crash-overlay throws the same text itself in its stage
 * for a frame error beside the gear, so the same guard line is expected). `burst`: PLATFORM.FRAME_ERROR_BURST, the frame
 * errors within FRAME_ERROR_WINDOW_MS after which the guard stops the loop. `guardLog`: the console.error line the frame guard writes
 * for each one. `crashLog`: the dev console.error line Crash writes for the first report of a page load (later identical ones are
 * deduplicated).
 */
export const CRASH_TEST = {
  message: '__crashTest: injected frame error',
  burst: 3,
  guardLog: '[frameGuard] Error: __crashTest: injected frame error',
  crashLog: '[crash] [frame] __crashTest: injected frame error',
};

/**
 * A scene that fails to START (P00-T21 final review): the next scene to start throws inside its own create(), which Phaser leaves in the CREATING
 * status for good, so no second error ever follows and only the frame guard's `fatal` probe (main.ts) turns it into the overlay. `snippet` is
 * what crash-overlay runs in the page, and the same text is device row R5 (docs/qa/DEVICE-CHECKLIST-M0.md) for the owner to paste into the
 * app's chrome://inspect console, where no DEV hook exists; it needs window.Phaser, which the production bundle also defines. It has no `|`
 * (it sits in a Markdown table cell). `message`, `guardLog` and `crashLog` are as in CRASH_TEST.
 */
export const CREATE_FAILURE = {
  message: 'frame guard device test (create)',
  guardLog: '[frameGuard] Error: frame guard device test (create)',
  crashLog: '[crash] [frame] frame guard device test (create)',
  snippet:
    "(() => { const P = Phaser.Scenes.SceneManager.prototype, create = P.create; P.create = function (scene) { P.create = create; scene.create = () => { throw new Error('frame guard device test (create)'); }; return create.call(this, scene); }; })();",
};

/** The frame guard's DOM overlay (PLATFORM.ERROR_OVERLAY). */
export const ERROR_OVERLAY = { id: 'gf-error-overlay', title: 'Something went wrong', action: 'Tap to restart' };
