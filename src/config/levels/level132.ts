import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 12 — Tempest · SIGNATURE "THE TEMPEST": the full storm at once — an updraft
// to ride, two saws crossing below, and a pulsing beam across the middle, all on the
// clock. Pure nerve: find the flow through chaos and don't stop.
export const level132: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 300, y: 110, radius: 26 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 580, width: 160, height: 170, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 60, y: 420, radius: 22, to: { x: 300, y: 420 }, durationMs: 1000 },  // lower saw
    { x: 300, y: 540, radius: 22, to: { x: 60, y: 540 }, durationMs: 1000 },  // floor saw (opposite)
    { x: 180, y: 250, width: 360, height: 12, pulseMs: 1400 },                // beam across the middle
  ],
  collectible: { x: 180, y: 640 }, // low-centre, in the lift mouth
  title:     'THE TEMPEST',
  hint:      'Ride the storm — lifts, saws, the beam',
  camera:    { introZoom: 1.5 },
  parTimeMs: 16000,
  timeLimitMs: 22000,
};
