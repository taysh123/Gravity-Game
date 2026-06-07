import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · AHA (use the current, don't fight it): the goal sits in a pocket under
// a shelf you can't pull into cleanly. The trick: ride up the right, enter the
// downdraft, and let it *push you down* through the gap into the pocket.
export const level11: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 310, y: 610, radius: 30 },
  obstacles: [
    { x: 235, y: 520, width: 150, height: 14 }, // shelf over the pocket (x 160..310); gap on the right (310..360)
  ],
  gravityZones: [
    { x: 325, y: 360, width: 70, height: 300, dir: { x: 0, y: 1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // downdraft funnels into the pocket
  ],
  collectible: { x: 80, y: 250 }, // off-route, upper-left
  hint:      'Let the downdraft drop you in',
  parTimeMs: 16000,
};
