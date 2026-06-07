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
**Gates, Progression & Magnet Fix (v0.4.0).** Fixed the magnet "inescapable trap" (clamp 70→95, reach
230→190 — escape now a skill, mid-range unchanged); added **One-Way Gates** + **World 7 Gates** (49–56);
added a **stats + achievements** system (14 achievements, trophy menu view, win-overlay toast); added
**World 8 — Convergence** (57–64, all-mechanic mastery levels). 48 → **64 levels / 8 worlds**. Verified:
44 tests, tsc/build green, magnet escapability + gate pass/block (no tunnel) + achievement unlock all
confirmed in-browser, all 64 load with no console errors.

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
