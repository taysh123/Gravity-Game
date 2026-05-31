import type { LevelConfig } from '../../types';

// Capstone: three staggered walls form a weave, with a small goal to finish.
// Gap right of A → gap left of B → gap right of C → up to the goal.
export const level6: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 26 },
  obstacles: [
    { x: 110, y: 520, width: 200, height: 18 }, // A (low)  — gap on right
    { x: 250, y: 360, width: 200, height: 18 }, // B (mid)  — gap on left
    { x: 110, y: 200, width: 200, height: 18 }, // C (high) — gap on right
  ],
  hint:      'Weave through all three',
};
