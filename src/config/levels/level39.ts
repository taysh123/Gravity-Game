import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 5 — Wells · combine: an updraft lifts you on the left, an attract well
// reels you right toward the goal — but a spike sits on the line between them.
// Swing wide of the spike as the well pulls.
export const level39: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 140, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 440, width: 110, height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  magnets: [
    { x: 285, y: 270, polarity: 'attract' },
  ],
  hazards: [
    { x: 200, y: 360, radius: 26 }, // spike on the swing line
  ],
  collectible: { x: 80, y: 180 }, // top of the updraft
  hint:      'Lift, swing past the spike, into the well',
  parTimeMs: 15000,
};
