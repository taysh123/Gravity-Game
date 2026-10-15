import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLATFORM } from '../config/platform.config';
import { FRAME_GUARD_LOG_PREFIX, frameGuardDecision, installFrameGuard, type FrameGuardDeps, type GuardedGame } from './frameGuard';

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
function fakeGame(impl: (time: number, delta: number, scene: { isProcessing: boolean }) => void) {
  const calls: Array<{ self: unknown; time: number; delta: number }> = [];
  const scene = { isProcessing: false };
  const game = {
    step(this: unknown, time: number, delta: number): void {
      calls.push({ self: this, time, delta });
      impl(time, delta, scene);
    },
    loop: { sleep: vi.fn() },
    scene,
  };
  return { game: game as GuardedGame & typeof game, calls };
}

function setup(impl: (time: number, delta: number, scene: { isProcessing: boolean }) => void, extra: Partial<FrameGuardDeps> = {}) {
  const { game, calls } = fakeGame(impl);
  let clock = 0;
  const deps = { report: vi.fn(), showOverlay: vi.fn(), log: vi.fn(), now: () => clock };
  installFrameGuard(game, { ...deps, ...extra });
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
    const order: string[] = [];
    const failing = (what: string) => (): never => {
      order.push(what);
      throw new Error(`${what} failed`);
    };
    const showOverlay = vi.fn(failing('overlay'));
    game.loop.sleep.mockImplementation(failing('sleep'));
    installFrameGuard(game, { now: () => clock, log: failing('log'), report: failing('report'), showOverlay });
    for (let i = 0; i < BURST + 2; i++) {
      clock += 16;
      expect(() => game.step(clock, 16)).not.toThrow();
    }
    // Every caught error is logged, then reported. The BURST-th one then puts the loop to sleep and shows the overlay: each once, in that order,
    // and the frames after it do nothing at all.
    const caught = Array.from({ length: BURST }, () => ['log', 'report']).flat();
    expect(order).toEqual([...caught, 'sleep', 'overlay']);
    expect(game.loop.sleep).toHaveBeenCalledTimes(1);
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

// P00-T21 final review. SceneManager.update sets isProcessing and only the end of render() clears it: a frame that throws in between leaves it true,
// and the next frame's processQueue then re-queues bringToTop (which PauseScene.create and SettingsScene.create call) for ever, an endless loop on the
// main thread. The guard restores the between-frames invariant.
describe('installFrameGuard: the scene manager after a caught error', () => {
  it('a step that throws mid-update leaves isProcessing false once the guard has caught it', () => {
    const { game, frame } = setup((_time, _delta, scene) => {
      scene.isProcessing = true;
      throw new Error('mid-update');
    });
    frame();
    expect(game.scene.isProcessing).toBe(false);
  });

  it('it is restored before anything else the catch does: the log, the report, the sleep and the overlay all find it false', () => {
    const { game } = fakeGame((_time, _delta, scene) => {
      scene.isProcessing = true;
      throw new Error('mid-update');
    });
    const seen: Array<[string, boolean]> = [];
    const at = (what: string) => (): void => {
      seen.push([what, game.scene.isProcessing]);
    };
    game.loop.sleep.mockImplementation(at('sleep'));
    installFrameGuard(game, { now: () => 0, log: at('log'), report: at('report'), showOverlay: at('overlay'), fatal: () => true });
    game.step(0, 16);
    expect(seen).toEqual([
      ['log', false],
      ['report', false],
      ['sleep', false],
      ['overlay', false],
    ]);
  });

  it('a frame that does not throw is left alone: the flag is only restored after an error', () => {
    const { game, frame } = setup((_time, _delta, scene) => {
      scene.isProcessing = true;
    });
    frame();
    expect(game.scene.isProcessing).toBe(true);
  });

  it('a flag that cannot be written does not stop the error being logged, reported and survived', () => {
    const { game } = fakeGame(persistent);
    Object.freeze(game.scene);
    const log = vi.fn();
    const report = vi.fn();
    installFrameGuard(game, { now: () => 0, log, report, showOverlay: vi.fn() });
    expect(() => game.step(0, 16)).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(1);
  });
});

// A scene whose init() or create() throws is left in Phaser's START or CREATING status for good: its update never runs, the scene it replaced is
// already stopped or paused, and the loop goes on drawing nothing new. That error is the only one there will ever be (nothing runs to repeat it), so the
// burst policy alone would never fire. main.ts passes a probe for it.
describe('installFrameGuard: a game that cannot recover by itself (fatal)', () => {
  it('fatal true: the first error already puts the loop to sleep and shows the overlay, once', () => {
    const { game, deps, frame } = setup(persistent, { fatal: () => true });
    frame();
    expect(game.loop.sleep).toHaveBeenCalledTimes(1);
    expect(deps.showOverlay).toHaveBeenCalledTimes(1);
    expect(deps.report).toHaveBeenCalledTimes(1);
    frame();
    frame();
    expect(game.loop.sleep).toHaveBeenCalledTimes(1);
    expect(deps.showOverlay).toHaveBeenCalledTimes(1);
    expect(deps.report).toHaveBeenCalledTimes(1);
  });

  it('fatal false: the error is survived like any other (no overlay, the next frames run)', () => {
    let throwNext = true;
    const { game, calls, deps, frame } = setup(
      () => {
        if (throwNext) {
          throwNext = false;
          throw new Error('transient');
        }
      },
      { fatal: () => false },
    );
    frame();
    frame();
    expect(calls).toHaveLength(2);
    expect(game.loop.sleep).not.toHaveBeenCalled();
    expect(deps.showOverlay).not.toHaveBeenCalled();
  });

  it('fatal is asked once for each caught error, and never for a frame that did not throw', () => {
    let throwNow = false;
    const fatal = vi.fn(() => false);
    const { frame } = setup(
      () => {
        if (throwNow) throw new Error('x');
      },
      { fatal },
    );
    frame();
    expect(fatal).not.toHaveBeenCalled();
    throwNow = true;
    frame();
    frame();
    expect(fatal).toHaveBeenCalledTimes(2);
  });

  it('a fatal that throws counts as false: nothing escapes the guard, there is no overlay, and the burst policy still works', () => {
    const fatal = vi.fn((): boolean => {
      throw new Error('probe failed');
    });
    const { deps, frame } = setup(persistent, { fatal });
    expect(() => frame()).not.toThrow();
    expect(deps.showOverlay).not.toHaveBeenCalled();
    for (let i = 1; i < BURST; i++) frame();
    expect(deps.showOverlay).toHaveBeenCalledTimes(1);
  });

  it('without a probe the guard is what it was: one error is only an error', () => {
    const { deps, frame } = setup(persistent);
    frame();
    expect(deps.showOverlay).not.toHaveBeenCalled();
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

  // The showOverlay callback main.ts hands the guard, up to the `},` that closes it.
  function showOverlayBody(): string {
    const m = /showOverlay: \(\) => \{([\s\S]*?)\}\s*,\s*\}\);/.exec(main);
    if (!m) throw new Error('main.ts: the showOverlay callback of installFrameGuard was not found');
    return m[1];
  }

  it('the overlay silences the game before it shows: the showOverlay body calls sharedAudio().suspend() (design decision 10)', () => {
    const body = showOverlayBody();
    expect(body).toMatch(/sharedAudio\(\)\.suspend\(\)/);
    expect(body.indexOf('sharedAudio().suspend()')).toBeLessThan(body.indexOf('showErrorOverlay()'));
  });

  // P00-T21 Task 5 re-review. Phaser's window-level mouse and touch handlers (MouseManager / TouchManager) also take events whose target is
  // NOT the canvas, such as a tap on the overlay, and the InputManager updates every running scene's input at once: only the step is inert
  // while the loop sleeps, not the input. A tap on the overlay would press a button beneath it (a Settings toggle flips a saved setting and
  // wakes the audio) before the click that restarts. Both handlers, and InputPlugin.isActive, check input.enabled.
  it('the overlay shields the halted game from the pointer: the showOverlay body sets game.input.enabled = false, before showErrorOverlay()', () => {
    const body = showOverlayBody();
    expect(body).toMatch(/game\.input\.enabled = false;/);
    expect(body.indexOf('game.input.enabled = false')).toBeLessThan(body.indexOf('showErrorOverlay()'));
  });

  it('Back reaches JS while the overlay is up: the showOverlay body turns the native back handler on (MainMenuScene hands Back to the system)', () => {
    expect(showOverlayBody()).toMatch(/setBackHandlerEnabled\(true\)/);
  });

  // The statuses are Phaser's (node_modules/phaser/src/scene/const.js): Systems.init sets INIT on EVERY registered scene, so a scene that never
  // started sits in INIT between frames (a probe that counted INIT would fire on any error); Systems.start sets START; create() sets CREATING and
  // then RUNNING; LOADING is legitimate (BootScene's preload).
  it('passes the fatal probe: a scene left in START or CREATING after an error cannot recover (never INIT or LOADING)', () => {
    const m = /fatal: \(\) =>([\s\S]*?),\s*showOverlay:/.exec(main);
    if (!m) throw new Error('main.ts: the fatal probe of installFrameGuard was not found');
    expect(m[1]).toMatch(/Phaser\.Scenes\.START/);
    expect(m[1]).toMatch(/Phaser\.Scenes\.CREATING/);
    expect(m[1]).not.toMatch(/Phaser\.Scenes\.(INIT|LOADING)/);
  });

  // A throw in installCrashContext inside the READY listener would stop texturesReady() before Game.start(): no loop at all, a black screen.
  it('a throw in installCrashContext cannot block Game.start(): it is caught and reported under "crashContext"', () => {
    expect(main).toMatch(/try \{\s*installCrashContext\(game\);\s*\} catch \(error\) \{\s*Crash\.recordError\(error, 'crashContext'\);\s*\}/);
  });

  it('mentions __crashTest only inside the import.meta.env.DEV block', () => {
    const dev = main.indexOf('if (import.meta.env.DEV) {');
    expect(dev).toBeGreaterThan(-1);
    expect(main.indexOf('__crashTest')).toBeGreaterThan(dev);
  });
});
