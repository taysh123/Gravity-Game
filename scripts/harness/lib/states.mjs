// Named game states the checks drive the app into: one per screen a player can see. Each state says how to reach it, which
// scenes must be active afterwards (`visits`) and which scenes the hit-area probe looks at (`probe`, absent = not probed) and whether the screen holds a scrolling
// list (`lists`: the probe must then find its viewport mask, see probeToAssertions).
//
// The `screens` check walks every state to prove each scene starts without an error and probes the ones with a `probe`;
// `first-run` reuses a few of them as a fresh player. `coveredSceneKeys()` is what `screens` compares against the scene list in
// src/main.ts: a new scene with no state fails the run until it is added.
//
// States reach a scene the way the app does (scene.start / launch + pause, or a real tap on its button). Where a state needs
// the game to be "won" or "dead", the harness calls the scene's own method (triggerWin, die): the same code the moment runs.

import { settle, startScene, waitFor, waitForScene, waitForText, clickText } from './game.mjs';

const WIN_TEXT = /LEVEL COMPLETE|STAR FREED/;
const RUN_OVER_TEXT = /^RUN OVER$/;
const WIN_OVERLAY_GAME_MS = 1100; // the win overlay's own entrance: panel scale-pop, then the offers (500 + 300 ms) pop in

/** The level the harness calls a boss. World 1's finale is "THE COLLAPSE"; the state asserts GameScene.isBoss, not just the number. */
export const BOSS_LEVEL = 10;

// ---- helpers ---------------------------------------------------------------------------------------------------------

const sceneCall = (page, key, method, ...args) =>
  page.evaluate(
    ([k, m, a]) => {
      const sc = window.__harnessGame.scene.getScene(k);
      if (typeof sc[m] !== 'function') throw new Error(`${k}.${m} is not a function any more: update scripts/harness/lib/states.mjs`);
      return sc[m](...a);
    },
    [key, method, args],
  );

/** Wait for the scene clock to run `ms` more (game time, so it follows the frame rate, not the wall). */
function runGameClock(page, key, ms) {
  return page.evaluate(
    ([k, wait]) =>
      new Promise((resolve) => {
        const sc = window.__harnessGame.scene.getScene(k);
        const t0 = sc.time.now;
        const step = () => (sc.time.now - t0 >= wait ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    [key, ms],
  );
}

export async function openSettingsOver(page, caller) {
  await page.evaluate((c) => {
    // What the gear / SETTINGS button does: pause the caller, launch the overlay on top of it.
    const sc = window.__harnessGame.scene.getScene(c);
    sc.scene.pause();
    sc.scene.launch('SettingsScene', { caller: c });
  }, caller);
  await waitForScene(page, 'SettingsScene');
  await settle(page, ['SettingsScene']);
}

/** MainMenu with the Settings overlay launched over it, as the gear button does. */
export async function settingsOverMenu(page) {
  await startScene(page, 'MainMenuScene');
  await openSettingsOver(page, 'MainMenuScene');
}

export async function pauseGame(page, level = 2) {
  await startScene(page, 'GameScene', { level });
  await sceneCall(page, 'GameScene', 'requestPause', 'button');
  await waitForScene(page, 'PauseScene');
  await settle(page, ['PauseScene']);
}

/** Win the running level through the scene's own method, with the auto-advance held so the overlay stays up. */
export function triggerWinHeld(page) {
  return page.evaluate(() => {
    const sc = window.__harnessGame.scene.getScene('GameScene');
    sc.triggerWin();
    if (sc.advanceTimer) sc.advanceTimer.paused = true;
  });
}

/** The win overlay of a campaign level, fully entered and settled. */
export async function winOverlay(page, level) {
  await startScene(page, 'GameScene', { level });
  await triggerWinHeld(page);
  await waitForText(page, WIN_TEXT, ['GameScene']);
  await runGameClock(page, 'GameScene', WIN_OVERLAY_GAME_MS);
  await settle(page, ['GameScene']);
}

/**
 * Start EndlessScene. The scene objects are reused across starts, so an own-property override outlives the state that set it:
 * `die` is cleared first. `idle` keeps the run alive: an idle ball falls behind the camera and the run ends by itself, which
 * would turn a HUD state into the run-over screen (and make requestPause a no-op) if it happened before the override. The
 * override is therefore installed BEFORE the scene starts.
 */
async function startEndless(page, mode, { idle = false } = {}) {
  await page.evaluate((keepAlive) => {
    const sc = window.__harnessGame.scene.getScene('EndlessScene');
    delete sc.die;
    if (keepAlive) sc.die = () => {};
  }, idle);
  await startScene(page, 'EndlessScene', { mode });
}

const endlessHud = (page, mode) => startEndless(page, mode, { idle: true });

async function endlessRunOver(page, mode) {
  await startEndless(page, mode);
  await page.evaluate(() => {
    const sc = window.__harnessGame.scene.getScene('EndlessScene');
    sc.score = 400;
    sc.die();
  });
  await waitForText(page, RUN_OVER_TEXT, ['EndlessScene']);
  await settle(page, ['EndlessScene']);
}

// ---- the table -------------------------------------------------------------------------------------------------------

/**
 * @typedef {{ name: string, visits: string[], probe?: string[], lists?: boolean, seed?: Record<string,string>, modes?: string[],
 *             setup: (page: import('playwright').Page) => Promise<void> }} State
 */

/** The menus, hubs and the overlays that sit on them. @type {State[]} */
export const MENU_STATES = [
  { name: 'MainMenu', visits: ['MainMenuScene'], probe: ['MainMenuScene'], setup: (p) => startScene(p, 'MainMenuScene') },
  {
    name: 'Settings over MainMenu',
    visits: ['MainMenuScene', 'SettingsScene'],
    probe: ['SettingsScene'],
    setup: settingsOverMenu,
  },
  ...['skin', 'trail', 'arrival', 'bundle'].map((tab) => ({
    name: `Cosmetics: ${tab} tab`,
    visits: ['CosmeticsScene'],
    probe: ['CosmeticsScene'],
    lists: true,
    setup: (p) => startScene(p, 'CosmeticsScene', { tab }),
  })),
  {
    // Rows scrolled up under the tab bar are masked: they must be dead and the tabs must win. The three list tabs share one list
    // implementation, so one of them stands for all (list-viewport-taps taps the others).
    name: 'Cosmetics: skin tab scrolled to the end',
    visits: ['CosmeticsScene'],
    probe: ['CosmeticsScene'],
    lists: true,
    setup: (p) => startScene(p, 'CosmeticsScene', { tab: 'skin', scrollOffset: -99999 }),
  },
  { name: 'WorldMap', visits: ['WorldMapScene'], probe: ['WorldMapScene'], lists: true, setup: (p) => startScene(p, 'WorldMapScene') },
  { name: 'LevelSelect: world 1', visits: ['LevelSelectScene'], probe: ['LevelSelectScene'], lists: true, setup: (p) => startScene(p, 'LevelSelectScene', { world: 1 }) },
  { name: 'LevelSelect: world 2', visits: ['LevelSelectScene'], probe: ['LevelSelectScene'], lists: true, setup: (p) => startScene(p, 'LevelSelectScene', { world: 2 }) },
  { name: 'RunSelect', visits: ['RunSelectScene'], probe: ['RunSelectScene'], setup: (p) => startScene(p, 'RunSelectScene') },
  { name: 'Achievements', visits: ['AchievementsScene'], probe: ['AchievementsScene'], lists: true, setup: (p) => startScene(p, 'AchievementsScene') },
  { name: 'EndScene', visits: ['EndScene'], probe: ['EndScene'], setup: (p) => startScene(p, 'EndScene') },
];

/** The game itself and its overlays: campaign levels, the daily, Pause, the win overlay, Endless. @type {State[]} */
export const PLAY_STATES = [
  { name: 'Game: level 1', visits: ['GameScene'], probe: ['GameScene'], setup: (p) => startScene(p, 'GameScene', { level: 1 }) },
  {
    name: `Game: boss level ${BOSS_LEVEL}`,
    visits: ['GameScene'],
    async setup(p) {
      await startScene(p, 'GameScene', { level: BOSS_LEVEL });
      const isBoss = await p.evaluate(() => window.__harnessGame.scene.getScene('GameScene').isBoss);
      if (isBoss !== true) throw new Error(`level ${BOSS_LEVEL} is no longer a boss level (GameScene.isBoss=${isBoss}): update BOSS_LEVEL in scripts/harness/lib/states.mjs`);
    },
  },
  ...['none', 'timed', 'gemRush'].map((dailyModifier) => ({
    name: `Game: daily (${dailyModifier})`,
    visits: ['GameScene'],
    setup: (p) => startScene(p, 'GameScene', { daily: true, dailyIndex: 0, dailyModifier }),
  })),
  { name: 'Pause over Game', visits: ['GameScene', 'PauseScene'], probe: ['PauseScene'], setup: (p) => pauseGame(p) },
  {
    name: 'Settings over Pause',
    visits: ['PauseScene', 'SettingsScene'],
    probe: ['SettingsScene'],
    async setup(p) {
      await pauseGame(p);
      await clickText(p, 'SETTINGS', ['PauseScene']); // the real button
      await waitForScene(p, 'SettingsScene');
      await settle(p, ['SettingsScene']);
    },
  },
  { name: 'Game: win overlay', visits: ['GameScene'], probe: ['GameScene'], setup: (p) => winOverlay(p, 5) },
  {
    name: 'Endless: HUD',
    visits: ['EndlessScene'],
    probe: ['EndlessScene'],
    setup: (p) => endlessHud(p, 'endless'),
  },
  { name: 'Endless: pause', visits: ['EndlessScene', 'PauseScene'], probe: ['PauseScene'], async setup(p) {
      await endlessHud(p, 'endless');
      await sceneCall(p, 'EndlessScene', 'requestPause', 'button');
      await waitForScene(p, 'PauseScene');
      await settle(p, ['PauseScene']);
    } },
  { name: 'Endless: run over', visits: ['EndlessScene'], probe: ['EndlessScene'], setup: (p) => endlessRunOver(p, 'endless') },
  { name: 'Endless: weekly run over', visits: ['EndlessScene'], setup: (p) => endlessRunOver(p, 'weekly') },
];

export const STATES = [...MENU_STATES, ...PLAY_STATES];

export const stateByName = (name) => {
  const state = STATES.find((s) => s.name === name);
  if (!state) throw new Error(`no state named "${name}" in scripts/harness/lib/states.mjs`);
  return state;
};

/** Scenes that are reached by the start-up path itself rather than by a state above. */
export const BOOT_PATH_SCENES = ['BootScene', 'CompanySplashScene', 'IntroSplashScene', 'MainMenuScene'];

export function coveredSceneKeys() {
  return new Set([...BOOT_PATH_SCENES, ...STATES.flatMap((s) => s.visits)]);
}

/** Put the app into a state and confirm every scene it promises is active. */
export async function enterState(page, state) {
  await state.setup(page);
  await waitFor(page, `scenes ${state.visits.join(', ')} to be active`, (keys) => keys.every((k) => window.__harnessGame.scene.isActive(k) || window.__harnessGame.scene.isPaused(k)), state.visits);
}

