import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 13 — Ascension · develop 2: rift across, ride an updraft, dodge a saw — a
// full four-beat climb on the right side of the arena. Read it all before you start.
export const level137: LevelConfig = {
  ball:      { x: 80, y: 690 },
  goal:      { x: 300, y: 120, radius: 28 },
  obstacles: [
    { x: 180, y: 480, width: 360, height: 16 }, // sealed wall
  ],
  portals: [
    { a: { x: 90, y: 580 }, b: { x: 300, y: 380 } },
  ],
  gravityZones: [
    { x: 300, y: 280, width: 110, height: 130, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 200, y: 200, radius: 22, to: { x: 320, y: 200 }, durationMs: 1100 },
  ],
  collectible: { x: 90, y: 320 },
  hint:      'Rift, lift, dodge — climb home',
  parTimeMs: 19000,
};
