import type { LevelConfig } from '../../types';

// World 7 — Gates · TOY opener "One-Way Door": the playful first taste of a gate.
// A tall shimmering door spans the lane; pull the ball straight across and it
// whooshes through — the membrane only opens forward, then seals behind. Pure
// horizontal framing (silhouette variety), big goal, unloseable. The satisfying
// pass-through is the wonder. Aha: "it only opens one way."
export const level50: LevelConfig = {
  ball:      { x: 70, y: 430 },
  goal:      { x: 300, y: 430, radius: 44 },
  obstacles: [],
  gates: [
    { x: 185, y: 430, width: 16, height: 620, dir: { x: 1, y: 0 } }, // passable rightward only
  ],
  collectible: { x: 300, y: 250 }, // past the door, up-right — no commitment cost
  hint:      'Whoosh through the one-way door — it only opens forward',
  parTimeMs: 12000,
};
