import type { LevelConfig } from '../../types';

// World 1 · L5 — AHA (puzzle box): the goal sits in a chamber whose floor blocks
// the obvious straight-up approach. The trick: climb the open RIGHT side and pull
// LEFT in through the side opening. A genuine "wait, how do I get in?" moment.
export const level5: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 170, y: 165, radius: 26 },
  obstacles: [
    { x: 180, y: 215, width: 160, height: 14 }, // chamber FLOOR — blocks straight up (x 100..260)
    { x: 110, y: 165, width: 14, height: 100 },  // chamber left wall (y 115..215)
    { x: 180, y: 115, width: 160, height: 14 },  // chamber roof (x 100..260) — opening is the RIGHT side
  ],
  collectible: { x: 315, y: 560 }, // off to the right, low
  hint:      'Straight up is blocked — slip in from the side',
  parTimeMs: 16000,
};
