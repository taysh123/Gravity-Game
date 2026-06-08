import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · L9 — REST/SHOT "Drifthome": a calm, beautiful breather. One wide, gentle
// crosswind carries the star across a near-empty sky; a feather-light nudge guides it
// into a big home. Almost unloseable — a moment to breathe, and a screenshot. Pacing
// matters: a rest beat between the surf toy and the world's first real tests.
export const level11: LevelConfig = {
  ball:      { x: 55, y: 430 },
  goal:      { x: 320, y: 300, radius: 46 },
  obstacles: [],
  gravityZones: [
    { x: 200, y: 360, width: 360, height: 220, dir: { x: 1, y: -0.25 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.5 },
  ],
  collectible: { x: 55, y: 250 }, // upwind corner — drift back against the breeze to earn it
  hint:      'Let the breeze carry the star home',
  parTimeMs: 14000,
};
