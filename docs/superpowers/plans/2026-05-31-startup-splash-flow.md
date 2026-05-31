# Startup Presentation Flow — Design Plan & Animation Storyboard

**Status:** DRAFT — awaiting approval. No code to be written until approved.
**Date:** 2026-05-31
**Target baseline:** clean Sprint 3 commit `b5df2e6` (see "Working-tree caveat" below).

---

## 0. Goal

Insert a two-stage startup presentation before the main menu:

```
BootScene → CompanySplashScene → IntroSplashScene → MainMenuScene → GameScene → … → EndScene
            (~2s)                 (~3–4s)
```

1. **Company Splash** — "True Story Application" logo, elegant fade-in, subtle orange glow, ~2s.
2. **Game Intro Splash** — cosmic theme: drifting stars + nebula, a glowing energy sphere flies across screen, gets pulled into a vortex/black hole, the swirl reveals the **Gravity Flow** logo, ~3–4s.
3. **Main Menu** — entry point to play.

Requirements: smooth transitions, mobile-friendly, **skip on first touch**, maintain performance, App-Store-quality polish.

---

## 1. Working-tree caveat (must resolve before implementation)

The current working tree does **not compile**. `src/scenes/EndScene.ts` and `src/scenes/GameScene.ts` have uncommitted edits importing modules that do not exist on disk (`../config/theme.config`, `../entities/Background`, `../utils/transitions`, `../utils/textures`), plus an untracked `src/ui/Button.ts`. This matches the memory note: the Sprint 4 visual overhaul never persisted.

**Decision needed (D0):** This plan assumes we **discard the broken working-tree changes and build the splash flow on the clean `b5df2e6` baseline.** The clean baseline has:
- Flat-color `EndScene` (no `Background`/`Button`/`transitions` helpers).
- `BootScene` that starts `GameScene` directly.
- No `MainMenuScene`, no `THEME` config, no reusable `Background` or `Button`.

If instead we are meant to finish the Sprint 4 overhaul first, the splash plan changes (it would reuse `Background`, `Button`, `transitions`, `THEME`). I recommend the clean-baseline path and will design self-contained splash scenes that introduce only the helpers they need.

---

## 2. Scope & new files

All visuals are runtime `Phaser.Graphics`/`Text` — **no image assets** (project rule). All numeric constants live in config, not inline (project rule).

**New scenes**
- `src/scenes/CompanySplashScene.ts` — stage 1.
- `src/scenes/IntroSplashScene.ts` — stage 2.
- `src/scenes/MainMenuScene.ts` — stage 3 (does not exist yet; minimal but polished).

**New / reused support**
- `src/config/splash.config.ts` — all splash timings, colors, sizes (single tuning surface, mirrors `physics.config.ts` philosophy).
- `src/utils/transitions.ts` — small shared `fadeIn(scene)` / `fadeToScene(scene, key, data?)` helpers (camera fade). Used by all three new scenes so transitions are uniform. (New file on the clean baseline.)
- `src/scenes/BootScene.ts` — change the single `this.scene.start('GameScene')` line to `this.scene.start('CompanySplashScene')`. Keep the `spark` texture generation. Optionally also generate a soft radial "glow" texture here (see §6) so all splash scenes can use additive glows cheaply.
- `src/main.ts` — register the three new scenes in the scene list, ordered `BootScene, CompanySplashScene, IntroSplashScene, MainMenuScene, GameScene, EndScene`.

**No changes** to `GameScene`, `EndScene`, entities, or levels (beyond Boot's one-line start target). The splash flow is additive and isolated.

---

## 3. Shared visual language

| Token | Value | Source |
|-------|-------|--------|
| Canvas | 390 × 844, `Scale.FIT`, center | `main.ts` |
| Background | `0x0d0d1a` deep indigo-black | `COLOR_BACKGROUND` |
| Orange glow (brand) | `0xffd166` | `COLOR_BALL_GLOW` |
| Energy sphere body | `0xf0f0ff` near-white core | `COLOR_BALL` |
| Vortex / attractor accent | `0x7c5cff` violet + `0x00d4ff` cyan | `COLOR_ATTRACTOR` / `COLOR_ATTRACTOR_PULSE` |
| Goal/positive green (menu accent) | `0x00e676` | `COLOR_GOAL` |
| Display font | system sans (`Arial, sans-serif` baseline) | matches Sprint 3 |

The energy sphere deliberately reuses the **ball's own look** (near-white fill + soft orange glow ring) so the intro visually *is* the ball the player will control — a narrative hook into the mechanic. The vortex reuses the **attractor's** violet/cyan ring palette so the black hole reads as "a giant gravity attractor," again teaching the core verb before gameplay.

### Skip behavior (global, both splash scenes)
- On `pointerdown` **or** any key, immediately fade to the next scene (≤180ms fade), kill running tweens/timers.
- A faint "tap to skip" affordance fades in only after ~800ms (so it never competes with the brand reveal), bottom-center, low alpha. Disabled during the final auto-transition to avoid double-advance.
- Guard with an `isAdvancing` flag so skip + auto-advance can't both fire (same pattern as `GameScene`'s `isWon`/`isDying` guards).

### Performance budget
- Stars: one tiled/scrolling starfield drawn into a **single** `Graphics` or a `TileSprite` from a runtime-generated star texture — not dozens of game objects.
- Nebula: 2–3 large additive-blend radial-glow sprites (from one generated texture), slowly tween-rotated/pulsed. Cheap, no per-frame redraw of many primitives.
- Particle bursts (sphere trail, vortex swirl, logo reveal): reuse the existing `spark` texture via Phaser emitters; **stay under the project's 50-active-particle ceiling**. Sphere trail emitter capped ~16; reveal burst ~24.
- Target 60fps on mobile. Everything is tween/emitter driven (GPU-friendly); avoid per-frame `Graphics.clear()`+redraw except the lightweight starfield drift.

---

## 4. Storyboard — Stage 1: Company Splash (~2000ms)

Black (`0x0d0d1a`) screen. Centerpiece: **"TRUE STORY APPLICATION"** wordmark (text), with a soft orange radial glow behind it.

```
 t=0ms      Pure dark background. Nothing visible.
            (camera already faded-in from Boot via a 1-frame black hold)

 t=0–600    LOGO FADE-IN
            Wordmark alpha 0→1, scale 0.92→1.00 (ease: Sine.Out).
            Orange glow sprite behind it alpha 0→0.5, scale 0.6→1.0.
            Letter-spacing settles (optional: slight tracking-in).

 t=600–1500 BREATHE / HOLD
            Glow gently pulses alpha 0.5→0.65→0.5 (Sine.InOut, ~900ms,
            yoyo). Wordmark holds. This is the "premium hold".

 t=1500–2000 FADE-OUT
            Whole scene (camera fade) → black over ~400ms.
            On complete → start IntroSplashScene.

 SKIP: pointerdown/key at any time → 150ms fade → IntroSplashScene.
```

Layout: wordmark centered at `(195, 422)`. Glow radius ~ canvas width. Tagline (optional, e.g. small "presents") can sit ~36px below at low alpha — **decision D2**.

ASCII mock:
```
┌─────────────────────────┐
│                         │
│        ·  (soft         │
│         orange glow)    │
│                         │
│   TRUE STORY            │
│     APPLICATION         │
│                         │
│                         │
│            tap to skip ⃝ │  ← appears after 800ms
└─────────────────────────┘
```

---

## 5. Storyboard — Stage 2: Game Intro Splash (~3500ms, tunable 3000–4000)

Cosmic theme. Builds the world, performs the "sphere → vortex → logo" set piece.

```
 t=0           COSMIC FADE-IN
               Starfield + nebula fade in from black (alpha 0→1, ~500ms).
               Stars begin slow parallax drift (continuous).
               Nebula clouds slow-rotate/pulse (continuous, subtle).

 t=300–1500    ENERGY SPHERE TRAVELS
               Glowing sphere enters from left edge (off-screen, ~ y=300),
               flies along a gentle curved path toward screen center-right.
               - Sphere = white core + orange glow halo + soft trail emitter.
               - Path: quadratic/bezier, NOT a straight line (more premium).
               - Slight scale pulse on the glow (alive feeling).

 t=1200        VORTEX APPEARS (overlaps sphere travel)
               A black hole / vortex forms at screen center
               (~ 195, 460): violet+cyan concentric rings (attractor look),
               a dark core, faint accretion swirl. Scales up 0→1 (Back.Out).

 t=1500–2400   CAPTURE / SPIRAL-IN
               Sphere's path curves into the vortex; it spirals inward
               (decreasing radius, increasing angular speed) — visualized
               with Phaser tween on polar coords or a path follower.
               - Sphere scale shrinks as it nears the core.
               - Trail intensifies; emitter rate up.
               - Vortex rings spin faster, pull inward.
               - At the moment of capture: brief bright flash + small
                 implosion (particles pulled to center), screen-shake hint
                 (very subtle, ≤ SHAKE_WIN_INTENSITY).

 t=2400–3100   ENERGY SWIRL → LOGO REVEAL
               The collapsed energy blooms outward into the wordmark:
               - A swirl of particles expands and resolves into the
                 "GRAVITY FLOW" logo (text) at center.
               - Logo alpha 0→1, scale 0.8→1.0 (Back.Out), orange glow
                 behind it ignites (alpha 0→0.6).
               - Optional tagline beneath, low alpha.

 t=3100–3500   SETTLE + FADE-OUT
               Logo holds ~300ms, glow breathes once, then camera fade
               → MainMenuScene (~350ms).

 SKIP: pointerdown/key → 150ms fade → MainMenuScene.
```

ASCII mock (capture moment):
```
┌─────────────────────────┐
│  ·   ·      ·   ·    ·   │  ← drifting stars
│    ·   (nebula haze)  ·  │
│ ·          ╭╮         ·  │
│      ◦·.   ╞◉╡  ← vortex │  ← sphere spiraling in
│ ·         ╰╯          ·  │
│   ·    ·       ·   ·     │
│            tap to skip ⃝ │
└─────────────────────────┘
```
ASCII mock (logo reveal):
```
┌─────────────────────────┐
│  ·   ·      ·   ·    ·   │
│        (orange bloom)    │
│      G R A V I T Y       │
│         F L O W          │
│   ·    ·       ·   ·     │
└─────────────────────────┘
```

### Implementation approach for the set piece
- **Sphere travel + spiral:** a single tween chain. Travel = tween along a `Phaser.Curves.QuadraticBezier` (use `getPoint(t)` in `onUpdate`). Spiral = a second tween animating `angle` + `radius` around the vortex center, sphere position computed as `center + polar(radius, angle)`.
- **Vortex:** a small `Vortex` visual helper (or inline `Graphics` redraw per frame, lightweight — a few `strokeCircle`s like `Attractor.draw`). Spin via incrementing rotation each frame.
- **Reveal burst:** `spark` emitter, explode mode, ~24 particles, tinted orange→violet, converging-then-diverging.
- All driven by scene timers/tweens; cleaned up on `shutdown`.

---

## 6. Storyboard — Stage 3: Main Menu (new scene, polished but minimal)

Persistent cosmic background (same starfield/nebula as intro — extract a tiny shared `CosmicBackground` helper OR re-instantiate; **decision D3**). Centerpiece:

```
┌─────────────────────────┐
│  ·   ·      ·   ·    ·   │
│      G R A V I T Y       │  ← wordmark + soft orange glow, gentle bob
│         F L O W          │
│                          │
│     ┌──────────────┐     │
│     │     PLAY     │     │  ← primary button (green accent)
│     └──────────────┘     │
│     ┌──────────────┐     │
│     │  LEVELS (opt)│     │  ← optional; or omit for MVP
│     └──────────────┘     │
│                          │
│   tap anywhere to play   │  ← optional fallback
└─────────────────────────┘
```

- Fade-in on enter. **PLAY** → `fadeToScene('GameScene', { level: 1 })`. **LEVELS** → `fadeToScene('LevelSelectScene')`.
- Buttons: ≥44×44px touch targets, ≥4.5:1 contrast (ui-ux-pro-max rule). On clean baseline there's no `Button` class, so introduce a minimal one (`src/ui/Button.ts`) — rounded rect + label + pointer states (hover/press scale, color shift). Reusable by `LevelSelectScene` and later `EndScene`.
- **Menu scope = PLAY + LEVELS** (resolved D4).

### LevelSelectScene (new)
- Same shared `CosmicBackground`. A 2×3 grid of buttons "1"–"6" (one per `LEVELS[]` entry — source the count from `LEVELS.length`, never hard-code). Each → `fadeToScene('GameScene', { level: n })`. A small "← Back" → `MainMenuScene`. Touch targets ≥44px; comfortable spacing for thumbs.

---

## 7. `splash.config.ts` (proposed constants)

```ts
export const SPLASH = {
  // Stage 1 — company
  COMPANY_FADE_IN_MS: 600,
  COMPANY_HOLD_MS: 900,
  COMPANY_FADE_OUT_MS: 400,        // total ≈ 1900ms ≈ "2s"
  COMPANY_GLOW_ALPHA: 0.55,

  // Stage 2 — intro
  INTRO_COSMIC_FADE_MS: 500,
  INTRO_SPHERE_TRAVEL_MS: 1200,
  INTRO_VORTEX_APPEAR_MS: 400,
  INTRO_SPIRAL_MS: 900,
  INTRO_REVEAL_MS: 700,
  INTRO_SETTLE_MS: 400,            // total ≈ 3500ms

  // Transitions / skip
  SCENE_FADE_MS: 350,
  SKIP_FADE_MS: 150,
  SKIP_HINT_DELAY_MS: 800,
  SKIP_HINT_ALPHA: 0.35,

  // Cosmic background
  STAR_COUNT: 90,                  // drawn into ONE texture/tilesprite
  STAR_DRIFT_SPEED: 6,             // px/sec parallax
  NEBULA_LAYERS: 3,

  // Particle caps (project ceiling = 50 active)
  SPHERE_TRAIL_MAX: 16,
  REVEAL_BURST_COUNT: 24,

  // Brand strings
  COMPANY_NAME: 'TRUE STORY APPLICATION',
  GAME_TITLE: 'GRAVITY FLOW',
} as const;
```
(Colors reused from `PHYSICS.COLOR_*`; no duplication.)

---

## 8. Transitions util (proposed)

```ts
// src/utils/transitions.ts
export function fadeIn(scene, ms = SPLASH.SCENE_FADE_MS) {
  scene.cameras.main.fadeIn(ms, 13, 13, 26); // matches 0x0d0d1a
}
export function fadeToScene(scene, key, data?, ms = SPLASH.SCENE_FADE_MS) {
  scene.cameras.main.fadeOut(ms, 13, 13, 26);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}
```
Uniform fades everywhere; one place to tune.

---

## 9. Mobile & quality checklist (ui-ux-pro-max / verification)

- [ ] Skip works on **first touch** anywhere on screen, both stages.
- [ ] Touch targets on menu ≥ 44×44px; text contrast ≥ 4.5:1.
- [ ] No layout dependence on canvas size beyond `this.scale.width/height` (safe under `Scale.FIT`).
- [ ] 60fps held on a throttled mobile profile (Playwright `--disable-gpu --use-gl=swiftshader` for capture; real-device spot check in Sprint 4 QA).
- [ ] Active particles never exceed 50; physics bodies = 0 in splash scenes.
- [ ] All tweens/timers/emitters destroyed on `shutdown` (no leaks across restarts).
- [ ] `npx tsc --noEmit` clean; `npm run build` clean.
- [ ] No hard-coded numbers/colors outside config.

---

## 10. Audio (resolved D5 — include now)

Extend `AudioSynth` with three intro cues: a soft rising **whoosh** during sphere travel, a low **"thoom"** on vortex capture, and a bright **chime** on logo reveal. Web Audio requires a user gesture, so the `AudioContext` is created/resumed on the **first pointerdown/skip**; if the intro auto-plays before any touch, the cues are skipped gracefully (visual-only) rather than throwing. No autoplay-policy violations. The MainMenu PLAY/LEVELS taps are valid gestures that guarantee audio is unlocked before gameplay.

---

## 11. Build order (subagent-driven-development, one task each)

0. Reset to clean baseline: revert broken `EndScene.ts`/`GameScene.ts`, drop untracked `src/ui/`.
1. `splash.config.ts` + `transitions.ts` + `CosmicBackground` helper + minimal `Button` (foundation).
2. `CompanySplashScene` (stage 1) — verify fade/glow/skip in browser.
3. `IntroSplashScene` (stage 2) — sphere→vortex→reveal set piece + audio cues; verify.
4. `MainMenuScene` (PLAY + LEVELS) + `LevelSelectScene` — verify routing to `GameScene`.
5. Extend `AudioSynth` with whoosh/thoom/chime; wire into intro with gesture-gated unlock.
6. Wire `BootScene` start target + register all new scenes in `main.ts`; full-flow playtest + perf check.
7. Update `CLAUDE.md` scene-flow diagram + folder structure; update `EndScene` wordmark to "GRAVITY FLOW".

Each step: build → browser playtest (Playwright screenshots) → `tsc --noEmit` → report actual observed behavior before moving on.

---

## 12. Decisions (resolved 2026-05-31)

- **D0 — RESOLVED:** Discard the broken working-tree Sprint 4 changes; build on clean `b5df2e6`. First implementation step is `git checkout -- src/scenes/EndScene.ts src/scenes/GameScene.ts` and remove untracked `src/ui/` (then reintroduce a fresh minimal `Button`).
- **D2 — RESOLVED:** Use "**GRAVITY FLOW**" everywhere — intro reveal, main menu, and update `EndScene`'s "You did it!" wordmark to match.
- **D3 — RESOLVED:** Share one `CosmicBackground` helper between `IntroSplashScene` and `MainMenuScene`.
- **D4 — RESOLVED:** Main menu has **PLAY + LEVELS**. PLAY → `GameScene { level: 1 }`. LEVELS → a level-select (grid of the 6 levels, each → `GameScene { level: n }`). *(Sub-decision D4a: a new lightweight `LevelSelectScene` vs. an in-menu overlay panel — recommend a separate `LevelSelectScene` for clarity; confirm at build time.)*
- **D5 — RESOLVED:** Include synth audio cues now (whoosh on sphere travel, low "thoom" on vortex capture, bright chime on logo reveal). Web Audio stays silent until the first user gesture (first touch/skip) per autoplay policy; extend `AudioSynth` with the new cues.
- **D1 — assumed:** "TRUE STORY APPLICATION" all-caps wordmark, no tagline unless you say otherwise.
- **D6 — assumed:** Company ~1.9s, Intro ~3.5s. Tunable via `splash.config.ts`.

---

## Revision 2 (2026-05-31) — Real logo assets + UI/UX polish + execution alignment

Supersedes the relevant parts above. Full working copy: `~/.claude/plans/jolly-waddling-star.md`.

**Real logo assets (replace text wordmarks).**
- `assets/images/true-story-logo.png` → CompanySplash centerpiece.
- `assets/images/gravity-flow-logo.png` → IntroSplash reveal + MainMenu title.
- Vite has `base: './'`, no `public/` dir → assets must be **import-bundled** (hashed URL), not raw paths.
  Add `src/vite-env.d.ts` (`/// <reference types="vite/client" />`) for `*.png` typing, and a central
  `src/config/assets.ts` `IMAGES` map. `BootScene.preload()` loads both logos (+ a shared radial glow texture).
- **Optimize source PNGs** (1.76/1.41 MB → <~200 KB each): downscale to ≤~1080px long edge + recompress.
  Biggest first-paint + GPU-memory win; preload guarantees no pop-in.

**Intro alignment (teaches the core mechanic):**
- **Sphere = the player ball, exactly** — reuse `Ball.ts` language: white core `COLOR_BALL`, orange glow
  ring `COLOR_BALL_GLOW` @0.35, tapering trail via `TRAIL_LENGTH`/`TRAIL_MAX_ALPHA`.
- **Vortex = the gameplay goal/target** (supersedes the earlier attractor look) — reuse `Goal.ts` language:
  `COLOR_GOAL` green halo (breathing `Goal.pulse`), inner ring, soft disc, center dot, plus rotational
  swirl + dark core. So the intro reads as "guide the ball into the target."

**UI/UX (ui-ux-pro-max) — all confirmed:** safe-area insets (`env(safe-area-inset-*)`),
`prefers-reduced-motion` fallback (heavy set-piece → tasteful fade), idle micro-animations (title bob,
button breathing), delayed skip-hint (~800ms). Menu keeps the **"Hold to pull"** tagline (confirmed).
New helper `src/utils/a11y.ts` (`prefersReducedMotion()`, `safeAreaInsets()`). `splash.config.ts` gains
`SAFE_AREA_MIN_PAD`, `REDUCED_MOTION_FADE_MS`, `IDLE_BOB_AMPLITUDE`, `IDLE_BOB_MS`, `LOGO_MAX_W_RATIO`.

**Execution workflow (confirmed):** Step 0 is **stash-based, non-destructive** (`git stash push -u` by
pathspec — broken `EndScene.ts`/`GameScene.ts`/`src/ui/` only, preserving `assets/` + docs). Commit after
each verified milestone; auto-continue unless verification fails or a major design decision is needed;
after each milestone report change summary + screenshots + commit hash.
```
