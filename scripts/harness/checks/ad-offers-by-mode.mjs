// P00-T19 (D-24): rewarded offers exist only where a rewarded ad can really be shown. The production web build has no ad
// SDK, so it must show none: no "2x Stardust" on the win overlay, no REVIVE or 2x on the Endless run-over, no Free Fragments
// card in the shop; SHARE sits centred when the 2x is absent. The Vite dev server uses a web stub that does show them, and
// that is the positive control: the same text patterns must be found there, so "absent in preview" can never pass only
// because a label was renamed.

import { startScene, waitForText, visibleTexts, findTexts } from '../lib/game.mjs';
import { winOverlay } from '../lib/states.mjs';

const WIN_OFFER = /2× Stardust|On a streak — 2×/;
const FREE_FRAGMENTS = /Free Fragments/;
const REVIVE = /REVIVE/;
const DOUBLE = /2× ✦/;

export const adOffersByMode = {
  name: 'ad-offers-by-mode',
  modes: ['preview', 'dev'],
  async run(page, ctx) {
    const expected = ctx.mode === 'dev'; // offers are shown only by the dev web stub
    const verb = expected ? 'is shown' : 'is NOT shown';
    const where = ctx.mode === 'dev' ? 'the dev web stub' : 'the production build';

    await winOverlay(page, 5);
    const winTexts = await visibleTexts(page, ['GameScene']);
    ctx.expect(winTexts.some((t) => WIN_OFFER.test(t)) === expected, `win overlay: the 2x Stardust offer ${verb} on ${where}`, JSON.stringify(winTexts));

    await startScene(page, 'CosmeticsScene', { tab: 'bundle' });
    const shop = await visibleTexts(page, ['CosmeticsScene']);
    ctx.expect(shop.some((t) => FREE_FRAGMENTS.test(t)) === expected, `shop: the Free Fragments offer ${verb} on ${where}`, JSON.stringify(shop));
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
    ctx.expect(run.some((t) => REVIVE.test(t)) === expected, `Endless run-over: REVIVE ${verb} on ${where}`, JSON.stringify(run));
    ctx.expect(run.some((t) => DOUBLE.test(t)) === expected, `Endless run-over: the 2x offer ${verb} on ${where}`, JSON.stringify(run));
    ctx.expect(run.some((t) => /RETRY/.test(t)) && run.some((t) => /SHARE/.test(t)), 'Endless run-over: RETRY and SHARE are shown either way');
    if (!expected) {
      const share = (await findTexts(page, /SHARE/, ['EndlessScene']))[0];
      ctx.expect(share && Math.abs(share.x - 195) < 2, 'Endless run-over: SHARE is centred when the 2x is absent', `SHARE at x=${share?.x}`);
    }
  },
};
