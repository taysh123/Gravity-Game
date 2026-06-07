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
- **Excitement (v0.7.0):** **per-world visual identity** (8 distinct palettes/atmospheres + world title
  cards), **per-world in-game music** + boss audio + boss-clear sting, **star-by-star win celebration**
  (PERFECT! + rising tones), boss **STAR FREED** payoff + red arena wash + camera punches, **signature/boss
  title cards**, and the hook **"Bring the lost star home."**
- **Quality:** `tsc` clean · 56 tests pass · build clean · full flow no console errors.
- **Git/GitHub:** branch `master`, **synced** with `origin` = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
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
**Device-playtest the Excitement build (v0.7.0)** — do worlds feel distinct? does winning feel good? do
bosses feel like events? is there a hook? Then, on approval, **Sprint 2 — Native + Monetization** begins:
1. **Sprint 2 — Native + Monetization (→ Play RC):** Capacitor + Android build pipeline, AdMob (rewarded +
   interstitial) + IAP (Remove-Ads, cosmetics) behind the `Ads`/`IAP` seams, analytics, crash reporting,
   Play listing. (Decisions locked: Capacitor → Play first; F2P hybrid, no P2W. Needs from you: Play
   Console $25, AdMob app/ad-unit IDs.)
2. **Sprint 3 — Polish + store assets:** real soundtrack tracks (swap behind `startWorldTheme`), vector
   icons (replace 🔒 emoji), app icon/screenshots/trailer → RC.
3. Later: apply the per-world overhaul (mental skills + signature + boss + identity) to Worlds 4–8; ~100.
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
