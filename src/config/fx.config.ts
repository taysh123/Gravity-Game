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
  FPS_DOWNGRADE_THRESHOLD: 50, // sustained fps below this disables bloom
  FPS_DOWNGRADE_WINDOW: 180,   // ~3s at 60fps
} as const;

export type FxConst = typeof FX;
