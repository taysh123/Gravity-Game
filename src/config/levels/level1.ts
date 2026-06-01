import type { LevelConfig } from '../../types';

// Onboarding level: ball and goal sit within a single attractor reach
// (~165px < ATTRACTOR_MIN/MAX), and the goal is generous, so the very first
// hold near the ball pulls it straight in. Teaches "holding pulls the ball"
// with zero friction. Later levels add the steering challenge.
export const level1: LevelConfig = {
  ball:      { x: 180, y: 470 },
  goal:      { x: 180, y: 305, radius: 64 },
  obstacles: [],
  collectible: { x: 180, y: 388 }, // on the ball→goal path for now (M6 moves gems off-route)
  hint:      'Hold near the ball to pull it toward you',
  parTimeMs: 9000,
};
