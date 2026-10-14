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
