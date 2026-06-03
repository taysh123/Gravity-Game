import type { LevelConfig } from '../../types';

// Wall spans play-x 20 to 240 (width 220).
// Gap on the right: play-x 240 to 360 = 120px — ball fits through.
export const level2: LevelConfig = {
  ball:      { x: 80, y: 620 },
  goal:      { x: 280, y: 140, radius: 36 },
  obstacles: [
    { x: 130, y: 390, width: 220, height: 18 },
  ],
  collectible: { x: 300, y: 450 },
  hint:      'Drag to steer the ball around the wall',
  parTimeMs: 11000,
};
