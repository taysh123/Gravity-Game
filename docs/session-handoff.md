# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **64 levels / 8 worlds** (Foundations · Currents · Clockwork · Peril · Wells · Rifts ·
  Gates · Convergence).
- **Systems live:** attractor pull, gravity zones, **magnets**, **portals**, **one-way gates**, moving
  platforms, hazards, collectible gems, 3-star scoring, timed levels, achievements + stats, scrollable
  world-select; **Retention engine (v0.5.0):** **Stardust** currency, **Daily Challenge 2.0** (curated
  pool + rotating modifier + streak rewards), **cosmetics shop** (ball themes, earn with Stardust),
  leaderboard-ready daily records, **Ads/IAP provider seams** (web stubs). Premium glass UI; mobile fixed.
- **Quality:** `tsc` clean · 52 tests pass · build clean · full flow no console errors.
- **Git/GitHub:** branch `master`, **synced** with `origin` = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Retention Engine (v0.5.0).** First commercial-phase sprint (web; no native wrap yet): **Stardust** soft
currency (earned on wins/daily, TDD'd award math); **Daily Challenge 2.0** — a curated daily pool
(`config/dailyLevels.ts`) + deterministic date→{level,modifier} pick + rotating modifiers (Classic /
Time Attack / Gem Rush) + streak milestone rewards; **cosmetics shop** (6 ball themes, buy/equip with
Stardust, applied to the Ball) reachable via a menu palette icon; **leaderboard-ready** daily records;
**Ads/IAP provider seams** (`utils/Ads.ts`, `IAP.ts`) as web stubs for Sprint 2 to swap for real
AdMob/IAP. Verified: 52 tests, tsc/build green, daily awards Stardust + records streak, cosmetic equips
recolor the ball, no console errors. *(Prior: v0.4.1 first-hour pacing fix; v0.4.0 Gates+Convergence.)*

## Next sprint
**Commercial roadmap** (decisions locked: Capacitor → Google Play first then iOS; F2P hybrid — rewarded +
remove-ads + cosmetics, no pay-to-win):
1. **Sprint 2 — Native + Monetization:** Capacitor (Android) wrap; real AdMob (rewarded + capped
   interstitial) + IAP (remove-ads, cosmetics) behind the `Ads`/`IAP` seams; analytics + consent/privacy.
2. **Sprint 3 — Polish + Wow + Store assets:** soundtrack, per-world visuals, 8 boss levels +
   decision-by-L3, vector icons (replace emoji), transitions, app icon/screenshots/trailer, ratings prompt → RC.
3. Open: **device playtest** of Worlds 7–8 + magnet feel; reach ~100 (Worlds 9–10 + backfill) later.
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
