// P00-T19 fix pass 1 (m2), D-24: while a rewarded ad is being requested or shown, nothing underneath it may act. The check
// pretends a show is in flight (Ads.isShowing() patched to true on the app's own module instance, and the external-flow flag
// raised, exactly as a real show does) and presses real buttons: Endless RETRY / SHARE / the scrim / Android Back (Escape),
// the HUD toolbar under the win overlay, the shop's tabs and Back. None may do anything; once the show is over each works.
//
// Dev mode only: it imports the app's own source modules, which a production bundle does not expose.

import { clickGame, findTexts, frames, isActive, startScene, waitFor, waitForScene, waitForText } from '../lib/game.mjs';
import { winOverlay } from '../lib/states.mjs';

/** Patch the app's own Ads / external-flow modules (the URLs the page actually loaded, which carry a ?t= stamp after an HMR edit). */
function setAdShowing(page, value) {
  return page.evaluate(async (v) => {
    const url = (re) => performance.getEntriesByType('resource').map((r) => r.name).find((n) => re.test(n));
    const ads = await import(url(/\/src\/services\/Ads\.ts/) ?? '/src/services/Ads.ts');
    const flow = await import(url(/\/src\/platform\/externalFlow\.ts/) ?? '/src/platform/externalFlow.ts');
    ads.Ads.isShowing = () => v;
    flow.setExternalFlowActive(v, 'ads');
    return ads.Ads.isShowing() === v && flow.isExternalFlowActive('ads') === v;
  }, value);
}

const endlessState = (page) =>
  page.evaluate(() => {
    const sc = window.__harnessGame.scene.getScene('EndlessScene');
    return { dead: sc.isDead, active: window.__harnessGame.scene.isActive('EndlessScene'), actionsVisible: sc.overlayActions.every((o) => o.visible), clock: sc.time.now };
  });

export const adInflightGuard = {
  name: 'ad-inflight-guard',
  modes: ['dev'],
  weight: 97, // about seconds on a CI runner: balances --shard slices
  async run(page, ctx) {
    // ---- Endless run-over ----
    await startScene(page, 'EndlessScene', { mode: 'endless' });
    await page.evaluate(() => {
      const sc = window.__harnessGame.scene.getScene('EndlessScene');
      sc.score = 400;
      sc.die();
    });
    await waitForText(page, /RETRY/, ['EndlessScene']);
    await waitFor(page, 'the run-over screen to accept a return tap (canReturn)', () => window.__harnessGame.scene.getScene('EndlessScene').canReturn === true, null);
    const retry = (await findTexts(page, /RETRY/, ['EndlessScene']))[0];
    const share = (await findTexts(page, /SHARE/, ['EndlessScene']))[0];
    const before = await endlessState(page);
    ctx.expect(before.dead && before.active, 'Endless: dead, on the run-over screen', JSON.stringify(before));

    ctx.expect(await setAdShowing(page, true), 'a show is in flight (Ads.isShowing() and the external-flow flag are raised)');
    await clickGame(page, retry.x, retry.y);
    await frames(page, 25);
    let st = await endlessState(page);
    ctx.expect(st.dead && st.active && st.clock >= before.clock, 'RETRY is ignored while an ad is in flight (the scene was not restarted)', JSON.stringify(st));
    await clickGame(page, share.x, share.y);
    await frames(page, 25);
    st = await endlessState(page);
    ctx.expect(st.dead && st.actionsVisible, 'SHARE is ignored while an ad is in flight (the actions were not hidden for a snapshot)', JSON.stringify(st));
    await clickGame(page, 30, 400); // the scrim ("tap to return")
    await frames(page, 25);
    ctx.expect(await isActive(page, 'EndlessScene'), 'a tap on the scrim does not walk to the menu during an ad');
    await page.keyboard.press('Escape');
    await frames(page, 25);
    ctx.expect((await isActive(page, 'EndlessScene')) && !(await isActive(page, 'MainMenuScene')), 'Android Back (Escape) does nothing during an ad: not the menu');
    ctx.expect(await setAdShowing(page, false), 'the show is over (flags lowered)');
    await page.keyboard.press('Escape');
    await ctx.step('Escape works again once the ad is gone: Endless run-over -> menu', () => waitForScene(page, 'MainMenuScene', 8000));

    // ---- the HUD toolbar under the win overlay ----
    await winOverlay(page, 1);
    const toolbar = await page.evaluate(() => {
      const sc = window.__harnessGame.scene.getScene('GameScene');
      return sc.children.list
        .filter((o) => o.depth === 21 && o.input && o.input.enabled) // the nav toolbar's buttons (GameScene.createNav)
        .map((o) => {
          const m = o.getWorldTransformMatrix();
          return { x: m.tx, y: m.ty };
        })
        .sort((a, b) => a.x - b.x);
    });
    ctx.expect(toolbar.length === 3, 'the three toolbar buttons (Home, Settings, Restart) are live under the win overlay', `found ${toolbar.length}`);
    if (toolbar.length === 3) {
      await setAdShowing(page, true);
      await clickGame(page, toolbar[0].x, toolbar[0].y); // Home
      await frames(page, 25);
      ctx.expect(await isActive(page, 'GameScene'), 'Home is ignored while the 2x ad is requested (still on the level)');
      await clickGame(page, toolbar[1].x, toolbar[1].y); // Settings
      await frames(page, 25);
      ctx.expect(!(await isActive(page, 'SettingsScene')), 'Settings does not open while an ad is in flight');
      await setAdShowing(page, false);
      await clickGame(page, toolbar[1].x, toolbar[1].y);
      await ctx.step('Settings opens again once the ad is gone', () => waitForScene(page, 'SettingsScene', 8000));
    }

    // ---- the shop: tabs and Back ----
    await startScene(page, 'CosmeticsScene', { tab: 'bundle' });
    const tabs = await findTexts(page, /^(Skins|Trails|Arrivals|Bundles)$/, ['CosmeticsScene']);
    const back = (await findTexts(page, /Back/, ['CosmeticsScene']))[0];
    const other = tabs.find((t) => t.text !== 'Bundles');
    ctx.expect(!!back && !!other, 'the shop tabs and Back are found');
    if (back && other) {
      const tab = () => page.evaluate(() => window.__harnessGame.scene.getScene('CosmeticsScene').tab);
      const t0 = await tab();
      await setAdShowing(page, true);
      await clickGame(page, other.x, other.y);
      await frames(page, 25);
      ctx.expect((await tab()) === t0 && (await isActive(page, 'CosmeticsScene')), `a tab switch is ignored during an ad (still on ${t0})`);
      await clickGame(page, back.x, back.y);
      await frames(page, 25);
      ctx.expect(await isActive(page, 'CosmeticsScene'), 'Back is ignored during an ad (still in the shop)');
      await setAdShowing(page, false);
      await clickGame(page, other.x, other.y);
      await ctx.step('the tab switch works again once the ad is gone', () => waitFor(page, 'the shop to leave the bundle tab', (t) => window.__harnessGame.scene.getScene('CosmeticsScene').tab !== t, t0, 8000));
    }
  },
};
