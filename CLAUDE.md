# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 📍 **Single source of truth for project state & resuming work:** [`docs/project-status.md`](docs/project-status.md)
> (30-second version: [`docs/session-handoff.md`](docs/session-handoff.md)). This CLAUDE.md covers
> architecture/conventions; the status doc covers current state, sprints, decisions, and what's next.

---

## Project Vision

Project Gravity is a mobile-first physics puzzle game. The player never directly controls the ball — instead, pressing and holding the screen creates a gravity attraction point that pulls the ball toward it. Drag to move the attractor, release to remove it. The core experience: hold to pull, guide the ball through physics.

The game targets iOS, Android, and web (web is the primary development and testing target). The MVP proves the mechanic is fun across 3 tutorial levels.

---

## Commands

```bash
npm run dev             # Start Vite dev server at http://localhost:5173
npm test                # Run Vitest unit tests (one-shot, not watch mode)
npm run build           # TypeScript check + Vite production build
npx tsc --noEmit        # Type-check only, no output
npm run fonts:fetch     # Download self-hosted Orbitron + Exo 2 woff2 into assets/fonts
npm run optimize:assets # Downscale/quantize raw logos → assets/images (sharp)
```

Run a single test file:
```bash
npx vitest run src/utils/MathUtils.test.ts
```

---

## Goals (current)

MVP mechanic validated and expanded into a **skill puzzle game**: **22 levels across 4 worlds**, each
world introducing one mechanic (teach → develop → twist → combine → master), with a 3-star skill layer.

- **World 1 — Foundations** (L1-6): attractor control + static walls. L1 isolates "hold → pull".
- **World 2 — Currents** (L7-11): **Gravity Zones** — updrafts, crosswinds, downdrafts (force routing).
- **World 3 — Clockwork** (L12-16): **Moving Platforms** — closing gaps, sweeping bars (timing).
- **World 4 — Peril** (L17-22): **Hazards** (touch = fail) + **timed levels** (hard countdown) — real stakes.

**3-star scoring** (per level): ★ complete · ★ optional **gem** (off-route) · ★ **efficiency** (≤ `parTimeMs`).
Persisted in `ProgressStore` (localStorage); shown on the win overlay + world-select; drives sequential
unlock. Pure scoring in `utils/scoring.ts` (TDD). Remaining mechanics ranked in
`docs/superpowers/plans/2026-06-01-mechanics-roadmap.md`.

**Gravity feel:** `ATTRACTOR_STRENGTH 2.6`, `MIN_DIST 75`, `MAX_DIST 310` — inverse-square model, tuned
for stronger medium-range pull without a close-range snap.

---

## Core Gameplay Principles

**No world gravity.** `matter.gravity = { x: 0, y: 0 }`. All forces are player-created.

**Attractor control:** Press to create. Drag to move. Release to remove. No lifetime limit.

**Attractor force model** (applied every frame in `GameScene.applyAttractorForce`):
```
dist = max(distance(ball, attractor), ATTRACTOR_MIN_DIST)
dir  = normalize(attractor.pos - ball.pos)
force = dir * ATTRACTOR_STRENGTH / (dist²)
Matter.Body.applyForce(ball.body, ball.position, force)
```
Inverse-square law — physically natural, stronger close, weaker far.

**Win condition.** `distance(ball, goal) < goal.radius` → `triggerWin()`. Distance check every frame, same pattern as `checkDeath`.

**Death / fail.** `triggerDeath` (red flash + ball puff + `playFail()` + sharp haptic → restart current level) now fires from real fail states: **hazard contact** (`checkHazards` — touching a `Hazard` fails the run) and **timeout** (`updateCountdown` — a level's `timeLimitMs` countdown reaching 0). Out-of-bounds death still exists but is rare (walled arena). Death always restarts the current level, never Level 1.

**Hazards** (`entities/Hazard.ts`, `LevelConfig.hazards`): deadly circle/rect objects (optionally moving via `to`/`durationMs`). Overlap → `triggerDeath`. The first real route-tension mechanic (World 4).

**Timed levels** (`LevelConfig.timeLimitMs`): a top-center glass countdown chip; red + pulsing under `TIMER_WARN_MS`; reaching 0 → timeout fail. The par-time efficiency star is separate and universal.

**Win feel.** `triggerWin` → goal absorb flash (`winFlash`) + particle burst + screen shake + ball scale-out, then the glass `LEVEL COMPLETE` overlay (scale-pop), `playLevelComplete` chord, and `HAPTIC_WIN_PATTERN`. All juice is elegant/subtle and within the <50-particle ceiling.

**Onboarding (Level 1).** Level 1 is retuned so ball→goal sits within one attractor reach — the first press near the ball pulls it home (teaches "hold → pull" with zero friction). Reinforced by: a one-time animated `CoachMark` (ghost dot ball→goal, persisted via `SettingsStore.seenTutorial`, dismissed on first touch, reduced-motion = static arrow), the action-accurate per-level `hint`, and the attractor **spawn "sonar ping"** (`Attractor`) that visualizes the reach on every press. Levels 2-6 keep the longer, drag-to-steer challenge.

**Level progression.** `scene.restart({ level: n })` for same-scene restart. `scene.start('EndScene')` after the last level (`LEVELS.length`).

---

## Architecture Overview

**Tech stack:** Phaser 3.90 · TypeScript (strict) · Matter.js (bundled in Phaser) · Vite 5 · Vitest

**Scene flow:**
```
BootScene → CompanySplashScene → IntroSplashScene → MainMenuScene → GameScene (levels 1–6) → EndScene
                                                          ↘ LevelSelectScene → GameScene { level n }
```
Startup presentation: CompanySplash (**True Story Labs** text wordmark, ~2s) → IntroSplash (cosmic
sphere→vortex→Gravity Flow logo reveal, ~3.5s) → MainMenu (PLAY / LEVELS + settings gear). Both
splashes skip on first touch, honor reduced-motion, and respect safe-area insets. `SettingsScene` is
an **overlay** launched on top of a paused game/menu (`scene.launch` + `scene.pause`/`resume`), not in
the linear flow. GameScene is reused for all levels via `scene.restart({ level: n })`. Never destroyed.

**Brand + design system:** Company = **True Story Labs**; game = **GRAVITY FLOW**. Typography is
self-hosted **Orbitron** (display/wordmarks) + **Exo 2** (body/UI) — `src/styles/fonts.css`, fetched by
`npm run fonts:fetch`. Cross-cutting look tokens (fonts, Expo easing, radius-16, glass surfaces, text
colors) live in `src/config/theme.config.ts`; user prefs (sound/music/haptics/reduce-motion) in
`src/utils/SettingsStore.ts` (localStorage).

**Level system:** `LevelConfig` objects in `src/config/levels/`. `GameScene.create()` reads `this.scene.settings.data.level`, indexes into `LEVELS[]`, and calls `createFromConfig()`. No loader class — inline 3-line lookup.

**Coordinate system:** Level configs use play-area coordinates (0,0 = top-left of 360×780 play area). `GameScene` adds `playX` / `playY` offsets at spawn time. Level files never reference canvas dimensions.

**Win animation:** On goal entry, ball graphics tween: scale up × 2.5, alpha → 0, over 350ms. Then overlay appears. Then scene advances at 1550ms from win trigger.

**Matter.js raw API access:** Phaser bundles Matter.js but doesn't expose it in TypeScript types. Use `RawMatter` from `src/utils/matter.ts`:
```typescript
import { RawMatter } from '../utils/matter';
RawMatter.Body.applyForce(body, position, force);
RawMatter.Body.setVelocity(body, velocity);
```

**Visuals:** Gameplay/UI visuals are Phaser `Graphics`/vector icons generated at runtime. The only
bundled image is the Gravity Flow logo PNG (`assets/images/`, optimized via `npm run optimize:assets`);
fonts are bundled woff2. Glassmorphic panels/buttons use the shared `src/ui/glass.ts` + `theme.config`.

---

## Folder Structure

```
assets/
  images/                       ← Optimized Gravity Flow logo PNG. Originals in assets/raw (gitignored).
  fonts/                        ← Self-hosted Orbitron + Exo 2 woff2 (committed).
scripts/
  optimize-logos.mjs            ← `npm run optimize:assets` — sharp downscale+quantize raw → images.
  fetch-fonts.mjs               ← `npm run fonts:fetch` — download woff2 (latin) into assets/fonts.
src/
  config/
    physics.config.ts           ← ALL gameplay constants + colors. Tune here first.
    theme.config.ts             ← Design system: fonts, Expo easing, radius, glass + text tokens.
    splash.config.ts            ← Splash/menu constants (timings, polish tokens). Reuses PHYSICS colors.
    assets.ts                   ← IMAGES map — import-bundled logo URLs (Vite hashes them).
    worlds.ts                   ← WORLDS chapter metadata (name/theme/level range) over flat LEVELS[].
    levels/                     ← LEVELS[] (index.ts, ordered by world) + level1…level22.ts
  entities/
    Ball.ts · Attractor.ts · Goal.ts · Obstacle.ts   ← gameplay entities (Graphics + Matter bodies)
    GravityZone.ts              ← Directional force field (W2 currents). contains() + force; reuses applyForce.
    MovingPlatform.ts           ← Static barrier slid via setPosition tween (W3 clockwork timing).
    Hazard.ts                   ← Deadly node/bar (optionally moving); overlap → triggerDeath (W4 peril).
    Collectible.ts              ← Optional gem (2nd star); overlap-collected.
    CoachMark.ts                ← One-time L1 gesture demo.
    CosmicBackground.ts         ← Shared stars + nebula backdrop (intensity param dims it for gameplay).
  ui/
    Button.ts                   ← Rounded-rect button: theme radius/easing, accent glow, optional icon.
    IconButton.ts               ← Glass icon button (HUD/nav, settings).
    Toggle.ts                   ← Toggle switch (settings).
    icons.ts                    ← Vector line icons (home, settings, restart, close, sound, …).
    glass.ts                    ← drawGlass() frosted-panel helper (HUD chip, overlays, settings).
  scenes/
    BootScene.ts                ← Preloads logo + glow texture, awaits fonts, starts CompanySplashScene.
    CompanySplashScene.ts       ← Stage 1: True Story Labs text wordmark (Orbitron + gold glow), ~2s.
    IntroSplashScene.ts         ← Stage 2: sphere→vortex→Gravity Flow logo reveal + audio, ~3.5s.
    MainMenuScene.ts            ← PLAY / LEVELS + settings gear, staggered entrance, ambient pad.
    LevelSelectScene.ts         ← World-grouped grid (star badges + sequential unlock) → GameScene { level }.
    SettingsScene.ts            ← Overlay: Sound/Music/Haptics/Reduce-Motion toggles (over paused scene).
    GameScene.ts                ← Level logic + HUD chip + Home/Settings/Restart nav + dim cosmic bg.
    EndScene.ts                 ← GRAVITY FLOW + Play Again / Main Menu.
  styles/
    fonts.css                   ← @font-face for the self-hosted fonts (imported in main.ts).
  utils/
    matter.ts · MathUtils.ts(+test)  ← Matter bridge (applyForce/setVelocity/setPosition); tested math.
    scoring.ts(+test)           ← computeStars() — pure 3-star logic (TDD).
    ProgressStore.ts            ← Per-level stars/best-time/gem + unlock (localStorage).
    AudioSynth.ts               ← Web Audio: SFX (Sound-gated) + ambient pad (Music). sharedAudio() singleton.
    SettingsStore.ts            ← localStorage prefs: sound, music, haptics, reduceMotion.
    transitions.ts              ← fadeIn / fadeToScene camera helpers.
    a11y.ts                     ← prefersReducedMotion(), reducedMotionActive(), safe-area insets.
  types/index.ts · vite-env.d.ts
  main.ts                       ← Phaser.Game bootstrap + fonts.css. Scenes: Boot, CompanySplash,
                                  IntroSplash, MainMenu, LevelSelect, Settings, Game, End.
```

---

## Coding Standards

- **All constants in `physics.config.ts`.** Never type a number directly in entity or scene code.
- **TypeScript strict mode.** `noUnusedLocals`, `noUnusedParameters` enabled. `tsc --noEmit` must pass before any commit.
- **No premature abstraction.** Level routing is inline in `GameScene.create()`. HUD label is inline in `showLevelLabel()`. Extract only when a second caller demands it.
- **Entity pattern:** Each entity owns its own `Phaser.GameObjects.Graphics`. `destroy()` cleans up graphics. Matter bodies are cleaned up by `scene.restart()` automatically.
- **`LevelConfig` is the expansion point.** Mechanics are optional fields on this interface
  (`gravityZones`, `movingPlatforms`, `collectible`, `parTimeMs`; future: portals, magnets…). Each maps
  to **one entity class** spawned in `GameScene.createFromConfig` and updated in `update()`. Existing
  levels stay valid (only ball + goal required). `LEVELS[]` is the flat source of truth, ordered by
  world so `config/worlds.ts` chapter ranges stay contiguous. **No managers.**

---

## Skill Usage Rules

| Situation | Skill to use |
|-----------|-------------|
| Before each sprint | `writing-plans` methodology: produce a plan doc in `docs/superpowers/plans/` |
| Executing a plan | `subagent-driven-development` pattern: one Agent per task, two-stage review |
| Discrete logic (MathUtils, type definitions) | `test-driven-development`: failing test first |
| Physics constants, level feel, visual polish | Playtest in browser — TDD does not apply |
| Any bug | `systematic-debugging` four-phase process: root cause before any fix |
| Before claiming done | `verification-before-completion`: run game, observe, report actual output |
| HUD, touch targets, layout | `ui-ux-pro-max`: 44×44px minimum touch targets, 4.5:1 contrast, mobile-first |
| Browser testing | Python Playwright with `--disable-gpu --use-gl=swiftshader` |
| End of sprint | `finishing-a-development-branch` |

---

## Sprint Workflow

| Sprint | Status | Goal |
|--------|--------|------|
| 1 — Gravity Sandbox | ✅ Complete | Ball + attractor + bounds + death + restart |
| 1.5 — Feel Tuning | ✅ Complete | Hold-to-attract, ATTRACTOR_STRENGTH 0.2, stationary start |
| 2 — Playable Game | ✅ Complete | 3 levels, Goal, win detection, ball absorption, EndScene |
| 3 — Polish | ✅ Complete | Trail, synth audio + hum, goal/attractor pulse, haptics, particle burst, screen shake, onboarding hints, pull line, 3 more levels (6 total), mobile touch hardening |
| 4 — QA + Mobile | Pending | Device testing, performance profiling, code review, deploy |

---

## Future Expansion Principles

**Adding a new mechanic = one new entity class + one new optional field in `LevelConfig`.**

Force-based mechanics (magnets, wind, gravity zones) reuse the same `RawMatter.Body.applyForce` call pattern from `applyAttractorForce()`. Portal teleport uses `RawMatter.Body.setPosition` (add to `matter.ts` bridge when needed). Moving platforms use tween-driven `setPosition` on static bodies.

**Never change the attractor force formula** — the inverse-square law is deliberate.

**Performance ceiling:** < 20 physics bodies, < 50 active particles simultaneously.
