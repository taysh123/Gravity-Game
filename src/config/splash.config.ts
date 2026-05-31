import { PHYSICS } from './physics.config';
import { THEME } from './theme.config';

// All startup-presentation tuning lives here (mirrors physics.config.ts).
// Timings in ms. Colors reuse PHYSICS.COLOR_* so the splash, menu, and
// gameplay share one palette. Never type these numbers inline in scenes.
export const SPLASH = {
  // ── Brand strings ────────────────────────────────────────────────
  GAME_TITLE: 'GRAVITY FLOW',
  TAGLINE: 'Hold to pull',
  FONT: THEME.FONT_BODY, // body/UI font; wordmarks use THEME.FONT_DISPLAY directly

  // ── Shared transitions / fade ────────────────────────────────────
  SCENE_FADE_MS: 350,
  SKIP_FADE_MS: 150,
  FADE_RGB: { r: 13, g: 13, b: 26 }, // == 0x0d0d1a, the app background

  // Skip-hint affordance (delayed so it never rushes the brand reveal)
  SKIP_HINT_DELAY_MS: 800,
  SKIP_HINT_ALPHA: 0.35,
  SKIP_HINT_TEXT: 'tap to skip',

  // ── Accessibility / device ───────────────────────────────────────
  REDUCED_MOTION_FADE_MS: 450,
  REDUCED_MOTION_HOLD_MS: 700,
  SAFE_AREA_MIN_PAD: 16, // floor padding from any edge, even without a notch

  // ── Idle micro-animations (menu) ─────────────────────────────────
  IDLE_BOB_AMPLITUDE: 6, // px the title bobs
  IDLE_BOB_MS: 2600,
  IDLE_BREATHE_SCALE: 0.025, // button breathing amount
  IDLE_BREATHE_MS: 2200,

  // ── Stage 1 — Company splash ─────────────────────────────────────
  COMPANY_FADE_IN_MS: 600,
  COMPANY_HOLD_MS: 900,
  COMPANY_FADE_OUT_MS: 400, // total ≈ 1900ms ≈ "2s"
  COMPANY_LOGO_W_RATIO: 0.66, // logo width as fraction of canvas width
  COMPANY_GLOW_COLOR: PHYSICS.COLOR_BALL_GLOW, // orange brand glow
  COMPANY_GLOW_ALPHA: 0.5,
  COMPANY_GLOW_ALPHA_PEAK: 0.66,
  COMPANY_GLOW_SCALE: 3.2, // glow sprite scale relative to logo width

  // ── Stage 2 — Intro splash ───────────────────────────────────────
  INTRO_COSMIC_FADE_MS: 500,
  INTRO_SPHERE_DELAY_MS: 300,
  INTRO_SPHERE_TRAVEL_MS: 1200,
  INTRO_VORTEX_APPEAR_MS: 400,
  INTRO_SPIRAL_MS: 900,
  INTRO_REVEAL_MS: 700,
  INTRO_SETTLE_MS: 500, // total ≈ 3500ms
  INTRO_LOGO_W_RATIO: 0.72,
  INTRO_GLOW_COLOR: PHYSICS.COLOR_BALL_GLOW,
  INTRO_GLOW_ALPHA: 0.55,

  // Energy sphere = the player ball (reuse PHYSICS ball colors directly)
  SPHERE_RADIUS: PHYSICS.BALL_RADIUS,
  SPHERE_TRAIL_MAX: 16, // capped well under the 50-particle ceiling

  // Vortex = the gameplay goal/target (reuse PHYSICS.COLOR_GOAL)
  VORTEX_RADIUS: 34,
  VORTEX_COLOR: PHYSICS.COLOR_GOAL,
  VORTEX_SPIN_SPEED: 2.4, // rad/sec of the accretion swirl
  REVEAL_BURST_COUNT: 24,

  // ── Cosmic background (shared: intro + menu + level select) ──────
  STAR_TILE: 256, // px of the repeating star texture
  STAR_FAR_COUNT: 40,
  STAR_NEAR_COUNT: 26,
  STAR_FAR_ALPHA: 0.5,
  STAR_NEAR_ALPHA: 0.85,
  STAR_DRIFT_SPEED: 7, // px/sec for the near layer; far drifts slower
  NEBULA_COUNT: 3,
  NEBULA_ALPHA: 0.16,
  NEBULA_TINTS: [
    PHYSICS.COLOR_ATTRACTOR, // violet
    PHYSICS.COLOR_ATTRACTOR_PULSE, // cyan
    PHYSICS.COLOR_GOAL, // green
  ],

  // ── Main menu / level select ─────────────────────────────────────
  MENU_TITLE_W_RATIO: 0.7,
  MENU_BTN_W: 220,
  MENU_BTN_H: 58,
  MENU_BTN_GAP: 18,
  MENU_FILL_PRIMARY: PHYSICS.COLOR_GOAL, // PLAY — high-emphasis green
  MENU_FILL_SECONDARY: 0x2a2f48, // LEVELS / level cells — calm slate
  MENU_TEXT: '#f0f0ff',
  LEVEL_COLS: 3, // grid columns on the level-select screen
} as const;
