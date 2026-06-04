import type { LevelConfig } from '../../types';

// World 7 — Gates · twist: a DOWN-only gate caps a bottom pocket. Rise up and over,
// then drop down through the gate into the chamber to reach the goal.
export const level51: LevelConfig = {
  ball:      { x: 90, y: 660 },
  goal:      { x: 300, y: 650, radius: 40 },
  obstacles: [
    { x: 225, y: 600, width: 16, height: 170 }, // left wall of the bottom-right pocket
  ],
  gates: [
    { x: 300, y: 520, width: 150, height: 16, dir: { x: 0, y: 1 } }, // passable downward only
  ],
  collectible: { x: 90, y: 250 }, // off-route, upper-left
  hint:      'Drop down through the one-way gate',
  parTimeMs: 17000,
};
