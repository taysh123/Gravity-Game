import type { LevelConfig } from '../../types';

// Single slanted deflector across the middle. The ball can't go straight up —
// curve it around either end. Teaches arcing a path with the attractor.
export const level4: LevelConfig = {
  ball:      { x: 70, y: 650 },
  goal:      { x: 290, y: 130, radius: 34 },
  obstacles: [
    { x: 180, y: 390, width: 200, height: 18, angle: 35 },
  ],
  collectible: { x: 80, y: 300 },
  hint:      'Curve around the slanted wall',
  parTimeMs: 13000,
};
