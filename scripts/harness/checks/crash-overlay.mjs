// P00-T21 (B-10): an exception inside a frame no longer freezes the game for good. window.__crashTest (src/main.ts, dev server only)
// makes the running scene's update throw, and the frame guard (src/platform/frameGuard.ts) must:
//   1. survive one throw: the error is logged, the game keeps stepping, no overlay;
//   2. stop on a persistent error: once FRAME_ERROR_BURST errors fall inside one FRAME_ERROR_WINDOW_MS window, put the loop to sleep
//      and show the DOM overlay "Something went wrong · Tap to restart" over the whole screen (src/platform/errorOverlay.ts). The error
//      of step 1 is usually still inside that window, so the overlay can come after FRAME_ERROR_BURST - 1 further throws as well as
//      after FRAME_ERROR_BURST: the check counts the errors in all and does not depend on which;
//   3. on a tap anywhere, reload: the game boots back to the main menu, stepping, with no overlay;
//   4. do the same on Back (Escape on the web; the Android Back button reaches the same handler, src/platform/lifecycle.ts handleBack).
// The injected errors are console.error lines by design: the guard logs every error it catches, and Crash logs its first report of a
// page load in the dev server (later identical ones are deduplicated). The check declares exactly those two lines with
// ctx.expectSignal right before it provokes them; any other error still fails the job.
//
// Dev mode only: the production bundle has no window.__crashTest (debug-handles proves it, at runtime and in dist/).

import { CRASH_TEST, DEV_HANDLES, ERROR_OVERLAY } from '../lib/copy.mjs';
import { bootToMenu, frames, isActive, waitFor } from '../lib/game.mjs';

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
  weight: 35, // about seconds on a CI runner: balances --shard slices (it boots the game three times)
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

    // ---- 3. tap to restart ----
    await reloadedBy(page, 'a tap on the overlay', () => page.mouse.click(ctx.viewport.width / 2, ctx.viewport.height / 2));
    const afterTap = await steppingAfterReload(page);
    ctx.expect(afterTap.ok, 'a tap reloads the page: the game boots back to the main menu, stepping, with no overlay', afterTap.detail);

    // ---- 4. Back restarts the same way ----
    await haltTheGame(page);
    await reloadedBy(page, 'Back (Escape) on the overlay', () => page.keyboard.press('Escape'));
    const afterBack = await steppingAfterReload(page);
    ctx.expect(afterBack.ok, 'Back (Escape) on the overlay reloads the page like a tap: the game boots back to the main menu, stepping, with no overlay', afterBack.detail);
  },
};
