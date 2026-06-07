import type { LevelConfig } from '../../types';

// World 1 · L2 — TOY/CLIP "Comet": a wide-open horizontal lane. Fling the star and
// it streaks across the whole screen on a glowing comet trail into a big home. No
// walls, no fail — pure satisfying motion. The first shareable moment, and it
// breaks the "climb upward" silhouette immediately.
export const level4: LevelConfig = {
  ball:      { x: 40, y: 400 },
  goal:      { x: 330, y: 400, radius: 46 },
  obstacles: [],
  collectible: { x: 185, y: 400 }, // on the streak line — caught in passing
  hint:      'Fling the star — watch it streak home',
  parTimeMs: 12000,
};
