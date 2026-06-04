import type { LevelConfig } from '../../types';

// World 7 — Gates · master: commit up through the gate, rift across the sealed
// wall, dodge a saw, and let the well reel you into a small goal. Everything,
// one-way, under a tight par.
export const level56: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [
    { x: 180, y: 380, width: 360, height: 16 }, // sealed wall
  ],
  gates: [
    { x: 180, y: 580, width: 360, height: 16, dir: { x: 0, y: -1 } }, // up-gate, low
  ],
  portals: [
    { a: { x: 90, y: 480 }, b: { x: 300, y: 290 } }, // cross to the right, above the wall
  ],
  magnets: [
    { x: 300, y: 190, polarity: 'attract' }, // reels the exit up toward the goal
  ],
  hazards: [
    { x: 200, y: 200, radius: 22, to: { x: 330, y: 200 }, durationMs: 1100 }, // saw guarding the goal
  ],
  collectible: { x: 90, y: 300 }, // off-route, far left
  hint:      'Commit, rift, dodge — the well brings you home',
  parTimeMs: 18000,
};
