import type { LevelConfig } from '../../types';

// World 4 — Peril · TOY opener "Sparkweave": the playful first taste of red.
// Three small sparks sit off-centre in a gentle slalom with wide, forgiving
// lanes — a centred pull sails straight through, but the alternating nodes
// invite a satisfying weave. Near-unloseable (no clock), big welcoming goal —
// wonder before the world's nerves begin. Gem off to the right rewards the weave.
export const level17: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 44 },
  obstacles: [],
  hazards: [
    { x: 120, y: 490, radius: 22 },
    { x: 240, y: 360, radius: 22 },
    { x: 120, y: 230, radius: 22 },
  ],
  collectible: { x: 290, y: 490 }, // right of the first spark — invites the weave
  hint:      'Weave between the sparks — red bites, but the lanes are wide',
  parTimeMs: 12000,
};
