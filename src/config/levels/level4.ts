import type { LevelConfig } from '../../types';

// World 1 · L4 — new shape: a horizontal traverse. Ball on the left, goal on the
// right; weave the pillars (under one, over the next) across the screen. Breaks
// the "always climb upward" expectation.
export const level4: LevelConfig = {
  ball:      { x: 40, y: 400 },
  goal:      { x: 330, y: 400, radius: 36 },
  obstacles: [
    { x: 130, y: 300, width: 16, height: 220 }, // pass under (y 190..410)
    { x: 240, y: 480, width: 16, height: 220 }, // pass over  (y 370..590)
  ],
  collectible: { x: 185, y: 650 }, // off the traverse line, low
  hint:      'Cross to the right — weave the pillars',
  parTimeMs: 14000,
};
