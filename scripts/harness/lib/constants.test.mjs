// Drift guard: every value the harness mirrors from src/ (it cannot import the app's modules from a production bundle) must
// still equal its source. When one of these fails, the app changed on purpose: update the harness mirror, not the assertion.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PLATFORM } from '../../../src/config/platform.config.ts';
import { FRAME_GUARD_LOG_PREFIX } from '../../../src/platform/frameGuard.ts';
import { PRIVACY_UI } from '../../../src/config/consent.config.ts';
import { PURCHASE_COPY } from '../../../src/config/monetization.config.ts';
import { THEME } from '../../../src/config/theme.config.ts';
import { LEVELS } from '../../../src/config/levels/index.ts';
import { LEGACY_PREMIUM_KEY, ENTITLEMENTS_KEY } from '../../../src/services/entitlements.ts';
import { SettingsStore } from '../../../src/utils/SettingsStore.ts';
import { CRASH_TEST, DEV_HANDLES, ERROR_OVERLAY, OFFERS, PRIVACY, POLICY_URL, SETTINGS_TOGGLES, WEB_NOTE } from './copy.mjs';
import { MAX_PAD_GAME_PX, MIN_TAP_GAME_PX } from './hitProbe.mjs';
import { KEYS } from './seeds.mjs';
import { BOSS_LEVEL } from './states.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const source = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('hit-area constants mirror THEME', () => {
  it('the minimum tap target', () => {
    expect(MIN_TAP_GAME_PX).toBe(THEME.MIN_TAP);
  });

  it('the largest pad any control grants past its visible edge (toggle and map node)', () => {
    expect(MAX_PAD_GAME_PX).toBe(Math.max(THEME.TOGGLE_TAP_PAD, THEME.NODE_TAP_PAD));
  });
});

describe('storage keys the seeds and checks use exist in the stores that own them', () => {
  const owners = [
    ['progress', 'src/utils/ProgressStore.ts'],
    ['currency', 'src/utils/CurrencyStore.ts'],
    ['storeNudge', 'src/scenes/GameScene.ts'],
    ['settings', 'src/utils/SettingsStore.ts'],
    ['cosmetics', 'src/utils/CosmeticStore.ts'],
  ];
  for (const [name, file] of owners) {
    it(`${name}: ${KEYS[name]} is declared in ${file}`, () => {
      expect(source(file)).toContain(`'${KEYS[name]}'`);
    });
  }

  it('entitlements and the legacy premium flag', () => {
    expect(KEYS.entitlements).toBe(ENTITLEMENTS_KEY);
    expect(KEYS.premium).toBe(LEGACY_PREMIUM_KEY);
  });
});

describe('on-screen copy the checks look for', () => {
  it('the web-only note on purchase surfaces', () => {
    expect(WEB_NOTE).toBe(PURCHASE_COPY.WEB_ONLY);
  });

  it('the privacy policy URL and the privacy rows', () => {
    expect(POLICY_URL).toBe(PLATFORM.PRIVACY_POLICY_URL);
    expect(PRIVACY.policy).toBe(PRIVACY_UI.LABEL_POLICY);
    expect(PRIVACY.choices).toBe(PRIVACY_UI.LABEL_CHOICES);
    expect(PRIVACY.reset).toBe(PRIVACY_UI.LABEL_RESET);
    expect(PRIVACY.armed).toBe(PRIVACY_UI.LABEL_RESET_CONFIRM);
    expect(PRIVACY.done).toBe(PRIVACY_UI.TOAST_RESET_DONE);
  });

  it('the Settings toggles: each label is in SettingsScene and each key is a SettingsStore field', () => {
    const scene = source('src/scenes/SettingsScene.ts');
    for (const [label, key] of SETTINGS_TOGGLES) {
      expect(scene).toContain(`label: '${label}'`);
      expect(Object.keys(SettingsStore.get())).toContain(key);
    }
  });
});

describe('the boss level the game state uses', () => {
  it(`level ${BOSS_LEVEL} is a boss level in the campaign`, () => {
    expect(LEVELS[BOSS_LEVEL - 1].boss).toBe(true);
  });
});

describe('the rewarded-offer labels ad-offers-by-mode looks for', () => {
  // The preview run asserts these labels are ABSENT, which would stay green for ever if a label were reworded while the offer
  // leaked. The dev run is the positive control in CI; this test is the control that needs no browser: each label must still be
  // the on-screen text in the scene that draws it. The quoted literal is matched, so a comment that mentions the name cannot
  // satisfy it.
  for (const [key, offer] of Object.entries(OFFERS)) {
    it(`${key}: "${offer.label}" is still drawn by ${offer.file}`, () => {
      expect(offer.literal).toContain(offer.label);
      expect(source(offer.file)).toContain(offer.literal);
    });
  }
});

describe('the DEV-only handles debug-handles looks for', () => {
  it('main.ts assigns window.__game and window.__Phaser, inside an import.meta.env.DEV block', () => {
    const main = source('src/main.ts');
    const block = main.slice(main.indexOf('if (import.meta.env.DEV) {'));
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain(`.${DEV_HANDLES.game} = game;`);
    expect(block).toContain(`.${DEV_HANDLES.phaser} = Phaser;`);
    expect(block).toContain(`.${DEV_HANDLES.crashTest} = `);
  });
});

describe('the frame-guard values crash-overlay looks for (P00-T21)', () => {
  it('the overlay id and copy are PLATFORM.ERROR_OVERLAY', () => {
    expect(ERROR_OVERLAY).toEqual({ id: PLATFORM.ERROR_OVERLAY.ID, title: PLATFORM.ERROR_OVERLAY.TITLE, action: PLATFORM.ERROR_OVERLAY.ACTION });
  });

  it('the burst is PLATFORM.FRAME_ERROR_BURST', () => {
    expect(CRASH_TEST.burst).toBe(PLATFORM.FRAME_ERROR_BURST);
  });

  it('the injected message is the literal main.ts throws inside its DEV block', () => {
    const main = source('src/main.ts');
    expect(main.slice(main.indexOf('if (import.meta.env.DEV) {'))).toContain(`'${CRASH_TEST.message}'`);
  });

  it('the guard line is the frame guard prefix + "Error: " + the message', () => {
    expect(CRASH_TEST.guardLog).toBe(`${FRAME_GUARD_LOG_PREFIX} Error: ${CRASH_TEST.message}`);
  });

  it('the Crash line is the dev console.error of a report made under the "frame" context', () => {
    expect(CRASH_TEST.crashLog).toBe(`[crash] [frame] ${CRASH_TEST.message}`);
    expect(source('src/services/Crash.ts')).toContain("console.error('[crash]', message, error)");
    expect(source('src/main.ts')).toContain("Crash.recordError(error, 'frame')");
  });
});
