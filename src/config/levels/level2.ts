import type { LevelConfig } from '../../types';

// World 1 · L2 — first small decision: two gaps. The centre gap goes straight to
// the goal; the right gap is a detour for the gem. A choice, not a corridor.
export const level2: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 150, radius: 40 },
  obstacles: [
    { x: 70,  y: 420, width: 120, height: 16 }, // left wall  (x 10..130)
    { x: 250, y: 420, width: 120, height: 16 }, // right wall (x 190..310) — gaps: centre 130..190, right 310..360
  ],
  collectible: { x: 335, y: 250 }, // up past the right gap — the detour
  hint:      'Two gaps — the gem is past the right one',
  parTimeMs: 11000,
};
