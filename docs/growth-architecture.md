# Growth Architecture — future opportunities & where they plug in

Highest-ROI growth opportunities for GRAVITY FLOW, ranked, with the **existing seams** each one extends.
This is a roadmap + architecture map — *no large systems are built yet*; the point is that the foundations
already exist so each is a small, additive step (consistent with the one-entity/one-field, data-driven,
no-managers rules).

## Already-built foundations (the seams)
- **Deterministic seeding** — `utils/daily.ts` (date seed + modifiers) and `utils/endless.ts` (`weekKey`,
  `generateRun`, `mulberry32`). Any time-boxed content = a seed + a date window.
- **Mode flag** — `EndlessScene.init({ mode })` + the `RunSelectScene` hub already accept new modes/rows.
- **Leaderboard interface** — `utils/Leaderboard.ts` (`submitRun/bestRun/submitEndless/bestEndless`) is
  explicitly swap-to-Play-Games-Services shaped; callers never touch storage.
- **Reward plumbing** — `CurrencyStore`/`FragmentStore`/`RewardStore`/`utils/Rewards.ts` grant currency
  idempotently; `CosmeticStore` + collections drive unlock-chase.
- **Share** — `utils/Share.ts` (Web Share API w/ image, else text) + a WebGL-safe snapshot.
- **Per-world identity** — `config/worldThemes.ts` (palette/accent/subtitle) now surfaced by the Star Map.

## Ranked opportunities
1. **Weekly/seasonal events (HIGH ROI, small).** A new `RunSelectScene` row + an `EndlessScene` `mode`
   ('event') whose seed = an event key with a start/end date; reward via `RewardStore` (one-time) + an
   exclusive cosmetic. *Seam:* seed + mode + hub row + Leaderboard. **No new engine.**
2. **Limited-time challenges / "this week's modifier" (HIGH, small).** Reuse the daily `DailyModifier`
   pattern as a weekly twist (e.g. mirror gravity, double-speed run). *Seam:* `daily.ts` modifier list →
   a weekly variant; the run already supports modifiers conceptually.
3. **Real Play Games leaderboards + sign-in (HIGH, medium).** Swap the `Leaderboard` local impl for PGS
   (weekly run board first, then all-time Endless). *Seam:* the interface is ready; only the impl + a
   native plugin change. Pair with a "this week's rank" surface in the Run hub.
4. **Viral share moments (MED, small).** Per-world-complete + 3★ + new-best share cards via `Share.shareCard`
   (the snapshot already exists); add a branded frame. *Seam:* `Share` + the existing overlays.
5. **Collection progression depth (MED, small).** Surface set/collection completion (already in
   `cosmetics.config` + `Rewards.claimCollectionRewards`) on the Star Map / store as a meta-goal with fanfare.
6. **Community competitions (MED, medium).** Built on #3 — a shared weekly seed already means everyone runs
   the same course; add a friends/global board + a season reset. *Seam:* PGS + the weekly seed.
7. **Social / friend ghosts (LOWER, larger).** Async friend bests/ghosts on top of PGS; defer until a base exists.

## Guardrails (unchanged)
Cosmetic-only monetization (no P2W); revives stay off ranked boards; live-ops content = data (seed + date +
reward), never a forked codebase; honor perf ceilings + reduced-motion. Build each only when metrics justify
it — these are documented seams, not a backlog to clear pre-launch.
