import type { LevelConfig } from '../../types';

// World 7 — Gates · BOSS "THE VAULT" → LOCK-AND-KEY. No clock, no saw — the vault
// opens only in the right order. Every door is one-way and the sealed wall yields
// only to the rift, so the sequence is forced and irreversible: commit UP through
// the outer gate, breach the sealed wall by rift, then commit RIGHT through the
// inner gate into the goal. Plan the order before you move — a wrong commit locks
// you out (instant retry). Foresight over speed.
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
  collectible: { x: 300, y: 520 }, // the "key" — off-route, before the up-gate
  boss:      true,
  title:     'THE VAULT',
  hint:      'No clock — commit up, breach the wall, commit right. Open the vault in order',
  parTimeMs: 16000,
};
