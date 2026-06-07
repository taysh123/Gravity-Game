import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 3 — Clockwork · combine (platform + zone + hazard): an updraft feeds you
// up through two fast bars. Thread them to the goal (1★); a spike to the side
// guards the gem. Lift + timing together.
export const level33: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 32 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 580, width: 140, height: 180, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 120, y: 470, width: 150, height: 16, to: { x: 240, y: 470 }, durationMs: 1000 }, // lower, fast
    { x: 240, y: 300, width: 150, height: 16, to: { x: 120, y: 300 }, durationMs: 1000 }, // upper, opposite
  ],
  hazards: [
    { x: 300, y: 385, radius: 24 }, // off to the side, guarding the gem
  ],
  collectible: { x: 300, y: 250 }, // up-right, past the spike
  hint:      'Ride up, thread the bars — the gem is guarded',
  parTimeMs: 18000,
};
