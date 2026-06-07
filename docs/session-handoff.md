# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **70 levels / 8 worlds** (Foundations · Currents · Clockwork · Peril · Wells · Rifts ·
  Gates · Convergence). **Worlds 1–3 are overhauled to 10 levels each**, themed to a distinct mental
  skill (W1 navigation/discovery · W2 prediction/flow · W3 timing/sequencing), each with ≥3 aha puzzles
  + a **signature** (THE GAUNTLET / THE EYE / THE GEARWORKS) + a **boss** (THE COLLAPSE / THE MAELSTROM
  / THE MACHINE). Later worlds (4–8) still 8 each, pending the same pass.
- **Systems live:** attractor pull, gravity zones, **magnets**, **portals**, **one-way gates**, moving
  platforms, hazards, collectible gems, 3-star scoring, timed levels, achievements + stats, scrollable
  world-select; **Retention engine (v0.5.0):** **Stardust** currency, **Daily Challenge 2.0** (curated
  pool + rotating modifier + streak rewards), **cosmetics shop** (ball themes, earn with Stardust),
  leaderboard-ready daily records, **Ads/IAP provider seams** (web stubs); **signature/boss level identity**
  (gold/red HUD titles). Premium glass UI; mobile fixed.
- **Quality:** `tsc` clean · 52 tests pass · build clean · full flow no console errors.
- **Git/GitHub:** branch `master`, **synced** with `origin` = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Gameplay Overhaul — Worlds 1–3 (v0.6.0).** Paused Sprint 2 to fix the core "too samey / not memorable"
risk. Each world now teaches a **distinct mental skill** (not just a new obstacle), optimized for **aha
moments**: W1 navigation/route-finding/discovery, W2 prediction/flow/reading current interactions, W3
timing/sequencing/rhythm. Each world: ≥3 genuine aha puzzles (e.g., enter-from-the-side box, decoy gap,
updraft→crosswind curve, "use the downdraft", stage-between-bars, patience slider) + a **signature**
(THE GAUNTLET / THE EYE / THE GEARWORKS) + a **boss** (THE COLLAPSE / THE MAELSTROM / THE MACHINE) with
gold/red HUD titles (new optional `LevelConfig.title/boss`). W1–3 → 10 each (renumbered; ProgressStore
v4). 66 → **70 levels**. Verified: 52 tests, tsc/build green, all 70 load no console errors, signatures +
bosses render distinct. *(Prior: v0.5.0 Retention Engine.)*

## Next sprint
**Per your call: playtest the first 30 levels (Worlds 1–3) before resuming Sprint 2.** Validate the aha
beat (pause → discover), the per-world mental skills, signatures + bosses, and 1★ fairness. Then:
1. **Sprint 2 — Native + Monetization:** Capacitor (Android) wrap; real AdMob + IAP behind the `Ads`/`IAP`
   seams; analytics + consent/privacy. (Decisions locked: Capacitor → Play first; F2P hybrid, no P2W.)
2. **Sprint 3 — Polish + Wow + Store assets:** soundtrack, per-world visuals, vector icons (replace emoji),
   transitions, app icon/screenshots/trailer, ratings prompt → RC.
3. Later: apply the same per-world overhaul to Worlds 4–8; reach ~100.
Full audit + roadmap: see the App Store Readiness plan (in `~/.claude/plans/`).

## Important notes
- ⚠️ **Level balance for Worlds 2-4 is unverified** — automated tests confirm mechanics work but can't
  reproduce finger input. Playtest on a device before adding more content.
- **GitHub:** `origin` = https://github.com/taysh123/Gravity-Game.git, `master` synced. Commit per
  milestone and `git push` to keep it current (run pushes yourself if auth is needed).
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
