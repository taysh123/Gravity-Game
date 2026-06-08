export const PHYSICS = {
  // Attractor — primary tuning surface for game feel.
  // Strength up + min-dist up: ~1.7× stronger at medium range (the "finicky"
  // band) while the raised clamp keeps close-range from snapping.
  ATTRACTOR_STRENGTH: 2.6,       // Force multiplier. Too high = snaps. Too low = floaty.
  ATTRACTOR_MIN_DIST: 75,        // Clamp prevents force spike at very close range.
  ATTRACTOR_MAX_DIST: 310,       // Force is zero beyond this radius; drives the visible ring.

  // Ball
  BALL_RADIUS: 16,
  BALL_RESTITUTION: 0.65,        // Bounciness: 0 = no bounce, 1 = perfect elastic.
  BALL_FRICTION: 0.01,           // Surface drag. Keep low — ball should slide.
  BALL_FRICTION_AIR: 0.02,       // Air damping. Prevents runaway with continuous hold force.
  BALL_START_VX: 0,              // Zero initial velocity — evaluate gravity in isolation.
  BALL_START_VY: 0,

  // Trail — a glowing "comet" tail (additive). Longer than before for drama on
  // fast moves while staying cheap (vector graphics, not particles).
  TRAIL_LENGTH: 10,              // Number of trail segments.
  TRAIL_MAX_ALPHA: 0.28,         // Opacity of the nearest trail segment.

  // Juice — particle burst + screen shake (kept under the 50-particle ceiling)
  PARTICLE_COUNT: 24,            // Particles in the goal-capture burst.
  SHAKE_WIN_MS: 120,             // Subtle celebratory shake on reaching the goal.
  SHAKE_WIN_INTENSITY: 0.004,
  SHAKE_DEATH_MS: 180,           // Sharper shake when the ball is lost.
  SHAKE_DEATH_INTENSITY: 0.008,

  // World bounds
  WALL_THICKNESS: 20,
  WALL_RESTITUTION: 0.5,
  PLAY_WIDTH: 360,               // Play area width inside 390px canvas.
  PLAY_HEIGHT: 780,              // Play area height inside 844px canvas.

  // Onboarding + feedback
  HINT_DURATION_MS: 5000,        // Auto-hide a level hint after this long.
  PULL_LINE_ALPHA: 0.22,         // Faint ball→attractor line while pulling.
  COLOR_HINT_TEXT: '#aeb8d8',    // Light lavender-grey — high contrast on bg.
  ATTRACTOR_INFLUENCE_ALPHA: 0.28, // Persistent reach-boundary ring (teaches range).
  SPAWN_PULSE_MS: 440,           // "Sonar ping" expanding to the reach on each spawn.
  SPAWN_PULSE_ALPHA: 0.38,

  // Mobile
  HAPTICS_ENABLED: true,         // Set false to disable navigator.vibrate calls.
  HAPTIC_TAP_MS: 12,             // Buzz length on restart/attractor spawn.
  HAPTIC_WIN_MS: 35,             // (legacy single buzz; win now uses the pattern)
  HAPTIC_WIN_PATTERN: [22, 28, 55], // Celebratory buzz-pause-buzz on reaching the goal.
  HAPTIC_PERFECT_PATTERN: [18, 24, 18, 24, 70], // 3-star — a rolling celebratory burst.
  HAPTIC_BOSS_PATTERN: [40, 30, 40, 30, 90], // Boss cleared — a heavier triumphant pattern.
  HAPTIC_DEATH_PATTERN: [60, 40, 20], // Sharp descending buzz on death.

  // Win / death feedback (elegant, within the <50-particle ceiling)
  WIN_FLASH_MS: 340,             // Goal "absorb" flash on capture.
  DEATH_FLASH_MS: 360,           // Red vignette flash on death.
  DEATH_PUFF_COUNT: 16,          // Ball "puff" particles on death.
  COLOR_DEATH: 0xff5a6a,         // Fail red — vignette + puff + ball tint.

  // Hazards — "alive" danger archetypes (P3). Rotating arm orbits a pivot; laser
  // beam toggles deadly on a telegraphed rhythm.
  HAZARD_ARM_ALPHA: 0.3,         // faint arm drawn pivot->saw on a rotating hazard.
  BEAM_DUTY: 0.45,               // fraction of each pulse the beam is firing (deadly).
  BEAM_CHARGE_FRAC: 0.25,        // last fraction before firing shows a charging telegraph.
  BEAM_ALPHA_ACTIVE: 0.85,       // beam opacity while firing (deadly).
  BEAM_ALPHA_IDLE: 0.12,         // dim "rail" opacity while safe.

  // Gravity zones (directional force fields). Strength ≈ a moderate attractor pull.
  GRAVITY_ZONE_STRENGTH: 0.0006, // Reference per-frame force for authoring level zones.
  COLOR_ZONE_UP: 0x00d4ff,       // cyan — updraft / upward push
  COLOR_ZONE_DOWN: 0xffd166,     // gold — downdraft
  COLOR_ZONE_SIDE: 0x7c5cff,     // violet — sideways current

  // Magnets (static attract/repel wells — reuse the inverse-square attractor model).
  // Clamp raised 70->95 and reach trimmed 230->190 to fix the "inescapable trap":
  // peak grab (strength/clamp²) drops ~46% so the player's attractor (peak 4.62e-4)
  // is ~1.9x stronger at close range, while mid-range pull (>=95px) is unchanged —
  // wells stay strategic but escape is a skill, not a stalemate.
  MAGNET_STRENGTH: 2.2,          // Always-on force; kept under the attractor's 2.6.
  MAGNET_MIN_DIST: 95,           // Close-range clamp — caps peak grab below the player's counter-force.
  MAGNET_MAX_DIST: 190,          // Influence radius — localized + avoidable (was 230).
  MAGNET_CORE_RADIUS: 20,        // Visible core circle.
  COLOR_MAGNET_ATTRACT: 0x00d4ff,// cyan — pulls the ball in
  COLOR_MAGNET_REPEL: 0xc04cff,  // violet-magenta — pushes away (distinct from hazard red)

  // Portals (linked teleport pairs — W6 Rifts). Carry velocity; cooldown + exit
  // offset prevent immediate re-entry / ping-pong.
  PORTAL_RADIUS: 26,             // mouth radius (overlap trigger).
  PORTAL_COOLDOWN_MS: 350,       // ignore re-entry on a pair for this long after a jump.
  PORTAL_EXIT_CLEAR: 56,         // exit offset along travel dir (ball + mouth + margin).
  COLOR_PORTAL_A: 0x33e1ff,      // cyan mouth
  COLOR_PORTAL_B: 0xffa64d,      // amber mouth (the linked partner)

  // One-way gates (W7 — Gates). Solid, but open while the ball moves along `dir`.
  GATE_OPEN_THRESHOLD: 0.1,      // min velocity component along dir to open (else solid).
  COLOR_GATE: 0x2ee6c0,          // teal — arrows show the allowed pass direction

  // Stars / scoring
  STAR_PAR_DEFAULT_MS: 12000,    // Fallback efficiency par when a level omits parTimeMs.
  COLOR_STAR: 0xffd166,          // Filled (earned) star — gold.
  COLOR_STAR_EMPTY: 0x3a4256,    // Empty star slate.

  // Countdown timer (hard-fail timed levels)
  TIMER_WARN_MS: 3000,           // Below this, the countdown turns red + pulses.
  COLOR_TIMER: '#EDEDF2',
  COLOR_TIMER_WARN: '#ff5a6a',

  // Live par chip + PB ghost trail (mastery feedback — the 3-star "one more try").
  COLOR_PAR_UNDER: '#ffd166',    // elapsed still under par (on pace for 3 stars) — gold.
  COLOR_PAR_OVER: '#8b93a7',     // over par — muted slate.
  GHOST_SAMPLE_MS: 60,           // record the ball position this often during a run.
  GHOST_MAX_POINTS: 90,          // downsample the saved PB path to at most this many points.
  GHOST_MAX_SAMPLES: 600,        // safety cap on in-run recording (long runs).
  COLOR_GHOST: 0x8fb0ff,         // pale blue — your best run's faint trail.
  GHOST_ALPHA: 0.16,

  // Collectible gem (2nd star — optional off-path route)
  GEM_RADIUS: 13,
  COLOR_GEM: 0xffd166,           // gold gem (matches the star it grants)
  COLOR_GEM_GLOW: 0xfff0c0,

  // Multi-goal "constellation" toy — collect orbs that connect on win.
  ORB_RADIUS: 12,
  COLOR_ORB: 0xcfe8ff,           // pale star-blue orbs
  COLOR_CONSTELLATION: 0xfff0c0, // warm lines drawn between collected orbs
  CONSTELLATION_ALPHA: 0.55,
  GOAL_NEAR_DIST: 150,           // within this range the home goal brightens (px)

  // Cinematic camera (per-level intro reveal)
  CAMERA_TWEEN_MS: 650,          // settle from introZoom back to 1.0
  CAMERA_INTRO_ZOOM_MAX: 2.2,    // clamp for LevelConfig.camera.introZoom

  // Instant retry — snappy re-spawn on death (premium flow, less dead time).
  RESTART_DELAY_MS: 240,

  // Colors
  COLOR_BACKGROUND: 0x0d0d1a,
  COLOR_BALL: 0xf0f0ff,
  COLOR_BALL_GLOW: 0xffd166,
  COLOR_ATTRACTOR: 0x7c5cff,
  COLOR_ATTRACTOR_PULSE: 0x00d4ff,
  COLOR_WALL: 0x1a2a3a,
  COLOR_GOAL: 0x00e676,          // electric green — unique, unmissable
  COLOR_PARTICLE: 0x00e676,      // burst color — matches the goal
  COLOR_OBSTACLE: 0x3a4a5c,      // slate — visually heavy, clearly blocking
} as const;
