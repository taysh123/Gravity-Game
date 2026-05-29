export const PHYSICS = {
  // Attractor — primary tuning surface for game feel
  ATTRACTOR_STRENGTH: 0.0015,    // Force multiplier. Too high = snaps. Too low = floaty.
  ATTRACTOR_DURATION_MS: 800,    // How long a tap lasts (ms).
  ATTRACTOR_MIN_DIST: 30,        // Clamp prevents force spike at very close range.

  // Ball
  BALL_RADIUS: 16,
  BALL_RESTITUTION: 0.65,        // Bounciness: 0 = no bounce, 1 = perfect elastic.
  BALL_FRICTION: 0.01,           // Surface drag. Keep low — ball should slide.
  BALL_FRICTION_AIR: 0.005,      // Air damping. Prevents runaway acceleration.
  BALL_START_VX: 1.5,            // Initial horizontal velocity.
  BALL_START_VY: 0.5,            // Initial vertical velocity.

  // World bounds
  WALL_THICKNESS: 20,
  WALL_RESTITUTION: 0.5,
  PLAY_WIDTH: 360,               // Play area width inside 390px canvas.
  PLAY_HEIGHT: 780,              // Play area height inside 844px canvas.

  // Colors
  COLOR_BACKGROUND: 0x0d0d1a,
  COLOR_BALL: 0xf0f0ff,
  COLOR_BALL_GLOW: 0xffd166,
  COLOR_ATTRACTOR: 0x7c5cff,
  COLOR_ATTRACTOR_PULSE: 0x00d4ff,
  COLOR_WALL: 0x1a2a3a,
} as const;
