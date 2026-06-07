import type { LevelConfig } from '../../types';

// World 5 — Wells · AHA (let repel place you): the goal sits at the top of a narrow
// chimney on the right. Pulling straight up won't seat you in it — instead drop in
// just above the repel well at the chimney's foot and let its push *fire you up*
// the shaft. Use the push as propulsion, not an obstacle.
export const level76: LevelConfig = {
  ball:      { x: 110, y: 660 },
  goal:      { x: 300, y: 130, radius: 30 },
  obstacles: [
    // Left wall of the chimney (channel is x 258..340, ~82px wide).
    { x: 250, y: 300, width: 16, height: 360 },
  ],
  magnets: [
    { x: 300, y: 470, polarity: 'repel' }, // at the chimney foot — pushes you up the shaft
  ],
  collectible: { x: 110, y: 250 }, // off-route, far left
  hint:      'Drop in above the push — ride it up the chimney',
  parTimeMs: 15000,
};
