// P00-T21 (B-10): an exception inside a frame no longer freezes the game for good. window.__crashTest (src/main.ts, dev server only)
// makes the running scene's update throw, and the frame guard (src/platform/frameGuard.ts) must:
//   1. survive one throw: the error is logged, the game keeps stepping, no overlay;
//   2. stop on a persistent error: once FRAME_ERROR_BURST errors fall inside one FRAME_ERROR_WINDOW_MS window, put the loop to sleep
//      and show the DOM overlay "Something went wrong · Tap to restart" over the whole screen (src/platform/errorOverlay.ts). The error
//      of step 1 is usually still inside that window, so the overlay can come after FRAME_ERROR_BURST - 1 further throws as well as
//      after FRAME_ERROR_BURST: the check counts the errors in all and does not depend on which. The overlay also shields the halted
//      game from the pointer: a press on it must not reach Phaser's input (main.ts turns game.input off), or it would press a button
//      beneath the overlay;
//   3. on a tap anywhere, reload: the game boots back to the main menu, stepping, with no overlay;
//   4. do the same on Back (Escape on the web; the Android Back button reaches the same handler, src/platform/lifecycle.ts handleBack);
//   5. leave the scene manager as a frame that did not throw: a frame error in the same update as the gear (pause the menu, launch
//      Settings) used to leave SceneManager.isProcessing true, and the next frame's processQueue then re-queued the bringToTop that
//      SettingsScene.create() calls for ever, an endless loop on the main thread. Settings must open and the game keep stepping;
//   6. show the overlay after ONE error when a scene fails to start: the next scene to start throws inside its own create(), which Phaser
//      leaves in the CREATING status for good, so nothing throws again and the burst policy alone would wait for ever (the frame guard's
//      `fatal` probe in main.ts sees the stuck scene).
// The injected errors are console.error lines by design: the guard logs every error it catches, and Crash logs its first report of a
// page load in the dev server (later identical ones are deduplicated). The check declares exactly those lines with ctx.expectSignal right
// before it provokes them; any other error still fails the job.
//
// Dev mode only: the production bundle has no window.__crashTest (debug-handles proves it, at runtime and in dist/).

import { CRASH_TEST, CREATE_FAILURE, DEV_HANDLES, ERROR_OVERLAY } from '../lib/copy.mjs';
import { bootToMenu, frames, isActive, waitFor, waitForScene, waitForSceneStopped } from '../lib/game.mjs';

// Failure limits and a progress count (never wall-clock sleeps): page frames, and the time a reload may take before it is a failure.
const MAX_WAIT_FRAMES = 600;
const PROGRESS_FRAMES = 30;
const RELOAD_TIMEOUT_MS = 15000;

/** Wait, frame by frame, until an expectation from ctx.expectSignal has seen at least n signals. Resolves to whether it has by MAX_WAIT_FRAMES. */
async function waitForSignals(page, expectation, n) {
  for (let i = 0; i < MAX_WAIT_FRAMES && expectation.count() < n; i++) await frames(page, 1);
  return expectation.count() >= n;
}

/** The game loop's frame counter and running flag, and whether the overlay is in the page. */
const loopState = (page) =>
  page.evaluate(
    (id) => ({ frame: window.__harnessGame.loop.frame, running: window.__harnessGame.loop.running, overlay: document.getElementById(id) !== null }),
    ERROR_OVERLAY.id,
  );

// A page whose main thread is stuck answers nothing, not even a Playwright timeout: waitForFunction on such a page never comes back (found by
// removing the isProcessing reset: the job hung for ever), and the whole job (and CI) would wait. So the wait that a hang would strand is
// raced against a clock of our own. A failure limit, not a delay: the passing path never waits for it.
const HANG_LIMIT_MS = 15000;

async function orHang(promise, what) {
  let timer;
  const hang = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: no answer within ${HANG_LIMIT_MS} ms (a stuck main thread, or a game that has stopped stepping)`)), HANG_LIMIT_MS);
  });
  try {
    return await Promise.race([promise, hang]);
  } finally {
    clearTimeout(timer);
  }
}

/** window.__crashTest(times), or window.__crashTest() when times is null. */
const crashTest = (page, times) => page.evaluate(([name, n]) => (n === null ? window[name]() : window[name](n)), [DEV_HANDLES.crashTest, times]);

/** Make every update throw, and wait for the frame guard to answer with its overlay. */
async function haltTheGame(page) {
  await crashTest(page, null);
  await waitFor(page, 'the error overlay', (id) => document.getElementById(id) !== null, ERROR_OVERLAY.id);
}

/** Do `act` (a tap, a key press) and wait for the page it reloads to finish loading. */
async function reloadedBy(page, what, act) {
  const loaded = page.waitForEvent('load', { timeout: RELOAD_TIMEOUT_MS });
  loaded.catch(() => undefined); // if `act` throws first, the wait nobody awaits must not become an unhandled rejection
  await act();
  try {
    await loaded;
  } catch (err) {
    throw new Error(`${what} did not reload the page within ${RELOAD_TIMEOUT_MS} ms: ${String(err.message).split('\n')[0]}`);
  }
}

/** After a reload: boot to the main menu and report whether the game is stepping with no overlay. */
async function steppingAfterReload(page) {
  await bootToMenu(page);
  const fresh = await loopState(page);
  await frames(page, PROGRESS_FRAMES);
  const later = await loopState(page);
  return { ok: !fresh.overlay && later.running && later.frame > fresh.frame, detail: JSON.stringify({ fresh, later }) };
}

export const crashOverlay = {
  name: 'crash-overlay',
  modes: ['dev'],
  weight: 40, // about seconds on a CI runner: balances --shard slices (it boots the game three times and runs six stages)
  async run(page, ctx) {
    const hook = await page.evaluate((name) => typeof window[name], DEV_HANDLES.crashTest);
    ctx.expect(hook === 'function', `the dev server defines window.${DEV_HANDLES.crashTest}()`, `typeof is ${hook}`);

    const guard = ctx.expectSignal({ kind: 'console.error', text: CRASH_TEST.guardLog }, 'the frame guard logs every injected frame error (console.error)');
    const reported = ctx.expectSignal({ kind: 'console.error', text: CRASH_TEST.crashLog }, 'the first injected frame error of a page load is reported to Crash (dev console.error)');

    // ---- 1. one transient throw ----
    await crashTest(page, 1);
    if (!(await waitForSignals(page, guard, 1))) throw new Error(`waited ${MAX_WAIT_FRAMES} frames for the single injected frame error: ${guard.count()} of 1 arrived`);
    const before = await loopState(page);
    await frames(page, PROGRESS_FRAMES);
    const after = await loopState(page);
    ctx.expect(after.running && after.frame > before.frame && !after.overlay, 'one frame error: the game keeps stepping and no overlay appears', JSON.stringify({ before, after }));
    ctx.expect(await isActive(page, 'MainMenuScene'), 'one frame error: the main menu is still running');

    // ---- 2. a persistent error ----
    await haltTheGame(page);
    const overlay = await page.evaluate(
      ([id, x, y]) => {
        const el = document.getElementById(id);
        const top = document.elementFromPoint(x, y);
        return {
          text: el ? el.textContent : '',
          role: el ? el.getAttribute('role') : null,
          count: document.querySelectorAll(`#${id}`).length,
          covers: !!top && top.closest(`#${id}`) !== null,
        };
      },
      [ERROR_OVERLAY.id, ctx.viewport.width / 2, ctx.viewport.height / 2],
    );
    ctx.expect(overlay.text.includes(ERROR_OVERLAY.title) && overlay.text.includes(ERROR_OVERLAY.action), `the overlay reads "${ERROR_OVERLAY.title}" and "${ERROR_OVERLAY.action}"`, overlay.text);
    ctx.expect(overlay.count === 1 && overlay.role === 'alertdialog', 'exactly one overlay, announced as an alert dialog', JSON.stringify(overlay));
    ctx.expect(overlay.covers, 'the overlay is on top of the game at the centre of the screen');
    const asleep = await loopState(page);
    await frames(page, PROGRESS_FRAMES);
    const still = await loopState(page);
    ctx.expect(!asleep.running && still.frame === asleep.frame, 'the game loop is asleep: no frame runs under the overlay', JSON.stringify({ asleep, still }));
    // The loop is asleep, so no frame error can follow: once the console lines have reached the harness the count is final. The overlay
    // must not come on fewer than FRAME_ERROR_BURST errors in all (the one of step 1 counts while it is inside the window). How many more
    // than that it took depends on how long step 1 took, so no exact total is asserted.
    const burstLogged = await waitForSignals(page, guard, CRASH_TEST.burst);
    ctx.expect(burstLogged, `the overlay came after at least ${CRASH_TEST.burst} frame errors in all (the one of step 1 counts while it is inside the window)`, `${guard.count()} logged`);
    ctx.expect(reported.count() === 1, 'Crash was told about the injected error once on this page load: the repeats of the same message were deduplicated', `${reported.count()} reports`);

    // The overlay also shields the halted game from the pointer. Phaser's window-level mouse and touch handlers take events whose target is
    // not the canvas, and the InputManager updates every running scene's input at once (only the step is inert while the loop sleeps), so,
    // left alone, a press on the overlay would press the button beneath it before the click that restarts. main.ts turns the game's input
    // off when it shows the overlay. The press stays down into step 3, where its release is the click that reloads.
    await page.mouse.move(ctx.viewport.width / 2, ctx.viewport.height / 2);
    await page.mouse.down();
    await frames(page, PROGRESS_FRAMES);
    const pointer = await page.evaluate(() => ({ down: window.__harnessGame.input.mousePointer.isDown, enabled: window.__harnessGame.input.enabled }));
    ctx.expect(!pointer.down, 'a press on the overlay does not reach the halted game: the Phaser mouse pointer stays up', JSON.stringify(pointer));

    // ---- 3. tap to restart ----
    // The release of the press above: together they are the click on the overlay.
    await reloadedBy(page, 'a tap on the overlay', () => page.mouse.up());
    const afterTap = await steppingAfterReload(page);
    ctx.expect(afterTap.ok, 'a tap reloads the page: the game boots back to the main menu, stepping, with no overlay', afterTap.detail);

    // ---- 4. Back restarts the same way ----
    await haltTheGame(page);
    await reloadedBy(page, 'Back (Escape) on the overlay', () => page.keyboard.press('Escape'));
    const afterBack = await steppingAfterReload(page);
    ctx.expect(afterBack.ok, 'Back (Escape) on the overlay reloads the page like a tap: the game boots back to the main menu, stepping, with no overlay', afterBack.detail);

    // ---- 5. a survived frame error leaves the scene manager as a frame that did not throw ----
    // The gear (pause the menu, launch Settings: two operations queued for the next frame) is pressed in the same menu update as one injected
    // frame error, the worst case for SceneManager.isProcessing. If the flag is left true the page hangs and answers nothing, so the wait for
    // Settings is raced against a clock of our own (orHang) and the check fails there instead of stranding the job.
    await page.evaluate((message) => {
      const menu = window.__harnessGame.scene.getScene('MainMenuScene');
      menu.events.once('update', () => {
        menu.scene.pause();
        menu.scene.launch('SettingsScene', { caller: 'MainMenuScene' });
        throw new Error(message);
      });
    }, CRASH_TEST.message);
    await orHang(waitForScene(page, 'SettingsScene'), 'Settings did not open after a frame error beside the gear');
    const beforeSettings = await loopState(page);
    await frames(page, PROGRESS_FRAMES);
    const afterSettings = await loopState(page);
    ctx.expect(
      afterSettings.running && afterSettings.frame > beforeSettings.frame && !afterSettings.overlay,
      'a frame error beside the gear: Settings opens and the game keeps stepping (the scene manager was not left mid-update)',
      JSON.stringify({ beforeSettings, afterSettings }),
    );
    await page.evaluate(() => window.__harnessGame.scene.getScene('SettingsScene').close());
    await waitForSceneStopped(page, 'SettingsScene');
    await waitForScene(page, 'MainMenuScene');

    // ---- 6. one throw while a scene starts ----
    // CREATE_FAILURE.snippet (device row R5) makes the next scene to start throw from its own create(). The gear starts one: Settings throws,
    // once. Phaser leaves it CREATING and the menu paused under it, nothing throws again, and only the `fatal` probe can turn that into the
    // overlay. The count below is exact because nothing runs after the overlay: one error, not a burst.
    const created = ctx.expectSignal({ kind: 'console.error', text: CREATE_FAILURE.guardLog }, 'the frame guard logs the error thrown while a scene starts (console.error)');
    ctx.expectSignal({ kind: 'console.error', text: CREATE_FAILURE.crashLog }, 'the error thrown while a scene starts is reported to Crash (dev console.error)');
    await page.evaluate((snippet) => {
      (0, eval)(snippet);
      const menu = window.__harnessGame.scene.getScene('MainMenuScene');
      menu.scene.pause();
      menu.scene.launch('SettingsScene', { caller: 'MainMenuScene' });
    }, CREATE_FAILURE.snippet);
    await waitFor(page, 'the error overlay after a scene failed to start', (id) => document.getElementById(id) !== null, ERROR_OVERLAY.id);
    const createLogged = await waitForSignals(page, created, 1);
    const stuck = await page.evaluate(() => ({ status: window.__harnessGame.scene.getScene('SettingsScene').sys.settings.status, creating: window.Phaser.Scenes.CREATING }));
    const asleepAfterCreate = await loopState(page);
    await frames(page, PROGRESS_FRAMES);
    const stillAfterCreate = await loopState(page);
    ctx.expect(createLogged && created.count() === 1, 'the overlay came after ONE frame error: a scene that fails to start throws only once', `${created.count()} logged`);
    ctx.expect(stuck.status === stuck.creating, 'that scene is stuck in the CREATING status, which is what the probe sees (Phaser never updates it)', JSON.stringify(stuck));
    ctx.expect(!asleepAfterCreate.running && stillAfterCreate.frame === asleepAfterCreate.frame, 'the game loop is asleep: no frame runs under the overlay', JSON.stringify({ asleepAfterCreate, stillAfterCreate }));
  },
};
