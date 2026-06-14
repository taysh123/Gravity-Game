# Content Roadmap — toward ~100 levels (+ difficulty rubric)

> ⏳ **Historical plan record (superseded).** The game is now **150 levels / 15 worlds** (`v1.0.0-rc.1`).
> Authoritative current state: [`docs/project-status.md`](../../project-status.md). The difficulty rubric
> below is still useful; the level/world counts are point-in-time.

Sprint that took Gravity Flow from 27 → **48 levels / 6 worlds** and made it harder. This doc is the
durable reference for *how* the game scales to ~100 without repetition or shallow filler.

## Difficulty rubric (apply to every level — rebalanced and new)

The anti-easy / anti-repetition lever is **combination**: mid/late levels in a world pull in an
*earlier* world's mechanic.

- **Goal radius by role:** teach 40–46 · develop 34–40 · twist 30–36 · combine 26–32 · master 22–28.
- **Par time:** a clean *expert* run (not a casual finish) — the par star should require a deliberate route.
- **Gems:** always genuinely **off-route** (a detour, a risk past a hazard/repeller, a tight pocket).
- **Per-world arc (8 levels):** Teach×2 → Develop×2 → Twist×1 → Combine-with-prior×2 → Master×1.
- **Precision levers (no engine change):** smaller goals, narrow corridors / true mazes, multi-step
  routes, tighter obstacle counts, off-route gems, tighter par.
- **Tension** (hard-fail hazards/timeouts) stays concentrated in designated worlds; everywhere else,
  difficulty comes from precision/routing + the 3-star layer. **1★ is always achievable** with the
  world's taught skill.
- **"Stronger mechanic use":** zones in opposing pairs; magnets as attract+repel gauntlets; platforms
  with tighter sync; hazards as routing constraints; portals that redirect across space.

## Roadmap to ~100 (10 worlds × ~10)

| # | World | Mechanic | Status |
|---|-------|----------|--------|
| 1 | Foundations | attractor + walls | **8** (this sprint) → 10 |
| 2 | Currents | gravity zones | **8** → 10 |
| 3 | Clockwork | moving platforms | **8** → 10 |
| 4 | Peril | hazards + timed | **8** → 10 |
| 5 | Wells | magnets | **8** → 10 |
| 6 | **Rifts** | **Portals** | **8** → 10 |
| 7 | **Gates** | **One-way gates** (NEW, v0.4.0) | **8** → 10 |
| 8 | **Convergence** | combination/mastery (all mechanics, v0.4.0) | **8** → 10 |
| 9 | Gauntlet | combination + tension | next sprint |
| 10 | Singularity | mastery capstone (everything) | next sprint |

**v0.4.0 also:** fixed the magnet trap (clamp 70→95, reach 230→190) and added a stats + achievements
system (14 achievements). Now **64 levels / 8 worlds**. To ~100: Worlds 9–10 (no new engine code) +
backfill Worlds 1–8 toward 10 each.

**Scaling without bloat:** only **one** more new mechanic remains (One-way Gates, W7). Worlds 8–10 are
pure-design *combination/mastery* worlds reusing the existing 7 mechanics — no new engine code — which is
how the game reaches ~100 high-quality levels. W1–6 each gain their final 2 levels (→10) in a later
polish pass.

## What shipped this sprint (v0.3.0)
- **M1:** rebalanced all 27 (tighter goals/par, gems off-route).
- **M2:** Worlds 1–5 → 8 each (+13 combination levels); level-select made **vertically scrollable**
  (drag + wheel) to scale past one screen; `ProgressStore` key → `:v2` (one-time reset).
- **M3:** **Portals** (`entities/Portal.ts` + `LevelConfig.portals` + `checkPortals`, pure math in
  `utils/portal.ts` TDD'd) + **World 6 Rifts** (41–48).

## Open / next
- **Device playtest** of the harder curve + Portals (the real fairness judge) — tune from notes.
- World 7 (One-way Gates), then combination/mastery worlds 8–10; backfill W1–6 to 10 each.
