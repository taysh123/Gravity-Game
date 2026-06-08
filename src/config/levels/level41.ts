import type { LevelConfig } from '../../types';

// World 6 — Rifts · TOY opener "Blink": the playful first taste of a rift. A tall
// pillar splits the arena; dive into the left mouth and *blink* — you reappear on
// the far side, right by the goal. The swoosh across is the wonder. Forgiving (you
// can even loop over the pillar), big goal, no hazards. Aha: "I appeared across!"
export const level41: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 180, radius: 44 },
  obstacles: [
    { x: 180, y: 430, width: 16, height: 360 }, // central pillar — the rift skips it
  ],
  portals: [
    { a: { x: 90, y: 430 }, b: { x: 300, y: 360 } }, // left mid <-> right, by the goal
  ],
  collectible: { x: 90, y: 250 }, // upper-left, off the blink
  hint:      'Dive into the rift — blink across to the far side',
  parTimeMs: 12000,
};
