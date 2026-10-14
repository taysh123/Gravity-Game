// A brand-new player: no saves at all. The screens a first-timer sees must start without an error: the menu offers PLAY (not
// CONTINUE), the map shows only the first world open, level 1 carries the one-time coach mark, and the first win of a new
// player gets its one-time hero beat (GameScene.isFirstWin) instead of the generic overlay. The `screens` check walks the
// same scenes as a returning player; this one is about what only a fresh install runs.

import { settle, startScene, visibleTexts, waitForText } from '../lib/game.mjs';
import { enterState, stateByName, triggerWinHeld } from '../lib/states.mjs';

export const firstRun = {
  name: 'first-run',
  modes: ['preview', 'dev'],
  weight: 32, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    for (const name of ['MainMenu', 'WorldMap', 'LevelSelect: world 1', 'Game: level 1']) {
      await ctx.step(`${name} (fresh install)`, () => enterState(page, stateByName(name)));
      if (name === 'MainMenu') {
        const texts = await visibleTexts(page, ['MainMenuScene']);
        ctx.expect(texts.includes('PLAY') && !texts.includes('CONTINUE'), 'MainMenu: a new player is offered PLAY, not CONTINUE', JSON.stringify(texts));
      }
    }
    // The hero beat floats above the panel and fades itself out, so it is waited for as the overlay appears, not afterwards.
    await ctx.step('the first win of a new player shows its one-time hero beat ("You brought your first star home")', async () => {
      await startScene(page, 'GameScene', { level: 1 });
      await triggerWinHeld(page);
      await waitForText(page, /first star home/i, ['GameScene']);
      await waitForText(page, /LEVEL COMPLETE|STAR FREED/, ['GameScene']);
      await settle(page, ['GameScene']);
    });
  },
};
