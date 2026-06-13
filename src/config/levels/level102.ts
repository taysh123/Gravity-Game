import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 9 — Gauntlet · SIGNATURE "THE GAUNTLET": the full run, top to bottom —
// lift off the left, time the sliding gate, then slip the saw sweeping the summit.
// One flowing line through every tool the world has shown.
export const level102: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 300, y: 110, radius: 26 },
  obstacles: [],
  gravityZones: [
    { x: 90, y: 520, width: 120, height: 220, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 200, y: 380, width: 140, height: 16, to: { x: 320, y: 380 }, durationMs: 1000 },
  ],
  hazards: [
    { x: 90, y: 230, radius: 22, to: { x: 300, y: 230 }, durationMs: 1100 }, // saw across the summit
  ],
  collectible: { x: 180, y: 560 }, // low-centre, before the climb
  title:     'THE GAUNTLET',
  hint:      'Lift, time the gate, slip the saw',
  camera:    { introZoom: 1.5 },
  parTimeMs: 19000,
};
