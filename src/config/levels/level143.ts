import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 13 — Ascension · BOSS "THE SUMMIT": the final ascent. Launch off the floor,
// weave the rotating arm and the floor saw up the side lanes, and let the summit
// well cradle the star at the peak. Endurance, no clock — just the long climb.
export const level143: LevelConfig = {
  ball:      { x: 180, y: 720 },
  goal:      { x: 180, y: 90, radius: 26 },
  obstacles: [
    { x: 180, y: 430, width: 200, height: 16 }, // central wall — side lanes
  ],
  gravityZones: [
    { x: 180, y: 620, width: 140, height: 140, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  magnets: [
    { x: 180, y: 140, polarity: 'attract' }, // the summit well
  ],
  hazards: [
    { x: 120, y: 300, radius: 20, pivot: { x: 180, y: 300 }, durationMs: 2400 }, // rotating arm
    { x: 60, y: 560, radius: 22, to: { x: 300, y: 560 }, durationMs: 1200 },     // floor saw
  ],
  collectible: { x: 300, y: 560 }, // off-route, low-right
  boss:      true,
  title:     'THE SUMMIT',
  hint:      'Launch, weave the spin — the well brings you home',
  camera:    { introZoom: 1.7 },
  parTimeMs: 22000,
};
