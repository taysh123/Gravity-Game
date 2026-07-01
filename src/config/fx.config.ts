import { PHYSICS } from './physics.config';

// Wave 1 "Make it Alive" tuning surface. Mirrors splash.config.ts — never type
// these numbers inline in an entity or scene.
export const FX = {
  // ── Screen-space post-FX (WebGL only; skipped on Canvas / reduced-motion / low FPS) ──
  BLOOM_COLOR: 0xffffff,
  BLOOM_OFFSET: 0.8,       // sample offset — soft, wide glow
  BLOOM_BLUR_STRENGTH: 0.9,
  BLOOM_STRENGTH: 0.65,    // ambient base bloom (premium sheen, not a wash-out)
  BLOOM_STEPS: 4,          // KEEP LOW — each step is a GPU pass; 4 is the mid-range budget
  VIGNETTE_RADIUS: 0.82,
  VIGNETTE_STRENGTH: 0.32, // gentle edge darkening focuses the eye on play
  VIGNETTE_CENTER: 0.5,    // normalized screen center (x=y) for the vignette
  FPS_DOWNGRADE_THRESHOLD: 50, // sustained fps below this disables bloom
  FPS_DOWNGRADE_WINDOW: 180,   // ~3s at 60fps

  // ── Living background ──
  COMET_MIN_GAP_MS: 4200,   // quiet cadence — an occasional event, never busy
  COMET_MAX_GAP_MS: 9000,
  COMET_MIN_LIFE_MS: 900,
  COMET_MAX_LIFE_MS: 1600,
  COMET_MAX_ACTIVE: 2,      // hard cap (cheap + calm)
  COMET_HEAD_R: 2.4,
  COMET_TAIL_LEN: 60,
  COMET_ALPHA: 0.5,
  COMET_TINT: PHYSICS.COLOR_BALL,   // pale star-white; per-world tint applied in entity
  NEBULA_PULSE_GAIN: 0.5,   // extra nebula alpha multiplier at a full press-pulse
  NEBULA_PULSE_MS: 520,     // ambient nebula-swell decay (eased in-entity); intentionally past the 400ms UI-transition cap — this is atmospheric, not a UI state transition
  NEBULA_PULSE_PARALLAX_PX: 6, // tiny press-reactive nebula position nudge (3rd parallax layer)

  // ── Living attractor (visual only — force formula untouched) ──
  CHARGE_FULL_MS: 900,      // hold this long → full visual charge
  TENDRIL_COUNT: 5,         // radial energy arcs at full charge
  TENDRIL_LEN: 22,          // px reach of a tendril beyond the core ring
  TENDRIL_ALPHA: 0.55,
  TENDRIL_REDUCED_CAP: 0.6, // reduced-motion: cap charge so the glow stays calm
  LENS_RING_ALPHA: 0.3,     // gravitational-lensing shimmer ring alpha at full charge
  LENS_RING_R: 46,
} as const;

export type FxConst = typeof FX;
