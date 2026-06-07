import type { LevelConfig } from '../../types';

// World 8 — Convergence · AHA (fuse two mechanics): a repel well sits right under a
// rift mouth. Don't fight the push — ride it. Let the repeller fling the ball UP
// into the rift, which spits it out by the goal. Two mechanics, one fused move.
export const level87: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 300, y: 150, radius: 26 },
  obstacles: [],
  magnets: [
    { x: 180, y: 430, polarity: 'repel' }, // its upward push launches you into the mouth
  ],
  portals: [
    { a: { x: 180, y: 300 }, b: { x: 300, y: 210 } }, // mouth above the repeller -> by the goal
  ],
  collectible: { x: 70, y: 250 }, // off-route, far left
  hint:      'Let the push throw you into the rift',
  parTimeMs: 17000,
};
