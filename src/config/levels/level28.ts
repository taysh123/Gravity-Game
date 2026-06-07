import type { LevelConfig } from '../../types';

// World 1 · L8 — new shape: descent. The ball starts high and the goal is a
// bottom-right pocket; drop down through the shelf's right gap. Inverts the climb.
export const level28: LevelConfig = {
  ball:      { x: 180, y: 290 },
  goal:      { x: 300, y: 680, radius: 34 },
  obstacles: [
    { x: 150, y: 480, width: 240, height: 14 }, // shelf (x 30..270); gap on the right (270..360)
  ],
  collectible: { x: 60, y: 650 }, // bottom-left, off the descent line
  hint:      'This time, head down',
  parTimeMs: 14000,
};
