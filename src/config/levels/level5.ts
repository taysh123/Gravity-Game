import type { LevelConfig } from '../../types';

// Two walls leave a 70px gap centered at x=180. Ball and goal sit on opposite
// sides, so you must angle the ball through the gap — precision steering.
export const level5: LevelConfig = {
  ball:      { x: 110, y: 650 },
  goal:      { x: 250, y: 120, radius: 38 },
  obstacles: [
    { x: 72,  y: 400, width: 145, height: 18 }, // left wall  (spans 0–145)
    { x: 288, y: 400, width: 145, height: 18 }, // right wall (spans 215–360)
  ],
  collectible: { x: 180, y: 300 },
  hint:      'Thread the narrow gap',
  parTimeMs: 17000,
};
