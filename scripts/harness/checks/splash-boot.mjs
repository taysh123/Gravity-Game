// The natural start-up path with no tap at all: Boot -> CompanySplash -> IntroSplash -> MainMenu, driven by the game's own
// timings. Every other check taps through the splashes to save time; this one proves they play out and hand over on their own.

import { bootToMenu } from '../lib/game.mjs';

const EXPECTED = ['BootScene', 'CompanySplashScene', 'IntroSplashScene', 'MainMenuScene'];

export const splashBoot = {
  name: 'splash-boot',
  modes: ['preview', 'dev'],
  boot: 'none',
  weight: 10, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    await ctx.step('boots to MainMenuScene on its own, without a tap', () => bootToMenu(page, { skipSplashes: false }));
    const log = await page.evaluate(() => window.__harnessSceneLog.slice());
    const order = log.flatMap((entry) => entry.split('+').filter((k) => EXPECTED.includes(k)));
    const seen = order.filter((k, i) => order.indexOf(k) === i);
    ctx.expect(JSON.stringify(seen) === JSON.stringify(EXPECTED), `scenes ran in the order ${EXPECTED.join(' -> ')}`, `saw ${JSON.stringify(log)}`);
    const renderer = await page.evaluate(() => (window.__harnessGame.renderer.type === 2 ? 'WebGL' : 'Canvas'));
    ctx.expect(renderer === 'WebGL', 'the game renders with WebGL (software, via swiftshader), as on a device', `renderer is ${renderer}`);
  },
};
