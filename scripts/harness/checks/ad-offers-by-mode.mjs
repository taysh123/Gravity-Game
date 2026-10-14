// P00-T19 (D-24): rewarded offers exist only where a rewarded ad can really be shown. The production web build has no ad
// SDK, so it must show none: no "2x Stardust" on the win overlay, no REVIVE or 2x on the Endless run-over, no Free Fragments
// card in the shop; SHARE sits centred when the 2x is absent.
//
// "Absent" is only worth something if the labels still match what the scenes draw, and two controls keep it so:
//   - the Vite dev server uses a web stub that does show the offers, so the same labels must be FOUND in the dev run
//     (controlModes: ['dev'], which makes the CI dev leg run this check even though it also runs in preview);
//   - lib/copy.mjs OFFERS holds each label with the quoted literal and file it comes from, and constants.test.mjs (every
//     push, no browser) fails if a scene no longer contains it.

import { OFFERS } from '../lib/copy.mjs';
import { startScene, waitForText, visibleTexts, findTexts } from '../lib/game.mjs';
import { winOverlay } from '../lib/states.mjs';

const shows = (texts, ...offers) => texts.some((t) => offers.some((o) => t.includes(o.label)));

export const adOffersByMode = {
  name: 'ad-offers-by-mode',
  modes: ['preview', 'dev'],
  controlModes: ['dev'], // the dev run is the positive control for the preview run's absence assertions
  weight: 15, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    const expected = ctx.mode === 'dev'; // offers are shown only by the dev web stub
    const verb = expected ? 'is shown' : 'is NOT shown';
    const where = ctx.mode === 'dev' ? 'the dev web stub' : 'the production build';

    await winOverlay(page, 5);
    const winTexts = await visibleTexts(page, ['GameScene']);
    ctx.expect(shows(winTexts, OFFERS.winStardust, OFFERS.winStreak) === expected, `win overlay: the 2x Stardust offer ${verb} on ${where}`, JSON.stringify(winTexts));

    await startScene(page, 'CosmeticsScene', { tab: 'bundle' });
    const shop = await visibleTexts(page, ['CosmeticsScene']);
    ctx.expect(shows(shop, OFFERS.freeFragments) === expected, `shop: the Free Fragments offer ${verb} on ${where}`, JSON.stringify(shop));
    ctx.expect(shop.includes('Remove Ads'), 'shop: the Remove Ads card is laid out either way');

    await startScene(page, 'EndlessScene', { mode: 'endless' });
    await page.evaluate(() => {
      const sc = window.__harnessGame.scene.getScene('EndlessScene');
      sc.score = 400;
      sc.die();
    });
    await waitForText(page, /^RUN OVER$/, ['EndlessScene']);
    await waitForText(page, /RETRY/, ['EndlessScene']);
    const run = await visibleTexts(page, ['EndlessScene']);
    ctx.expect(shows(run, OFFERS.revive) === expected, `Endless run-over: REVIVE ${verb} on ${where}`, JSON.stringify(run));
    ctx.expect(shows(run, OFFERS.double) === expected, `Endless run-over: the 2x offer ${verb} on ${where}`, JSON.stringify(run));
    ctx.expect(run.some((t) => /RETRY/.test(t)) && run.some((t) => /SHARE/.test(t)), 'Endless run-over: RETRY and SHARE are shown either way');
    if (!expected) {
      const share = (await findTexts(page, /SHARE/, ['EndlessScene']))[0];
      ctx.expect(share && Math.abs(share.x - 195) < 2, 'Endless run-over: SHARE is centred when the 2x is absent', `SHARE at x=${share?.x}`);
    }
  },
};
