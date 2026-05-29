export interface Vec2 {
  x: number;
  y: number;
}

export interface ObstacleConfig {
  x: number;       // play-area center x
  y: number;       // play-area center y
  width: number;
  height: number;
  angle?: number;  // degrees, default 0
}

export interface LevelConfig {
  ball: { x: number; y: number };
  goal: { x: number; y: number; radius: number };
  obstacles: ObstacleConfig[];
  startVelocity?: { x: number; y: number };
}
