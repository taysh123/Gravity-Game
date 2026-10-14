// Settings privacy rows on the web build (P00-T18): "Privacy policy" and "Reset analytics data" are there, "Privacy choices" is
// not (it is the native consent form's entry point and exists only on Android when the consent layer asks for it), the reset is
// a two-tap in-game confirm that disarms by itself, and the policy link opens the hosted policy in a new tab.
//
// The policy URL is intercepted and answered locally, so the run never depends on the network and never loads a page the
// harness does not own. Taps are real pointer events on the live rows.

import { POLICY_URL, PRIVACY as LABEL } from '../lib/copy.mjs';
import { clickText, frames, isActive, visibleTexts, waitForText } from '../lib/game.mjs';
import { BOTH_VIEWPORTS } from '../lib/registry.mjs';
import { settingsOverMenu } from '../lib/states.mjs';

const SETTINGS = ['SettingsScene'];

export const settingsPrivacyWeb = {
  name: 'settings-privacy-web',
  modes: ['preview', 'dev'],
  viewports: BOTH_VIEWPORTS,
  weight: 22, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    await page.context().route(`${POLICY_URL}**`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>policy (harness stub)</title>' }));

    await settingsOverMenu(page);

    const texts = await visibleTexts(page, SETTINGS);
    ctx.expect(texts.includes(LABEL.policy), `the ${LABEL.policy} row is shown`, JSON.stringify(texts));
    ctx.expect(texts.includes(LABEL.reset), `the ${LABEL.reset} row is shown`, JSON.stringify(texts));
    ctx.expect(!texts.includes(LABEL.choices), `${LABEL.choices} is NOT shown on the web`, JSON.stringify(texts));

    // Two-tap confirm.
    await clickText(page, LABEL.reset, SETTINGS);
    await ctx.step('the first tap arms the row ("Tap again to reset") and resets nothing yet', async () => {
      await waitForText(page, LABEL.armed, SETTINGS, 8000);
      await frames(page, 10);
      if ((await visibleTexts(page, SETTINGS)).includes(LABEL.done)) throw new Error('the first tap already reset the data');
    });
    await clickText(page, LABEL.armed, SETTINGS);
    await ctx.step('the second tap runs it: the toast appears and the row is unarmed again', async () => {
      await waitForText(page, LABEL.done, SETTINGS, 8000);
      await waitForText(page, LABEL.reset, SETTINGS, 8000);
    });
    // An armed row that is left alone disarms by itself (PRIVACY_UI.RESET_CONFIRM_MS of game time).
    await clickText(page, LABEL.reset, SETTINGS);
    await waitForText(page, LABEL.armed, SETTINGS, 8000);
    await ctx.step('an armed row disarms by itself when no second tap comes', () => waitForText(page, LABEL.reset, SETTINGS, 15000));

    // The policy link.
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
    await clickText(page, LABEL.policy, SETTINGS);
    const popup = await popupPromise;
    ctx.expect(popup !== null, 'tapping Privacy policy opens a new tab (window.open)', 'no popup event');
    if (popup) {
      await popup.waitForLoadState('commit').catch(() => undefined);
      ctx.expect(popup.url().startsWith(POLICY_URL), 'the new tab targets the hosted policy URL', `url is ${popup.url()}`);
      await popup.close().catch(() => undefined);
    }
    ctx.expect(await isActive(page, 'SettingsScene'), 'Settings is still open after the policy tap', 'the overlay closed');
  },
};
