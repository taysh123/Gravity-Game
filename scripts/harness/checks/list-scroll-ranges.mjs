// Scroll ranges (P00-T17b fix pass 3): a scrolling list moves exactly between "the first item fully visible" and "the last item
// fully visible", the first drag moves it by the drag distance (no jump), and a list that fits does not scroll at all. Real
// mouse drags (page.mouse), never content.y assignments.
//
// `slackTop` / `slackBottom` are how far an end item may sit from the viewport edge: the scene's own trailing gap (the shop's
// bottom margin, the world map's header and footer, the achievements row gap). They describe each scene's layout, so a
// deliberate layout change is expected to touch the numbers here. `itemH` is the row height for rows that are unsized containers
// (AchievementsScene ROW_H).

import { frames, startScene } from '../lib/game.mjs';
import { inPage, installLists } from '../lib/lists.mjs';
import { SMALL_VIEWPORTS } from '../lib/registry.mjs';

const LISTS = [
  { name: 'Achievements', key: 'AchievementsScene', itemH: 56, scrolls: true, restsAtTop: true, slackTop: 12, slackBottom: 12 },
  { name: 'LevelSelect (a 10-level world fits)', key: 'LevelSelectScene', data: { world: 1 }, itemH: 44, scrolls: false },
  { name: 'WorldMap', key: 'WorldMapScene', itemH: 46, scrolls: true, restsAtTop: false, slackTop: 30, slackBottom: 80 },
  { name: 'Shop (skins)', key: 'CosmeticsScene', data: { tab: 'skin' }, itemH: 64, scrolls: true, restsAtTop: true, slackTop: 2, slackBottom: 48 },
];
const SMALL_DRAG_CSS_PX = 30;
const MAX_DRAGS_TO_END = 14;

const fully = (item, band) => item.top >= band.top - 0.5 && item.bottom <= band.bottom + 0.5;

export const listScrollRanges = {
  name: 'list-scroll-ranges',
  modes: ['preview', 'dev'],
  viewports: SMALL_VIEWPORTS, // 360x640 only: the stricter scale for the css->game px conversion; the end positions do not depend on it
  weight: 130, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    await installLists(page);
    const geom = (L) => inPage(page, 'listGeometry', L.key, L.itemH);
    const dragBy = async (from, dy, steps) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x, from.y + dy, { steps });
      await page.mouse.up();
      await frames(page, 6);
    };
    /** A drag across the whole viewport band, up (content moves up) or down. */
    const sweep = async (L, dir) => {
      const { from, to } = await inPage(page, 'dragPoints', L.key, dir);
      await dragBy(from, to.y - from.y, 12);
    };
    const dragToEnd = async (L, dir) => {
      let prev = (await geom(L)).y;
      for (let i = 0; i < MAX_DRAGS_TO_END; i++) {
        await sweep(L, dir);
        const y = (await geom(L)).y;
        if (Math.abs(y - prev) < 0.5) return y;
        prev = y;
      }
      return prev;
    };
    const k = await inPage(page, 'k');

    for (const L of LISTS) {
      await startScene(page, L.key, L.data);
      const g0 = await geom(L);
      const first = g0.items[0];
      if (L.restsAtTop ?? true) ctx.expect(fully(first, g0.band), `${L.name}: at rest, the first item ("${first.name}") is fully visible`, `top ${first.top.toFixed(1)} vs band top ${g0.band.top.toFixed(1)}`);

      if (!L.scrolls) {
        ctx.expect(g0.items.every((it) => fully(it, g0.band)), `${L.name}: every item is fully visible at rest (it fits)`, 'an item is outside the viewport');
        await sweep(L, 'up');
        await sweep(L, 'down');
        const g1 = await geom(L);
        ctx.expect(Math.abs(g1.y - g0.y) < 0.5, `${L.name}: a list that fits does not scroll (drag up and down)`, `content.y ${g0.y.toFixed(1)} -> ${g1.y.toFixed(1)}`);
        continue;
      }

      // The first small drag moves the list by the drag, it does not jump.
      const { from } = await inPage(page, 'dragPoints', L.key, 'up');
      await dragBy(from, -SMALL_DRAG_CSS_PX, 6);
      const moved = (await geom(L)).y - g0.y;
      ctx.expect(Math.abs(moved + SMALL_DRAG_CSS_PX / k) < 2.5, `${L.name}: the first small drag (${SMALL_DRAG_CSS_PX} css px up) moves the list by the drag, no jump`, `moved ${moved.toFixed(1)} game px, expected about ${(-SMALL_DRAG_CSS_PX / k).toFixed(1)}`);

      // Bottom end: the last item is fully visible and flush with the bottom (within the scene's own trailing gap).
      await dragToEnd(L, 'up');
      const gb = await geom(L);
      const last = gb.items[gb.items.length - 1];
      ctx.expect(fully(last, gb.band) && gb.band.bottom - last.bottom <= L.slackBottom, `${L.name}: dragged to the bottom, the last item ("${last.name}") is fully visible and flush with the viewport bottom`, `bottom ${last.bottom.toFixed(1)} vs band bottom ${gb.band.bottom.toFixed(1)}`);

      // Top end: the first item is fully visible and flush with the top, and it is where the list rested.
      const yTop = await dragToEnd(L, 'down');
      const gt = await geom(L);
      const head = gt.items[0];
      ctx.expect(fully(head, gt.band) && head.top - gt.band.top <= L.slackTop, `${L.name}: dragged back to the top, the first item ("${head.name}") is fully visible and flush with the viewport top`, `top ${head.top.toFixed(1)} vs band top ${gt.band.top.toFixed(1)}`);
      if (L.restsAtTop) ctx.expect(Math.abs(yTop - g0.y) < 0.5, `${L.name}: the top end is the resting position (nothing above it was ever hidden)`, `rest ${g0.y.toFixed(1)}, top end ${yTop.toFixed(1)}`);
    }
  },
};
