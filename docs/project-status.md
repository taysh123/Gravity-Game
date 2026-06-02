# Gravity Flow — Project Status (Single Source of Truth)

> **Resume in one line:** Read this file first, then continue from **[Next Recommended Sprint](#next-recommended-sprint)**.
> Quick version: `docs/session-handoff.md`. Last updated at commit `206ab35` (Tension & Clarity sprint).

---

## Project Overview

- **Game vision.** A mobile-first physics puzzle game. The player never directly controls the ball —
  pressing/holding the screen creates a gravity attraction point that pulls the ball toward it (drag to
  move, release to remove). Core loop: *hold to pull, guide the ball to the goal.*
- **Brand.** Studio = **True Story Labs**. Game = **GRAVITY FLOW**. Premium cosmic identity.
- **Target platform.** iOS, Android, and web. **Web is the primary dev/test target** (Vite dev server).
- **Tech stack.** Phaser 3.80 · TypeScript (strict) · Matter.js (bundled in Phaser) · Vite 5 · Vitest.
- **Architecture (the golden rule).** *A new mechanic = one entity class + one optional `LevelConfig`
  field.* Mechanics are spawned in `GameScene.createFromConfig` and updated in `GameScene.update`.
  **No managers, no premature abstraction.** All constants live in config files (`physics.config.ts`,
  `theme.config.ts`, `splash.config.ts`). Visuals are runtime `Graphics`/vector icons + one bundled logo
  PNG + self-hosted fonts. Raw Matter via the `RawMatter` bridge (`utils/matter.ts`).
- **Major systems.** Scene flow (splash → menu → game), the attractor force model, the `LevelConfig`
  mechanic pipeline, a 3-star scoring + `ProgressStore` progression layer, a design-token UI system
  (`theme.config` + `ui/` components), and a Web-Audio synth.

**Scene flow:** `Boot → CompanySplash → IntroSplash → MainMenu → Game → End`, with `LevelSelect` and a
`Settings` overlay. See CLAUDE.md for the full diagram + folder structure.

---

## Current State

**Implemented & working (verified in browser via Playwright unless noted):**
- Full startup presentation: text-only True Story Labs company splash → cosmic intro (energy sphere →
  vortex → GRAVITY FLOW logo reveal, with synth audio) → main menu.
- Core gameplay: attractor pull (inverse-square), goal/win, restart, dim cosmic background.
- Mechanics: **gravity zones** (force fields), **moving platforms** (timing barriers), **hazards**
  (fail-on-touch, static + moving saws), **collectible gems**, **timed levels** (hard countdown).
- Scoring: **3 stars** per level (complete / gem / under-par), persisted in `ProgressStore`
  (localStorage), shown on the win overlay + world-select; **sequential unlock**; menu **Continue**.
- UI/UX: glassmorphic design system, Orbitron+Exo 2 fonts, in-game glass toolbar (Home/Settings/Restart),
  settings overlay (Sound/Music/Haptics/Reduce-Motion), one-time Level-1 coach-mark, win/death feedback,
  full-surface button hit areas + press feedback, safe-area handling.
- Quality gates green: `npx tsc --noEmit` clean · `npm test` 16 tests pass (MathUtils 10 + scoring 6) ·
  `npm run build` clean · full flow runs with **no console errors**.

**Caveat:** automated Playwright scripts verified that mechanics *function* (zone lifts, saw sweeps,
hazard kills, countdown fails). They **cannot** reproduce precise finger input, so per-level
**solvability/difficulty balance** is not yet verified — that needs a **human device playtest**.

---

## Completed Sprints

History lives in `docs/superpowers/plans/`. Summary:

### Sprint A — Foundations + Startup Flow
- **Objective:** stand up the game + a premium startup presentation.
- **Delivered:** Boot/Game/End loop; company splash, cosmic intro set-piece, main menu, level select;
  design-token UI (`theme.config`, self-hosted Orbitron+Exo 2), glass components, cosmic background;
  settings overlay (audio/haptics/motion); real True Story Labs logo (white-knockout).
- **Key commits:** `e953a67`, `c285dc7`, `786b02d`, `d23b2d6`, `643412c`, `2d588f3`, `e02db1d`,
  `0571cb9`, `97f9505`.
- **Lessons:** the broken "Sprint 4" WIP was stashed (`stash@{0}`) and rebuilt from clean `b5df2e6`;
  Vite `base:'./'` + no `public/` → assets must be **import-bundled**; canvas needs `document.fonts`
  awaited before first text render; overlay scenes need `scene.bringToTop()` (scene-list order bug).

### Sprint B — Onboarding & Game Feel ("Effortless First 30s")
- **Objective:** fix the first-time experience; add win/death juice.
- **Delivered:** Level 1 retuned within one attractor reach; attractor spawn "sonar-ping" + brighter
  reach ring; one-time animated coach-mark (`seenTutorial`); win juice (absorb flash + haptic pattern);
  death feedback (red flash + puff + fail tone). 
- **Key commits:** `014a879`, `6531d3f`, `960f120`, `6d14031`, `1e5ab7e`, `bb12a95`.
- **Lessons:** the inverse-square pull is very weak at distance — root cause of "finicky" control;
  **death was unreachable** in the walled arena (motivated hazards later).

### Sprint C — Depth, Variety & Replay
- **Objective:** add gameplay depth + replay.
- **Delivered:** **Gravity Zones** (World 2 Currents), **Moving Platforms** (World 3 Clockwork),
  **collectible gems**, **3-star scoring** + `ProgressStore`, **grouped world-select** (star badges +
  locks) + menu **Continue**; expanded to 16 levels / 3 worlds. Pure `scoring.ts` is TDD'd.
- **Key commits:** `a43c6ae`, `f9d2a00`, `aaab696`, `9bb5f99`, `1d40d6f`, `0921613`, `1239580`.
- **Lessons:** mechanics drop in cleanly via the `LevelConfig` rule; adding levels reflows the
  world-select grid (watch layout); Playwright canvas-button taps are flaky during Vite HMR reloads.

### Sprint D — Tension & Clarity (latest)
- **Objective:** address playtest feedback (small buttons, weak pull, unfinished HUD, no stakes).
- **Delivered:** full-surface hit areas + press feedback (`THEME.HIT_PADDING`); **gravity tuning**
  (strength 1.5→2.6, min-dist 55→75); **HUD toolbar** redesign + gear icon; **Hazards** (fail-on-touch,
  static+moving); **timed levels** (hard countdown fail); **World 4 Peril** (6 levels) → 22 levels /
  4 worlds.
- **Key commits:** `3a0f936`, `3d387ac`, `dc0c0d1`, `dc0461a`, `8e8ba7c`, `59c03f1`, `206ab35`.
- **Lessons:** button "smallness" was glow-overhang + `pointerupoutside` drift, not hit-rect size;
  hazards finally make `triggerDeath` reachable; the world-select needed compacting for a 4th world.

---

## Current Gameplay Systems

- **Attractor physics** (`GameScene.applyAttractorForce`, `entities/Attractor.ts`): inverse-square,
  `force = dir * ATTRACTOR_STRENGTH / dist²`, clamped to `[MIN_DIST, ∞)`, zeroed past `MAX_DIST`.
  Current tuning: **STRENGTH 2.6, MIN_DIST 75, MAX_DIST 310**. Spawn shows a "sonar ping" to the reach.
- **Gravity zones** (`entities/GravityZone.ts`, `LevelConfig.gravityZones`): rect force fields (dir +
  strength); constant force while the ball is inside (reuses `applyForce`). Tinted by direction
  (cyan up / gold down / violet side) with drifting chevrons.
- **Moving platforms** (`entities/MovingPlatform.ts`, `LevelConfig.movingPlatforms`): static barrier
  slid via `RawMatter.Body.setPosition` along a yoyo tween; a faint track telegraphs the path.
- **Hazards** (`entities/Hazard.ts`, `LevelConfig.hazards`): deadly red spiked node / striped bar,
  optionally moving (`to`/`durationMs` → `startMoving`). Overlap with the ball → `triggerDeath`.
- **Collectibles** (`entities/Collectible.ts`, `LevelConfig.collectible`): optional gold gem; overlap →
  collected + chime; grants the 2nd star.
- **Stars / scoring** (`utils/scoring.ts` TDD): ★ complete · ★ gem · ★ under `parTimeMs`. Computed in
  `triggerWin`, persisted via `ProgressStore`.
- **Progression** (`utils/ProgressStore.ts`): per-level `{stars, bestTimeMs, gem}` in localStorage;
  `isUnlocked` (sequential), `nextLevel` (menu Continue), `totalStars`.
- **Worlds** (`config/worlds.ts`): chapter metadata (name/theme/range) over the flat `LEVELS[]`.
- **Menus / onboarding:** `MainMenuScene` (PLAY/CONTINUE + LEVELS + settings gear, staggered entrance,
  ambient pad), `LevelSelectScene` (world-grouped, star badges, locks), one-time L1 `CoachMark`,
  per-level `hint`.
- **Settings** (`SettingsScene` overlay + `utils/SettingsStore.ts`): Sound / Music / Haptics /
  Reduce-Motion, persisted; wired into `AudioSynth` (Sound-gated SFX + Music ambient pad), haptics gate,
  and `reducedMotionActive()`.
- **Fail states:** **hazard contact** and **timeout** both → `triggerDeath` (red flash + ball puff +
  `playFail()` + sharp haptic → restart current level). Out-of-bounds death still exists but is rare.
- **Timers** (`LevelConfig.timeLimitMs`): top-center glass countdown chip; red + pulsing under
  `TIMER_WARN_MS` (3s); 0 → timeout fail. The par-time efficiency star is separate/universal.

---

## Current Content

- **4 worlds, 22 levels** (`LEVELS[]` ordered by world so chapter ranges are contiguous):
  - **World 1 — Foundations** (L1-6): attractor + static walls. L1 isolates "hold → pull".
  - **World 2 — Currents** (L7-11): gravity zones (updraft / crosswind / downdraft).
  - **World 3 — Clockwork** (L12-16): moving platforms (closing gap / sweeping bar / alternating gates).
  - **World 4 — Peril** (L17-22): hazards + timed levels + moving saws + master capstone.
- **Progression structure:** sequential unlock (a level opens when the previous is ≥1★); world tally
  shown in the level-select. Every level has a `parTimeMs` and most have a `collectible`.
- **Difficulty curve:** each world follows **teach → develop → twist → combine → master**; 1★ is always
  meant to be reachable, with gems + par + (Peril) hazards/time as the opt-in skill layer.

---

## Design Decisions (do not forget)

- **Branding:** company **True Story Labs** (text-only premium splash; old photo-card logo retired);
  game **GRAVITY FLOW**. Use these names everywhere (splash, menu, end, docs).
- **Art direction:** premium **cosmic / gravity** identity — deep indigo space, nebula + parallax stars,
  glassmorphic "cinema-dark" panels, accent glows.
- **Typography:** **Orbitron** (display/wordmarks) + **Exo 2** (body/UI), **self-hosted woff2**
  (`npm run fonts:fetch`). Never Arial.
- **UX choices:** 44px+ touch targets with hit areas extended past the visible edge; immediate press
  feedback; safe-area insets; `prefers-reduced-motion` honored + user toggle; one cohesive in-game glass
  toolbar (not loose buttons); skip-on-touch splashes.
- **Progression philosophy:** sequential unlock, 3-star mastery layer, replay via gems + best-time + par.
- **Challenge philosophy:** **fair, not frustrating** — teach each mechanic in isolation before
  combining; 1★ always achievable; stars/hazards/timers are the opt-in skill ceiling.
- **Architecture rule:** one entity + one optional `LevelConfig` field per mechanic; **no managers**;
  constants in config; the attractor *formula* stays inverse-square (only its constants are tuned).
- **Force model:** never rewrite the inverse-square law; tune `STRENGTH`/`MIN_DIST`/`MAX_DIST` only.

---

## Open Issues

- **Level balance needs a device playtest (highest).** Worlds 2-4 geometry/par/`timeLimitMs`/gem
  placement are reasonable but unverified for solvability/fairness with real finger input. Likely
  suspects: Peril hazards being unavoidable, timed levels too tight, downdraft/crosswind strengths.
- **Gravity values are device-tunable.** STRENGTH 2.6 / MIN_DIST 75 were tuned in-browser; confirm feel
  on a phone.
- **Out-of-bounds death is rare** (walled arena) — hazards/timeouts are now the real fail paths.
- **No GitHub remote** — all work is local-only (see Resume Instructions).
- **Audio "Music"** is a subtle ambient pad only; no real soundtrack yet.

---

## Next Recommended Sprint

**Sprint E — Balance & Validation (then World 5).**
1. **Human device playtest of Worlds 2-4** → tune `parTimeMs`, `timeLimitMs`, hazard placement, zone
   strengths, and gem routes from real feedback. *(This is the single most valuable next step — content
   exists but its balance is unverified.)*
2. Then begin the next mechanic per the roadmap: **One-way Gates** or **Magnets (World 5 — Wells)** —
   Magnets are the cheapest/highest-synergy (reuse the attractor force model as a static source).

**Why next:** the game is feature-rich but its newest content is unvalidated; balancing before adding
more avoids compounding unfair levels. **Deliverables:** tuned level configs (+ any difficulty fixes),
a short playtest notes doc, and a green full-flow run.

---

## Future Roadmap

Ranked in `docs/superpowers/plans/2026-06-01-mechanics-roadmap.md`. Highlights:
- **Magnets** (World 5 — Wells): static attract/repulse points. Cheap, high synergy. *Next mechanic.*
- **Portals** (World 6 — Rifts): paired teleport + velocity redirect.
- **One-way gates**, **rotating obstacles** (physics-risky), bounce pads (skip).
- **Advanced progression:** stars-gated world unlocks, best-time leaderboards, daily/challenge variants.
- **Audio:** a real ambient soundtrack beyond the pad.
- **Deployment / mobile release:** Capacitor/Cordova wrap or PWA; app-store assets; real-device QA
  (touch, haptics, audio-unlock, safe-area, 60fps).

---

## Resume Instructions

1. **Read this file first.** It is the single source of truth.
2. Skim `docs/session-handoff.md` for the 30-second version.
3. Continue from **[Next Recommended Sprint](#next-recommended-sprint)** (currently: device playtest +
   balance tuning of Worlds 2-4).
4. Working conventions: plan first (`writing-plans` → `docs/superpowers/plans/`), one entity + one
   `LevelConfig` field per mechanic, all constants in config, verify in-browser before "done"
   (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`), keep `tsc`/tests/build green.
5. **Git:** local-only (no remote). `git status` should be clean; commit per milestone. To enable
   GitHub: create an empty repo, then `git remote add origin <url>` and `git push -u origin master`.
