import type { LevelConfig } from '../../types';

// World 4 — Peril · BOSS "THE INFERNO" → ENDURANCE. No clock — the climax is a
// long, sustained nerve gauntlet. Five escalating bands climb the tall arena:
// flanking spikes, a slow sweep, a centre spike to round, a counter-phase sweep,
// and a final guard saw at the goal. Composure over speed — keep your hand steady
// all the way home. (Boss archetype = endurance; only HOMECOMING keeps a clock.)
export const level74: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 90, radius: 26 },
  obstacles: [],
  hazards: [
    // Band 1 — flanking spikes leave a centre lane (~140px between edges).
    { x: 110, y: 590, radius: 24 },
    { x: 270, y: 590, radius: 24 },
    // Band 2 — a slow saw sweeps the mid lane.
    { x: 60,  y: 480, radius: 22, to: { x: 300, y: 480 }, durationMs: 1300 },
    // Band 3 — a centre spike: commit to a side.
    { x: 180, y: 370, radius: 26 },
    // Band 4 — counter-phase sweep.
    { x: 300, y: 260, radius: 22, to: { x: 60,  y: 260 }, durationMs: 1300 },
    // Band 5 — a slow saw guards the final approach to home.
    { x: 90,  y: 170, radius: 20, to: { x: 270, y: 170 }, durationMs: 1500 },
  ],
  collectible: { x: 300, y: 370 }, // past the centre spike, right side — the brave 2nd star
  boss:      true,
  title:     'THE INFERNO',
  hint:      'No clock — just nerve. Thread every band, stay calm, bring the star home',
  parTimeMs: 17000,
};
