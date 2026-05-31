# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Vision

Project Gravity is a mobile-first physics puzzle game. The player never directly controls the ball — instead, pressing and holding the screen creates a gravity attraction point that pulls the ball toward it. Drag to move the attractor, release to remove it. The core experience: hold to pull, guide the ball through physics.

The game targets iOS, Android, and web (web is the primary development and testing target). The MVP proves the mechanic is fun across 3 tutorial levels.

---

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm test          # Run Vitest unit tests (one-shot, not watch mode)
npm run build     # TypeScript check + Vite production build
npx tsc --noEmit  # Type-check only, no output
```

Run a single test file:
```bash
npx vitest run src/utils/MathUtils.test.ts
```

---

## MVP Goals

3 levels. Mechanic validated. Levels are intentionally simple — each teaches exactly one thing.

- Level 1: learn that holding pulls the ball
- Level 2: learn that you must control direction (obstacle present)
- Level 3: learn that trajectory must be planned (two obstacles, zigzag path)

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

**Death.** Ball position > 60px outside play area bounds → `scene.restart({ level: currentLevel })`. Death always restarts the current level, never Level 1.

**Level progression.** `scene.restart({ level: n })` for same-scene restart. `scene.start('EndScene')` after Level 3.

---

## Architecture Overview

**Tech stack:** Phaser 3.90 · TypeScript (strict) · Matter.js (bundled in Phaser) · Vite 5 · Vitest

**Scene flow:**
```
BootScene → CompanySplashScene → IntroSplashScene → MainMenuScene → GameScene (levels 1–6) → EndScene
                                                          ↘ LevelSelectScene → GameScene { level n }
```
Startup presentation: CompanySplash (True Story logo, ~2s) → IntroSplash (cosmic sphere→vortex→Gravity
Flow logo reveal, ~3.5s) → MainMenu (PLAY / LEVELS). Both splashes skip on first touch, honor
prefers-reduced-motion, and respect safe-area insets. GameScene is reused for all levels via
`scene.restart({ level: n })`. Never destroyed/recreated.

**Level system:** `LevelConfig` objects in `src/config/levels/`. `GameScene.create()` reads `this.scene.settings.data.level`, indexes into `LEVELS[]`, and calls `createFromConfig()`. No loader class — inline 3-line lookup.

**Coordinate system:** Level configs use play-area coordinates (0,0 = top-left of 360×780 play area). `GameScene` adds `playX` / `playY` offsets at spawn time. Level files never reference canvas dimensions.

**Win animation:** On goal entry, ball graphics tween: scale up × 2.5, alpha → 0, over 350ms. Then overlay appears. Then scene advances at 1550ms from win trigger.

**Matter.js raw API access:** Phaser bundles Matter.js but doesn't expose it in TypeScript types. Use `RawMatter` from `src/utils/matter.ts`:
```typescript
import { RawMatter } from '../utils/matter';
RawMatter.Body.applyForce(body, position, force);
RawMatter.Body.setVelocity(body, velocity);
```

**Visuals:** All visuals are Phaser `Graphics` generated at runtime. No image files. Swap for real art post-MVP without touching entity logic.

---

## Folder Structure

```
assets/
  images/                       ← Optimized logo PNGs (committed). Originals in assets/raw (gitignored).
scripts/
  optimize-logos.mjs            ← `npm run optimize:assets` — sharp downscale+quantize raw → images.
src/
  config/
    physics.config.ts           ← ALL gameplay constants + colors. Tune here first.
    splash.config.ts            ← ALL splash/menu constants (timings, polish tokens). Reuses PHYSICS colors.
    assets.ts                   ← IMAGES map — import-bundled logo URLs (Vite hashes them).
    levels/
      index.ts                  ← LEVELS[] — single source of truth (order + count)
      level1.ts … level6.ts     ← 6 handcrafted levels (play-area coords)
  entities/
    Ball.ts                     ← Physics circle + Graphics. update() syncs position.
    Attractor.ts                ← Ring visual. moveTo(x,y) redraws. No lifetime.
    Goal.ts                     ← Visual ring + x,y,radius data. No physics body.
    Obstacle.ts                 ← Static Matter.js rect + Graphics visual.
    CosmicBackground.ts         ← Shared stars + nebula backdrop (intro, menu, level select, end).
  ui/
    Button.ts                   ← Reusable rounded-rect button: pointer states + idle breathing.
  scenes/
    BootScene.ts                ← Preloads logos + glow texture, starts CompanySplashScene.
    CompanySplashScene.ts       ← Stage 1: True Story logo, fade/scale/glow, ~2s.
    IntroSplashScene.ts         ← Stage 2: sphere→vortex→Gravity Flow logo reveal + audio, ~3.5s.
    MainMenuScene.ts            ← PLAY / LEVELS, logo title + tagline, idle bob.
    LevelSelectScene.ts         ← Grid from LEVELS.length → GameScene { level n }.
    GameScene.ts                ← Level load, input, force, win, death, restart.
    EndScene.ts                 ← GRAVITY FLOW + Play Again / Main Menu.
  utils/
    matter.ts                   ← Typed bridge to Phaser's bundled Matter.js.
    MathUtils.ts                ← normalize(), clamp(), distance(). TDD-tested.
    MathUtils.test.ts
    AudioSynth.ts               ← Web Audio synth: hum, chimes, splash whoosh/thoom/reveal cues.
    transitions.ts              ← fadeIn / fadeToScene camera helpers.
    a11y.ts                     ← prefersReducedMotion(), safe-area insets.
  types/
    index.ts                    ← Vec2, ObstacleConfig, LevelConfig.
  vite-env.d.ts                 ← Vite client types (enables *.png imports).
  main.ts                       ← Phaser.Game bootstrap. Scene list: Boot, CompanySplash,
                                  IntroSplash, MainMenu, LevelSelect, Game, End.
```

---

## Coding Standards

- **All constants in `physics.config.ts`.** Never type a number directly in entity or scene code.
- **TypeScript strict mode.** `noUnusedLocals`, `noUnusedParameters` enabled. `tsc --noEmit` must pass before any commit.
- **No premature abstraction.** Level routing is inline in `GameScene.create()`. HUD label is inline in `showLevelLabel()`. Extract only when a second caller demands it.
- **Entity pattern:** Each entity owns its own `Phaser.GameObjects.Graphics`. `destroy()` cleans up graphics. Matter bodies are cleaned up by `scene.restart()` automatically.
- **`LevelConfig` is the expansion point.** Future mechanics (portals, magnets, wind zones) are optional fields on this interface. Existing levels remain valid (all fields optional except ball + goal).

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
