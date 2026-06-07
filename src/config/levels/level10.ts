import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · AHA (reading interactions): an updraft hands you to a crosswind. You
// don't pull right — the lift carries you up and the wind *curves* you across to
// the goal. Read the combined flow; the path isn't a straight line.
export const level10: LevelConfig = {
  ball:      { x: 90, y: 660 },
  goal:      { x: 305, y: 160, radius: 30 },
  obstacles: [
    { x: 200, y: 440, width: 14, height: 250 }, // divider — no shortcut up the middle
  ],
  gravityZones: [
    { x: 90, y: 450, width: 110, height: 330, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 230, y: 235, width: 250, height: 90, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.9 },
  ],
  collectible: { x: 90, y: 200 }, // top of the lift, before the wind
  hint:      'Let the lift hand you to the wind',
  parTimeMs: 15000,
};
