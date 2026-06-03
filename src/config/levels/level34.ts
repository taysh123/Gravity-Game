import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 3 — Clockwork · combine: an updraft lifts you toward a sliding gate, with
// a side ledge to stage your timing. Lift, hold, and slip through when it opens.
export const level34: LevelConfig = {
  ball:      { x: 110, y: 660 },
  goal:      { x: 110, y: 110, radius: 32 },
  obstacles: [
    { x: 280, y: 470, width: 140, height: 16 }, // right ledge — a place to wait out the gate
  ],
  gravityZones: [
    { x: 110, y: 450, width: 120, height: 300, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 110, y: 230, width: 140, height: 16, to: { x: 260, y: 230 }, durationMs: 1100 }, // gate atop the column
  ],
  collectible: { x: 300, y: 200 }, // top-right, past the gate's far swing
  hint:      'Lift up, time the gate',
  parTimeMs: 17000,
};
