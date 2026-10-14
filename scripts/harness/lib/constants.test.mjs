// Drift guard: every value the harness mirrors from src/ (it cannot import the app's modules from a production bundle) must
// still equal its source. When one of these fails, the app changed on purpose: update the harness mirror, not the assertion.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PLATFORM } from '../../../src/config/platform.config.ts';
import { PRIVACY_UI } from '../../../src/config/consent.config.ts';
import { PURCHASE_COPY } from '../../../src/config/monetization.config.ts';
import { THEME } from '../../../src/config/theme.config.ts';
import { LEVELS } from '../../../src/config/levels/index.ts';
import { LEGACY_PREMIUM_KEY, ENTITLEMENTS_KEY } from '../../../src/services/entitlements.ts';
import { SettingsStore } from '../../../src/utils/SettingsStore.ts';
import { PRIVACY, POLICY_URL, SETTINGS_TOGGLES, WEB_NOTE } from './copy.mjs';
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
