# P07 — Monetization Design

**Status:** PLANNED, not started (written 2026-10-07, baseline `master @ d3c6aab`). This is EXECUTION-ORDER step 18, which needs steps 16 (P5 system) and 17 (P6), and feeds **M2 Launch Candidate**. D-23 is PROPOSED: implement it unless M1 telemetry contradicts it. Design of record: [`../../design/MONETIZATION.md`](../../design/MONETIZATION.md) Part B.

---

## 1. Summary

P7 turns the P0-correct purchase and ad plumbing into an intentional, ethical economy and offer architecture.

- **Currency.** It merges Cosmic Fragments into Stardust at ×10. The merge is value-neutral by construction and migrated idempotently (D-23).
- **Faucets.** It fixes the faucets: replays pay only newly earned stars, Endless is capped per day, collections count earnable items only, and the free daily ad pays 50 Stardust.
- **Sinks.** It adds sinks so Stardust never dies: a weekly Spotlight, procedural recolors, a seasonal Stardust drop and achievement-unlocked prestige cosmetics.
- **Ad caps.** It applies the D-24 caps through Remote Config: no interstitial before lifetime level 12; ≥180 s and ≥3 completions apart; ≤4 per session and ≤10 per day; never after a death or a failure streak; and the 2× offer at most once per 3 wins and 4 per day.
- **Offers.** It rebuilds the shop with try-on previews and honest labels, and ships a fixed offer set: Remove Ads $2.99, Starter $3.99 after the World 1 boss, Founder's with an honest end date, Supporter $9.99, a seasonal pack, and cosmetic-only "twins" so nobody pays twice for Remove Ads.
- **Experiments and guardrails.** It wires RevenueCat Offerings and Remote Config for experiments, plus retention guardrails.

Money never buys currency, hints, progress or revives (D-07, D-23, D-24).

## 2. Scope

**P0 plumbing is not in this phase.** RevenueCat registration and init, entitlement-as-truth, the Non-consumable configuration, error codes, pending/refund/restore, store prices, Starter-hidden-when-`no_ads`, consent-first boot, preload and readiness, the event-driven rewarded flow with its 5 s watchdog, the awaited interstitial, busy guards and offline behaviour are all **P00 tasks**:
- EXECUTION-ORDER **step 3, Purchases (D-09)**, and **step 4, Ads + consent (D-10, D-24 plumbing)**;
- see [`P00-foundation.md`](P00-foundation.md) §16 and the spec in [`MONETIZATION.md` Part A](../../design/MONETIZATION.md).

P7 assumes they are done and device-verified at **M0** (MONETIZATION.md A.15 rows C1–P21). P7 never re-implements them; it only extends the entitlement map and the policy gates.

| Item | Detail |
|---|---|
| **Systems** | Currency (`CurrencyStore`, `FragmentStore` retired, `currency.ts`), rewards (`Rewards.ts`, `RewardStore.ts`, `loginBonus.ts`, `DailyStore.ts`), cosmetics (`cosmetics.ts`, `cosmeticsLogic.ts`, `CosmeticStore.ts`, `cosmetics.config.ts`), ad policy (`interstitial.ts`, `Ads.ts`, new `rewardedPolicy.ts`, `AdCapStore.ts`), offers (`monetization.config.ts`, `IAP.ts`, P00 `entitlements.ts`, new `offerTiming.ts`, `OfferStore.ts`), shop (`CosmeticsScene.ts`), surfaces (`GameScene`/ResultPanel, `EndlessScene`, `MainMenuScene`, `WorldMapScene`, `EndScene`, `SettingsScene`), Remote Config (`rcConfig.ts` from P06), analytics |
| **Dependencies** | **P00** steps 3–4 (plumbing above) + D-12 Preferences mirror. **P02** stable level ids (D-05), so "best stars per level" is keyed by id. **P03** ResultPanel NEXT/RETRY (D-08), relief ladder + route ghost (D-07). **P05** shop components: ScrollView, Modal, Toast, cards (step 16). **P06** `rcConfig.ts` + Remote Config, analytics taxonomy v2, login calendar pause (D-18), achievements v2 (step 17). |
| **Difficulty** | Engineering **M** · design **H** · QA **M** (license testers + migration on device) |
| **Risk** | Medium. Brand trust and migration correctness. Mitigated by the never-list (MONETIZATION B.1), a pure TDD migration with frozen v1 keys, Remote Config kill switches and retention guardrails. |
| **Expected upside** | Medium-high relative to today's $0: payer conversion ≥1.5%, a ~$33/yr spend ceiling instead of $15.97, rewarded inventory in "stuck" contexts, and no dead currency |
| **Success metrics** | Rewarded opt-in ≥20% of offers · interstitials ≤1.5/DAU · payer conversion ≥1.5% · retention delta between ad-cap arms within ±1 pp (D1, D7) · 30–70% of DAU have an affordable unowned item · median days of currency on hand 2–10 · refund rate ≤5% (HEURISTIC) · non-cancel purchase failures <3% |
| **Must NOT be done yet** | Subscriptions, gacha, energy, paid currency (MASTER-ROADMAP P7); battle pass, event currency (D-30); consumable tips; Play one-time discount offers (unsupported by RC); strikethrough or "was" money prices; price experiments for EEA/UK users; **No-Ads+ ad-skip** until D-23 is amended (P07-T18 is USER-GATED); selling hints, tokens or revives; interstitials outside the campaign NEXT; re-doing any P00 plumbing; any physics or formula change (D-26) |

## 3. Architecture plan

The CLAUDE.md pattern applies: pure logic in `src/utils/*.ts` with TDD, thin persisted `*Store.ts`, constants in `src/config/*`, scenes as thin callers, and no managers.

| Layer | Module | Responsibility |
|---|---|---|
| Config | `src/config/economy.config.ts` (new) | Every v2 faucet and sink number (MONETIZATION B.3.2) plus the default caps. `rcConfig.ts` clamps all overrides. |
| Pure | `src/utils/economyV2.ts` (new) | `clearPayout`, `streakBonusEligible`, `endlessPayoutCapped`, `chestDoubleAmount` |
| Pure | `src/utils/economyMigration.ts` (new) | `migrateEconomyV2({sd, fr, marker}) → {sd, marker, changed}` |
| Pure | `src/utils/rewardedPolicy.ts` (new) | Per-surface eligibility and caps (B.2) |
| Pure | `src/utils/interstitial.ts` (modify) | Full D-24 gate with an enumerated reason |
| Pure | `src/utils/spotlight.ts` (new) | `spotlightFor(weekKey, pool, pct, overrides)` |
| Pure | `src/utils/offerTiming.ts` (new) | Which IAP surface (if any) may show now |
| Pure | `src/utils/hintTokens.ts` (new, or extend P03's) | Token earn rules and cap |
| Pure | `src/utils/cosmeticsLogic.ts` (modify) | Single currency, earnable-only collections, `recolorOf` |
| Pure | `src/utils/entitlements.ts` (P00; modify) | The extended entitlement → grant map with twins |
| Store | `CurrencyStore.ts` (modify: v2 key), `AdCapStore.ts` (new), `OfferStore.ts` (new), `HintTokenStore.ts` (new unless P03 made it), `RewardStore.ts` (modify: local date) | Persisted counters. Every key is registered in the D-12 mirror with schema validation and a backup key. |
| Glue | `Ads.ts`, `IAP.ts` | Read caps from `rcConfig`, write `AdCapStore`, choose the RC offering (`iap_offering`) and twins |
| UI | `CosmeticsScene.ts` + P05 components; ResultPanel (P03); `MainMenuScene`, `WorldMapScene`, `EndScene`, `SettingsScene`, `EndlessScene` | Surfaces only; no policy logic in scenes |

**Remote Config keys** added by P7. Defaults equal the shipped constants; all keys are clamped (D-14):

| Key | Default | Clamp |
|---|---|---|
| `ads_interstitial_enabled` | true | bool (kill switch) |
| `ads_inter_min_lifetime_level` | 12 | 6–30 |
| `ads_inter_min_secs` | 180 | 120–600 |
| `ads_inter_min_completions` | 3 | 2–8 |
| `ads_inter_max_session` / `ads_inter_max_day` | 4 / 10 | 1–6 / 1–15 |
| `ads_inter_skip_after_attempts` | 3 | 2–10 |
| `ads_inter_holdout_pct` | 10 (first 28 days after launch, then 0) | 0–20 |
| `rewarded_2x_every_n_wins` / `rewarded_2x_max_day` | 3 / 4 | 2–6 / 1–8 |
| `rewarded_endless2x_max_day` | 3 | 1–6 |
| `free_stardust_amount` | 50 | 0–100 |
| `endless_sd_daily_cap` | 150 | 60–400 |
| `spotlight_enabled` / `spotlight_discount_pct` / `spotlight_schedule` | true / 20 / `{}` | bool / 10–30 / dated JSON |
| `offers_enabled` | `{"starter":true,"remove_ads_line":true,"supporter":true,"season":true}` | JSON, unknown keys ignored |
| `offer_no_ads_plus` | false | bool (USER-GATED) |
| `iap_offering` | `"default"` | whitelist `default`, `price_b` |

## 4. Files/modules affected

"Exists" was verified in the repo on 2026-10-07. "Phase-created" files must exist by the time P7 starts; check their paths at P07-T01.

| Path | Action | Status | Why |
|---|---|---|---|
| `src/config/economy.config.ts` | Create | new | v2 numbers |
| `src/utils/economyV2.ts` + `.test.ts` | Create | new | Payout math |
| `src/utils/economySim.test.ts` | Create | new | Persona model (MONETIZATION B.3.3) as a test |
| `src/utils/economyMigration.ts` + `.test.ts` | Create | new | Currency merge |
| `src/utils/rewardedPolicy.ts` + `.test.ts` | Create | new | Rewarded caps |
| `src/utils/AdCapStore.ts` | Create | new | Persisted ad counters (absorbs `gravity-flow:interstitial:v1`) |
| `src/utils/spotlight.ts` + `.test.ts` | Create | new | Spotlight |
| `src/utils/offerTiming.ts` + `.test.ts` | Create | new | IAP prompt rules |
| `src/utils/OfferStore.ts` | Create | new | Offer prompt history |
| `src/utils/shopCopy.ts` + `.test.ts` | Create | new | Honest labels, can't-afford estimate |
| `src/utils/hintTokens.ts` + `.test.ts`, `src/utils/HintTokenStore.ts` | Create (Modify if P03 created them) | new / P03 | Token faucet |
| `src/config/monetization.config.ts` | Modify | exists | `BUNDLES` → `PRODUCTS` v2 (entitlements, twins, `endsAt`); delete `priceLabel` / `REMOVE_ADS_PRICE_LABEL` if P00 left any; `INTERSTITIAL` v2 defaults |
| `src/config/cosmetics.config.ts` | Modify | exists | `CollectionId` + `'prestige'` |
| `src/config/retention.config.ts` | Modify | exists | `LOGIN_BONUS_LADDER` merged to SD (`:82-90`) |
| `src/utils/cosmetics.ts` | Modify | exists | Fragments → Stardust ×10 (`:56-87`); prestige, Halcyon, First Light, Founder badge items; recolor variant registry |
| `src/utils/cosmeticsLogic.ts` + `.test.ts` | Modify | exists | `Currency = 'stardust'`; earnable-only `collectionComplete`; `recolorOf` |
| `src/utils/economy.test.ts` | Modify | exists | Single-currency rarity ladder; recolor < base |
| `src/utils/CosmeticStore.ts` | Modify | exists | Single currency; derived ownership (P00 entitlements) ∪ prestige; variant id validation |
| `src/utils/CurrencyStore.ts` | Modify | exists | `currency:v2` key; migration hook |
| `src/utils/FragmentStore.ts` | **Delete** (after T03/T04 remove callers) | exists | Retired currency |
| `src/utils/Rewards.ts` + `.test.ts` | Modify | exists | Merged achievement, milestone and collection rewards; prestige grants |
| `src/utils/RewardStore.ts` | Modify | exists | Local `dateKey` (fixes the UTC/local double claim, audit F.1); `free_stardust` |
| `src/utils/loginBonus.ts` + `.test.ts` | Modify | exists | `{ sd }` only |
| `src/utils/DailyStore.ts` | Modify | exists | `claimLoginBonus` returns `{ sd }`; chest double hook |
| `src/utils/currency.ts` + `.test.ts` | Modify | exists | `stardustForWin` → `clearPayout` caller |
| `src/utils/endless.ts` + `.test.ts` | Modify | exists | Payout unchanged; the cap is applied via `economyV2` |
| `src/utils/storeNudge.ts` + `.test.ts` | Modify | exists | Single currency |
| `src/utils/interstitial.ts` + `.test.ts` | Modify | exists | D-24 gate v2 |
| `src/utils/Ads.ts` | Modify | exists | Caps from `rcConfig`; `AdCapStore`; holdout arm |
| `src/utils/IAP.ts` | Modify | exists | Twin selection; `iap_offering`; Founder's `endsAt` filter |
| `src/utils/entitlements.ts` + `.test.ts` | Modify | P00 | Extended map (MONETIZATION B.4) |
| `src/utils/rcConfig.ts` + `.test.ts` | Modify | P06 | Keys in §3 |
| `src/utils/analyticsEvents.ts` + `.test.ts` | Modify | exists | `earn_virtual_currency`, `spend_virtual_currency`, `offer_shown/tapped/dismissed`, `rewarded_result`, interstitial reasons v2; remove `fragment_earned` |
| `src/utils/achievements.ts` | Modify only if P06 v2 needs ids | exists | Prestige unlock ids |
| `src/scenes/CosmeticsScene.ts` | Modify (rebuild) | exists | Shop v2 |
| `src/scenes/GameScene.ts` (or P03's ResultPanel module) | Modify | exists | `clearPayout`; 2× via `rewardedPolicy`; offer slot |
| `src/scenes/EndlessScene.ts` | Modify | exists | Endless cap; 2× day cap |
| `src/scenes/MainMenuScene.ts` | Modify | exists | Chest double; free Stardust entry; season card |
| `src/scenes/WorldMapScene.ts` | Modify | exists | Starter card after the World 1 boss |
| `src/scenes/EndScene.ts` | Modify | exists | Supporter card + supporter star |
| `src/scenes/SettingsScene.ts` | Modify | exists | Remove Ads row uses store price / twin logic |
| `src/scenes/AchievementsScene.ts` | Modify | exists | Shows prestige cosmetic rewards |
| `src/scenes/BootScene.ts` | Modify | exists | Run the economy migration after the D-12 hydrate |
| `docs/design/MONETIZATION.md`, `docs/store/privacy-policy.md`, `docs/store/listing.md`, `CHANGELOG.md` | Modify | exist | §13 |
| `docs/roadmap/DECISIONS.md` | Modify (owner-approved) | exists | D-09 table extension; D-23 decision on No-Ads+ |
| `docs/STATUS.md`, `docs/analytics/ANALYTICS-PLAN.md` | Modify | P00 / P06 | §13 |

## 5. Data-model changes

**Currency (D-23).** v1 keys are never written again; they stay frozen for audit and recovery.

| Key | Before | After |
|---|---|---|
| `gravity-flow:currency:v1` | SD integer | Frozen (read only by the migration) |
| `gravity-flow:fragments:v1` | FR integer | Frozen |
| `gravity-flow:currency:v2` | — | `sd_v1 + 10·fr_v1`, then the live balance |
| `gravity-flow:economy:v2` | — | Marker `{v:2, at, sd, fr}`, written **after** `currency:v2` |

**Entitlement snapshot** (`gravity-flow:entitlements:v1`, created by P00 per D-09):
- The schema is unchanged: `{v:1, active: string[], at, pending?: {productId, at}[]}`.
- P7 only adds entitlement ids: `pack_supporter`, `pack_season_first_light` and, if gated on, `ad_skip`.
- It also extends the derived-grant table: `pack_supporter` → the Halcyon set; `pack_season_first_light` → Morning Star + Horizon; `pack_founders` → also `badge_founder`.
- Twin products map to the same pack entitlements, so ownership never depends on which product was bought.

**Cosmetics:**
- `Acquire` loses `'fragments'`.
- `CollectionId` gains `'prestige'`.
- Recolor variants are ids `<baseId>@shift`, stored in `owned[]` and `equipped`. Resolution falls back: unknown variant → base → category default.
- Bundle items stay derived, never stored (D-09).

**New stores** (each with a version field, a shape validator and a last-good backup, D-12):
- `gravity-flow:adcaps:v1`:
  ```
  {lastFullScreenMs, completionsSinceFullScreen, day, interstitialsToday, x2Today, winsSince2x,
   endless2xToday, endlessSdToday, chestDoubleDay, freeStardustDay, lifetimeInterstitials}
  ```
  It absorbs `gravity-flow:interstitial:v1` (`Ads.ts:24`).
- `gravity-flow:offers:v1`:
  ```
  {sessionIndex, starterPromptedAt, removeAdsLineAt, supporterShownAt, lastPurchaseAt, promptsThisSession}
  ```
  `promptsThisSession` is session-scoped and not persisted.
- `gravity-flow:hinttokens:v1`: `{tokens, grantedKeys[]}`, unless P03 owns it.

**RewardStore:**
- Values switch to local `dateKey` (`daily.ts:11`).
- `free_fragments` is replaced by `free_stardust`; the old key is ignored, which costs at most one claim on migration day.
- New keys: `prestige:<id>`, `chest_double` (daily).

## 6. UI changes

- **Shop v2 (`CosmeticsScene`).** Shelf order: Free Stardust card → Spotlight (this week + next week) → This season → catalog by category → Vault → Packs → Restore.
  - A try-on mini-stage reuses `Ball` and the trail/arrival renderers, and previews locked and paid items.
  - Labels are honest (MONETIZATION B.5).
  - A can't-afford toast ("Need 120 more ✦ — about 4 level clears") replaces the camera shake at `CosmeticsScene.ts:217`.
  - A pending chip shows on pending products. Twin cards replace their packs for `no_ads` owners.
  - Founder's shows a static end-date line.
  - Every interactive element is ≥48 px with 4.5:1 contrast, using the P05 components.
- **Result panel (P03).** The 2× offer is "Watch ad · 2× Stardust (+N ✦)", below NEXT and only once NEXT is live (D-08). It shares the slot with the Stardust nudge or an IAP line under the one-CTA rule.
- **MainMenu.** After the free claim, the chest offers "Watch ad · double today's chest". A season card shows during a season (P10 hook).
- **WorldMap.** A one-time, dismissible Starter card on the World 1 world-complete beat, in session 2 or later.
- **EndScene.** A one-time Supporter card and a supporter star in the sky.
- **Settings.** The Remove Ads row shows the store price, or is hidden when owned; Restore stays.
- **Copy.** Every "Fragments" and "◆" string is removed (CosmeticsScene `FRAGMENT`/`FR` constants at `:36,38`; `RETENTION.COLLECTION_*` violet copy at `retention.config.ts:68-73`).

## 7. Gameplay changes

The attractor formula and physics are unchanged (D-26). No stars, unlocks or timers change. Changes:
1. Replays of a cleared level pay Stardust only for newly earned stars. The 2× offer appears only when a payout exists.
2. The win-streak Stardust bonus counts only paying wins (the FLOW/BLAZE/NOVA flourish still counts every win).
3. Endless Stardust is capped at 150 per day. Revive stays 1 per run and off the boards (D-17).
4. Interstitial moments follow MONETIZATION B.2. In particular, none after any death or ≥3 attempts on the level, after an assisted clear, or after a boss.
5. A route ghost after the free first view costs an earned hint token or a rewarded ad (D-07). Assisted clears never earn the par star.

## 8. Test strategy

**TDD (Vitest, pure modules first):**
- **Economy math** (`economyV2.test.ts`):
  - first-clear payout `5 + 3★`;
  - replay payout `3 × (newBest − oldBest)` and 0 when no new star;
  - streak eligibility;
  - Endless cap at 149/150/151;
  - chest double equals the ladder value;
  - achievements total 1,365, milestones total 900, ladder 205 per 7 days.
- **Persona simulation** (`economySim.test.ts`). It reproduces MONETIZATION B.3.3 within ±5% and asserts the health bounds:
  - first purchase by lifetime level ≤5;
  - non-watcher EoC sink share 55–70%;
  - rewarded share of watcher income ≤30%;
  - no D7–EoC gap of more than 3 play days without an affordable unowned item.
- **Migration** (`economyMigration.test.ts`):
  - the four example rows (0/0, 180/6, 2,480/37, 5,000/400);
  - idempotent (a second run is a no-op);
  - a crash after writing `currency:v2` but before the marker re-derives the same value;
  - NaN, negative, string and missing values → 0;
  - v1 keys untouched;
  - an existing marker → no-op;
  - 1e7 inputs do not overflow.
- **Catalog invariants** (`economy.test.ts`, `cosmeticsLogic.test.ts`):
  - no `acquire: 'fragments'`;
  - the single-currency rarity ladder is strictly increasing;
  - earnable catalog = 7,440;
  - every collection is completable with `free | stardust | achievement` only;
  - recolor price < base price, and a recolor requires the base;
  - every paid cosmetic is reachable from an entitlement;
  - no product maps to hint tokens or currency.
- **Policies:**
  - `rewardedPolicy.test.ts`: every cap at its boundary; session 1 → no result-screen offers; not-ready → hidden.
  - `interstitial.test.ts`: every D-24 rule at its boundary with an enumerated reason (`premium`, `session1`, `lifetime_grace`, `spacing`, `session_cap`, `day_cap`, `failure`, `assisted`, `boss`, `flow`, `holdout`, `not_ready`); rewarded resets the clock.
  - `offerTiming.test.ts`: session 1 none; ≤1 per session; 14-day post-purchase cooldown; Starter once, in session ≥2, after the W1 boss; Remove Ads line after the 3rd interstitial, ≤1 per 7 days; under-18 flag off.
- **Spotlight** (`spotlight.test.ts`): deterministic per week key; the Sunday 07:00 UTC boundary; floor-to-10; dated overrides; owned → "next"; only earnable Epic+ items.
- **Entitlements** (`entitlements.test.ts`, extends P00):
  - twin shown iff `no_ads` is active and the pack entitlement is not;
  - Starter hidden iff `no_ads`;
  - Founder's filtered after `endsAt`;
  - refunding one `no_ads` source keeps `no_ads` while another source is active;
  - `ad_skip` is never granted while `offer_no_ads_plus=false`.
- **Remote Config and analytics.** `rcConfig.test.ts`: clamps; malformed JSON → defaults; `iap_offering` whitelist. `analyticsEvents.test.ts`: names and params pass the lint (no reserved names, ≤40 chars).

**License-tester matrix (HUMAN DEVICE TEST).** All of MONETIZATION A.15 is re-run as regression, plus:

| # | Scenario | Expected |
|---|---|---|
| M1 | Upgrade an internal build that has SD 2,480 / FR 37 and owned cosmetics | 2,850 SD; nothing lost; no Fragments UI; marker written once (relaunch → unchanged) |
| M2 | Buy `starter_pack`, then open Founder's | `founders_cosmetic` at its store price is shown, not `founders_pack` |
| M3 | Own `founders_pack`, open the shop | Starter hidden; "Galaxy Trail" twin shown |
| M4 | Buy `supporter_pack`, then refund it | Halcyon set and supporter star removed; `no_ads` removed only if no other source |
| M5 | Buy the seasonal pack, uninstall/reinstall, Restore | Morning Star + Horizon return |
| M6 | Spotlight item purchase | Charged the discounted Stardust; the shelf shows next week's item |
| M7 | Interstitial caps on a level-12+ save, 6 quick clears | ≤1 interstitial; none after a death, boss or 3★ |
| M8 | 2× offers over 12 wins in one day | ≤4 shown, never two within 3 wins |
| M9 | Remote Config `ads_interstitial_enabled=false` published | No interstitials after the next fetch |
| M10 | `iap_offering=price_b` on a non-EEA tester | `_b` products shown; Restore still grants the entitlement |

## 9. Migration

1. **Boot order:** D-12 Preferences hydrate (P00) → D-05 id migration (P02) → `migrateEconomyV2` → prestige retro-grant (from `RewardStore` `stars:*` keys and achievement state) → collection re-evaluation → `interstitial:v1` → `adcaps:v1`.
2. **Collection re-evaluation.** Earnable-only counting can complete collections for the first time; each newly completed one pays 200 SD once. Collections already claimed under v1 (`collection:<id>` keys) are **not** paid again: their 20 FR was already converted ×10.
3. **Fragment-era rewards.** Achievement, milestone and login Fragments already in the balance convert ×10. Nothing is re-granted.
4. **Release note:** "Cosmic Fragments are now Stardust (×10 for both balances and prices). Nothing was lost."
5. **Removal.** The `fragments:v1` key and `FragmentStore.ts` are physically removed **two releases** after P7 ships. Until then they stay in place, read only by the migration.

## 10. Rollback

- **Remote Config (minutes):**
  - `ads_interstitial_enabled=false`;
  - `rewarded_surfaces` to disable a surface;
  - `offers_enabled` to disable offer prompts;
  - `spotlight_enabled=false`;
  - `iap_offering=default`;
  - faucet values back within their clamps.
- **RevenueCat (minutes).** Set the Current offering back to `default` and remove packages (twins and season) from the offering. Owners keep their entitlements.
- **Play (hours).** Deactivate a new product. Existing owners keep it and Restore works through RC.
- **App code.** Play cannot downgrade versionCode, so a rollback is a **forward hotfix** (D-20) that must keep reading `currency:v2`.
  - The frozen v1 keys make an emergency "re-derive from v1" possible, losing post-migration earnings and spends but keeping owned items.
  - Use it only if `currency:v2` is proven corrupt, and log it in `CHANGELOG.md`.

## 11. Performance

- **Shop try-on:** one `Ball`, one trail and one arrival burst capped at 40 particles, within the <50 ceiling (CLAUDE.md). Draw calls stay within the P05 tier budgets (Low ≤40).
- **Recolors** are computed once at catalog load (14 variants), well under 1 ms, with no textures (runtime Graphics).
- **Migration and Spotlight:** the migration is O(1) at boot; Spotlight is O(pool ≈ 20) per shop open. Neither adds a blocking await to boot (D-14's 3 s Remote Config fetch is unchanged).
- **Ads:** preloading is native-side. Policy checks are pure and O(1).

## 12. Platform

- **Android** (D-11): Capacitor 8.5.2, `@revenuecat/purchases-capacitor` 13.7.0, Play Billing 8.3.0, AdMob 8.2.x with UMP 4.
  - New products follow MONETIZATION A.3: one-time, Non-consumable in RC, one backwards-compatible Buy option.
  - Country price tests use Play Billing Lab.
- **Web:** purchases disabled in production (P00); the economy, Spotlight and recolors work fully offline.
- **iOS (D-29, P12):** product ids and RC entitlements are mirrored in App Store Connect; StoreKit runs through RC; ATT comes before ads; a visible Restore button (App Review 3.1.1). Nothing in P7 may be Android-only in data shape.

## 13. Documentation

- `docs/design/MONETIZATION.md`: update B.3.3 if the simulation changes the numbers. The doc and the test must agree.
- `docs/roadmap/DECISIONS.md`: the D-09 entitlement-table extension and the D-23 No-Ads+ ruling (owner-approved, dated).
- `docs/store/privacy-policy.md`: remove "Cosmic Fragments" (`:26`) and list the pack products.
- `docs/store/listing.md`: IAP list; "cosmetic only"; no "leaderboard" (D-17).
- IARC re-check: digital purchases = yes, random paid items = no.
- `docs/analytics/ANALYTICS-PLAN.md`: P7 events.
- `docs/STATUS.md` and `CHANGELOG.md` at phase end.
- An owner dashboard addendum for the new products and offering packages, appended to MONETIZATION A.14.

## 14. Validation criteria

| Criterion | Method | Label |
|---|---|---|
| `npx tsc --noEmit`, `npx vitest run`, `npm run build` green | Commands | VERIFIED |
| All §8 TDD suites green, including the migration and persona simulation | `npx vitest run src/utils/economy*.test.ts src/utils/*Policy*.test.ts …` | VERIFIED |
| No `FragmentStore` import or `'fragments'` literal remains in `src/` (except the migration) | `grep -rn "FragmentStore\|'fragments'" src` | VERIFIED |
| Catalog totals: 20 earnable / 7,440 SD; 14 recolors / 2,100; First Light 1,250; 6 prestige items | Invariant tests | VERIFIED |
| Headless boot smoke: all scenes, zero console errors, shop renders with no network | Boot smoke (MASTER-ROADMAP §6) | VERIFIED |
| Migration on a real upgraded install (M1) | Device | HUMAN DEVICE TEST |
| Twin, Starter, Founder's and Supporter visibility (M2–M5) | License tester | HUMAN DEVICE TEST |
| Ad caps on device (M7–M9) | Test ads | HUMAN DEVICE TEST |
| Full MONETIZATION A.15 regression | Device | HUMAN DEVICE TEST |
| Interstitials ≤1.5/DAU; rewarded opt-in ≥20%; ±1 pp retention between arms | Firebase + AdMob, after ≥14 days of closed or production data | INFERRED until data volume allows (MONETIZATION B.9) |
| Economy health (30–70% affordable; 2–10 days on hand) | `earn/spend_virtual_currency` + balance user property | INFERRED until telemetry |

## 15. Exact completion definition

P7 is complete when **all** of the following are true:
1. P07-T01 to T17 are done-when-satisfied. T18 is either shipped after an approved D-23 amendment or explicitly recorded as declined in DECISIONS.md.
2. **Currency:** one currency in code and UI. The migration is device-verified (M1), with v1 keys frozen and the marker written once.
3. **Ad caps:** every D-24 rule is enforced through clamped Remote Config with the defaults in §3, and every suppression carries an enumerated reason.
4. **Shop v2** ships with try-on, honest labels, the can't-afford toast, Spotlight, recolors, the First Light drop, the Prestige collection and twins. No hard-coded price strings exist anywhere.
5. **Products:** `supporter_pack`, `supporter_cosmetic`, `starter_cosmetic`, `founders_cosmetic` and `season_first_light_pack` are Active in Play and Non-consumable in RC, attached to entitlements and present in the `default` offering. The Founder's end date is written into config on launch day.
6. **Testing:** all §14 VERIFIED gates pass, and the HUMAN DEVICE TEST rows are signed off by the owner.
7. **Docs:** the §13 updates are merged, including the DECISIONS amendments.

## 16. Task breakdown

| ID | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P07-T01** | Economy constants and pure payout model | Create `src/config/economy.config.ts`, `src/utils/economyV2.ts` (+test), `src/utils/economySim.test.ts` | Payout and cap boundaries; persona model vs B.3.3 ±5%; health bounds | Tests green; MONETIZATION B.3.3 matches the model output |
| **P07-T02** | Currency merge migration | Create `src/utils/economyMigration.ts` (+test); modify `CurrencyStore.ts`, `BootScene.ts`; register keys in the D-12 mirror | 4 example rows, idempotence, crash-between-writes, corrupt input, frozen v1 | Device row M1 passes |
| **P07-T03** | Catalog conversion; earnable-only collections; Prestige collection | Modify `cosmetics.ts`, `cosmetics.config.ts`, `cosmeticsLogic.ts` (+test), `CosmeticStore.ts`, `economy.test.ts` | No `'fragments'`; ladder; 7,440 total; every collection earnable-completable | Shop shows one currency; collections show "Supporter item" chips |
| **P07-T04** | Faucet conversion and local-date keys | Modify `Rewards.ts` (+test), `retention.config.ts`, `loginBonus.ts` (+test), `DailyStore.ts`, `RewardStore.ts`, `currency.ts` (+test), `GameScene.ts`, `EndlessScene.ts`; delete `FragmentStore.ts` | 1,365 / 900 / 205 totals; replays pay new ★ only; the 23:30-local boundary can't double-claim | `grep` for FragmentStore is empty; persona simulation still green |
| **P07-T05** | Rewarded policy and surfaces | Create `src/utils/rewardedPolicy.ts` (+test), `src/utils/AdCapStore.ts`; modify `Ads.ts`, `GameScene.ts`/ResultPanel, `EndlessScene.ts`, `MainMenuScene.ts`, `CosmeticsScene.ts` | All B.2 caps; session 1; not-ready hidden | Device A1–A6 and M8 pass |
| **P07-T06** | Interstitial gate v2 (D-24) and holdout | Modify `interstitial.ts` (+test), `Ads.ts`, `AdCapStore.ts`, `monetization.config.ts`, `rcConfig.ts` | Every rule and reason at its boundary; rewarded resets the clock; holdout arm | Device A7–A13 and M7 pass; `interstitial_suppressed{reason}` visible in DebugView |
| **P07-T07** | Hint tokens and the rewarded route-ghost step (D-07) | Create or modify `src/utils/hintTokens.ts` (+test), `HintTokenStore.ts`; modify the P03 relief-ladder module | +1/world, +1/10 3★, cap 5; first view free; never levels 1–3; no product grants tokens | Ghost purchasable only by token or ad; assisted clear shows no par star |
| **P07-T08** | Product catalog v2 and entitlement extension | Modify `monetization.config.ts`, `src/utils/entitlements.ts` (+test), `IAP.ts`; DECISIONS D-09 amendment | Twins, Starter hidden, Founder's `endsAt`, multi-source `no_ads`, `ad_skip` gated | Owner dashboard addendum done; M2–M5 pass |
| **P07-T09** | Shop v2 UI | Modify `CosmeticsScene.ts` (P05 components; try-on stage stays in-scene until a second caller exists, per CLAUDE.md); create `src/utils/shopCopy.ts` (+test) | Label strings; can't-afford estimate math | 48 px / 4.5:1 / reduced-motion audits pass; boot smoke clean |
| **P07-T10** | Spotlight rotation | Create `src/utils/spotlight.ts` (+test); modify `CosmeticsScene.ts`, `rcConfig.ts` | Determinism, week boundary, rounding, overrides, owned | M6 passes; no countdown UI anywhere |
| **P07-T11** | Procedural recolors | Modify `cosmeticsLogic.ts` (`recolorOf`) (+test), `cosmetics.ts`, `CosmeticStore.ts` | 14 variants; price < base; requires base; lightness clamp; id fallback | A visual sheet of all 14 reviewed (luminance check per D-13) |
| **P07-T12** | Prestige cosmetics | Modify `cosmetics.ts`, `Rewards.ts` (+test), `AchievementsScene.ts` | Each unlock grants once; retro-grant idempotent; not purchasable | An upgraded save with 100★ owns Voyager, Luminary and Ascendant |
| **P07-T13** | Offer timing engine | Create `src/utils/offerTiming.ts` (+test), `src/utils/OfferStore.ts`; modify `WorldMapScene.ts`, `EndScene.ts`, `MainMenuScene.ts`, `SettingsScene.ts`, ResultPanel | All B.6 rules | Session-1 playthrough shows zero IAP prompts (device) |
| **P07-T14** | Founder's end date, Supporter, First Light content | Modify `monetization.config.ts`, `cosmetics.ts`, `EndScene.ts`, `CosmeticsScene.ts` | Catalog invariants still hold; `endsAt` filter | Play products Active and RC offering updated (owner); M4–M5 pass |
| **P07-T15** | Remote Config keys, offering selection, analytics | Modify `rcConfig.ts` (+test), `IAP.ts`, `analyticsEvents.ts` (+test), `docs/analytics/ANALYTICS-PLAN.md` | Clamps, malformed JSON, whitelist, event lint | M9–M10 pass; events visible in DebugView |
| **P07-T16** | Docs and compliance | `docs/store/privacy-policy.md`, `docs/store/listing.md`, `docs/design/MONETIZATION.md`, `docs/STATUS.md`, `CHANGELOG.md`, `DECISIONS.md` | Docs facts check (P00 `scripts/facts.mjs --check`) | IARC and Data safety answers re-confirmed by the owner |
| **P07-T17** | Device validation run | — | MONETIZATION A.15 + §8 M1–M10 | Owner signs off every HUMAN DEVICE TEST row |
| **P07-T18** | **USER-GATED:** No-Ads+ ad-skip (`no_ads_plus`, `ad_skip`) | `monetization.config.ts`, `entitlements.ts`, `rewardedPolicy.ts` | `ad_skip` covers only the capped 2× and chest-double payouts, never route ghosts or revives; same caps as a watcher | Only after a D-23 amendment is ACCEPTED; otherwise recorded as declined and the flag stays false |
