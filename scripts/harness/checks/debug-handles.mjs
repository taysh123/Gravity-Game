// A production build exposes no debug handle. The Vite dev server sets window.__game and window.__Phaser for tooling (main.ts,
// import.meta.env.DEV) and later DEV-only hooks (P00-T21 __crashTest, P00-T22 a corrupt-save hook); none of them may exist in the
// bundle a player runs. This reads the page's own global names (the harness's __harness* keys are its own and ignored), so a
// hook added without its DEV guard is caught here, whatever its name, as long as it follows the `__name` convention.

const harnessOwned = (key) => key.startsWith('__harness');

export const debugHandles = {
  name: 'debug-handles',
  modes: ['preview', 'dev'],
  weight: 6, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    const globals = await page.evaluate(() => Object.getOwnPropertyNames(window).filter((k) => k.startsWith('__')));
    const app = globals.filter((k) => !harnessOwned(k));
    if (ctx.mode === 'preview') {
      ctx.expect(app.length === 0, 'the production bundle defines no window.__* debug handle', `found: ${app.join(', ')}`);
      return;
    }
    ctx.expect(app.includes('__game') && app.includes('__Phaser'), 'the dev server exposes window.__game and window.__Phaser', `found: ${app.join(', ')}`);
    const same = await page.evaluate(() => window.__game === window.__harnessGame);
    ctx.expect(same, 'window.__game is the same Phaser.Game the harness captured (the capture hook finds the real game)');
  },
};
