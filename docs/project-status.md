# Gravity Flow — Project Status (Single Source of Truth)

> **Resume in one line:** Read this file first, then continue from **[Next Recommended Sprint](#next-recommended-sprint)**.
> Quick version: `docs/session-handoff.md`.
> **Repository:** https://github.com/taysh123/Gravity-Game.git · branch `master` (synced).

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
- Mechanics: **gravity zones** (force fields), **magnets** (static attract/repel wells), **portals**
  (linked teleport pairs, carry velocity), **moving platforms** (timing barriers), **hazards**
  (fail-on-touch, static + moving saws), **collectible gems**, **timed levels** (hard countdown).
- Scoring: **3 stars** per level (complete / gem / under-par), persisted in `ProgressStore`
  (localStorage), shown on the win overlay + world-select; **sequential unlock**; menu **Continue**.
- Retention: **Daily Challenge** — a date-seeded level + consecutive-day streak (DAILY menu button,
  gold badge, `DAILY COMPLETE` overlay), persisted in `DailyStore`.
- UI/UX: glassmorphic design system, Orbitron+Exo 2 fonts, in-game glass toolbar (Home/Settings/Restart),
  settings overlay (Sound/Music/Haptics/Reduce-Motion), one-time Level-1 coach-mark, win/death feedback,
  full-surface button hit areas + press feedback, safe-area handling.
- Quality gates green: `npx tsc --noEmit` clean · `npm test` 44 tests pass (MathUtils 10 + scoring 6 +
  daily 12 + portal 5 + gate 5 + achievements 6) · `npm run build` clean · full flow **no console errors**.

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

### Sprint E — Validate, then Expand (latest, in progress)
- **Objective:** shift from polish to a shippable product — add the next mechanic + a retention hook,
  validating balance first. Confirmed scope: tight (Magnets + Daily Challenge), balance pass first,
  ship-target (PWA vs Capacitor) deferred as the monetization/release gate.
- **Delivered (M1):** **Magnets** (`entities/Magnet.ts` + `LevelConfig.magnets` + `applyMagnetForces`,
  reusing the inverse-square model with signed attract/repel strength); **World 5 — Wells** (levels
  23-27); level-select compacted for a 5th world (cells stay ≥44px); dev-only `__game`/`__Phaser`
  Playwright hooks (stripped from prod).
- **Delivered (M2):** **Daily Challenge** — pure `utils/daily.ts` (date-seeded level pick + streak math,
  12 TDD tests) + `DailyStore.ts` (localStorage streak/bestStreak); a **DAILY** menu button with a gold
  attention badge + streak caption; `GameScene` `daily` flag → records streak on win, shows the
  `DAILY COMPLETE` overlay + streak, returns to the menu, persists, and survives restart.
- **Verified:** isolated attract pull + repel push (Playwright, no player input), World 5 reflow + magnet
  visuals; full daily flow (play→win→streak→persist→missed-day reset→keep-alive); `tsc`/**28 tests**/build
  green; no console errors.
- **Open in this sprint:** **M0 balance pass** — awaits human device playtest of W2-5.

### Sprint D — Tension & Clarity
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
- **Magnets** (`entities/Magnet.ts`, `LevelConfig.magnets`): static force wells — `applyMagnetForces()`
  reuses the inverse-square attractor model with **signed strength** (+ attract / − repel), clamped to
  `[MAGNET_MIN_DIST, MAGNET_MAX_DIST]`. Cyan `+` well pulls; violet-magenta `−` well pushes; faint
  influence ring telegraphs reach.
- **Moving platforms** (`entities/MovingPlatform.ts`, `LevelConfig.movingPlatforms`): static barrier
  slid via `RawMatter.Body.setPosition` along a yoyo tween; a faint track telegraphs the path.
- **Hazards** (`entities/Hazard.ts`, `LevelConfig.hazards`): deadly red spiked node / striped bar.
  Four motions: static · linear sweep (`to`/`durationMs`) · **rotating arm** (`pivot` + `durationMs`,
  orbits a point — drawn with a spoke) · **pulsing laser beam** (`pulseMs`/`phaseMs` — a rect deadly only
  during its firing window, telegraphed dim-rail→charging→fire; `overlaps` gates on state). Overlap → fail.
  Pure motion math (on/off, orbit point) in `utils/hazardMotion` (TDD). *(Phase 3 added rotating + laser.)*
- **Mastery feedback** (P3): a live **par chip** (untimed levels — elapsed time, gold while under
  `parTimeMs`) and a faint **PB ghost trail** — `GameScene` records the ball path, saves a downsampled
  best run to `utils/GhostStore` (localStorage; `utils/ghost.downsamplePath` TDD'd), repainted on entry.
  Honors reduced-motion. Fuels the 3★ / "one more try" loop.
- **Collectibles** (`entities/Collectible.ts`, `LevelConfig.collectible`): optional gold gem; overlap →
  collected + chime; grants the 2nd star. *(Phase 3 moved many gems onto risky/skill lines — risk/reward.)*
- **Stars / scoring** (`utils/scoring.ts` TDD): ★ complete · ★ gem · ★ under `parTimeMs`. Computed in
  `triggerWin`, persisted via `ProgressStore`.
- **Progression** (`utils/ProgressStore.ts`): per-level `{stars, bestTimeMs, gem}` in localStorage;
  `isUnlocked` (sequential), `nextLevel` (menu Continue), `totalStars`.
- **Worlds** (`config/worlds.ts`): chapter metadata (name/theme/range) over the flat `LEVELS[]`.
- **Daily Challenge** (`utils/daily.ts` pure + `utils/DailyStore.ts` localStorage): a date-seeded level
  per day + a consecutive-day streak. Surfaced as a **DAILY** menu button (gold badge until done) and a
  `DAILY COMPLETE` overlay; a `daily` flag on `GameScene` routes the win to record the streak + return
  to the menu. Reuses existing levels — no new content to author.
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

- **8 worlds, 56 levels (8×7)** — `LEVELS[]` ordered by world so chapter ranges are contiguous. The whole
  campaign was trimmed to its strongest levels (Phase 1 = W1-3, Phase 2 = W4-8) with toys-before-tests,
  cut filler combine-stacks, and a fully rotated set of distinct boss archetypes:
  - **World 1 — Foundations** (1-7): attractor + static walls; toy First-Pull/Comet/Constellation; BOSS THE COLLAPSE (descent set-piece).
  - **World 2 — Currents** (8-14): gravity zones; toy Updraft-surf/Drifthome; signature THE EYE; BOSS THE MAELSTROM (chase).
  - **World 3 — Clockwork** (15-21): moving platforms; toy Gearslip/Orrery; signature THE GEARWORKS; BOSS THE MACHINE (mechanic-turned).
  - **World 4 — Peril** (22-28): hazards + timed; toy Sparkweave; signature THE FORGE; BOSS THE INFERNO (endurance, no clock).
  - **World 5 — Wells** (29-35): magnets; toy Swingby; signature THE BINARY STAR; BOSS THE SINGULARITY (orbit).
  - **World 6 — Rifts** (36-42): **portals**; toy Blink; signature HALL OF MIRRORS; BOSS THE BREACH (puzzle-boss, no clock).
  - **World 7 — Gates** (43-49): **one-way gates**; toy One-Way Door; signature THE LOCKWORKS; BOSS THE VAULT (lock-and-key, no clock).
  - **World 8 — Convergence** (50-56): all-mechanic synthesis/improvisation; signature THE CONFLUENCE; BOSS/FINALE HOMECOMING (the only timed boss).
  - *Retired levels stay on disk (un-imported) as future "Expert" packs. Balance awaits a device playtest for fairness.*
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
- **Audio "Music"** is a subtle ambient pad only; no real soundtrack yet.

---

## Next Recommended Sprint

**v0.7.0 shipped: Excitement Sprint — per-world visual identity (8 palettes + title cards), per-world
in-game music + boss audio, star-by-star win + PERFECT, boss STAR FREED payoff + red arena + camera
punches, signature/boss title cards, and the hook "Bring the lost star home." Turned the prototype toward
a memorable game (no new mechanics). NEXT: device-playtest the excitement build, then Sprint 2 (Capacitor
→ Play, AdMob, IAP, analytics → RC). Excitement audit + roadmap in `~/.claude/plans/`. (Prior: v0.6.x
Gameplay Overhaul; v0.5.0 Retention
Engine; v0.4.1 pacing fix.)**
1. **Device playtest of the harder curve + Portals (open, highest priority):** the rebalanced goals/par
   and the new combination/Rifts levels need real finger input to confirm fair-but-real difficulty
   (1★ always achievable). Tune `parTimeMs`/`timeLimitMs`/geometry from notes.
2. **World 7 — One-way Gates** (the last new mechanic), then **combination/mastery Worlds 8–10** to reach
   ~100, and backfill W1–6 to 10 each. Rubric + full roadmap:
   `docs/superpowers/plans/2026-06-03-content-roadmap-100.md`.

**Gate for monetization + release phases:** choose **PWA** vs **Capacitor native wrap** (decides whether
AdMob rewarded ads + store IAP are possible). Deferred until those phases; recorded here.

**Why this order:** balance before more content avoids compounding unfair levels; retention is high
value-per-cost; Portals add the next decision axis. **Deliverables:** tuned configs, Daily Challenge,
green full-flow runs.

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
   balance tuning of Worlds 2-5, then the Daily Challenge).
4. Working conventions: plan first (`writing-plans` → `docs/superpowers/plans/`), one entity + one
   `LevelConfig` field per mechanic, all constants in config, verify in-browser before "done"
   (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`), keep `tsc`/tests/build green.
5. **Git/GitHub:** remote `origin` = https://github.com/taysh123/Gravity-Game.git, branch `master`
   (tracking set up). `git status` should be clean; commit per milestone and `git push` to keep GitHub
   in sync. (If a push needs auth, run `git push` yourself so the credential prompt works.)
