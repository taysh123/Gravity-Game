import type { LevelConfig } from '../../types';

// World 1 · L3 — a real decision: a tight central channel is the fast line (and
// holds the gem + makes par), while the open sides are a slow, safe go-around.
// Speed/risk vs safety — a genuine tradeoff this early.
export const level3: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 140, radius: 36 },
  obstacles: [
    { x: 150, y: 400, width: 14, height: 280 }, // channel left wall  (x ~143..157, y 260..540)
    { x: 210, y: 400, width: 14, height: 280 }, // channel right wall (x ~203..217) — slot ~46px
  ],
  collectible: { x: 180, y: 400 }, // inside the channel — reward for the brave line
  hint:      'Thread the channel for speed, or take the slow sides',
  parTimeMs: 12000,
};
