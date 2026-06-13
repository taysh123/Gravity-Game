import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 9 — Gauntlet · combine 2: a crosswind shoves you right toward a saw that
// patrols up and down. Counter the wind to hold your line and climb past the blade.
export const level100: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 160, y: 120, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 420, width: 300, height: 180, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
  ],
  hazards: [
    { x: 300, y: 420, radius: 26, to: { x: 300, y: 560 }, durationMs: 1100 }, // vertical patrol, downwind
  ],
  collectible: { x: 300, y: 250 },
  hint:      'Counter the wind, climb past the saw',
  parTimeMs: 15000,
};
