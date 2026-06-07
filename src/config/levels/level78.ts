import type { LevelConfig } from '../../types';

// World 5 — Wells · BOSS "THE SINGULARITY": a vast attract well dominates the arena
// — fall in and it holds you. Slingshot around its rim, thread the two spikes of
// its accretion disk, and break for the goal before the clock runs out. The well
// stays escapable (peak grab < your attractor), but only just.
export const level78: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 100, radius: 26 },
  obstacles: [],
  magnets: [
    { x: 180, y: 410, polarity: 'attract', strength: 2.6, radius: 220 }, // the singularity
  ],
  hazards: [
    { x: 95,  y: 300, radius: 22 }, // accretion-disk spikes flanking the well
    { x: 265, y: 300, radius: 22 },
  ],
  collectible: { x: 180, y: 410 }, // the core — dip in and escape (greediest line)
  boss:      true,
  title:     'THE SINGULARITY',
  hint:      'Slingshot the rim — break for the goal before it holds you',
  parTimeMs: 12000,
  timeLimitMs: 17000,
};
