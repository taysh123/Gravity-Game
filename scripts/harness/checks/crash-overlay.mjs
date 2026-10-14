// P00-T21 (B-10): an exception inside a frame no longer freezes the game for good. window.__crashTest (src/main.ts, dev server only)
// makes the running scene's update throw, and the frame guard (src/platform/frameGuard.ts) must:
//   1. survive one throw: the error is logged, the game keeps stepping, no overlay;
//   2. after FRAME_ERROR_BURST throws within FRAME_ERROR_WINDOW_MS, put the loop to sleep and show the DOM overlay
//      "Something went wrong · Tap to restart" over the whole screen (src/platform/errorOverlay.ts);
//   3. on a tap anywhere, reload: the game boots back to the main menu, stepping, with no overlay.
// The injected errors are console.error lines by design: the guard logs every error it catches, and Crash logs its first report in
// the dev server (later identical ones are deduplicated). The check declares exactly those two lines with ctx.expectSignal right
// before it provokes them; any other error still fails the job.
//
// Dev mode only: the production bundle has no window.__crashTest (debug-handles proves it, at runtime and in dist/).

import { CRASH_TEST, DEV_HANDLES, ERROR_OVERLAY } from '../lib/copy.mjs';
import { bootToMenu, frames, isActive, waitFor } from '../lib/game.mjs';

// A failure limit and a progress count, both in page frames (never wall-clock sleeps).
const MAX_WAIT_FRAMES = 600;
const PROGRESS_FRAMES = 30;

/** Wait, frame by frame, until an expectation from ctx.expectSignal has seen at least n signals. */
async function waitForSignals(page, expectation, n, what) {
  for (let i = 0; i < MAX_WAIT_FRAMES && expectation.count() < n; i++) await frames(page, 1);
  if (expectation.count() < n) throw new Error(`waited ${MAX_WAIT_FRAMES} frames for ${what}: ${expectation.count()} of ${n} arrived`);
}

/** The game loop's frame counter and running flag, and whether the overlay is in the page. */
const loopState = (page) =>
  page.evaluate(
    (id) => ({ frame: window.__harnessGame.loop.frame, running: window.__harnessGame.loop.running, overlay: document.getElementById(id) !== null }),
    ERROR_OVERLAY.id,
  );

/** window.__crashTest(times), or window.__crashTest() when times is null. */
const crashTest = (page, times) => page.evaluate(([name, n]) => (n === null ? window[name]() : window[name](n)), [DEV_HANDLES.crashTest, times]);

export const crashOverlay = {
  name: 'crash-overlay',
  modes: ['dev'],
  weight: 25, // about seconds on a CI runner (it boots the game twice)
  async run(page, ctx) {
    const hook = await page.evaluate((name) => typeof window[name], DEV_HANDLES.crashTest);
    ctx.expect(hook === 'function', `the dev server defines window.${DEV_HANDLES.crashTest}()`, `typeof is ${hook}`);

    const guard = ctx.expectSignal({ kind: 'console.error', text: CRASH_TEST.guardLog }, 'the frame guard logs every injected frame error (console.error)');
    const reported = ctx.expectSignal({ kind: 'console.error', text: CRASH_TEST.crashLog }, 'the first injected frame error is reported to Crash (dev console.error)');

    // ---- 1. one transient throw ----
    await crashTest(page, 1);
    await waitForSignals(page, guard, 1, 'the single injected frame error');
    const before = await loopState(page);
    await frames(page, PROGRESS_FRAMES);
    const after = await loopState(page);
    ctx.expect(after.running && after.frame > before.frame && !after.overlay, 'one frame error: the game keeps stepping and no overlay appears', JSON.stringify({ before, after }));
    ctx.expect(await isActive(page, 'MainMenuScene'), 'one frame error: the main menu is still running');

    // ---- 2. a persistent error ----
    await crashTest(page, null);
    await waitFor(page, 'the error overlay', (id) => document.getElementById(id) !== null, ERROR_OVERLAY.id);
    await waitForSignals(page, guard, CRASH_TEST.burst, `${CRASH_TEST.burst} logged frame errors`);
    ctx.expect(guard.count() >= CRASH_TEST.burst, `the overlay came after at least ${CRASH_TEST.burst} frame errors`, `${guard.count()} logged`);
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

    // ---- 3. tap to restart ----
    const reloaded = page.waitForEvent('load');
    await page.mouse.click(ctx.viewport.width / 2, ctx.viewport.height / 2);
    await reloaded;
    await bootToMenu(page);
    const fresh = await loopState(page);
    await frames(page, PROGRESS_FRAMES);
    const later = await loopState(page);
    ctx.expect(!fresh.overlay && later.running && later.frame > fresh.frame, 'a tap reloads the page: the game boots back to the main menu, stepping, with no overlay', JSON.stringify({ fresh, later }));
    ctx.expect(reported.count() === 1, 'Crash reported the injected error once: the repeats of the same message were deduplicated', `${reported.count()} reports`);
  },
};
