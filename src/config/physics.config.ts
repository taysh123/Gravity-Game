export const PHYSICS = {
  // Attractor — primary tuning surface for game feel
  ATTRACTOR_STRENGTH: 1.5,       // Force multiplier. Too high = snaps. Too low = floaty.
  ATTRACTOR_MIN_DIST: 55,        // Clamp prevents force spike at very close range.
  ATTRACTOR_MAX_DIST: 280,       // Force is zero beyond this radius; drives the visible ring.

  // Ball
  BALL_RADIUS: 16,
  BALL_RESTITUTION: 0.65,        // Bounciness: 0 = no bounce, 1 = perfect elastic.
  BALL_FRICTION: 0.01,           // Surface drag. Keep low — ball should slide.
  BALL_FRICTION_AIR: 0.02,       // Air damping. Prevents runaway with continuous hold force.
  BALL_START_VX: 0,              // Zero initial velocity — evaluate gravity in isolation.
  BALL_START_VY: 0,

  // Trail
  TRAIL_LENGTH: 8,               // Number of trail segments.
  TRAIL_MAX_ALPHA: 0.4,          // Opacity of the nearest trail segment.

  // World bounds
  WALL_THICKNESS: 20,
  WALL_RESTITUTION: 0.5,
  PLAY_WIDTH: 360,               // Play area width inside 390px canvas.
  PLAY_HEIGHT: 780,              // Play area height inside 844px canvas.

  // Mobile
  HAPTICS_ENABLED: true,         // Set false to disable navigator.vibrate calls.

  // Colors
  COLOR_BACKGROUND: 0x0d0d1a,
  COLOR_BALL: 0xf0f0ff,
  COLOR_BALL_GLOW: 0xffd166,
  COLOR_ATTRACTOR: 0x7c5cff,
  COLOR_ATTRACTOR_PULSE: 0x00d4ff,
  COLOR_WALL: 0x1a2a3a,
  COLOR_GOAL: 0x00e676,          // electric green — unique, unmissable
  COLOR_OBSTACLE: 0x3a4a5c,      // slate — visually heavy, clearly blocking
} as const;
