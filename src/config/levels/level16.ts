import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 3 — Clockwork · master capstone: a static maze gap, a sweeping bar, and a
// current — all at once. Precise multi-step routing.
export const level16: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 110, radius: 30 },
  obstacles: [
    { x: 120, y: 470, width: 220, height: 16 }, // low wall, gap on the right
    { x: 250, y: 300, width: 220, height: 16 }, // mid wall, gap on the left
  ],
  gravityZones: [
    { x: 300, y: 470, width: 110, height: 120, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 180, y: 180, width: 18, height: 150, to: { x: 320, y: 180 }, durationMs: 1400 }, // sweeping guard near the goal
  ],
  collectible: { x: 70, y: 250 },
  hint:      'Route the maze, time the guard',
  parTimeMs: 24000,
};
