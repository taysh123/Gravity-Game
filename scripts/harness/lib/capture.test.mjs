import { describe, expect, it } from 'vitest';
import { GAME_START_LIMIT_MS, PHASER_GRACE_MS, captureProblem } from './capture.mjs';

const base = { gameCaptured: false, hookError: undefined, phaserType: 'undefined', readyState: 'complete', elapsedMs: 0 };

describe('captureProblem: why the harness cannot reach the game, as soon as that is knowable', () => {
  it('has no problem once the game was captured, whatever else the page says', () => {
    expect(captureProblem({ ...base, gameCaptured: true, hookError: 'boom', elapsedMs: 99999 })).toBeNull();
  });

  it('reports a hook error at once, with the error text and what it means', () => {
    const msg = captureProblem({ ...base, hookError: "TypeError: Cannot read properties of undefined (reading 'prototype')", elapsedMs: 10 });
    expect(msg).toContain("TypeError: Cannot read properties of undefined (reading 'prototype')");
    expect(msg).toMatch(/capture hook failed/i);
    expect(msg).toContain('Game.prototype.step');
    expect(msg).toContain('scripts/harness/lib/browser.mjs');
  });

  it('waits a short grace for window.Phaser after the page finished loading, then names the problem', () => {
    expect(captureProblem({ ...base, elapsedMs: PHASER_GRACE_MS })).toBeNull();
    const msg = captureProblem({ ...base, elapsedMs: PHASER_GRACE_MS + 1 });
    expect(msg).toContain('window.Phaser');
    expect(msg).toContain("document.readyState is 'complete'");
    expect(msg).toMatch(/bundle did not run|does not assign|never assigned/i);
  });

  it('does not blame Phaser while the page is still loading', () => {
    expect(captureProblem({ ...base, readyState: 'loading', elapsedMs: 50000 })).toBeNull();
    expect(captureProblem({ ...base, readyState: 'interactive', elapsedMs: 50000 })).toBeNull();
  });

  it('when Phaser loaded but no Game ever stepped, gives it the start-up limit and then says so', () => {
    expect(captureProblem({ ...base, phaserType: 'object', elapsedMs: GAME_START_LIMIT_MS })).toBeNull();
    const msg = captureProblem({ ...base, phaserType: 'object', elapsedMs: GAME_START_LIMIT_MS + 1 });
    expect(msg).toContain('Phaser loaded');
    expect(msg).toContain(`${GAME_START_LIMIT_MS / 1000} s`);
    expect(msg).toMatch(/no Game|did not start|stepped/i);
  });

  it('the limits are short enough to beat the 120 s boot timeout by a wide margin', () => {
    expect(PHASER_GRACE_MS).toBeLessThanOrEqual(5000);
    expect(GAME_START_LIMIT_MS).toBeLessThanOrEqual(30000);
  });
});
