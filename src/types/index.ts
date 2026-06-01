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

// Directional force field the ball is pushed by while inside (wind/updraft/repulse).
export interface GravityZoneConfig {
  x: number;       // play-area center x
  y: number;       // play-area center y
  width: number;
  height: number;
  dir: Vec2;       // force direction (will be normalized)
  strength: number; // force magnitude per frame
}

// A deadly object — touching it fails the level. Circle (radius) or rect (width/height).
export interface HazardConfig {
  x: number;       // play-area center x
  y: number;       // play-area center y
  radius?: number; // circular hazard
  width?: number;  // rect hazard
  height?: number;
  to?: Vec2;       // optional: hazard slides between (x,y) and `to` (yoyo)
  durationMs?: number;
}

// A static barrier that slides between two points (yoyo) — opens/closes gaps for timing.
export interface MovingPlatformConfig {
  x: number;       // start center (play coords)
  y: number;
  width: number;
  height: number;
  to: Vec2;        // end center (play coords)
  durationMs: number; // one-way travel time
  angle?: number;  // degrees, default 0
}

export interface LevelConfig {
  ball: { x: number; y: number };
  goal: { x: number; y: number; radius: number };
  obstacles: ObstacleConfig[];
  startVelocity?: { x: number; y: number };
  hint?: string;   // one-line onboarding tip, shown on level entry
  // Optional mechanics — existing levels stay valid (all optional).
  gravityZones?: GravityZoneConfig[];
  movingPlatforms?: MovingPlatformConfig[];
  hazards?: HazardConfig[]; // deadly objects — touching fails the level
  collectible?: Vec2; // optional gem (drives the 2nd star)
  parTimeMs?: number; // efficiency-star target (3rd star)
  timeLimitMs?: number; // hard countdown — level fails if it reaches 0
}
