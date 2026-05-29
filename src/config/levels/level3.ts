import type { LevelConfig } from '../../types';

// Wall A spans play-x 30 to 170. Gap right: 170 to 360.
// Wall B spans play-x 190 to 330. Gap left: 0 to 190.
// Player must zigzag: right through Wall A gap → left through Wall B gap → goal.
export const level3: LevelConfig = {
  ball:      { x: 180, y: 630 },
  goal:      { x: 180, y: 130, radius: 30 },
  obstacles: [
    { x: 100, y: 430, width: 140, height: 18 }, // Wall A (lower)
    { x: 260, y: 280, width: 140, height: 18 }, // Wall B (upper)
  ],
};
