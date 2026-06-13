import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 13 — Ascension · opener (the long climb begins): a two-stage journey — an
// updraft launches you to a rift that breaches the sealed wall and sets you on the
// final approach. Chain the stages into one rising line.
export const level134: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 30 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall
  ],
  gravityZones: [
    { x: 180, y: 590, width: 140, height: 160, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  portals: [
    { a: { x: 180, y: 500 }, b: { x: 180, y: 300 } }, // breach the wall
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Lift into the rift, then home',
  parTimeMs: 16000,
};
