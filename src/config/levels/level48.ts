import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 6 — Rifts · master: jump the rift across the wall, ride an updraft toward
// the goal, and dodge a saw guarding it. A small goal under a tight par.
export const level48: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [
    { x: 180, y: 470, width: 360, height: 16 }, // full-width wall, low
  ],
  portals: [
    { a: { x: 90, y: 560 }, b: { x: 300, y: 340 } }, // cross to the right, above the wall
  ],
  gravityZones: [
    { x: 300, y: 250, width: 110, height: 150, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 200, y: 220, radius: 24, to: { x: 320, y: 220 }, durationMs: 1200 }, // saw guarding the goal
  ],
  collectible: { x: 90, y: 300 }, // off-route, far left
  hint:      'Rift across, ride up, dodge the saw',
  parTimeMs: 16000,
};
