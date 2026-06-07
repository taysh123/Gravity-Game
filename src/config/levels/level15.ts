import type { LevelConfig } from '../../types';

// World 3 · AHA (sequencing): two bars share the same phase, so you can't rush
// straight through both. The trick: pass the lower gap, *stage* in the pocket
// between, then go when the upper opens. Patience + sequence, not speed.
export const level15: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 30 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 470, width: 150, height: 16, to: { x: 240, y: 470 }, durationMs: 1200 }, // lower
    { x: 120, y: 300, width: 150, height: 16, to: { x: 240, y: 300 }, durationMs: 1200 }, // upper (same phase)
  ],
  collectible: { x: 300, y: 385 }, // in the staging pocket between the bars
  hint:      "You can't rush both — stage between them",
  parTimeMs: 17000,
};
