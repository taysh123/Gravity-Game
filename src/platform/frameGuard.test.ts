import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLATFORM } from '../config/platform.config';
import { FRAME_GUARD_LOG_PREFIX, frameGuardDecision, installFrameGuard, type GuardedGame } from './frameGuard';

const BURST = PLATFORM.FRAME_ERROR_BURST;
const WINDOW = PLATFORM.FRAME_ERROR_WINDOW_MS;
// Errors this far apart can never put BURST of them inside one window.
const SPREAD = WINDOW / 2 + 1;

describe('frameGuardDecision (pure, TECHNICAL-ARCHITECTURE 4.2)', () => {
  it('pins the P0 spec values: 3 errors within 2000 ms', () => {
    expect(BURST).toBe(3);
    expect(WINDOW).toBe(2000);
  });

  it('no error, or one error: continue', () => {
    expect(frameGuardDecision([], 0)).toBe('continue');
    expect(frameGuardDecision([500], 500)).toBe('continue');
  });

  it('BURST - 1 errors inside the window: continue', () => {
    expect(frameGuardDecision([0, 16], 16)).toBe('continue');
  });

  it('BURST errors inside the window: overlay (a persistent error, one per frame)', () => {
    expect(frameGuardDecision([0, 16, 33], 33)).toBe('overlay');
  });

  it('the window edge: an error exactly WINDOW ms old no longer counts, one just inside still does', () => {
    expect(frameGuardDecision([0, 1000, WINDOW], WINDOW)).toBe('continue');
    expect(frameGuardDecision([1, 1000, WINDOW], WINDOW)).toBe('overlay');
  });

  it('isolated errors spread over a long session never add up to an overlay', () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      times.push(i * SPREAD);
      expect(frameGuardDecision(times, times[times.length - 1])).toBe('continue');
    }
  });
});

// A stand-in for Phaser.Game: a step that does what the test says, and a loop that can sleep.
function fakeGame(impl: (time: number, delta: number) => void) {
  const calls: Array<{ self: unknown; time: number; delta: number }> = [];
  const game = {
    step(this: unknown, time: number, delta: number): void {
      calls.push({ self: this, time, delta });
      impl(time, delta);
    },
    loop: { sleep: vi.fn() },
  };
  return { game: game as GuardedGame & typeof game, calls };
}

function setup(impl: (time: number, delta: number) => void) {
  const { game, calls } = fakeGame(impl);
  let clock = 0;
  const deps = { report: vi.fn(), showOverlay: vi.fn(), log: vi.fn(), now: () => clock };
  installFrameGuard(game, deps);
  // One requestAnimationFrame frame, as Phaser's TimeStep calls it (Game.start binds step to the game).
  const frame = (dt = 16): void => {
    clock += dt;
    game.step.call(game, clock, dt);
  };
  return { game, calls, deps, frame };
}

const persistent = (): never => {
  throw new Error('persistent');
};

describe('installFrameGuard', () => {
  it('a frame that does not throw runs the original step, on the game, with the same arguments', () => {
    const { game, calls, deps, frame } = setup(() => undefined);
    frame(16);
    expect(calls).toEqual([{ self: game, time: 16, delta: 16 }]);
    expect(deps.report).not.toHaveBeenCalled();
    expect(deps.log).not.toHaveBeenCalled();
  });

  it('a throw is caught, logged with the prefix and reported, and the next frames run (one transient error never ends the session)', () => {
    let throwNext = true;
    const boom = new TypeError('x is undefined');
    const { game, calls, deps, frame } = setup(() => {
      if (throwNext) {
        throwNext = false;
        throw boom;
      }
    });
    expect(() => frame()).not.toThrow();
    expect(deps.log).toHaveBeenCalledWith(`${FRAME_GUARD_LOG_PREFIX} TypeError: x is undefined`, boom);
    expect(deps.report).toHaveBeenCalledWith(boom);
    frame();
    frame();
    expect(calls).toHaveLength(3);
    expect(game.loop.sleep).not.toHaveBeenCalled();
    expect(deps.showOverlay).not.toHaveBeenCalled();
  });

  it('BURST throws within the window put the loop to sleep and show the overlay, once, on the BURST-th error', () => {
    const { game, deps, frame } = setup(persistent);
    for (let i = 1; i < BURST; i++) {
      frame();
      expect(deps.showOverlay).not.toHaveBeenCalled();
    }
    frame();
    expect(game.loop.sleep).toHaveBeenCalledTimes(1);
    expect(deps.showOverlay).toHaveBeenCalledTimes(1);
    expect(deps.report).toHaveBeenCalledTimes(BURST);
  });

  it('after the overlay the guarded step does nothing: the original never runs again and nothing more is reported', () => {
    const { calls, deps, frame } = setup(persistent);
    for (let i = 0; i < BURST + 2; i++) frame();
    expect(calls).toHaveLength(BURST);
    expect(deps.report).toHaveBeenCalledTimes(BURST);
    expect(deps.showOverlay).toHaveBeenCalledTimes(1);
  });

  it('errors further apart than the window never show the overlay', () => {
    const { deps, frame } = setup(persistent);
    for (let i = 0; i < 10; i++) frame(SPREAD);
    expect(deps.report).toHaveBeenCalledTimes(10);
    expect(deps.showOverlay).not.toHaveBeenCalled();
  });

  it('a log, report, sleep or overlay that throws cannot escape the guard, and the overlay is still attempted once', () => {
    const { game, calls } = fakeGame(persistent);
    let clock = 0;
    const showOverlay = vi.fn(() => {
      throw new Error('overlay failed');
    });
    game.loop.sleep.mockImplementation(() => {
      throw new Error('sleep failed');
    });
    installFrameGuard(game, {
      now: () => clock,
      log: () => {
        throw new Error('no console');
      },
      report: () => {
        throw new Error('report failed');
      },
      showOverlay,
    });
    for (let i = 0; i < BURST + 2; i++) {
      clock += 16;
      expect(() => game.step(clock, 16)).not.toThrow();
    }
    expect(showOverlay).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(BURST);
  });

  it('a thrown non-Error is logged by its string form', () => {
    const { deps, frame } = setup(() => {
      throw 'plain string';
    });
    frame();
    expect(deps.log).toHaveBeenCalledWith(`${FRAME_GUARD_LOG_PREFIX} plain string`, 'plain string');
  });

  it('installing twice on the same game wraps it once', () => {
    const { game, calls } = fakeGame(() => undefined);
    const deps = { report: vi.fn(), showOverlay: vi.fn(), log: vi.fn(), now: () => 0 };
    installFrameGuard(game, deps);
    const once = game.step;
    installFrameGuard(game, deps);
    expect(game.step).toBe(once);
    game.step(0, 16);
    expect(calls).toHaveLength(1);
  });

  it('by default it logs to console.error with the prefix', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { game } = fakeGame(() => {
      throw new Error('to the console');
    });
    installFrameGuard(game, { report: vi.fn(), showOverlay: vi.fn() });
    game.step(0, 16);
    expect(error).toHaveBeenCalledWith(`${FRAME_GUARD_LOG_PREFIX} Error: to the console`, expect.any(Error));
    error.mockRestore();
  });
});

describe('main.ts wiring (P00-T21)', () => {
  const main = readFileSync(fileURLToPath(new URL('../main.ts', import.meta.url)), 'utf8').replace(/\/\/.*$/gm, '');

  it('installs the frame guard once, first thing in the READY listener (Game.start binds this.step right after READY)', () => {
    expect(main.match(/installFrameGuard\(/g)).toHaveLength(1);
    expect(main).toMatch(/game\.events\.once\(Phaser\.Core\.Events\.READY, \(\) => \{\s*installFrameGuard\(game, \{/);
  });

  it('reports caught frame errors to Crash under the "frame" context and shows the DOM overlay', () => {
    expect(main).toMatch(/report: \(error\) => Crash\.recordError\(error, 'frame'\)/);
    expect(main).toMatch(/showErrorOverlay\(\);/);
  });

  it('mentions __crashTest only inside the import.meta.env.DEV block', () => {
    const dev = main.indexOf('if (import.meta.env.DEV) {');
    expect(dev).toBeGreaterThan(-1);
    expect(main.indexOf('__crashTest')).toBeGreaterThan(dev);
  });
});
