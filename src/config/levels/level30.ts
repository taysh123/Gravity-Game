import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · twist (opposing lanes + risk): a left updraft lifts you to
// the goal; the right lane is a downdraft hiding a spike by the gem. 1★ stays in
// the lift and never nears the spike — the gem lane is the opt-in gamble.
export const level30: LevelConfig = {
  ball:      { x: 110, y: 670 },
  goal:      { x: 110, y: 120, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 110, y: 400, width: 120, height: 380, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 250, y: 400, width: 120, height: 380, dir: { x: 0, y: 1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
  ],
  hazards: [
    { x: 250, y: 320, radius: 26 }, // in the downdraft lane, below the gem
  ],
  collectible: { x: 250, y: 200 }, // up the downdraft past the spike — double risk
  hint:      'Stay in the lift — the gem lane hides a spike',
  parTimeMs: 14000,
};
