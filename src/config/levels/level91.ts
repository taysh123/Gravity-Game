import type { LevelConfig } from '../../types';

// World 1 · L3 — TOY/SHOT "Constellation": gather three drifting orbs (any order),
// then bring the star home — the collected points connect into a constellation on
// win. A playful, screenshot-worthy multi-goal toy with no fail state; teaches
// free-roam control and rewards curiosity. (Gem off to the side = the 3rd star.)
export const level91: LevelConfig = {
  ball:      { x: 180, y: 650 },
  goal:      { x: 180, y: 150, radius: 40 },
  obstacles: [],
  collectibles: [
    { x: 80,  y: 450 },
    { x: 280, y: 450 },
    { x: 180, y: 540 },
  ],
  collectAllToWin: true,
  collectible: { x: 305, y: 240 }, // gold gem, slight detour → 3rd star
  hint:      'Gather the stars — then draw the constellation home',
  parTimeMs: 18000,
};
