// Real taps on the two overlays (P00-T17b review finding F2). The Settings panel swallows a tap on blank space (it used to fall
// through to the scrim and close the overlay), only the scrim OUTSIDE the panel closes it, every control still works. The
// Pause overlay has the same scrim and panel but no scrim handler: blank taps, panel or scrim, never close it and gameplay
// stays paused. Positions come from the live scene (the toggles sit on the same row as their label), never hard-coded.

import { SETTINGS_TOGGLES as TOGGLES } from '../lib/copy.mjs';
import { frames, gameToPage, isActive, readTexts, stored, waitForSceneStopped } from '../lib/game.mjs';
import { clickPoint } from '../lib/lists.mjs';
import { BOTH_VIEWPORTS } from '../lib/registry.mjs';
import { KEYS } from '../lib/seeds.mjs';
import { pauseGame, settingsOverMenu } from '../lib/states.mjs';
const NOTHING_HAPPENED_FRAMES = 25;

/** Page (CSS) points for the controls of the open Settings overlay, found from the labels they sit beside. */
async function settingsPoints(page) {
  const texts = await readTexts(page, ['SettingsScene']);
  const at = (t) => texts.find((x) => x.text === t && x.visible);
  const labels = TOGGLES.map(([label]) => at(label));
  const title = at('SETTINGS');
  if (labels.some((l) => !l) || !title) throw new Error('Settings labels not found: the screen changed, update overlay-taps');
  const found = await page.evaluate(
    ([rows, head]) => {
      const g = window.__harnessGame;
      const sc = g.scene.getScene('SettingsScene');
      const pos = (o) => {
        const m = o.getWorldTransformMatrix();
        return { x: m.tx, y: m.ty };
      };
      const inter = sc.input._list.filter((o) => o.input && o.input.enabled && o.type === 'Container' && o.width < 100);
      const toggles = rows.map((l) => inter.filter((o) => Math.abs(pos(o).y - l.y) < 8 && pos(o).x > l.x + 60).map(pos)[0] ?? null);
      const close = inter.map(pos).find((p) => Math.abs(p.y - head.y) < 24 && p.x > head.x + 100) ?? null;
      return { toggles, close };
    },
    [labels, title],
  );
  if (found.toggles.some((t) => !t) || !found.close) throw new Error(`Settings controls not found: ${JSON.stringify(found)}`);
  const toPage = (p) => gameToPage(page, p.x, p.y);
  const [t0, t1, t2] = found.toggles;
  return {
    toggles: await Promise.all(found.toggles.map(toPage)),
    close: await toPage(found.close),
    blankBesideFirst: await toPage({ x: t0.x - 90, y: t0.y }),
    blankBetweenRows: await toPage({ x: t0.x - 40, y: (t0.y + t1.y) / 2 }),
    blankBesideThird: await toPage({ x: t2.x - 90, y: t2.y }),
    scrim: await toPage({ x: 10, y: 10 }),
  };
}

export const overlayTaps = {
  name: 'overlay-taps',
  weight: 3, // starts early when jobs run in parallel (rough relative cost)
  modes: ['preview', 'dev'],
  viewports: BOTH_VIEWPORTS,
  async run(page, ctx) {
    const open = () => isActive(page, 'SettingsScene');

    await settingsOverMenu(page);
    const pts = await settingsPoints(page);
    for (const [name, point] of [
      ['blank panel space beside the first toggle', pts.blankBesideFirst],
      ['blank panel space between two toggle rows', pts.blankBetweenRows],
      ['blank panel space beside the third toggle', pts.blankBesideThird],
    ]) {
      if (!(await open())) await settingsOverMenu(page);
      await clickPoint(page, point, NOTHING_HAPPENED_FRAMES);
      ctx.expect(await open(), `Settings: a tap on ${name} keeps the overlay open`, 'the overlay closed');
    }

    await settingsOverMenu(page);
    const live = await settingsPoints(page);
    for (let i = 0; i < TOGGLES.length; i++) {
      const [label, key] = TOGGLES[i];
      const before = JSON.parse((await stored(page, KEYS.settings)) ?? '{}');
      await clickPoint(page, live.toggles[i]);
      const after = JSON.parse((await stored(page, KEYS.settings)) ?? '{}');
      ctx.expect(after[key] !== before[key] && (await open()), `Settings: the ${label} toggle flips ${key} and the overlay stays open`, `before=${before[key]} after=${after[key]}`);
    }
    await clickPoint(page, live.close, 2);
    await ctx.step('Settings: the close button closes the overlay', () => waitForSceneStopped(page, 'SettingsScene', 8000));

    await settingsOverMenu(page);
    await clickPoint(page, (await settingsPoints(page)).scrim, 2);
    await ctx.step('Settings: a tap on the scrim outside the panel closes the overlay', () => waitForSceneStopped(page, 'SettingsScene', 8000));

    // Pause: the same scrim + glass panel, but its scrim has no handler. Blank taps must leave the game paused.
    await pauseGame(page);
    const title = (await readTexts(page, ['PauseScene'])).find((t) => t.text === 'PAUSED' && t.visible);
    ctx.expect(!!title, 'Pause: the PAUSED overlay is on screen', 'no PAUSED text');
    if (title) {
      const blank = await gameToPage(page, title.x + 150, title.y);
      const scrim = await gameToPage(page, 10, 10);
      const stillPaused = async () => (await isActive(page, 'PauseScene')) && !(await isActive(page, 'GameScene'));
      await clickPoint(page, blank, NOTHING_HAPPENED_FRAMES);
      ctx.expect(await stillPaused(), 'Pause: a tap on blank panel space keeps the overlay open and the game paused', 'the overlay closed or the game resumed');
      await clickPoint(page, scrim, NOTHING_HAPPENED_FRAMES);
      ctx.expect(await stillPaused(), 'Pause: a tap on the scrim outside the panel does not close it either', 'the overlay closed or the game resumed');
    }
    await frames(page, 2);
  },
};
