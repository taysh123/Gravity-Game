import type { LevelConfig } from '../../types';

// World 7 — Gates · twist: two gates in series — pass UP through the first, then
// RIGHT through the second. Each is one-shot, so commit in the right order.
export const level54: LevelConfig = {
  ball:      { x: 120, y: 660 },
  goal:      { x: 300, y: 150, radius: 30 },
  obstacles: [
    { x: 230, y: 560, width: 16, height: 170 }, // wall channelling the lower-left start
  ],
  gates: [
    { x: 120, y: 500, width: 200, height: 16, dir: { x: 0, y: -1 } }, // up-gate (left)
    { x: 235, y: 320, width: 16, height: 210, dir: { x: 1, y: 0 } },  // right-gate (upper)
  ],
  hazards: [
    { x: 120, y: 410, radius: 20, to: { x: 230, y: 410 }, durationMs: 1200 }, // a saw patrols between the two commits
  ],
  collectible: { x: 60, y: 300 }, // off-route left, above the first gate
  hint:      'Two gates — commit in turn, and time the saw between them',
  parTimeMs: 18000,
};
