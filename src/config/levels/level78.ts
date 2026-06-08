import type { LevelConfig } from '../../types';

// World 5 — Wells · BOSS "THE SINGULARITY" → ORBIT. No clock — the climax is the
// orbit itself. A vast attract well dominates the arena; fall straight in and it
// holds you. Build a slingshot around its rim, thread the two spikes of its
// accretion disk, and release at the apex to break free for the goal. Pure
// trajectory skill, not a race. The well stays escapable — but only from the rim.
export const level78: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 100, radius: 26 },
  obstacles: [],
  magnets: [
    { x: 180, y: 410, polarity: 'attract', strength: 2.8, radius: 230 }, // the singularity
  ],
  hazards: [
    { x: 95,  y: 300, radius: 22 }, // accretion-disk spikes flanking the well
    { x: 265, y: 300, radius: 22 },
    { x: 180, y: 280, radius: 18, pivot: { x: 180, y: 410 }, durationMs: 3200 }, // the accretion disk, slowly spinning
  ],
  collectible: { x: 180, y: 410 }, // the core — dip in and escape (greediest line)
  boss:      true,
  title:     'THE SINGULARITY',
  hint:      'No clock — orbit the rim, time the spinning disk, release at the apex',
  parTimeMs: 15000,
};
