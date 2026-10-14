// Why the harness cannot reach the game, as soon as that is knowable. Pure: unit-tested in capture.test.mjs.
//
// browser.mjs installs a hook that captures Phaser.Game as window.__harnessGame. If that fails (Phaser changed how it exports its
// global, the bundle did not run, no Game ever stepped), every job would otherwise wait out the whole boot timeout (120 s) and
// report a generic "timed out". bootToMenu samples this state and stops with the message below within a few seconds instead.

export const PHASER_GRACE_MS = 3000; // after the page finished loading, window.Phaser must exist almost at once
export const GAME_START_LIMIT_MS = 20000; // Phaser is there: a Game must step well within this

/**
 * @param {{ gameCaptured: boolean, hookError?: string, phaserType: string, readyState: string, elapsedMs: number }} state
 * @returns {string | null} a message when the capture cannot succeed (or has run out of time), null when it is fine or still early
 */
export function captureProblem({ gameCaptured, hookError, phaserType, readyState, elapsedMs }) {
  if (gameCaptured) return null;
  if (hookError) {
    return `The harness capture hook failed: ${hookError}. It wraps Game.prototype.step when Phaser assigns window.Phaser (scripts/harness/lib/browser.mjs, CAPTURE_GAME_SOURCE); Phaser's export may have changed.`;
  }
  if (phaserType === 'undefined') {
    if (readyState === 'complete' && elapsedMs > PHASER_GRACE_MS) {
      return `window.Phaser was never assigned although the page finished loading (document.readyState is 'complete', ${Math.round(elapsedMs / 1000)} s in): the app bundle did not run or no longer assigns the Phaser global the capture hook waits for. Check the page errors above.`;
    }
    return null;
  }
  if (elapsedMs > GAME_START_LIMIT_MS) {
    return `Phaser loaded but no Game stepped within ${GAME_START_LIMIT_MS / 1000} s, so there is no window.__harnessGame: the game did not start. Check the page errors above.`;
  }
  return null;
}
