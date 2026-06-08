import type { LevelConfig } from '../../types';

// World 3 · SIGNATURE "THE GEARWORKS": four bars sweep in alternating phase like a
// machine's teeth. Find the rhythm and flow up through the gears. The Clockwork
// poster level.
export const level69: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 110, radius: 28 },
  obstacles: [],
  movingPlatforms: [
    { x: 100, y: 560, width: 130, height: 14, to: { x: 260, y: 560 }, durationMs: 1000 },
    { x: 260, y: 430, width: 130, height: 14, to: { x: 100, y: 430 }, durationMs: 1000 },
    { x: 100, y: 300, width: 130, height: 14, to: { x: 260, y: 300 }, durationMs: 1000 },
    { x: 260, y: 190, width: 130, height: 14, to: { x: 100, y: 190 }, durationMs: 1000 },
  ],
  hazards: [
    // A real spinning gear at the machine's flank — a deadly rotating arm guarding
    // the gem. The 1-star climb up the centre stays clear of its sweep; reaching the
    // gem means timing your way inside the ring. (The Clockwork world's signature.)
    { x: 340, y: 495, radius: 16, pivot: { x: 280, y: 495 }, durationMs: 2600 },
  ],
  camera:    { introZoom: 1.55 }, // reveal the machine in motion
  collectible: { x: 300, y: 495 }, // inside the gear's ring — dare the spin
  title:     'THE GEARWORKS',
  hint:      'Time the machine — and dare the spinning gear for the gem',
  parTimeMs: 20000,
};
