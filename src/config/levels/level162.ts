import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 15 — Homecoming · SIGNATURE "THE HOMEWARD PATH": the last long road — launch
// off the floor, breach the wall by rift, commit up through the gate, and let the
// well draw the star toward home. The whole journey in a single, soaring line.
export const level162: LevelConfig = {
  ball:      { x: 180, y: 710 },
  goal:      { x: 180, y: 100, radius: 24 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 14 }, // sealed wall — rift required
  ],
  gravityZones: [
    { x: 180, y: 610, width: 150, height: 150, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  portals: [
    { a: { x: 180, y: 510 }, b: { x: 300, y: 310 } }, // breach across the wall
  ],
  gates: [
    { x: 300, y: 250, width: 160, height: 16, dir: { x: 0, y: -1 } }, // the last commit
  ],
  magnets: [
    { x: 180, y: 150, polarity: 'attract' }, // draws toward home
  ],
  collectible: { x: 300, y: 510 }, // off-route, beside the breach
  title:     'THE HOMEWARD PATH',
  hint:      'Lift, rift, commit — the last stretch home',
  camera:    { introZoom: 1.6 },
  parTimeMs: 20000,
};
