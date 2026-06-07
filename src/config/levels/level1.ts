import type { LevelConfig } from '../../types';

// World 1 · L1 — TOY "First Pull": the goal sits up and to the SIDE, so the very
// first hold near the ball curves the star home in a satisfying glowing arc (not a
// dull straight line). Generous goal + gem on the arc + generous par = an
// unloseable, 3★-by-default, "oh, I get it!" opening. Wonder before difficulty.
export const level1: LevelConfig = {
  ball:      { x: 150, y: 560 },
  goal:      { x: 255, y: 305, radius: 52 }, // up-right → the pull bends into an arc
  obstacles: [],
  collectible: { x: 205, y: 435 }, // sits on the arc — grabbed just by playing
  hint:      'Hold to pull — bring the star home',
  parTimeMs: 15000,
};
