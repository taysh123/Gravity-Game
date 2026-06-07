import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · master capstone: gate, rift, current, well, saw — and a
// clock. Plan the whole route in advance; small goal, tight par. Everything.
export const level64: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 110, radius: 22 },
  obstacles: [
    { x: 180, y: 380, width: 360, height: 16 }, // sealed wall
  ],
  gates: [
    { x: 180, y: 580, width: 360, height: 16, dir: { x: 0, y: -1 } }, // commit up
  ],
  portals: [
    { a: { x: 90, y: 470 }, b: { x: 300, y: 300 } }, // cross above the wall
  ],
  gravityZones: [
    { x: 300, y: 235, width: 100, height: 130, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  magnets: [
    { x: 300, y: 160, polarity: 'attract' }, // reels into the goal
  ],
  hazards: [
    { x: 200, y: 180, radius: 20, to: { x: 330, y: 180 }, durationMs: 1000 }, // saw guarding the goal
  ],
  collectible: { x: 90, y: 300 }, // off-route, far left
  hint:      'Everything at once — plan the whole route',
  parTimeMs: 18000,
  timeLimitMs: 20000,
};
