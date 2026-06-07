import type { LevelConfig } from '../../types';

// World 5 — Wells · AHA (slingshot-around): the goal is dead ahead but a wall caps
// the straight climb. The only opening is up-LEFT — and an attract well sits out
// there. The aha: head *away* from the goal first; let the well sling you around
// the wall and back to it.
export const level75: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 120, radius: 34 },
  obstacles: [
    // Caps the straight-up line; gap only on the left (x 20..110, ~90px).
    { x: 235, y: 400, width: 250, height: 16 },
  ],
  magnets: [
    { x: 70, y: 290, polarity: 'attract' }, // up-left, beyond the gap — reels you around
  ],
  collectible: { x: 70, y: 190 }, // at the top of the well's pull, on the slung path
  hint:      'The way up is to the side — let the well pull you around',
  parTimeMs: 14000,
};
