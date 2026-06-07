# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **64 levels / 8 worlds** (Foundations · Currents · Clockwork · Peril · Wells · Rifts ·
  Gates · Convergence).
- **Systems live:** attractor pull, gravity zones, **magnets** (retuned — no more trap), **portals**,
  **one-way gates**, moving platforms, hazards (fail-on-touch), collectible gems, 3-star scoring +
  `ProgressStore`, timed levels, **achievements + stats** (14 achievements, menu trophy view, win toast),
  scrollable world-select, Daily Challenge, full splash→menu→game→settings flow, premium glass UI. Mobile
  viewport/touch fixed.
- **Quality:** `tsc` clean · 44 tests pass · build clean · full flow no console errors.
- **Git/GitHub:** branch `master`, **synced** with `origin` = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**First-Hour Pacing Fix (v0.4.1).** Worlds 1–3 redesign (config-only, no new mechanics): the first
fail-state moved **L25 → L6**, with early hazards as *optional* risk/reward (a spike guards the gem; the
direct route to goal stays clear so **1★ never touches red**) and recurring through L6–24 (6,7,8,12,14,16,
19,22,24); mechanic combinations begin ~L12. Difficulty now rises mainly via decisions/routing/timing/
combos, not death (learn → risk → recover → improve). ProgressStore key → v3 (clean reset). Verified:
pacing assertion (first fail = L6), all 64 load no console errors, first hazard reads clearly with an
open 1★ route. *(Prior: v0.4.0 — One-Way Gates + World 7, achievements, World 8 Convergence, magnet fix.)*

## Next sprint
1. **Device playtest** of Worlds 7–8 + the magnet feel (the real fairness judge) — tune from notes.
2. **Reach ~100:** **World 9 Gauntlet** + **World 10 Singularity** (combination/mastery, no new engine
   code), and backfill Worlds 1–8 toward 10 each. Roadmap: `docs/superpowers/plans/2026-06-03-content-roadmap-100.md`.
3. **Monetization + release** remain gated on the **PWA vs Capacitor** ship-target decision.

## Important notes
- ⚠️ **Level balance for Worlds 2-4 is unverified** — automated tests confirm mechanics work but can't
  reproduce finger input. Playtest on a device before adding more content.
- **GitHub:** `origin` = https://github.com/taysh123/Gravity-Game.git, `master` synced. Commit per
  milestone and `git push` to keep it current (run pushes yourself if auth is needed).
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
