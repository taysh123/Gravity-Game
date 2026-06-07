import type { LevelConfig } from '../../types';

// World 7 — Gates · BOSS "THE VAULT": every door is one-way and the clock is running.
// Commit up through the gate, breach the sealed wall by rift, commit RIGHT through
// the inner gate, then time the saw into the goal. No backtracking, no second
// chances — crack the vault before time's up.
export const level86: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 300, y: 110, radius: 24 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall — rift required
  ],
  gates: [
    { x: 180, y: 590, width: 360, height: 16, dir: { x: 0, y: -1 } }, // outer up-gate (commit)
    { x: 210, y: 250, width: 16, height: 180, dir: { x: 1, y: 0 } },  // inner right-gate (commit)
  ],
  portals: [
    { a: { x: 90, y: 520 }, b: { x: 120, y: 330 } }, // breach across the sealed wall
  ],
  hazards: [
    { x: 300, y: 170, radius: 22, to: { x: 120, y: 170 }, durationMs: 1000 }, // saw guarding the goal
  ],
  collectible: { x: 300, y: 520 }, // off-route, before the up-gate
  boss:      true,
  title:     'THE VAULT',
  hint:      'Commit, breach, commit, time the saw — before the clock',
  parTimeMs: 12000,
  timeLimitMs: 16000,
};
