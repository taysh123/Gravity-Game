// Real taps around scrolling lists: a tap outside a list's viewport never reaches one of its rows (P00-T17b, review findings
// F1 and F3). A list is clipped by a mask, but a mask only hides drawing: a row scrolled under the tab bar or the Back button
// used to keep its hit area and steal the tap. Here the taps are real pointer events at positions computed from the live scene.
//
// The shop is seeded with 5000 Stardust, so a stray row tap WOULD buy something: an unchanged balance and an unchanged
// cosmetics save prove no row was tapped. Other lists: a tap on a hidden row's centre must not navigate; a visible row's must.

import { clickPoint, inPage, installLists } from '../lib/lists.mjs';
import { frames, isActive, startScene, stopAll, stored, waitFor, waitForScene } from '../lib/game.mjs';
import { BOTH_VIEWPORTS } from '../lib/registry.mjs';
import { ALL_WORLDS_UNLOCKED, KEYS, RICH } from '../lib/seeds.mjs';

const TAB_LABEL = { skin: 'Skins', trail: 'Trails', arrival: 'Arrivals', bundle: 'Bundles' };
const NOTHING_HAPPENED_FRAMES = 25; // a negative assertion cannot wait for an effect: let the tap be processed, then look

export const listViewportTaps = {
  name: 'list-viewport-taps',
  weight: 72, // about seconds on a CI runner: balances --shard slices
  modes: ['preview', 'dev'],
  viewports: BOTH_VIEWPORTS,
  seed: { ...ALL_WORLDS_UNLOCKED, ...RICH },
  async run(page, ctx) {
    await installLists(page);
    const snap = async () => ({
      tab: await page.evaluate(() => window.__harnessGame.scene.isActive('CosmeticsScene') && window.__harnessLists.shopTab()),
      currency: await stored(page, KEYS.currency),
      cosmetics: await stored(page, KEYS.cosmetics),
    });
    const openShop = async (tab, scrollOffset) => {
      await startScene(page, 'CosmeticsScene', { tab, scrollOffset });
    };
    const unchanged = (a, b) => a.currency === b.currency && a.cosmetics === b.cosmetics;

    // --- the shop, scrolled to the end: rows are under the tab bar; every tab tap must still switch tabs -----------------
    // Each list tab as the start, the centre of a label and 19 px below / above it (inside the 44 px target, over what used to be a
    // row), every destination reached at least once.
    const tapCases = [
      ['skin', 'trail', 0],
      ['trail', 'arrival', 19],
      ['arrival', 'bundle', -19],
    ];
    for (const [start, dest, dy] of tapCases) {
      const where = dy === 0 ? 'centre' : `${Math.abs(dy)} px ${dy > 0 ? 'below' : 'above'}`;
      await ctx.step(`shop ${start} (scrolled to the end): tap ${TAB_LABEL[dest]} (${where}) switches tab, buys and equips nothing`, async () => {
        await openShop(start, -99999);
        const before = await snap();
        await clickPoint(page, await inPage(page, 'tabPoint', TAB_LABEL[dest], dy));
        await waitFor(page, `the shop to show the ${dest} tab`, (d) => window.__harnessLists.shopTab() === d, dest, 8000);
        const after = await snap();
        if (!unchanged(before, after)) throw new Error(`balance/cosmetics changed: ${JSON.stringify({ before, after })}`);
      });
    }

    await ctx.step('shop (scrolled to the end): a tap in the header above the tab bar does nothing', async () => {
      await openShop('skin', -99999);
      const before = await snap();
      await clickPoint(page, await inPage(page, 'aboveTabs', 30, 28), NOTHING_HAPPENED_FRAMES);
      const after = await snap();
      if (after.tab !== 'skin' || !unchanged(before, after)) throw new Error(JSON.stringify({ before, after }));
    });

    // --- the shop at rest: the row cut off by the viewport bottom ---------------------------------------------------------
    await openShop('skin', 0);
    const row = await inPage(page, 'partialRow');
    ctx.expect(row !== null, 'shop skin: a row straddles the bottom of the viewport (the state this test needs)', 'none does: the list no longer overflows the viewport, or its mask moved');
    if (row) {
      const back = await inPage(page, 'backPointOf', 'CosmeticsScene');
      const before = await snap();
      await clickPoint(page, row.hiddenPart, NOTHING_HAPPENED_FRAMES);
      const afterHidden = await snap();
      ctx.expect(
        (await inPage(page, 'rowTaps')) === 0 && unchanged(before, afterHidden) && afterHidden.tab === 'skin',
        `shop skin: a tap on the hidden part of a partly visible row ("${row.name}") does nothing`,
        JSON.stringify({ rowTaps: await inPage(page, 'rowTaps'), before, afterHidden }),
      );
      await clickPoint(page, { x: row.left.x, y: back.y }, NOTHING_HAPPENED_FRAMES); // left of Back, where rows pass under the strip
      const afterStrip = await snap();
      ctx.expect(unchanged(before, afterStrip) && afterStrip.tab === 'skin', 'shop skin: a tap on the strip beside Back (rows pass under it) does nothing', JSON.stringify({ before, afterStrip }));

      await openShop('skin', 0);
      const again = await inPage(page, 'partialRow');
      await clickPoint(page, again.visiblePart, NOTHING_HAPPENED_FRAMES);
      const taps = await inPage(page, 'rowTaps');
      ctx.expect(taps === 1, `shop skin: a tap on the visible part of the same row ("${again.name}") still taps it`, `row received ${taps} taps`);
    }
    await openShop('skin', -99999);
    await clickPoint(page, await inPage(page, 'backPointOf', 'CosmeticsScene'));
    await ctx.step('shop (scrolled to the end): Back still works', () => waitForScene(page, 'MainMenuScene', 8000));

    // --- the other lists --------------------------------------------------------------------------------------------------
    const lists = [
      { name: 'WorldMap (all worlds unlocked)', scene: 'WorldMapScene', target: 'LevelSelectScene', back: 'MainMenuScene', open: ['WorldMapScene'], ends: ['initial', 'bottom'], mustHaveHidden: true },
      { name: 'LevelSelect (a 10-level world fits: nothing scrolls)', scene: 'LevelSelectScene', target: 'GameScene', back: 'WorldMapScene', open: ['LevelSelectScene', { world: 1 }], ends: ['initial'] },
      { name: 'LevelSelect (simulated overflow: content shifted up 150 px, as a longer world would be)', scene: 'LevelSelectScene', target: 'GameScene', back: 'WorldMapScene', open: ['LevelSelectScene', { world: 1 }], ends: [-150], mustHaveHidden: true },
    ];
    for (const L of lists) {
      for (const end of L.ends) {
        const at = typeof end === 'number' ? `shifted ${-end} px up` : end === 'initial' ? 'at rest' : `scrolled to the ${end}`;
        const reopen = async () => {
          await startScene(page, ...L.open);
          if (end !== 'initial') await inPage(page, 'scrollList', L.scene, end);
          await frames(page, 6);
        };
        await reopen();
        const pts = await inPage(page, 'listPoints', L.scene);
        if (pts.hidden) {
          await clickPoint(page, pts.hidden.css, NOTHING_HAPPENED_FRAMES);
          ctx.expect(
            (await isActive(page, L.scene)) && !(await isActive(page, L.target)),
            `${L.name}, ${at}: a tap on the centre of a hidden item ("${pts.hidden.name}", ${pts.hidden.n} hidden on the canvas) does nothing`,
            `navigated to ${L.target}, or left ${L.scene}`,
          );
          await reopen();
        } else if (L.mustHaveHidden) {
          ctx.expect(false, `${L.name}, ${at}: a hidden interactive item exists to tap (the state this test needs)`, 'none found on the canvas');
        }
        if (pts.visible) {
          await clickPoint(page, pts.visible.css, 2);
          await ctx.step(`${L.name}, ${at}: a tap on a visible item ("${pts.visible.name}") still opens ${L.target}`, () => waitForScene(page, L.target, 8000));
          await reopen();
        } else {
          // The positive control of every negative assertion above: if no row is visibly tappable, "a hidden row does nothing" proves
          // nothing (the whole list may be dead).
          ctx.expect(false, `${L.name}, ${at}: a visible interactive item exists to tap (the positive control)`, `none of the ${pts.interactive} interactive items in the list is inside its viewport`);
        }
        const back = await inPage(page, 'backPointOf', L.scene);
        await clickPoint(page, back, 2);
        await ctx.step(`${L.name}, ${at}: Back still works`, () => waitForScene(page, L.back, 8000));
      }
    }
    await stopAll(page);
  },
};
