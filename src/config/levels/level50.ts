import type { LevelConfig } from '../../types';

// World 7 — Gates · develop: a full-height gate passes RIGHT only. Cross to the
// goal — but you can't come back, so collect the left-side gem before you commit.
export const level50: LevelConfig = {
  ball:      { x: 70, y: 640 },
  goal:      { x: 310, y: 160, radius: 38 },
  obstacles: [],
  gates: [
    { x: 185, y: 390, width: 16, height: 760, dir: { x: 1, y: 0 } }, // passable rightward only
  ],
  collectible: { x: 70, y: 250 }, // left side — grab before crossing right
  hint:      "Cross right — there's no coming back",
  parTimeMs: 15000,
};
