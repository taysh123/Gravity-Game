import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 4 — Peril · master: a hard countdown, a wall gap, an updraft to the goal,
// and a saw guarding it. Everything under the clock — the peril capstone.
export const level37: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 120, radius: 26 },
  obstacles: [
    { x: 130, y: 440, width: 220, height: 16 }, // gap on the right
  ],
  gravityZones: [
    { x: 300, y: 330, width: 110, height: 170, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 180, y: 200, radius: 24, to: { x: 320, y: 200 }, durationMs: 1200 }, // saw near the goal
  ],
  collectible: { x: 70, y: 250 }, // off-route, far left
  hint:      'Beat the clock, ride the lift, dodge the saw',
  parTimeMs: 11000,
  timeLimitMs: 15000,
};
