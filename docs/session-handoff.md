# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **80 levels / 8 worlds, all overhauled to 10 each** (10×8). Every world has a distinct
  *mental skill*, ≥3 designed aha puzzles, archetype variety, a named **signature** and a **boss**:
  W1 Foundations (navigation) · W2 Currents (prediction/flow) · W3 Clockwork (timing/sequencing) ·
  W4 Peril (reaction/nerve) · W5 Wells (trajectory/orbital) · W6 Rifts (spatial/non-linear) ·
  W7 Gates (planning/commitment) · W8 Convergence (synthesis/improvisation).
  Signatures: THE GAUNTLET · THE EYE · THE GEARWORKS · THE FORGE · THE BINARY STAR · HALL OF MIRRORS ·
  THE LOCKWORKS · THE CONFLUENCE. Bosses: THE COLLAPSE · THE MAELSTROM · THE MACHINE · THE INFERNO ·
  THE SINGULARITY · THE BREACH · THE VAULT · **HOMECOMING** (finale — the lost star reaches home).
  World ranges: 1-10 · 11-20 · 21-30 · 31-40 · 41-50 · 51-60 · 61-70 · 71-80. Driven by the Level Design
  Audit + roadmap in `~/.claude/plans/warm-orbiting-map.md`. **No new mechanics added** — pure design.
- **Systems live:** attractor pull, gravity zones, **magnets**, **portals**, **one-way gates**, moving
  platforms, hazards, collectible gems, 3-star scoring, timed levels, achievements + stats, scrollable
  world-select; **Retention engine (v0.5.0):** **Stardust** currency, **Daily Challenge 2.0** (curated
  pool + rotating modifier + streak rewards), **cosmetics shop** (ball themes, earn with Stardust),
  leaderboard-ready daily records, **Ads/IAP provider seams** (web stubs); **signature/boss level identity**
  (gold/red HUD titles). Premium glass UI; mobile fixed.
- **Excitement (v0.7.0):** **per-world visual identity** (8 distinct palettes/atmospheres + world title
  cards), **per-world in-game music** + boss audio + boss-clear sting, **star-by-star win celebration**
  (PERFECT! + rising tones), boss **STAR FREED** payoff + red arena wash + camera punches, **signature/boss
  title cards**, and the hook **"Bring the lost star home."**
- **Quality:** `tsc` clean · 57 tests pass · build clean · all 80 levels load no console errors.
- **Git/GitHub:** branch `master`. **Local is ahead of `origin` by 6 commits (v0.8.0→v0.9.0)** — push
  pending (run `git push origin master`). origin = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Worlds 4–8 redesign roadmap — COMPLETE (v0.9.0).** Applied the W1–3 treatment to all remaining worlds,
each grown 8→10 with a distinct mental skill, ≥3 aha, archetype variety, a signature + a boss — **no new
mechanics**. Per world: kept the 6 strongest, retired 2 redundants, added 4 new (2 aha + signature + boss).
The game is now **80 levels, 10×8**, consistently "different, not just harder."
- **W4 Peril** (v0.8.0): safe-window + decoy aha, THE FORGE, THE INFERNO (`level71-74`).
- **W5 Wells** (trajectory/orbital): slingshot-around + repel-place aha, THE BINARY STAR, THE SINGULARITY (`level75-78`).
- **W6 Rifts** (spatial): velocity-carry + think-backwards aha, HALL OF MIRRORS, THE BREACH (`level79-82`).
- **W7 Gates** (commitment): lock-and-key + plan-the-gem aha, THE LOCKWORKS, THE VAULT (`level83-86`).
- **W8 Convergence** (synthesis): fuse + improvise aha, THE CONFLUENCE, finale boss HOMECOMING (`level87-90`).
Rewired `levels/index.ts` + `worlds.ts` ranges each milestone; `ProgressStore` key v5→v6 (clean reset);
`world.test.ts` rewritten to derive from `WORLDS` (range-shift-proof). Verified per world: tsc clean,
57 tests, build clean, Playwright (`scripts/verify_w4..w8.py`) = every level loads no console errors + all
16 new levels' routes physically solvable. **Not yet device-playtested** (the real judge of fun/fairness).

**Excitement Sprint (v0.7.0).** Turned the polished prototype toward a *memorable* game (no new mechanics):
EM1 per-world identity (`config/worldThemes.ts` → themed `CosmicBackground` + world title cards;
`worldOf()` pure helper +4 tests); EM2 game feel (star-by-star reveal + PERFECT, boss STAR FREED banner,
camera zoom-punches, scaled haptics); EM3 audio (`AudioSynth.startWorldTheme` per-world beds with
same-world continuity, boss minor bed, boss-clear arpeggio); EM4 signature/boss "events" (entry title
cards + boss red arena wash); EM5 hook ("Bring the lost star home" tagline + world subtitles). Verified:
56 tests, tsc/build green, all 70 load no console errors, worlds visibly distinct, celebration + boss
event captured. Audit: `docs/superpowers/plans/2026-06-07-excitement-audit.md`. *(Prior: v0.6.x Gameplay
Overhaul + L9/L1 fixes.)*

## Next sprint
**Push + deploy v0.9.0, then device-playtest all 80 levels.** First: `git push origin master` then
`vercel --prod --yes` (both blocked from auto-run; run yourself). Then playtest the redesigned worlds —
especially the new aha levels (W4 safe-window/decoy · W5 slingshot/repel-place · W6 velocity-carry/
think-backwards · W7 lock-and-key/plan-gem · W8 fuse/improvise), the signatures, and the boss clocks
(THE INFERNO/THE SINGULARITY/THE BREACH/THE VAULT/HOMECOMING — tune `timeLimitMs`/`parTimeMs`/saw speeds
from notes). Then **Sprint 2 — Native + Monetization** begins:
1. **Sprint 2 — Native + Monetization (→ Play RC):** Capacitor + Android build pipeline, AdMob (rewarded +
   interstitial) + IAP (Remove-Ads, cosmetics) behind the `Ads`/`IAP` seams, analytics, crash reporting,
   Play listing. (Decisions locked: Capacitor → Play first; F2P hybrid, no P2W. Needs from you: Play
   Console $25, AdMob app/ad-unit IDs.)
2. **Sprint 3 — Polish + store assets:** real soundtrack tracks (swap behind `startWorldTheme`), vector
   icons (replace 🔒 emoji), app icon/screenshots/trailer → RC.
Full audit + roadmap: `~/.claude/plans/warm-orbiting-map.md`.

## Important notes
- ⚠️ **Level balance for the redesigned worlds (31–80) is unverified on a device** — automated tests
  confirm every route is *physically solvable* and clean, but can't reproduce finger input or judge
  *fun/fairness*. Playtest the new aha levels + boss clocks before Sprint 2; tune constants in the level
  files (no code changes needed). Per-world verifiers: `scripts/verify_w4.py`…`verify_w8.py`.
- **GitHub:** `origin` = https://github.com/taysh123/Gravity-Game.git. **`master` is ahead by 6 unpushed
  commits** (v0.8.0→v0.9.0) — push/deploy are blocked from auto-run, so run them yourself per milestone.
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
