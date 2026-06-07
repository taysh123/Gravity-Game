import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · L8 — TOY "Updraft Surf": the star starts in a tall current and the
// first touch sends it surfing up the column in a swoosh to a big, generous home.
// A delightful, unloseable introduction to currents — feel the flow before any test.
export const level7: LevelConfig = {
  ball:      { x: 180, y: 650 },
  goal:      { x: 180, y: 140, radius: 46 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 400, width: 150, height: 520, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 180, y: 300 }, // on the surf line
  hint:      'Surf the current straight up',
  parTimeMs: 9000,
};
