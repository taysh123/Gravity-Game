// Frame-loop error boundary (D-11, B-10, P00-T21). Phaser runs the game from one requestAnimationFrame callback, and that callback
// schedules the next frame only AFTER Game.step returns (node_modules/phaser/src/dom/RequestAnimationFrame.js, step). An exception
// anywhere inside a frame (input, a scene's update, a tween or timer callback, the render) therefore stopped the loop for good: the
// game froze and nothing told the player. installFrameGuard replaces game.step with a guarded step that never throws:
//   - every caught error is logged (console.error by default: logcat on Android, and the boot-smoke harness still sees it in the
//     production bundle, where Crash is silent on the web) and reported (deps.report: Crash.recordError in main.ts);
//   - an isolated error costs one frame and the loop goes on;
//   - FRAME_ERROR_BURST errors within FRAME_ERROR_WINDOW_MS (frameGuardDecision) mean the game cannot recover by itself: the loop is
//     put to sleep and deps.showOverlay() shows the "Tap to restart" overlay (errorOverlay.ts, plain DOM). The step then does nothing.
// Install it from the Game's READY event: Game.texturesReady emits READY and then calls start(), which binds this.step for the loop
// (node_modules/phaser/src/core/Game.js, texturesReady / start), so the guarded step is the one the loop calls.
// The game, the report and the overlay are passed in (no Phaser import, no services import): the guard is tested in node, and
// src/platform gains no dependency on src/services (src/platform/boundaries.test.ts).
import { PLATFORM } from '../config/platform.config';

export type FrameGuardDecision = 'continue' | 'overlay';

/** The part of Phaser.Game the guard touches. */
export interface GuardedGame {
  step(time: number, delta: number): void;
  readonly loop: { sleep(): void };
}

export interface FrameGuardDeps {
  /** Report one caught error (main.ts: Crash.recordError(error, 'frame')). */
  report(error: unknown): void;
  /** Show the restart overlay, once, after the loop has been put to sleep (main.ts: silence audio, then showErrorOverlay). */
  showOverlay(): void;
  /** Monotonic clock in ms. Default: performance.now(). */
  now?: () => number;
  /** Where each caught error is logged. Default: console.error. */
  log?: (message: string, error: unknown) => void;
}

export const FRAME_GUARD_LOG_PREFIX = '[frameGuard]';

/**
 * Pure. errorTimesMs: when the frame errors so far happened, the one just caught included. 'overlay' once FRAME_ERROR_BURST of them
 * fall within the last FRAME_ERROR_WINDOW_MS (an error exactly FRAME_ERROR_WINDOW_MS old no longer counts), else 'continue'.
 */
export function frameGuardDecision(errorTimesMs: readonly number[], nowMs: number): FrameGuardDecision {
  const recent = errorTimesMs.filter((t) => nowMs - t < PLATFORM.FRAME_ERROR_WINDOW_MS).length;
  return recent >= PLATFORM.FRAME_ERROR_BURST ? 'overlay' : 'continue';
}

const describeError = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

// A dependency that throws must never escape the guard: that would stop the loop, the very thing the guard exists to prevent.
function quietly(fn: () => void): void {
  try {
    fn();
  } catch {
    // nothing more can be done from inside a failing frame
  }
}

const guarded = new WeakSet<GuardedGame>();

export function installFrameGuard(game: GuardedGame, deps: FrameGuardDeps): void {
  if (guarded.has(game)) return;
  guarded.add(game);
  const step = game.step; // Game.prototype.step, read before it is replaced
  const now = deps.now ?? (() => performance.now());
  const log = deps.log ?? ((message: string, error: unknown) => console.error(message, error));
  let errorTimes: number[] = [];
  let stopped = false;
  game.step = (time: number, delta: number): void => {
    if (stopped) return;
    try {
      step.call(game, time, delta);
    } catch (error) {
      const t = now();
      // Only the errors that can still count are kept, so a long session with rare errors keeps a short list.
      errorTimes = [...errorTimes.filter((x) => t - x < PLATFORM.FRAME_ERROR_WINDOW_MS), t];
      quietly(() => log(`${FRAME_GUARD_LOG_PREFIX} ${describeError(error)}`, error));
      quietly(() => deps.report(error));
      if (frameGuardDecision(errorTimes, t) === 'overlay') {
        stopped = true;
        quietly(() => game.loop.sleep());
        quietly(() => deps.showOverlay());
      }
    }
  };
}
