// V8: every scene boots with zero console errors, and on every screen the object a player sees is the object a tap reaches.
//
// Walks every state in lib/states.mjs (GameScene for level 1, a boss level and the daily in all three modifiers; EndlessScene in
// both modes with its run-over overlay; the Settings and Pause overlays; every hub scene, the shop on every tab) as a returning
// player, and fails if a scene registered in src/main.ts has no state, so a new scene cannot ship untested. Entering a state is
// one named assertion: a console error raised while it ran fails that state by name (the runner also fails the whole job on any
// page error, even one that arrives between states).
//
// Tap areas (the P00-T17b work, method in lib/hitProbe.mjs): in every state that has something to tap, corners and centre are the
// object's own, nothing leaks outside the visible edge beyond the declared pad, no zone is under 44x44 game px, no two zones
// overlap, and a scrolling list's hidden rows are dead. Each state is probed at 390x844 AND 360x640: the page is resized in place
// (the app refits, as on a rotation or a browser toolbar change) and probed again, and the next state is entered at the size the
// previous one ended on, so scenes are created at both sizes. One walk instead of two keeps the run short; the screens are
// the expensive part, not the probe.

import { runProbe, probeToAssertions } from '../lib/hitProbe.mjs';
import { setViewport, startScene } from '../lib/game.mjs';
import { BOTH_VIEWPORTS } from '../lib/registry.mjs';
import { ALL_WORLDS_UNLOCKED, RETURNING_PLAYER } from '../lib/seeds.mjs';
import { STATES, coveredSceneKeys, enterState } from '../lib/states.mjs';

/** Move a scrolling scene's content to one of its clamp ends (what a drag to the end does), or shift it by a number of px. */
async function scrollList(page, key, where) {
  await page.evaluate(
    ([k, w]) => {
      const sc = window.__harnessGame.scene.getScene(k);
      const max = sc.scroll ? sc.scroll.max : 0;
      const min = sc.scroll ? sc.scroll.min : sc.scrollMin;
      if (w === 'top') sc.content.y = max;
      else if (w === 'bottom') sc.content.y = min;
      else sc.content.y += w;
    },
    [key, where],
  );
}

/** Probe the current screen at the page's viewport, resize to the other one, probe again. The page stays at the second size. */
function bothViewportsProber(page, ctx) {
  let current = BOTH_VIEWPORTS[0];
  return async (name, scenes) => {
    for (let i = 0; i < BOTH_VIEWPORTS.length; i++) {
      if (i > 0) {
        current = BOTH_VIEWPORTS.find((v) => v !== current);
        await setViewport(page, current);
      }
      ctx.record(probeToAssertions(`${name} @ ${current.label}`, await runProbe(page, scenes)));
    }
  };
}

export const screens = {
  name: 'screens',
  modes: ['preview', 'dev'],
  seed: RETURNING_PLAYER,
  weight: 10, // the longest check: starts first when jobs run in parallel
  async run(page, ctx) {
    const registered = await page.evaluate(() => window.__harnessGame.scene.scenes.map((s) => s.scene.key));
    const covered = coveredSceneKeys();
    const uncovered = registered.filter((k) => !covered.has(k));
    ctx.expect(uncovered.length === 0, `all ${registered.length} scenes registered in src/main.ts have a smoke state`, `no state visits: ${uncovered.join(', ')} (add one in scripts/harness/lib/states.mjs)`);
    const unknown = [...covered].filter((k) => !registered.includes(k));
    ctx.expect(unknown.length === 0, 'every scene a state visits is registered in src/main.ts', `not registered: ${unknown.join(', ')}`);

    // 1. Every screen, as a returning player.
    const probe = bothViewportsProber(page, ctx);
    for (const state of STATES) {
      const entered = await ctx.step(`${state.name}: ${state.visits.join(' + ')} started`, () => enterState(page, state));
      if (entered && state.probe) await probe(state.name, state.probe);
    }

    // 2. Scrolling lists at their ends: the content container is moved straight to the end, as a drag does. Every world unlocked
    //    for the map, so every planet on it is live; a 10-level world never scrolls today (222 px of content in a 604 px
    //    viewport), so the overflow case shifts the content by hand, as a longer world would.
    const all = await ctx.openPage({ seed: ALL_WORLDS_UNLOCKED });
    const probeAll = bothViewportsProber(all, ctx);
    for (const where of ['initial', 'top', 'bottom']) {
      await startScene(all, 'WorldMapScene');
      if (where !== 'initial') await scrollList(all, 'WorldMapScene', where);
      await probeAll(`WorldMap (all worlds unlocked, ${where})`, ['WorldMapScene']);
    }
    for (const where of ['top', 'bottom']) {
      await startScene(page, 'WorldMapScene');
      await scrollList(page, 'WorldMapScene', where);
      await probe(`WorldMap (returning player, ${where})`, ['WorldMapScene']);
      await startScene(page, 'AchievementsScene');
      await scrollList(page, 'AchievementsScene', where);
      await probe(`Achievements (${where})`, ['AchievementsScene']);
    }
    await startScene(page, 'LevelSelectScene', { world: 15 });
    await probe('LevelSelect: world 15', ['LevelSelectScene']);
    await startScene(page, 'LevelSelectScene', { world: 1 });
    await scrollList(page, 'LevelSelectScene', -150);
    await probe('LevelSelect: simulated overflow (content shifted up 150 px)', ['LevelSelectScene']);
  },
};
