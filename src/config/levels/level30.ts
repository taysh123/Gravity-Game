import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · twist: two opposing lanes — a left updraft and a right
// downdraft. Stay in the lift; drifting right drops you. The gem hangs in the
// downdraft, so grabbing it means fighting back out.
export const level30: LevelConfig = {
  ball:      { x: 110, y: 670 },
  goal:      { x: 110, y: 120, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 110, y: 400, width: 120, height: 380, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 250, y: 400, width: 120, height: 380, dir: { x: 0, y: 1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
  ],
  collectible: { x: 250, y: 210 }, // up inside the downdraft — the risky line
  hint:      'Stay in the lift — the right lane pushes down',
  parTimeMs: 13000,
};
