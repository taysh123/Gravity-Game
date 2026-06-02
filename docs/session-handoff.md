# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **27 levels / 5 worlds** (Foundations · Currents · Clockwork · Peril · Wells).
- **Systems live:** attractor pull, gravity zones, **magnets (attract/repel wells)**, moving platforms,
  hazards (fail-on-touch), collectible gems, 3-star scoring + `ProgressStore` unlock, timed levels
  (countdown fail), full splash→menu→game→settings flow, premium glass UI (Orbitron/Exo 2).
- **Quality:** `tsc` clean · 16 tests pass · build clean · full flow no console errors.
- **Git/GitHub:** branch `master`, **synced** with `origin` = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Sprint E — Validate, then Expand.** Shipped **Magnets** (attract/repel force wells) + **World 5 —
Wells** (levels 23-27) and the **Daily Challenge** (seeded per-day level + streak, menu button/badge,
DAILY COMPLETE overlay). Level-select compacted for a 5th world; dev-only Playwright hooks. Verified:
isolated attract/repel force, World 5 reflow, full daily flow (play→win→streak→persist→reset), 28 tests,
no console errors. *(Prior sprint: Tension & Clarity — hazards, timed levels, World 4 Peril.)*

## Next sprint
1. **Milestone 0 still open — human device playtest of Worlds 2-5** to tune par/time-limits/hazard
   placement/zone+magnet strengths. Balance is unverified with real finger input. *(Highest priority.)*
2. **Portals (World 6 — Rifts):** paired teleport + velocity redirect — the next mechanic.
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
