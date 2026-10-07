# Analytics Plan: Taxonomy v2, Remote Config and Experimentation

> **Deliverable #12.** The analytics plan of record referenced by D-14. Hygiene items land in **P0 step 5**; the taxonomy, user properties and Remote Config land in **P6 step 17** ([`../roadmap/phases/P06-retention.md`](../roadmap/phases/P06-retention.md)).
> **Conforms to** D-02 (armed clock), D-05 (stable level ids), D-10 (consent-first boot), D-14 (taxonomy v2 + RC), D-15 (notifications), D-17 ("your best"), D-21 (Daily), D-24 (ad caps).
> **Evidence:**
> - `docs/research/retention-analytics-liveops.md` Q1–Q3, Q5 (all **[DOC]** limits below come from there)
> - `docs/research/play-launch-compliance-aso.md` §2 (Data safety)
> - `docs/audit/2026-10-07/STATE-AUDIT.md` §G.3
> - Code: `src/utils/analyticsEvents.ts`, `src/utils/Analytics.ts`, `src/utils/Crash.ts`, `src/scenes/BootScene.ts`
>
> Date: 2026-10-07.

---

## 0. Phasing

| Item | Phase / step | Status today (code) |
|---|---|---|
| Delete the custom `session_start` (reserved, silently dropped) | P0 step 5 | Present: `analyticsEvents.ts:39`, fired in `BootScene.ts:19` |
| Pre-consent queue; consent-first boot (D-10) | P0 steps 4–5 | Missing: `Analytics.ts` loads the plugin on the first `track()` |
| Manual `screen_view` per scene; manifest `google_analytics_automatic_screen_reporting_enabled=false` | P0 step 5 | Missing |
| Name/param lint test | P0 step 5 (extended in P6 §15) | Missing: `sanitizeParams` only truncates |
| Taxonomy v2 (§5), attempt semantics (§3), user properties (§6) | P6 (P06-T01–T03) | Not started |
| Remote Config seam + `rcConfig.ts` (§10) | P6 (P06-T04) | No RC plugin installed (`package.json`) |
| BigQuery link, dashboards, weekly aggregates (§8, §13) | P6 (P06-T22); link at M1 | Not started |

---

## 1. Principles

1. **Every event answers a named product question** (MASTER-ROADMAP §5) and maps to one dashboard or query (§8). There is no "just in case" logging.
2. **One attempt = one `level_start` + exactly one `level_end`** (§3). Outcomes are params, not separate events. This replaces `level_complete`, `level_fail` and `retry`.
3. **Use the recommended names where they exist:** `level_start`, `level_end`, `post_score`, `unlock_achievement`, `earn_virtual_currency`, `spend_virtual_currency`, `tutorial_begin`, `tutorial_complete`, `share`, `screen_view`.
4. **Time is sim time** (D-01/D-02). `duration_ms` runs from the arming touch, so pause, Settings and ads never inflate it.
5. **Levels are keyed by the stable id** (D-05). `level_id` is the join key; `level` (campaign order) is only for sorting.
6. **Minimal and private.** No user ID, no free text, no device identifiers in params. Enums and our own catalog ids only (§9).
7. **Rename now.** The game is unlaunched, so renaming loses no history (research Q2). The closed-beta data from M1 is the only casualty, and it is disposable.

---

## 2. Platform limits and naming rules

| Item | Limit **[DOC]** | Our rule |
|---|---|---|
| Distinct event names | 500 | ≤ 70 custom (57 today, §5) |
| Event name length | 40 | `^[a-z][a-z0-9_]{0,39}$` |
| Params per event | 25 | ≤ 16 (`level_end` is the largest) |
| Param name length / value length | 40 / 100 chars | names `^[a-z][a-z0-9_]{0,39}$`; strings ≤ 100, ids ≤ 40 |
| User properties | 25 (name ≤ 24, value ≤ 36) | exactly 10 (§6) |
| Custom dimensions | 50 event-scoped, 25 user-scoped | 41 event-scoped, 10 user-scoped (§4) |
| Custom metrics | 50 | 16 (§4) |
| Custom-definition latency | 24–48 h after registration | register on day 1 of M1 |

**Reserved event names** (the lint list). It is the research Q1 list plus a conservative superset from the FirebaseAnalytics.Event reference; re-verify at implementation.

`ad_activeview, ad_click, ad_exposure, ad_query, ad_reward, adunit_exposure, app_background, app_clear_data, app_exception, app_install, app_remove, app_store_refund, app_store_subscription_cancel, app_store_subscription_convert, app_store_subscription_renew, app_update, app_upgrade, dynamic_link_app_open, dynamic_link_app_update, dynamic_link_first_open, error, firebase_campaign, firebase_in_app_message_action, firebase_in_app_message_dismiss, firebase_in_app_message_impression, first_open, first_visit, in_app_purchase, notification_dismiss, notification_foreground, notification_open, notification_receive, notification_send, os_update, session_start, session_start_with_rollout, user_engagement`

**Other reserved names and rules:**
- **Reserved prefixes** (events, params and user properties): `firebase_`, `google_`, `ga_`, and for params also `_` and `gtag.`.
- **Reserved params:** `session_id`, `user_id`.
- **Reserved user properties:** `first_open_time`, `session_number`, `non_personalized_ads`, and anything with a reserved prefix.
- **Revenue safety:** never send `value` together with `currency` on a custom event, so GA4 can't count it as revenue. Play revenue comes from the automatic `in_app_purchase`, and ad revenue from the automatic AdMob `ad_impression`. We never log either name.

---

## 3. Attempt, session and time semantics

| Concept | Definition |
|---|---|
| **Attempt** | Starts when the simulation **arms** on the first press (D-02). Entering a level and leaving without pressing is a view (`screen_view`), not an attempt. |
| `level_start` | Fired at arm. `attempt` = the lifetime attempt number for this `level_id`, 1-based, from the P3 ProgressStore attempt counter. Capped at 99, meaning 99+. For the Daily, `attempt` counts attempts *today*. |
| `level_end` | Exactly one per `level_start`. `cause` is one of: `win`, `hazard`, `timeout`, `oob`, `restart` (manual retry), `quit` (Home/Back/LEVELS during an attempt), `skip` (D-07 "Skip for now"), `killed` (app died mid-attempt) |
| `killed` | At arm we write the marker `gravity-flow:attempt:v1 = {levelId, mode, attempt, armedSimMs}`; `level_end` clears it. If boot finds a marker, it emits `level_end{cause:'killed', duration_ms:-1}` before anything else. |
| Retry | `level_end{success:0, cause:'restart'}`, then `level_start{attempt:n+1}`. The `retry` event is removed. |
| Quit after fail (QAF) | Derived (§7): the session's last `level_end` had `success = 0` |
| Replay | `replay = 1` when the level was already cleared before this attempt |
| Daily | `level_start`/`level_end` with `mode:'daily'` for every attempt. `daily_start` fires once per local day (first entry); `daily_complete` once (first clear = the payout). |
| Gravity Run | `run_start` at countdown end (Endless arms on scene start, D-02). `post_score` once at run over. |
| Session | Automatic `session_start` / `user_engagement`, with `ga_session_id` and `ga_session_number` in the BigQuery export. No custom session events. |
| Screen | Manual `screen_view{screen_name, screen_class}` from each scene's `create()` (P0). `screen_class` = the scene key; `screen_name` = the scene key, or the overlay name for `SettingsScene`, `TodayScene` and the pre-prompt. |

---

## 4. Parameter dictionary

**Reg** = how it is registered in GA4: **D** dimension, **M** metric, **BQ** BigQuery only (unregistered, available in the export). Booleans are ints 0/1.

| Param | Type | Values / range | Cardinality | Reg |
|---|---|---|---|---|
| `level_id` | str ≤ 40 | D-05 ids: `w02-currents-03`, `dly-t3-0042`, `w02-currents-03~rx` | ~420 | D |
| `level` | int | 1–150 campaign order; 0 = not campaign | 151 | D |
| `world` | int | 0–15 | 16 | D |
| `mode` | enum | `campaign, daily, remix, boss_rush, time_attack, endless, weekly` | 7 | D |
| `attempt` | int | 1–99 | 99 | D |
| `replay`, `boss` | int | 0/1 | 2 | BQ |
| `relief_tier` | int | 0–3 (max relief used: 1 hint, 2 show-me, 3 skip; D-07) | 4 | D |
| `success` | int | 0/1 | 2 | D |
| `cause` | enum | `win, hazard, timeout, oob, restart, quit, skip, killed, fell` | 9 | D |
| `duration_ms` | int | sim ms since arm; −1 = unknown | — | M |
| `stars` | int | 0–3 (this attempt) | 4 | D |
| `stars_new` | int | 0–3 (newly earned) | — | M |
| `gem`, `under_par`, `assisted`, `first_try`, `new_best`, `revived` | int | 0/1 | 2 | D |
| `tier` | int | Daily tier 1–3 | 3 | D |
| `modifier` | enum | `none, timed, gemRush, mirror` | 4 | D |
| `daily_no`, `streak`, `cycle`, `run_no`, `slot` | int | counters | grows | BQ |
| `sched` | enum | `rc, hash` | 2 | BQ |
| `paid` | int | 0/1 (Daily payout granted) | 2 | BQ |
| `score`, `chunks`, `points`, `count` | int | — | — | M |
| `week_id` | str | `weekWindow` key, e.g. `2026-W46` | 52/yr | BQ |
| `milestone` | int | 1–5 | 5 | D |
| `mission_type` | enum | 13 types (RETENTION §6.2) | 13 | D |
| `difficulty` | enum | `easy, medium, hard` | 3 | BQ |
| `day` | int | Login calendar slot 1–7 | 7 | D |
| `gap_days`, `days_away` | int | — | — | M |
| `kind` | enum | `streak_broken`: `daily, win`; `relief_*`: `hint, show_me, skip` | 5 | D |
| `cost` | enum | `free, token, rewarded` | 3 | D |
| `achievement_id` | str | 26 ids (RETENTION §8) | 26 | D |
| `collection_id` | enum | `classic, cosmic, cyber, mythic, trails, arrivals, mastery, seals, orbit` | 9 | D |
| `virtual_currency_name` | enum | `stardust, fragments` | 2 | D |
| `value`, `balance` | int | — | — | M |
| `source` | enum | currency faucet: `win, daily, login, mission, orbit, achievement, milestone, collection, mastery, comeback, rewarded_2x, rewarded_free, run, streak, daily_count` | 15 | D |
| `item_name`, `item_id` | str | cosmetic id (≤ 60) / content id | ≤ 60 / ≤ 420 | D |
| `method` | enum | share: `native, web_share, clipboard`; unlock: `stardust, fragments, achievement, mastery, bundle, free`; world unlock: `clear8, stars, boss` | 12 | D |
| `rarity` | enum | 5 | 5 | D |
| `tab`, `surface`, `entry` | enum | shop tab / where an offer showed / where the shop was opened from | ≤ 10 each | D, D, BQ |
| `product_id` | enum | `remove_ads, starter_pack, premium_collection_pack, founders_pack` (+ P7 additions) | ≤ 8 | D |
| `price_micros` | int | store price × 10⁶ | — | M |
| `currency_code` | str | ISO 4217 | ~40 | BQ |
| `reason` | enum | suppression or failure reason | ≤ 15 | D |
| `code` | int | RevenueCat error code (D-09) | ≤ 40 | BQ |
| `result`, `restored` | enum / int | `ok, none, error` / count | — | BQ / M |
| `placement` | enum | `campaign_2x, endless_2x, endless_revive, free_fragments, show_me, interstitial_next` | 6 | D |
| `format` | enum | `interstitial, rewarded` | 2 | D |
| `secs_since`, `wins_since` | int | since the last full-screen ad | — | M |
| `stage` | enum | `pre_shown, pre_yes, pre_no, os_granted, os_denied, settings_open` | 6 | D |
| `trigger` | enum | `daily_2nd, streak_3, settings` (+ P9 review triggers) | ≤ 8 | D |
| `notif_type` | enum | `daily, streak, weekly, comeback` | 4 | D |
| `day_offset`, `via` | int / enum | 0–14 / `os, settings` | — | BQ |
| `content_type` | enum | `daily, run, world, level` | 4 | D |
| `step` | int | onboarding step 1–6 (§5.B) | 6 | D |
| `boot_ms` | int | cold start → MainMenu interactive | — | M |
| `splash_skipped` | int | 0/1 | 2 | BQ |
| `levels_cleared` | int | — | — | M |

**Totals:** 41 event-scoped dimensions and 16 metrics. That is within the 50/50 quotas, with room for P7–P10.

---

## 5. Event catalogue

**Owner** = the solo developer for everything. The column names the dashboard or query that consumes the event (§8).

### A. Automatic (never logged by us)

| Event | Question | Dashboard |
|---|---|---|
| `first_open` (+ Play referrer `utm_*` campaign attribution) | Acquisition volume and source; the base of Day-N cohorts | DB-RET, DB-ACT |
| `session_start`, `user_engagement` | Sessions per DAU; engagement time; Day-N activity | DB-RET |
| `app_update`, `os_update`, `app_remove` | Update adoption; uninstall timing relative to the last level | DB-TECH, `q_stuck` |
| `in_app_purchase` (Play billing) | Revenue of record (we never duplicate it) | DB-MON |
| `ad_impression` (AdMob-linked) | Ad revenue per format and unit | DB-MON |
| `screen_view` (**manual**, P0) | Navigation paths; menu dead-ends; time in TODAY/shop | DB-ACT, DB-LOOP |

### B. Activation and onboarding

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `app_launch` | `boot_ms`, `splash_skipped` | How heavy is the splash tax (audit §G.4 #3)? Does boot time predict D1? | DB-TECH, `q_retention_dn` |
| `tutorial_begin` | — | Do new players reach the first press? | DB-ACT |
| `onboarding_step` | `step` (1 menu shown, 2 PLAY tapped, 3 L1 armed, 4 L1 won, 5 NEXT tapped, 6 L3 won) | Where exactly do first-session players drop before the first real progress? | DB-ACT funnel |
| `tutorial_complete` | — (fires at the first-ever win; replaces `onboarding_complete`) | Activation: % of `first_open` reaching a first win in session 1; time to first win. **Key event.** | DB-ACT |

### C. Core loop

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `level_start` | `level_id, level, world, mode, attempt, replay, boss, relief_tier` | Funnel reach per level; retry depth; replay share | DB-LVL `q_level_health` |
| `level_end` | `level_id, level, world, mode, attempt, success, cause, duration_ms, stars, stars_new, gem, under_par, assisted, relief_tier, replay, boss` | FASR, APS, QAF, time-to-pass/abandon, death-cause mix, par calibration (3★ rate 25–40%), gem discoverability (all §7). **3★ and gem are params here, not separate events.** A boss complete = `level_end{boss:1, success:1}` (with `world_complete` on the first clear). | DB-LVL `q_level_health`, `q_ttp` |
| `relief_offered` | `level_id, relief_tier` | Is the D-07 ladder reaching struggling players at the right moment? | DB-LVL |
| `relief_used` | `level_id, relief_tier, kind, cost` (replaces `hint_used`) | Relief usage < 15% of attempts in W1–4 (MASTER P3)? Which levels need relief? Token vs rewarded mix | DB-LVL |

### D. Progression and mastery

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `world_start` | `world` | Macro funnel entry per world | DB-PROG |
| `world_unlock` | `world, method` | Is the open frontier (D-07) unlocking by clears or by stars? | DB-PROG |
| `world_complete` | `world, levels_cleared` (first boss clear) | Macro progression; A/B goal. **Key event.** | DB-PROG, A/B |
| `world_mastered` | `world` | Does mastery happen, and does it predict D30? | DB-PROG |
| `mode_unlock` | `mode` (`remix, boss_rush, time_attack`) | Do post-game hooks reach players before churn? | DB-PROG |
| `unlock_achievement` | `achievement_id` (replaces `achievement_unlocked`) | Meta engagement; which achievements are never reached | DB-PROG |
| `collection_complete` | `collection_id` | Do earn-only collections get completed? | DB-PROG, DB-ECO |

### E. Daily, weekly and habit loops

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `daily_start` | `daily_no, tier, level_id, modifier, sched` | Daily participation (≥ 25% of DAU); tier mix; how often the schedule falls back to hash | DB-LOOP `q_loops` |
| `daily_complete` | `daily_no, tier, level_id, modifier, attempt, first_try, stars, duration_ms, streak, paid` | Daily clear rate and first-try rate per tier/modifier (target 30–50%); does a streak predict D7? **Key event.** | DB-LOOP |
| `weekly_start` | `week_id` (first Orbit point of the week) | Weekly participation as % of WAU | DB-LOOP |
| `weekly_milestone` | `week_id, milestone, points` | Orbit calibration: ≥ 50% of WAU at M1, ≥ 20% at M5 | DB-LOOP |
| `weekly_complete` | `week_id` (M5) | Completion; seal accumulation. **Key event.** | DB-LOOP |
| `mission_complete` | `mission_type, difficulty, slot` | Which missions get done; do missions move players across modes? | DB-LOOP |
| `mission_swap` | `mission_type, difficulty` | Which missions players dislike (swap rate by type) | DB-LOOP |
| `login_bonus` | `day, cycle, gap_days` | Calendar engagement; how often the pause (D-18) saves progress | DB-LOOP |
| `comeback_gift` | `days_away, freeze_granted` | Comeback reach; do gifted players return ≥ 2 sessions in 7 days? | DB-LOOP |
| `streak_frozen` | `streak` | Freeze usage; slack value | DB-LOOP |
| `streak_broken` | `kind, count` | Daily breaks without return within 48 h (a churn signal); win-streak noise | DB-LOOP, churn |
| `win_streak` | `count` (at milestones) | Is FLOW a real skill signal after the first-try rule? | DB-LVL |

### F. Gravity Run

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `run_start` | `mode, run_no, week_id` | Mode adoption; runs per DAU among adopters (P8 target ≥ 1.5) | DB-LOOP |
| `post_score` | `score, mode, new_best, revived, duration_ms, chunks, cause` | Median run 60–180 s (P8)? Revive impact; how fast novelty dies (score plateau) | DB-LOOP |

### G. Economy and cosmetics

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `earn_virtual_currency` | `virtual_currency_name, value, source, balance` (replaces `fragment_earned`, `reward_double_stardust`) | Faucets by source; is P6 inflating Stardust? | DB-ECO `q_economy` |
| `spend_virtual_currency` | `virtual_currency_name, value, item_name, balance` | Sinks; hoarding (high balance, no spend) | DB-ECO |
| `cosmetic_unlock` | `item_id, method, rarity` | Earned vs bought unlocks; are mastery and seal cosmetics reached? | DB-ECO |
| `cosmetic_equip` | `item_id` | Which cosmetics are actually worn | DB-ECO |

### H. Shop and IAP

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `shop_open` | `tab, entry` | Shop reach and entry points | DB-MON `q_iap_funnel` |
| `store_tab` | `tab` | Intent depth (the Bundles tab is the strongest signal) | DB-MON |
| `product_view` | `product_id, surface` | IAP view: which offers are seen, and where | DB-MON |
| `bundle_cross_sell` | `item_id, product_id` (fixes the camelCase `bundleId`) | Per-item IAP intent | DB-MON |
| `store_nudge_shown` / `store_nudge_tapped` | — | Does the honest spend nudge convert? | DB-MON |
| `purchase_initiated` | `product_id, surface` | IAP start | DB-MON |
| `purchase_pending` | `product_id` | Pending-payment share (D-09 code 20) | DB-MON |
| `purchase_completed` | `product_id, price_micros, currency_code` (no `value`/`currency`, §2) | IAP success per product and region | DB-MON |
| `purchase_failed` | `product_id, reason, code` | Failure taxonomy (cancel vs network vs already owned) | DB-MON |
| `first_purchase` | `product_id` | Payer conversion (P7 ≥ 1.5%) | DB-MON |
| `purchase_restore` | `result, restored` (replaces `restore`) | Restore health | DB-MON |

### I. Ads

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `rewarded_offered` | `placement` | Offer reach per surface | DB-MON `q_ads_funnel` |
| `rewarded_shown` | `placement` | Opt-in (P7 ≥ 20% of offers) | DB-MON |
| `rewarded_earned` | `placement` | Completion: rewarded **complete** | DB-MON |
| `rewarded_cancel` | `placement` | Early closes: rewarded **cancel** (audit hang bug class) | DB-MON |
| `interstitial_shown` | `placement, secs_since, wins_since` | Impressions per DAU ≤ 1.5 (P7); D-24 cap audit | DB-MON |
| `interstitial_suppressed` | `reason` | Is the retention-first cadence working? | DB-MON |
| `ad_fail` | `format, placement, reason` | Load and show failures; offers hidden when not ready | DB-MON, DB-TECH |

### J. Notifications and social

| Event | Params | Product question | Dashboard / query |
|---|---|---|---|
| `notif_prompt` | `stage, trigger` | Opt-in funnel: os_granted ÷ pre_shown ≥ 35% | DB-NOTIF `q_notif` |
| `notif_open` | `notif_type, day_offset` | Efficacy: open → `level_start` within 30 min, by type | DB-NOTIF |
| `notif_disabled` | `via` | Weekly disable rate < 3% of granted players | DB-NOTIF |
| `share` | `method, content_type, item_id` | Viral volume; Daily share rate = shares ÷ `daily_complete` | DB-LOOP |
| `review_request` | `trigger` (P9; the name is reserved now) | Review-prompt reach vs rating changes | P9 |

### K. Churn indicators (derived, no events)

| Indicator | Definition | Action |
|---|---|---|
| Same-level fail streak | ≥ 3 consecutive `level_end{success:0}` on one `level_id` in a session | Relief ladder (D-07); flag the level |
| QAF wall | QAF at L > 2× the world median | Level rework queue (P4 waves) |
| Broken Daily streak, no return | `streak_broken{kind:'daily'}` without a session within 48 h | Comeback cohort review |
| Session-gap growth | Each inter-session gap > 1.5× the previous one, over 3 sessions | Notification-plan review |
| No activation | No `tutorial_complete` in session 1 | Onboarding funnel review |
| Shop without play | `shop_open` with no `level_start` in the session | Shop entry-point review |
| Notifications off | `notif_disabled` | Copy and cadence review |

57 custom events in total (B–J), plus the manual `screen_view`. That is well under 500.

---

## 6. User properties (10 of 25)

| Property | Values | Set when | Question |
|---|---|---|---|
| `furthest_level` | 1–150 | On first clear | Segment every metric by progress |
| `furthest_world` | 1–15 | On world unlock | Coarser progress segment |
| `stars_bucket` | `0-29, 30-89, 90-199, 200+` | After `level_end` with `stars_new > 0` | Mastery segment |
| `daily_streak_bkt` | `0, 1-2, 3-6, 7-13, 14-29, 30+` | At launch and on `daily_complete` | Habit segment; notification cap logic check |
| `payer` | `none, noads, bundle` | From entitlements (D-09) | Monetization segment; never used for difficulty |
| `notif_state` | `unasked, declined, granted, denied` | Every launch (re-read OS state) | Notification cohorts |
| `modes_used` | Sorted letters from `C D R W X B T` (campaign, daily, run, weekly, remix, boss rush, time attack), ≤ 7 chars | On the first use of a mode | Breadth of engagement; does breadth predict D30? |
| `first_app_ver` | versionName at first launch | Once | Separate beta from production cohorts |
| `pgs` | `0/1` (`0` until P8 ships PGS) | P8 sign-in | PGS adoption (D-17) |
| `reduce_motion` | `0/1` | On change | Accessibility reach; any metric gap for reduced motion |

Bucketing lives in a pure `analyticsProps.ts`, tested. Names are ≤ 24 chars and values ≤ 36.

---

## 7. Derived metrics and thresholds

**Day boundaries.** Day boundaries follow the GA4 property reporting timezone, which is set to **UTC** on day 1. Changing it later splits history. All metrics exclude developer devices (§13).

| Metric | Definition | Target / flag |
|---|---|---|
| **D1 / D7 / D30** | Classic Day-N: users whose `first_open` is on day 0 with ≥ 1 engaged session on day N exactly ÷ day-0 cohort. Not rolling retention, which always reads higher. | ≥ 30% / ≥ 10% / ≥ 4% (MASTER-ROADMAP P6). Benchmarks: median D1 ~20–22%, top-25% D7 6–7% (research Q4). |
| **Activation** | % of `first_open` users with `tutorial_complete` in `ga_session_number = 1` | ≥ 90%; median time to first win ≤ 30 s of sim time |
| **Early completion** | % of D0 users with `world_complete{world:1}` by end of D0 | ≥ 50% |
| **FASR** (first-attempt success rate) | `level_end{success:1, attempt:1}` ÷ `level_start{attempt:1}` per `level_id` | W1–3 ≥ 70%. Flag any non-boss level < 40% (Bruin). P4 per-slot targets from game-design §2. |
| **APS** (attempts per success) | Median `attempt` at the user's first success on the level | ≤ 3 (≤ 6 for bosses) |
| **QAF** (quit after fail) | Users whose session's last `level_end` is `success:0` at L ÷ users with ≥ 1 fail at L | Flag > 2× the world median |
| **Stuck rate** | Users with `furthest_level = L` and no session for ≥ 7 days ÷ users who reached L (BigQuery) | Flag > 2× neighbours or > 10% |
| **Time-to-pass** | Per user and level, Σ `duration_ms` of attempts up to and including the first success; median and p90 | Flag a non-boss median > 120 s, a boss > 300 s ("hard levels should be short", King) |
| **Time-to-abandon** | Σ `duration_ms` for stuck users on L | Compare against time-to-pass |
| **3★ rate** | Clearers whose best is 3★ ÷ clearers | 25–40% per level after P4 (game-design §2) |
| **Gem discovery** | Clearers with the gem ÷ clearers | 30–60% |
| **Relief usage** | `relief_used` ÷ `level_start` in W1–4 | < 15% |
| **Daily participation** | DAU with `daily_start` ÷ DAU (and ÷ Daily-eligible DAU) | ≥ 25% (≥ 40% of eligible) |
| **Daily first-try** | `daily_complete{first_try:1}` ÷ `daily_complete` per tier | 30–50% |
| **Orbit reach** | WAU with `weekly_milestone{milestone:1}` / `{5}` ÷ WAU | ≥ 50% / ≥ 20% |
| **Notification opt-in** | `notif_prompt{stage:os_granted}` ÷ `{stage:pre_shown}` | ≥ 35% |
| **Notification disable** | `notif_disabled` in week ÷ users with `notif_state = granted` at the week start | < 3%/week |
| **Notification efficacy** | `notif_open` followed by `level_start` within 30 min ÷ `notif_open` | Track by type; prune types < 30% |
| **Share rate** | `share{content_type:daily}` ÷ `daily_complete` | Baseline at M2; P9 overall ≥ 3% of DAU |
| **Economy health** | Days of currency on hand = median balance ÷ median daily earn; % of DAU with an affordable unowned item | P7 sets targets; P6 alert if days-on-hand > 30 |
| **Crash-free sessions** | Crashlytics | ≥ 99.5% (MASTER P0) |

---

## 8. Dashboards and queries

| Code | Surface | Contents | Built in |
|---|---|---|---|
| DB-ACT | GA4 Funnel exploration | `first_open` → `onboarding_step` 1–6 → `tutorial_complete` → `world_complete{1}` | P06-T22 |
| DB-RET | GA4 Cohort exploration + `q_retention_dn` | D1/D7/D30 by `first_app_ver`, `notif_state`, `modes_used` | P06-T22 |
| DB-LVL | Looker Studio on BigQuery `agg_level_daily` | FASR/APS/QAF/TTP/3★/gem per level; the worst 10 by QAF | P06-T22 |
| DB-PROG | GA4 Explore | World funnel, mastery, mode unlocks, achievements | P06-T22 |
| DB-LOOP | GA4 Explore + `q_loops` | Daily participation and tiers; missions; Orbit; login; comeback; runs; shares | P06-T22 |
| DB-ECO | Looker Studio on `agg_economy` | Faucets/sinks by source; balances | P06-T22 |
| DB-MON | GA4 + AdMob + RevenueCat | Ads and IAP funnels (`q_ads_funnel`, `q_iap_funnel`) | P06-T22 (P7 extends) |
| DB-NOTIF | GA4 Funnel + `q_notif` | Prompt funnel, opens by type, weekly disable | P06-T22 |
| DB-TECH | Crashlytics + Play Vitals | Crash-free rate, ANR, `app_launch.boot_ms`, `ad_fail` | P0 / P06-T22 |

The SQL files live in `scripts/analytics/queries/`: `q_level_health.sql`, `q_ttp.sql`, `q_stuck.sql`, `q_retention_dn.sql`, `q_loops.sql`, `q_economy.sql`, `q_ads_funnel.sql`, `q_iap_funnel.sql`, `q_notif.sql`. The weekly aggregate job (§13) runs them.

---

## 9. Consent timing and privacy

### 9.1 Boot order (D-10), as wired in P0

1. **Manifest:**
   - `google_analytics_default_allow_analytics_storage`, `_ad_storage`, `_ad_user_data` and `_ad_personalization` are all **`false`** (Consent Mode v2 defaults denied).
   - `google_analytics_automatic_screen_reporting_enabled=false`.
   - `firebase_crashlytics_collection_enabled=false`.
2. Firebase initializes. The JS seam (`Analytics.ts`) is **queued**: `track()`, `screen()` and `setUserProp()` append to an in-memory FIFO capped at **50 events**, dropping the oldest.
3. UMP `requestConsentInfoUpdate` runs, followed by `showConsentForm` when required. Firebase initializes before UMP (research Q1).
4. Apply the outcome. If consent is not required, call `setConsent` with all four types granted. If consent was obtained, UMP ≥ 3.2 writes consent mode; read it back and log it to logcat ("Setting consent").
5. **Flush the queue.** With `analytics_storage` denied, the SDK sends cookieless pings without identifiers. That is lawful; denied users simply don't join cohorts.
6. Crashlytics collection follows the analytics choice after consent resolves. This is the D-10 default, pending a legal check.
7. AdMob initializes **only when `canRequestAds`** (D-10).

### 9.2 Settings entry points

| Row | Behaviour |
|---|---|
| Privacy choices | Shown when UMP status is REQUIRED; `showPrivacyOptionsForm()` |
| Privacy policy | Opens the hosted policy |
| Share anonymous usage data | Off → `setEnabled(false)` + all consent denied + queue cleared. On → re-enabled. |
| Reset analytics data | `resetAnalyticsData()`, which issues a new app-instance ID |
| Analytics ID | Shows the copyable `app_instance_id`, so deletion requests can name it |

### 9.3 Data minimisation

- No `setUserId`.
- No free-text params. Every string param is an enum or one of our own catalog ids, ≤ 40 chars.
- No advertising ID, IP, device model or locale in params; GA collects its own automatic fields only.
- Counters go into user properties as **buckets** (`stars_bucket`, `daily_streak_bkt`).
- Consent choices are never logged as events.
- Notifications, missions, streaks and progress stay on-device. Data safety calls this "local only, not declared" (compliance §2).
- Remote Config and A/B use the Firebase installation ID, which is already declared under "Device or other IDs".

### 9.4 Retention and deletion

| Store | Retention | Deletion |
|---|---|---|
| GA4 | **14 months** (set on day 1; retroactive within the current window) | GA User Deletion API by `app_instance_id`: removed from reports within 72 h, purged in about 2 months (compliance §2) |
| BigQuery | Sandbox: 60-day table expiry. Blaze (from M2): raw partitions 425 days ≈ 14 months; aggregates (no identifiers) kept | Raw rows `DELETE … WHERE user_pseudo_id = …` (needs Blaze; in the sandbox, rows expire within 60 days) |
| Crashlytics | About 90 days (verify in the console) | No user identifiers are set, so there is nothing to look up |
| RevenueCat | Per the RevenueCat policy | Delete the customer (dashboard/REST) |
| On device | Until uninstall | "Reset analytics data"; uninstall |

**Deletion process:**
1. A request arrives by email.
2. We ask for the in-app Analytics ID.
3. We run the GA deletion, the BigQuery delete and the RevenueCat delete.
4. We confirm within **30 days**.

### 9.5 Data safety alignment

| Plan element | Play data type | Declared (compliance §2) |
|---|---|---|
| Events and user properties | App activity › App interactions | Yes (collected; not shared by Firebase) |
| `purchase_*` with `product_id` and `price_micros` | Financial info › Purchase history | Yes |
| GA coarse location from IP | Location › Approximate | Yes |
| App-instance ID, Firebase installation ID (RC/A/B) | Device or other IDs | Yes |
| Crashlytics keys and logs (§12) | Crash logs; Diagnostics | Yes |
| Local notifications, streaks, missions, Daily records | — (on-device) | Not declared |

Re-check the SDK disclosure pages at every SDK bump (compliance §2). Add Remote Config/A/B Testing and local notifications to the privacy-policy SDK table in P06-T22.

---

## 10. Remote Config

### 10.1 Loading (D-14)

- **At boot:** `activate()` the cached values, then `fetchAndActivate()` with a **3 s timeout** in parallel with the splash (CompanySplash + IntroSplash ≈ 5.5 s). This is Firebase's "behind a loading screen" pattern, which it recommends for A/B tests.
- **Session snapshot:** when MainMenu first reads RC, `rcConfig` freezes a **session snapshot**. Values never change mid-session.
- **Fetch interval:** 43,200 s (12 h) in production, 0 in debug builds. No real-time listener.
- **Plugin:** `@capacitor-firebase/remote-config` 8.5.2, matching capacitor-firebase 8.5.2 (D-11). It is reached through the `registerPlugin` proxy pattern in `src/utils/native/`, like `firebaseAnalytics.ts`.

### 10.2 `rcConfig.ts` (pure, TDD)

- **Pipeline:** `parse → type-check → clamp → fall back to the shipped constant`. Malformed JSON, a wrong type or an out-of-range value yields the default, never a crash.
- **Defaults** import the shipped constants (`RETENTION`, `INTERSTITIAL`, `PHYSICS`). The drift test `rcConfig.test.ts` asserts `RC_DEFAULTS` equals them, and the console template is exported from the same object.
- **Clamps encode DECISIONS.** RC can make the game *more* conservative, never less.
- `rc_schema` gates JSON shapes. A value whose `schema` is newer than the client's is ignored, so old builds stay safe (unknown kinds are skipped, P10).

### 10.3 Key catalogue

| Key | Type | Default (= shipped constant) | Clamp / validation | Phase |
|---|---|---|---|---|
| `rc_schema` | int | 1 | ≥ 1 | P6 |
| `par_time_mult` | number | 1.0 | 0.8–1.5 | P6 (P4 uses) |
| `par_mult_by_world` | JSON `{ "1": 1.0, … }` | `{}` | each 0.8–1.5; worlds 1–15 | P6 |
| `time_limit_mult` | number | 1.0 | 0.8–1.5 | P6 |
| `relief_hint_fails` / `relief_showme_fails` / `relief_skip_fails` | int | 3 / 6 / 10 (D-07) | 2–6 / 4–10 / 6–15, strictly ascending | P3 const → P6 RC |
| `relief_skip_ms` | int | 240000 (D-07: 4 min) | 120000–600000 | P6 |
| `daily_schedule` | JSON date → `{mod, t1, t2, t3}` | `{}` (hash fallback) | ISO dates; `mod` ∈ enum; ids must exist in the pool, else that tier falls back | P6 |
| `daily_payout` | JSON `{base, per_star}` | `{15, 3}` (`currency.ts`) | base 0–30, per_star 0–5 | P6 |
| `daily_count_rewards` | JSON `{"3":10,"7":25,"14":50,"30":100}` | = `daily.ts#streakReward` | each 0–150 | P6 |
| `streak_freeze_every` | int | 7 (`RETENTION.STREAK_FREEZE_GRANT_EVERY`) | 5–14 | P6 |
| `streak_freeze_max` | int | 3 (`RETENTION.STREAK_FREEZE_MAX`) | 1–3 | P6 |
| `login_ladder` | JSON 7×`{sd,fr}` | = `RETENTION.LOGIN_BONUS_LADDER` | exactly 7 entries; sd 0–100, fr 0–5 | P6 |
| `missions_per_day` | int | 3 | 0–3 (0 = missions off) | P6 |
| `mission_rewards` | JSON `{easy,medium,hard,all_bonus_fr}` | `{5,10,15,1}` | each 0–50; bonus 0–3 | P6 |
| `mission_weights` | JSON type → weight | all 1 | 0–5; unknown types ignored | P6 |
| `weekly_track` | JSON `{thresholds[5], rewards[5]}` | `[4,8,13,18,24]`, rewards per RETENTION §5.1 | strictly ascending, 1–60 | P6 |
| `weekly_track_enabled` | bool | true | — | P6 |
| `comeback_min_days` | int | 7 (D-18) | **≥ 7**, ≤ 30 | P6 |
| `comeback_gift` | JSON `{sd, freeze_if_streak}` | `{50, 7}` | sd 0–150 | P6 |
| `notif_enabled` | bool | true | kill switch | P6 |
| `notif_max_per_week` | int | 4 (D-15) | **0–4** | P6 |
| `notif_max_per_week_casual` | int | 3 | 0–4 | P6 |
| `notif_quiet_start` / `notif_quiet_end` | int (hour) | 21 / 9 (D-15) | 19–21 / 9–11 (can only widen) | P6 |
| `notif_default_minute` / `notif_latest_minute` | int | 1110 (18:30) / 1200 (20:00) | 570–1200 / 900–(quiet_start × 60 − 60) | P6 |
| `share_enabled` / `share_link_enabled` | bool | true / true | — | P6 |
| `postgame_enabled` | bool | true | — | P6 |
| `ads_interstitial_enabled` | bool | true | kill switch | P0/P7 |
| `ads_inter_min_lifetime_level` | int | 12 (D-24) | **≥ 12** | P7 |
| `ads_inter_min_secs` | int | 180 (`INTERSTITIAL.MIN_GAP_MS`/1000) | **≥ 180** | P7 |
| `ads_inter_min_completions` | int | 3 (D-24) | **≥ 3** | P7 |
| `ads_inter_max_session` / `ads_inter_max_day` | int | 4 / 10 (D-24) | **0–4 / 0–10** | P7 |
| `rewarded_2x_every_wins` / `rewarded_2x_max_day` | int | 3 / 4 (D-24) | **≥ 3 / 0–4** | P7 |
| `rewarded_surfaces` | JSON placement → bool | all true | unknown placements ignored | P7 |
| `store_nudge_cooldown` | int | 6 (`STORE.NUDGE_COOLDOWN_WINS`, `monetization.config.ts`) | ≥ 3 | P7 |
| `review_min_wins` | int | 15 | ≥ 10 | P9 |
| `event_calendar` | JSON `[]` | `[]` | unknown `kind` ignored (P10 schema) | P10 |

**Rules for date-dependent content:**
- Such content (`daily_schedule`, `event_calendar`) is published as **dated entries** and resolved **once per date and persisted** (`DailyStore.today`), so it is never retroactive (D-14).
- Gameplay multipliers (`par_*`, `time_limit_mult`) apply from the next session snapshot.
- Stars already earned are never revoked (ProgressStore keeps the max).

---

## 11. A/B testing policy

**Tooling.** Firebase A/B Testing on Remote Config. Bucketing happens behind the splash (§10.1), so first-session users are assigned before any gameplay.

**Rules:**
1. **Pre-register** every test in `docs/analytics/EXPERIMENTS.md` (created by P06-T22). Record:
   - hypothesis
   - primary metric
   - guardrails: crash-free sessions, D1, `rewarded_shown` rate, `notif_disabled`
   - MDE (minimum detectable effect)
   - n per arm, from the table below
   - fixed end date, **≥ 14 days** (Firebase recommends at least 14)
2. **No peeking** and no early stop for "winning".
3. **Limit concurrency.** At most one experiment per surface and ≤ 2 concurrent.
4. **Never test:**
   - real-money prices (use Play price experiments, P7)
   - consent UI
   - anything outside DECISIONS (notification caps above D-15, ad caps below D-24 floors, purchasable freezes)
   - Daily fairness: everyone on a tier gets the same Daily
5. **Small-DAU rule.** Below about 300 installs/day, test only large swings: interstitials on/off, the par multiplier, the early curve, `missions_per_day` 0 vs 3. Prefer high-frequency per-user metrics such as `world_complete{world:1}` and Daily participation. Use **RC Rollouts** (staged percentage + crash-free watch) for everything else.
6. **Report nulls** as results.

**Sample size.** Two arms, α = 0.05, 80% power: `n per arm ≈ 15.7 · p(1−p) / δ²` (research Q3). Days = 2n ÷ eligible users per day, with a 14-day minimum.

| Metric | Baseline | Detect | n per arm | Days at 30 / 100 / 300 installs/day |
|---|---|---|---|---|
| D1 | 25% | +3 pp | ~3,300 | 220 / 66 / 22 |
| D1 | 25% | +5 pp | ~1,200 | 80 / 24 / 14 |
| D1 | 25% | +8 pp | ~460 | 31 / 14 / 14 |
| D7 | 8% | +2 pp | ~2,900 | 193 / 58 / 19 |
| D7 | 8% | +4 pp | ~720 | 48 / 14 / 14 |
| L1–10 completion | 60% | +5 pp | ~1,500 | 100 / 30 / 14 |
| W1 complete on D0 | 50% | +10 pp | ~390 | 26 / 14 / 14 |
| Notification opt-in (per prompted player) | 35% | +10 pp | ~360 prompted | depends on prompt reach |
| Rewarded opt-in (per offered user) | 20% | +5 pp | ~1,000 | depends on offer reach |

**Implication.** At launch-scale DAU (likely 30–100 installs/day), only D1 swings of ≥ +8 pp and completion swings of ≥ +10 pp are testable within a month. Everything else is a Rollout plus a before/after read with explicit caveats.

---

## 12. Crashlytics custom keys

There are 64 keys available; we use 14. They are set through the P0 error boundary (`Crash.ts`) and updated on change.

| Key | Values | Set when |
|---|---|---|
| `scene` | scene key | each scene `create()` |
| `mode` | §4 `mode` enum | level or run start |
| `level_id` | D-05 id | level start |
| `attempt` | int | arm |
| `sim_ms` | int (rounded to 100 ms) | every 1 s while armed |
| `quality_tier` | `low, mid, high` (D-13) | boot + watchdog step-down |
| `renderer` | `webgl, canvas` | boot |
| `webview_ver` | Chrome major from the UA | boot |
| `build` | versionCode (D-20) | boot |
| `rc_tpl` | the active RC template version | after activation |
| `consent_an` | `granted, denied` | after consent resolves |
| `notif_state` | §6 enum | launch |
| `daily_no` | int | Daily start |
| `save_v` | the store schema versions, e.g. `d2.m1.w1.n1` | boot (after D-12 hydrate) |

**Logs and exceptions:**
- **Logs:** `Crash.log` on scene transitions, `level_start` and `level_end` (64 kB per session).
- **Non-fatals:** `window.onerror` and `unhandledrejection` go to `recordException`, deduplicated by message hash and capped at 5 per session (research Q1; P0 step 5).

---

## 13. BigQuery

1. **M1 (closed beta): link the free sandbox.** Constraints [DOC; verify the list on the sandbox page at setup]:
   - every table expires after **60 days**
   - 10 GiB storage, 1 TiB/month of queries
   - no streaming, no DML, and **no Data Transfer Service, which means no scheduled queries**

   The "weekly aggregate job" therefore runs **outside** BigQuery: `scripts/analytics/weekly-aggregates.mjs` (P06-T22) runs each `scripts/analytics/queries/*.sql` with `bq query --format=csv` every Monday and writes `analytics-archive/<week_id>/*.csv`. That folder is gitignored, aggregated, and holds no identifiers; it is mirrored to the owner's Drive. **This is the only defence against the 60-day expiry during the beta.**
2. **M2 (before the production rollout): upgrade the Firebase project to Blaze**, with a **$5/month budget alert**.
   - Set the `analytics_<property>` dataset's partition expiration to 425 days (≈ GA's 14 months).
   - Create a `gf_agg` dataset with no expiration.
   - Convert the job to a BigQuery **scheduled query** (Mondays 06:00 UTC) writing `gf_agg.agg_level_daily`, `agg_retention`, `agg_loops`, `agg_notif` and `agg_economy`.
   - Expected cost at this scale: storage far below the free 10 GiB and queries far below the free 1 TiB, so about $0.
3. **Developer traffic:**
   - exclude the `user_pseudo_id`s listed in `scripts/analytics/dev-devices.txt` (gitignored)
   - exclude debug builds by `app_info.version` suffix
   - remember that DebugView events *are* exported (research Q1)
4. **Aggregates hold no identifiers.** They are counts and medians per `level_id`, day, week or cohort. They outlive raw data by design.

---

## 14. Migration from the current events

There is no production history, so names change freely. Closed-beta (M1) data before P6 is analysed on the old names and then abandoned.

| Old (`analyticsEvents.ts`) | New | Note |
|---|---|---|
| `session_start` | — (automatic) | Removed in **P0** (reserved name) |
| `level_start{level, world}` (per scene create) | `level_start{level_id, level, world, mode, attempt, replay, boss, relief_tier}` **at arm** | D-02 semantics |
| `level_complete{level, stars, time_ms}` | `level_end{success:1, cause:'win', …}` | — |
| `level_fail{level, cause}` (Daily logged as level 0) | `level_end{success:0, cause, …}`; the Daily uses `mode:'daily'` + `level_id` | fixes audit §G.3 |
| `retry{level}` | `level_end{success:0, cause:'restart'}` | — |
| `world_start{world}` | `world_start{world}` | kept |
| `world_complete{world}` | `world_complete{world, levels_cleared}` | — |
| `daily_start{index, modifier}` | `daily_start{daily_no, tier, level_id, modifier, sched}` | once per day |
| `daily_complete{streak}` | `daily_complete{…, attempt, first_try, stars, duration_ms, streak, paid}` | once per day |
| `achievement_unlocked{id}` | `unlock_achievement{achievement_id}` | recommended name |
| `onboarding_complete` | `tutorial_complete` | recommended name |
| `win_streak{count}` | `win_streak{count}` | kept |
| `streak_broken{count}` (win only) | `streak_broken{kind, count}` | adds Daily breaks |
| `login_bonus{day}` | `login_bonus{day, cycle, gap_days}` | D-18 calendar |
| `streak_frozen{streak}` | kept | — |
| `shop_open{tab}` | `shop_open{tab, entry}` | — |
| `store_tab{tab}`, `store_nudge_shown`, `store_nudge_tapped` | kept | — |
| `bundle_cross_sell{bundleId}` | `bundle_cross_sell{item_id, product_id}` | snake_case fix |
| `cosmetic_equip{id}` | `cosmetic_equip{item_id}` | — |
| `purchase_initiated{product}` | `purchase_initiated{product_id, surface}` | — |
| `purchase_completed{product}` | `purchase_completed{product_id, price_micros, currency_code}` | — |
| `purchase_failed{product, reason}` | `purchase_failed{product_id, reason, code}` | D-09 codes |
| `first_purchase{product}` | `first_purchase{product_id}` | — |
| `restore` | `purchase_restore{result, restored}` | — |
| `rewarded_offered/shown/earned{source}` | same names, `{placement}` | `source` is reserved for faucets |
| `interstitial_shown` | `interstitial_shown{placement, secs_since, wins_since}` | — |
| `interstitial_suppressed{reason}` | kept | — |
| `fragment_earned{amount, source}` | `earn_virtual_currency{virtual_currency_name:'fragments', value, source, balance}` | recommended |
| `reward_double_stardust{amount}` | `earn_virtual_currency{…, source:'rewarded_2x'}` | — |
| `hint_used{level}` (fires on every hint *exposure*) | `relief_used{level_id, relief_tier, kind, cost}` (on use) | semantic fix |
| `collection_complete{collection}` | `collection_complete{collection_id}` | — |
| — | new: `app_launch`, `tutorial_begin`, `onboarding_step`, `relief_offered`, `world_unlock`, `world_mastered`, `mode_unlock`, `weekly_*`, `mission_*`, `comeback_gift`, `run_start`, `post_score`, `spend_virtual_currency`, `cosmetic_unlock`, `product_view`, `purchase_pending`, `rewarded_cancel`, `ad_fail`, `notif_*`, `share`, `review_request` | — |

**GA4 admin:** register the §4 dimensions and metrics and the §6 user properties **on the day the M1 build ships**, because definitions take 24–48 h and aren't retroactive. Mark the key events `tutorial_complete`, `world_complete`, `daily_complete`, `weekly_complete` and `purchase_completed`.

---

## 15. Validation

### 15.1 Automated (`npx vitest run`)

| Test | Asserts |
|---|---|
| `src/utils/analyticsEvents.test.ts` (extended) | Every factory's output: name matches `^[a-z][a-z0-9_]{0,39}$`, is not in the §2 reserved list, has no reserved prefix; ≤ 25 params; param names valid and not reserved; numbers finite; strings ≤ 100; enum params ∈ allowed sets; required params present; never `value`+`currency` together |
| `src/utils/analyticsSchema.test.ts` (new) | `EVENT_SCHEMA` registry ↔ factories (no unregistered event); every registered param is in `DIMENSIONS` or `METRICS` or marked BQ; dimension count ≤ 50, metric count ≤ 50 |
| `src/utils/analyticsProps.test.ts` (new) | 10 user properties; names ≤ 24, values ≤ 36; bucket edges (29/30, 89/90, 199/200; streak 0/1/2/3/6/7/13/14/29/30) |
| `src/utils/attemptMarker.test.ts` (new) | One `level_end` per `level_start` across win/death/restart/quit/skip; the boot-time `killed` emission |
| `src/utils/rcConfig.test.ts` (new) | Defaults equal the shipped constants (drift); every clamp edge; malformed JSON → default; the D-15/D-18/D-24 floors and ceilings can't be crossed |
| Golden sequences | Fixture event sequences for: first session → first win; Daily first try; Daily 3 tries; quit mid-attempt; app killed |

### 15.2 DebugView checklist (device, per release that touches analytics)

Enable with `adb shell setprop debug.firebase.analytics.app com.truestorylabs.gravityflow`; disable with `.none.`.

1. Fresh install in an EEA locale over a VPN → the UMP form shows before any event. Logcat shows "Setting consent" with the UMP outcome. Then queued events arrive in order.
2. US device → no form; consent granted; events flow.
3. `screen_view` appears once per scene (MainMenu, GameScene, WorldMap, Today overlay…), and no automatic `MainActivity` screen.
4. L1: `tutorial_begin` → `onboarding_step` 1–4 → `level_start{attempt:1}` at the first press, **not** at scene load → `level_end{cause:'win'}` → `tutorial_complete`.
5. Die once, then RETRY → `level_end{cause:'hazard'}`, then `level_end{cause:'restart'}`… → `attempt` increments.
6. Force-stop mid-attempt and relaunch → `level_end{cause:'killed'}` is the first gameplay event.
7. Daily → `daily_start` once; three attempts → three `level_start{mode:'daily'}`; first clear → `daily_complete{paid:1}`; a second clear sends **no** second `daily_complete`.
8. Gravity Run → `run_start`, `post_score`.
9. The pre-prompt → `notif_prompt` stages; tap a test notification → `notif_open`.
10. User properties are visible on the device row (all 10).
11. **Zero `firebase_error`** events and no `firebase_error` params during the whole session.
12. Airplane-mode first launch → the game plays entirely on RC defaults (no crash, Daily via hash fallback).

---

## 16. Review cadence

| Cadence | Duration | Agenda | Output |
|---|---|---|---|
| **Weekly** (Monday, after the aggregate job) | 30 min | D1/D7 of the last cohorts; DB-LVL worst 10 by QAF and FASR; Daily participation and tier mix; notification opt-in and disable; crash-free rate; any metric past a §7 flag | One-line entries in `docs/STATUS.md`; level rework tickets |
| **Monthly** (first Monday) | 60 min | D30; Orbit and mission calibration; economy days-on-hand; A/B readouts; publish next month's `daily_schedule` (≥ 7 days ahead, linted) | RC publish; `EXPERIMENTS.md` updates |
| **Per release** | 15 min | §15.2 DebugView smoke for the changed events; schema lint green | Release checklist tick |
| **Quarterly** | 60 min | Taxonomy audit: unused events, dimension quota, cardinality "(other)" rows, retention settings, SDK disclosure pages | This document revised |
