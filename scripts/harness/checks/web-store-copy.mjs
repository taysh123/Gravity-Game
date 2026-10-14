// P00-T17: the web build sells nothing and says so honestly. In the shop and in Settings the purchase surfaces read "Available in
// the Android app", no amount of money appears anywhere (prices only ever come from the store, and there is none on the web),
// there is no Restore link (nothing to restore), and tapping a purchase surface grants nothing. In the production build the
// bundle itself carries no price label or "$n.nn" amount (the Phaser vendor chunk is excluded: it is third-party code).

import { WEB_NOTE } from '../lib/copy.mjs';
import { clickText, frames, isTappable, startScene, stored, tapCount, visibleTexts, watchTaps } from '../lib/game.mjs';
import { KEYS } from '../lib/seeds.mjs';
import { settingsOverMenu } from '../lib/states.mjs';

const CURRENCY = /[$€£₪¥]\s?\d|\d\s?[$€£₪¥]/;
const SHOP = ['CosmeticsScene'];
const SETTINGS = ['SettingsScene'];

export const webStoreCopy = {
  name: 'web-store-copy',
  modes: ['preview', 'dev'],
  async run(page, ctx) {
    // ---- the shop's Bundles tab ----
    await startScene(page, 'CosmeticsScene', { tab: 'bundle' });
    let texts = await visibleTexts(page, SHOP);
    const notes = texts.filter((t) => t === WEB_NOTE).length;
    ctx.expect(notes === 4, `shop: all four purchase cards read "${WEB_NOTE}"`, `${notes} of 4: ${JSON.stringify(texts.filter((t) => /Available|Android/.test(t)))}`);
    ctx.expect(!texts.some((t) => CURRENCY.test(t)), 'shop: no amount of money anywhere', JSON.stringify(texts.filter((t) => CURRENCY.test(t))));
    ctx.expect(!texts.includes('Restore Purchases'), 'shop: no Restore Purchases link (nothing to restore on the web)');
    ctx.expect(texts.includes('Starter Pack'), 'shop: the Starter Pack is offered (Remove Ads is not owned)');
    const before = { ent: await stored(page, KEYS.entitlements), premium: await stored(page, KEYS.premium) };
    const tappable = [await isTappable(page, 'Remove Ads', SHOP), await isTappable(page, 'Starter Pack', SHOP)];
    ctx.expect(!tappable[0] && !tappable[1], 'shop: the purchase cards are disabled on the web (nothing around the Remove Ads and Starter Pack cards is tappable)', JSON.stringify(tappable));
    await clickText(page, 'Remove Ads', SHOP);
    await frames(page, 25);
    await clickText(page, 'Starter Pack', SHOP);
    await frames(page, 25);
    const after = { ent: await stored(page, KEYS.entitlements), premium: await stored(page, KEYS.premium) };
    ctx.expect(JSON.stringify(before) === JSON.stringify(after) && after.ent === null && after.premium === null, 'shop: tapping the purchase cards grants nothing (no entitlement snapshot, no premium flag)', JSON.stringify({ before, after }));

    // ---- Settings ----
    await settingsOverMenu(page);
    texts = await visibleTexts(page, SETTINGS);
    ctx.expect(texts.includes('Remove Ads') && texts.includes(WEB_NOTE), `settings: the Remove Ads row reads "${WEB_NOTE}"`, JSON.stringify(texts));
    ctx.expect(!texts.some((t) => CURRENCY.test(t)) && !texts.includes('Restore Purchases'), 'settings: no amount of money and no Restore link', JSON.stringify(texts));
    await watchTaps(page, 'Remove Ads', SETTINGS, 'settings-remove-ads');
    await clickText(page, 'Remove Ads', SETTINGS);
    await frames(page, 25);
    ctx.expect((await tapCount(page, 'settings-remove-ads')) === 1, 'settings: the tap reached the Remove Ads row', 'the row got no tap');
    ctx.expect((await stored(page, KEYS.entitlements)) === null && (await stored(page, KEYS.premium)) === null, 'settings: tapping the Remove Ads row grants nothing');

    // ---- the production bundle ----
    if (ctx.mode === 'preview') {
      const scan = await page.evaluate(async () => {
        const scripts = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((n) => /\.js(\?|$)/.test(n) && !/\/phaser-[^/]*\.js/.test(n));
        const hits = [];
        for (const url of scripts) {
          const source = await (await fetch(url)).text();
          for (const m of source.matchAll(/\$\d+\.\d{2}/g)) hits.push(`${url.split('/').pop()}: ${m[0]}`);
          if (/priceLabel|REMOVE_ADS_PRICE_LABEL/.test(source)) hits.push(`${url.split('/').pop()}: a price label identifier`);
        }
        return { scanned: scripts.length, hits };
      });
      ctx.expect(scan.scanned > 0, 'bundle: the app scripts were found to scan', 'no script resources');
      ctx.expect(scan.hits.length === 0, `bundle: no "$n.nn" amount and no price-label identifier in ${scan.scanned} app script(s) (Phaser excluded)`, JSON.stringify(scan.hits.slice(0, 5)));
    }
  },
};
