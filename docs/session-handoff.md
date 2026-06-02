# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **22 levels / 4 worlds** (Foundations · Currents · Clockwork · Peril).
- **Systems live:** attractor pull, gravity zones, moving platforms, hazards (fail-on-touch), collectible
  gems, 3-star scoring + `ProgressStore` unlock, timed levels (countdown fail), full splash→menu→game→
  settings flow, premium glass UI (Orbitron/Exo 2).
- **Quality:** `tsc` clean · 16 tests pass · build clean · full flow no console errors.
- **HEAD:** `206ab35` (master). **Git is local-only — no remote configured.**

## Last completed sprint
**Tension & Clarity** — full-surface buttons, stronger gravity, redesigned HUD toolbar, **hazards** +
**timed levels** (real fail states), **World 4 — Peril** (6 levels).

## Next sprint
**Balance & Validation:** a **human device playtest of Worlds 2-4** to tune par/time-limits/hazard
placement/zone strengths (content exists but its balance is unverified), then start **Magnets (World 5)**.

## Important notes
- ⚠️ **Level balance for Worlds 2-4 is unverified** — automated tests confirm mechanics work but can't
  reproduce finger input. Playtest on a device before adding more content.
- ⚠️ **No GitHub remote.** 51 commits are local-only. To sync: create a repo →
  `git remote add origin <url>` → `git push -u origin master`.
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
