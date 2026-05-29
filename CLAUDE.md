# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Vision

Project Gravity is a mobile-first physics puzzle game. The player never directly controls the ball — instead, tapping the screen creates a temporary gravity attraction point that pulls the ball toward it. The core experience: tap anywhere, feel gravity, guide the ball through physics.

The game targets iOS, Android, and web (web is the primary development and testing target). The MVP answers exactly one question: **Is the gravity manipulation mechanic fun?**

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

The MVP contains exactly 3 levels. Before expanding beyond these, the mechanic must pass a human playtest gate:

> "Can you tap and guide the ball for 5 minutes without wanting to stop?"

If the answer is no, tune `PHYSICS` constants before adding any features. The MVP proves the mechanic is fun — nothing else.

**Current state:** Sprint 1 sandbox complete. One scene, one ball, one attractor mechanic, world bounds, death detection, instant restart. No levels, no UI, no obstacles yet.

---

## Core Gameplay Principles

**No world gravity.** `matter.gravity = { x: 0, y: 0 }`. All forces are player-created.

**Attractor force model** (applied every frame in `GameScene.applyAttractorForce`):
```
dist = max(distance(ball, attractor), ATTRACTOR_MIN_DIST)   // clamp prevents spike
dir  = normalize(attractor.pos - ball.pos)
force = dir * ATTRACTOR_STRENGTH / (dist²)
Matter.Body.applyForce(ball.body, ball.position, force)
```
This is inverse-square — physically natural, stronger close, weaker far.

**One active attractor.** New tap destroys the previous one before creating the new one.

**Attractor lifetime.** Fixed duration (`ATTRACTOR_DURATION_MS`), visualized by a shrinking ring.

**Death.** Ball position > 60px outside play area bounds → `scene.restart()`. In Sprint 1 this is a safety net (walls keep the ball in); in Sprint 3 hazard bodies will trigger death directly.

---

## Architecture Overview

**Tech stack:** Phaser 3.90 · TypeScript (strict) · Matter.js (bundled in Phaser) · Vite 5 · Vitest

**Scene flow (current):**
```
BootScene → GameScene
```
**Planned (Sprint 2+):**
```
BootScene → PreloadScene → GameScene (level 1..3) → EndScene
```

**GameScene is the entire game** for Sprint 1. All physics, input, force calculation, death, and restart live here. The scene is reused across all 3 levels via `scene.restart({ level: n })` — never destroyed and recreated.

**Key design rule:** `physics.config.ts` is the single source of truth for all numeric constants. No magic numbers anywhere else.

**Matter.js raw API access:** Phaser bundles Matter.js but doesn't expose it in TypeScript types. Use `RawMatter` from `src/utils/matter.ts`:
```typescript
import { RawMatter } from '../utils/matter';
RawMatter.Body.applyForce(body, position, force);
RawMatter.Body.setVelocity(body, velocity);
```
Never use `Phaser.Physics.Matter.Matter` directly — TypeScript rejects it.

**Visuals:** All MVP visuals are generated at runtime via `Phaser.GameObjects.Graphics`. No image files. The ball draws itself in `Ball.draw()`, the attractor in `Attractor.draw()`. Swap these for real art in post-MVP without touching entity logic.

**`playX` / `playY` computed getters** in `GameScene` center the 360×780 play area inside the 390×844 canvas. All world bound positions and ball spawn position derive from these. Never hardcode canvas offsets.

---

## Folder Structure

```
src/
  config/
    physics.config.ts     ← ALL numeric constants live here. Tune here first.
  entities/
    Ball.ts               ← Physics body + Graphics. update() syncs position.
    Attractor.ts          ← Ring visual + lifetime. update(delta) shrinks ring.
  scenes/
    BootScene.ts          ← Immediately starts GameScene.
    GameScene.ts          ← Core game loop: bounds, input, force, death, restart.
  utils/
    matter.ts             ← Typed bridge to Phaser's bundled Matter.js.
    MathUtils.ts          ← normalize(), clamp(), distance(). TDD-tested.
    MathUtils.test.ts
  types/
    index.ts              ← Vec2 and shared types.
  main.ts                 ← Phaser.Game bootstrap. Scene list lives here.
```

**Sprint 2 additions (not yet created):**
```
  config/levels/level1.ts, level2.ts, level3.ts
  entities/Obstacle.ts, Goal.ts, Hazard.ts, WorldBounds.ts (extracted from GameScene)
  scenes/PreloadScene.ts, EndScene.ts
  ui/HUD.ts, Button.ts
  systems/AttractorSystem.ts  (extracted from GameScene when Sprint 2 warrants it)
  utils/ScaleUtils.ts
```

---

## Coding Standards

- **All constants in `physics.config.ts`.** If you find yourself typing a number that affects feel, it belongs there.
- **TypeScript strict mode.** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are all enabled. `tsc --noEmit` must pass before any commit.
- **No premature abstraction.** Sprint 1 intentionally inlines `AttractorSystem` and `WorldBounds` into `GameScene`. Extract into separate files only when a second caller or Sprint 2's `LevelLoader` needs them.
- **Entity pattern:** Each entity owns its own `Phaser.GameObjects.Graphics` and destroys it in `destroy()`. `GameScene` owns the Matter body lifecycle.
- **`as const` on PHYSICS.** Constants are readonly. TypeScript will catch accidental mutation.
- **No comments explaining what code does.** The code names explain that. Comments only for non-obvious why (hidden constraint, force model rationale, API workaround).

---

## Skill Usage Rules

| Situation | Skill to use |
|-----------|-------------|
| Before each sprint | Apply `writing-plans` methodology: produce a plan doc in `docs/superpowers/plans/` before writing code |
| Executing a plan | Use `subagent-driven-development` pattern: one Agent per task, two-stage review (spec then quality) |
| Discrete logic (MathUtils, scene transitions, config parsing) | `test-driven-development`: write failing test first, then implement |
| Physics constants, attractor feel, visual polish | Playtest in browser — TDD does not apply here |
| Any bug or unexpected behavior | Apply `systematic-debugging` four-phase process: trace root cause before touching code |
| Before claiming any task done | `verification-before-completion`: run the game, observe behavior, report actual output |
| HUD, touch targets, layout | Consult `ui-ux-pro-max` skill: 44×44px minimum touch targets, 4.5:1 contrast, mobile-first |
| Browser-based testing (goal detection, death, restart) | Use `webapp-testing` (Python Playwright) against the Vite dev server |
| End of sprint | Apply `finishing-a-development-branch`: verify tests → present 4 merge options |

**Skill locations:**
- Superpowers skills: `.ai/superpowers/skills/` (symlink → `C:\AI-SKILLS\superpowers\skills\`)
- UI/UX skills: `.ai/ui-ux-pro-max-skill\.claude\skills\` (symlink → `C:\AI-SKILLS\ui-ux-pro-max-skill\`)
- Generic skills: `.ai/skills/skills/` (symlink → `C:\AI-SKILLS\skills\skills\`)
- Harness skills (invokable via `Skill` tool): `init`, `run`, `verify`, `code-review`, `simplify`, `security-review`

---

## Sprint Workflow

| Sprint | Status | Goal |
|--------|--------|------|
| 1 — Gravity Sandbox | ✅ Complete | Ball + attractor + bounds + death + restart. Mechanic playtest gate. |
| 2 — Level Architecture | Pending | LevelConfig type, LevelLoader, Obstacle/Goal entities, HUD, Level 1 + 2 |
| 3 — Level 3 + Hazards | Pending | Hazard entity, Level 3 (momentum chaining), EndScene |
| 4 — Juice + Polish | Pending | Particles, sounds, screen shake, ball trail, visual polish |
| 5 — QA + Mobile | Pending | Mobile testing, performance profiling, code review, deploy |

**Before Sprint 2 begins:** Confirm the Sprint 1 playtest gate passes. Open `http://localhost:5173` after `npm run dev`. Test: can you deliberately guide the ball to a target location using tap chains? If not, tune `PHYSICS.ATTRACTOR_STRENGTH`, `PHYSICS.ATTRACTOR_DURATION_MS`, and `PHYSICS.BALL_FRICTION_AIR` first.

---

## Future Expansion Principles

The architecture is built for mechanic expansion without scene rewrites:

**Adding a new mechanic = one new entity class + one new optional field in `LevelConfig`.**

The force model in `GameScene.applyAttractorForce` is the template for any future force source. Repel mode: negate the force direction. Wind zones: a `WindSystem` applies constant directional force each frame using the same `RawMatter.Body.applyForce` call. Magnets: permanent attractor with no lifetime. Portals: sensor overlap → teleport `ball.body.position`. None of these require touching `GameScene`'s scene lifecycle.

**Never change the attractor force formula without a documented reason.** The inverse-square law is what makes the mechanic feel physical. Distance-linear or constant-force attractors have been considered and rejected.

**`LevelConfig` is the expansion point.** Sprint 2 introduces this type. Future fields (hazardBodies, movingPlatforms, gravityZones, windZones, portals) are additive — existing level configs remain valid.

**Performance ceiling:** Keep physics body count < 20 and active particles < 50. Profile before adding effects, not after.
