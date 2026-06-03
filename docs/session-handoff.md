# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **48 levels / 6 worlds** (Foundations · Currents · Clockwork · Peril · Wells · Rifts).
- **Systems live:** attractor pull, gravity zones, **magnets**, **portals (teleport pairs)**, moving
  platforms, hazards (fail-on-touch), collectible gems, 3-star scoring + `ProgressStore` unlock, timed
  levels (countdown fail), **scrollable** world-select, Daily Challenge, full splash→menu→game→settings
  flow, premium glass UI (Orbitron/Exo 2). Mobile viewport/touch fixed.
- **Quality:** `tsc` clean · 33 tests pass · build clean · full flow no console errors.
- **Git/GitHub:** branch `master`, **synced** with `origin` = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Depth & Content (v0.3.0).** Rebalanced all 27 for real difficulty (tighter goals/par, off-route gems);
expanded Worlds 1–5 to **8 levels each** (+13 combination levels) and made the world-select **scrollable**;
added the **Portals** mechanic + **World 6 — Rifts** (41–48). 27 → **48 levels / 6 worlds**. Verified:
33 tests, tsc/build green, all 48 load with no console errors, portals teleport without ping-pong. Full
rubric + path-to-100 in `docs/superpowers/plans/2026-06-03-content-roadmap-100.md`.

## Next sprint
1. **Device playtest of the harder curve + Portals** (the real fairness judge) — tune from notes.
2. **World 7 — One-way Gates** (the last new mechanic), then combination/mastery Worlds 8–10 to reach
   ~100; backfill W1–6 to 10 each.
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
