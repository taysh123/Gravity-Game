# Success Metrics

> **Status:** plan of record from 2026-10-07 (baseline `master @ d3c6aab`).
> **Purpose:**
> - Define what "success" means at every milestone (M0–M3) and every phase (P0–P12).
> - Give each metric an exact formula, its data source and a review cadence.
> - Hold the triggers that would re-open a deferred system (D-30).
>
> **Conforms to:** [`DECISIONS.md`](DECISIONS.md) and [`MASTER-ROADMAP.md`](MASTER-ROADMAP.md).
> **Evidence:** the research briefs ([`../research/`](../research/), condensed in [`../research/RESEARCH-SUMMARY.md`](../research/RESEARCH-SUMMARY.md)) and the audit [`../audit/2026-10-07/STATE-AUDIT.md`](../audit/2026-10-07/STATE-AUDIT.md).

## 1. Principles and labels

1. **Every metric answers a product question** (MASTER §5, analytics track). If no decision would change when a number moves, we don't track it.
2. **Bots are not players** (MASTER §7). Bot metrics (Q-xx) gate *structure*. Player metrics (F-, E-, M-, S-xx) gate *experience*. Neither substitutes for the other.
3. **Small-n honesty.**
   - The closed test has 12–20 players, so every M1 number is a **triage flag, not a statistic**.
   - Below about 300 installs/day, only large swings can be A/B tested (retention Q3).
4. **Consent changes what analytics can see.** With `analytics_storage` denied, Firebase sends measurements "without signals" (retention Q1), so those users are effectively invisible to cohort analysis. For that reason:
   - All GA4/BigQuery rates are **among consented users**.
   - Play Console, AdMob and RevenueCat numbers cover the full population.
   - Never mix the two in one ratio without saying so.
5. **Every target carries a label:**

| Label | Meaning |
|---|---|
| **[DOC]** | A platform threshold or rule from official documentation |
| **[IND]** | An industry heuristic or benchmark from a cited source |
| **[OWNER]** | A roadmap target set in MASTER-ROADMAP, with no external benchmark behind it |
| **[OPN]** | A judgement, to be refitted with real data |

## 2. Measurement stack, event sources and data hygiene

| Source | What it measures | Notes |
|---|---|---|
| **Firebase Analytics (GA4F) → BigQuery** | Funnels, per-level difficulty, retention cohorts, economy, notifications, sharing | Link BigQuery on day one. **The sandbox expires every table after 60 days** (retention Q1), so either a weekly scheduled query writes aggregates to a durable table, or billing is enabled (pennies at this scale). Set GA4 data retention to **14 months** on day one; the default is 2 months. |
| **DebugView** | Event validation | Debug events **are exported to BigQuery**, so every query filters developer traffic (retention Q1). |
| **Crashlytics** | Crash-free sessions, non-fatals, renderer-gone, perf keys | Custom keys: `scene`, `level`, `mode`, `webview_ver`, `renderer`, `build`, plus `quality_tier` and the p50/p95 frame time (retention Q1; UX §5). Only the 8 most recent non-fatals are kept per session. |
| **Play Console** | Android vitals (crash, ANR, wake locks), store listing conversion, acquisition, ratings, pre-launch report | 28-day vitals windows [DOC] (android Q12; launch F1) |
| **AdMob** | Impressions, eCPM, estimated earnings, fill, app-ads.txt status | Link AdMob to Firebase so `ad_impression` is auto-logged (retention Q1) |
| **RevenueCat** | Revenue, transactions, refunds, entitlements, payer counts | Refund revocation can lag up to 24 h (monetization Q1) |
| **`level-quality-report.json`** (bot, D-06) | Per-level gates and difficulty estimates | CI (A0–A3 fast agents) plus nightly (A4–A6 + ablation) |
| **Multi-rate harness + replay CI** (D-01) | Physics parity and determinism | Runs on every PR from P1 on |
| **Device checklists** | Purchases, ads, consent, lifecycle, haptics, saves | License-tester matrix rows P1–P15 and C1–C3/A1–A5 (monetization, device matrix); android brief validations |

**Event names.**
- Names follow the taxonomy in retention Q2 and D-14. The canonical registry is `docs/analytics/ANALYTICS-PLAN.md`, written in P6, and it must include every item tagged **[add]** below.
- Core events:
  - `level_start{level, world, mode, attempt, replay}`
  - `level_end{level, world, mode, attempt, success, cause, duration_ms, stars, gem, under_par, hint, streak}`
  - `tutorial_begin` / `tutorial_complete`
  - `world_start` / `world_complete`
  - `post_score{score, mode, new_best, revived, duration_ms}`
  - `earn_virtual_currency` / `spend_virtual_currency{virtual_currency_name, value, source|item_name, balance}`
  - `share{method, content_type, item_id}`
  - `notif_prompt{stage}`, `notif_open{type}`
  - `review_request{trigger}`
  - `rewarded_offered/shown/earned{source}`, `interstitial_shown/suppressed{reason}`
  - `purchase_initiated/completed/failed`, `first_purchase`, `restore`, `hint_used`
- Automatic events used: `first_open`, `session_start`, `user_engagement`, `screen_view` (manual per scene, D-14), `ad_impression`, `in_app_purchase`.
- Under D-01, `duration_ms` is **sim time** (`simMs`), never wall time.

**Additions this file requires [add]:**
- `level_id` (stable string id, D-05) on every level event. The int `level` alone breaks when levels are reordered (D-27).
- `assisted` (0/1) on `level_end` (D-07).
- `hint_offered{level_id, tier}` and `hint_used{level_id, tier}`, with tier 1 = notice-hint, 2 = route ghost, 3 = skip (D-07; monetization Q7).
- `purchase_pending` (monetization Q1).
- `rewarded_result{source, outcome = earned|dismissed|unavailable}` (D-24).
- Extra params on `interstitial_shown`:
  - `lifetime_levels`, `since_last_s`, `completions_since` (D-24 cap audit)
  - `sim_running`, debug builds only
- `lb_submit{board, ok}` (D-17).
- User property `quality_tier` (D-13).

## 3. North-star metric

**Weekly Returning Clearers (WRC).** The number of distinct users who logged ≥ 1 `level_end{success=1}` (any mode) in ISO week *W* **and** ≥ 1 `level_end{success=1}` in week *W−1*.
- **Companion rate (CURR-style):** `WRC(W) ÷ clearers(W−1)`.
- **Why this metric.** It combines four things the product thesis wants:
  - understanding and enjoyment (they clear levels);
  - returning (two consecutive weeks);
  - mastery (any mode counts, including replays for stars);
  - honesty: idle opens don't count, and neither do notifications that lead to no play.

  It mirrors Duolingo's current-user-retention north star, which had 5× the impact of their next-best lever (retention Q4) [IND].
- **Source:** BigQuery, weekly scheduled query, consented users.
- **Target [OPN]:** grows week over week across the first 12 weeks after launch, with the companion rate ≥ 40%. Refit after 8 weeks of data.
- **Not measurable before M3.** M0–M2 are judged by the gates in §5.

## 4. Guardrail metrics

These metrics must not get worse while we optimise anything else. A breach pauses the change that caused it.

| Guardrail | Threshold | Label / source | Action on breach |
|---|---|---|---|
| User-perceived crash rate (Q-13) | < 1.09% overall; < 8% per phone model | [DOC] android Q12, launch F1 | Halt the staged rollout; hotfix |
| User-perceived ANR rate (Q-14) | < 0.47% overall; < 8% per model | [DOC] | Halt the rollout |
| Excessive partial wake locks (Q-15) | < 5% | [DOC] | Audit the notification and alarm code |
| Crash-free sessions (Q-12) | ≥ 99.5% | [OWNER] MASTER P0 | Block the milestone |
| Interstitial shown while the sim is running (Q-24) | **0** | [DOC] Play "beginning of a level" ban (monetization Q4) | Kill switch `ads_interstitial_enabled=false` via Remote Config |
| Interstitial cap compliance (M-06) | 100% of shows obey D-24 | [DOC] + [OWNER] D-24 | Kill switch; fix |
| Interstitials per DAU (M-05) | ≤ 1.5 | [OWNER] MASTER P7 | Tighten the caps via Remote Config |
| D1/D7 delta between ad-cap cohorts (M-11) | within ±1 pp | [OWNER] MASTER P7 | Revert to the stricter cap |
| Notification disable rate (E-12) | < 3% per week | [OPN] retention Q5 | Cut cadence to ≤ 2 per week |
| Play rating (S-05) | ≥ 4.5; alarm below 4.2 | [OWNER] MASTER P9 | Review triage within 48 h |
| 3★ rate per level (F-09) | ≤ 40% of clearers | [OPN] game-design §2 | Par is too loose; refit it |
| Relief usage, W1–4 (F-12) | < 15% of attempts | [OWNER] MASTER P3 | The level is too hard, or relief is too eager |
| p95 frame time, Mid reference device (Q-17) | ≤ 20 ms | [OWNER] MASTER P5 | Lower the tier defaults |
| Store copy accuracy | 0 claims of unbuilt features | [DOC] metadata policy (launch §5) | Fix the copy before the next upload |

## 5. Milestone metrics (M0–M3)

**Gate types:**
- **Blocking:** the milestone cannot close until it passes.
- **Directional:** recorded and triaged; the milestone isn't blocked on it.

### M0 — Truthful Build (internal track; owner device plus internal testers)
| Metric | Target | Gate | Method |
|---|---|---|---|
| Open P0 items | 0 | Blocking | `STATUS.md` (P0 task 1) |
| Q-22 `npm audit --omit=dev` critical | 0 | Blocking | CI |
| Q-23 device matrix: purchases P1–P15 + consent/ads C1–C3, A1–A5 | 23/23 rows pass | Blocking | License testers + debug geography EEA/US (monetization device matrix) |
| Q-24 interstitial while the sim runs | 0 | Blocking | Debug-build `sim_running` param + device smoke |
| Q-01 physics rate parity | ≤ 1 px at t = 2 s; bit-identical after N steps | Blocking | Harness at 30/60/90/120/144 Hz ± 1 ms jitter (D-01) |
| Q-02 sim/wall drift | ≤ 1 step over 10 s | Blocking | Harness |
| Q-03 replay determinism | 100% | Blocking | Browser ↔ Node hash |
| Q-04 wall-clock reads in gameplay code | 0 | Blocking | Lint test |
| Lifecycle checklist | Back from every scene; Home mid-level is silent and costs no time; haptics fire; portrait locks; no white system bars | Blocking | android Q1, Q2, Q3, Q5 validations (device) |
| Save durability | `bmgr backupnow` → uninstall → reinstall → progress restored | Blocking | android Q10 validation |
| FORCE_SCALE A/B | Owner records 1.0 / 1.5 / 2.08 verdict on a 120 Hz and a 60 Hz device | Blocking (owner) | D-01 calibration |
| Q-12 crash-free sessions | ≥ 99.5% | Directional (tiny n) | Crashlytics |
| Upload | versionCode ≥ 1000001 accepted | Blocking | Play Console (D-20) |

### M1 — Closed Beta (12–20 testers × ≥ 14 continuous days)
| Metric | Target | Gate | Method |
|---|---|---|---|
| Opted-in testers | ≥ 12 for 14 continuous days (recruit 18–20) | Blocking, if the account requires it | Play Console [DOC] launch E2 |
| Feedback log | Every tester session triaged, and the log kept for the production-access form | Blocking | Owner (launch E2) |
| Q-05 bot gate failures, W1–3 | 0 | Blocking | `level-quality-report.json` |
| Q-06 report coverage | 150/150 (or the current `LEVELS[]` count) | Blocking | Report |
| F-02 time to first win | median ≤ 30 s | Directional | BigQuery (retention Q4 "FTUE to first win in under 30 s") |
| F-03 FASR, W1–3 non-boss | ≥ 70%; no non-boss level < 40% | Directional (n small) | BigQuery [IND] retention Q2 (Bruin flag at 40%) |
| F-04 APS | ≤ 3 (≤ 6 for bosses); slot curve within ±1 attempt of the game-design §2 target | Directional | BigQuery |
| F-05 QAF | no level > 2× its world median | Directional | BigQuery |
| F-09 3★ rate, W1–3 | 25–40% of clearers | Directional | BigQuery |
| F-12 relief usage, W1–4 | < 15% of attempts | Directional | BigQuery |
| Q-20 / Q-21 render (W1–3 captures) | Peak luminance ≥ 230; HUD contrast ≥ 4.5:1 | Blocking | `readPixels` + contrast script |
| Q-12 / Q-13 / Q-14 | ≥ 99.5% / < 1.09% / < 0.47% | Blocking for crash clusters; directional otherwise | Crashlytics + vitals |
| "Plays itself" mentions in feedback | 0 | Directional [OPN] | Feedback log (audit K#13) |

> **M1 caveat.** The FASR/APS/QAF rows need `attempt`, `success` and `cause` on level events. The roadmap ships taxonomy v2 in step 17, after M1. FEATURE-MATRIX §6 O15 proposes moving that subset into step 10. Without it, these rows can only be estimated from tester interviews.

### M2 — Launch Candidate
| Metric | Target | Gate | Method |
|---|---|---|---|
| Q-05 bot gate failures, all worlds | 0 | Blocking | Report |
| Q-08 duplicate score | < 0.85 for every pair (labelled remixes excluded); bosses < 0.7 | Blocking | Report (game-design §4–5) |
| Boss difficulty | Each boss has the world's lowest A4 random-solve rate and a T_best above the world median | Blocking | Report (game-design §4) |
| Q-09 bot par fit | Predicted 3★ rate 25–40% per level | Blocking | A6 noisy-expert distribution |
| F-03 / F-04 per world slot | Closed-test values within the game-design §2 slot targets | Directional | BigQuery |
| Q-17 p95 frame time, Mid | ≤ 20 ms | Blocking | Reference device |
| Q-19 draw calls | Low ≤ 40 · Mid ≤ 60 · High ≤ 80 | Blocking | Debug overlay (D-13) |
| Q-21 accessibility | 0 text < 12 px; 0 targets < 48 px; contrast ≥ 4.5:1; reduced-motion audit passes | Blocking | P5 audits |
| C-03 app-ads.txt | "Verified" in AdMob | Blocking | AdMob [DOC] monetization Q4 |
| Data safety + privacy policy | Matrix (launch §2) submitted; policy deltas P1–P10 applied | Blocking | Play Console |
| Store assets | 9:16 ≥ 1080×1920; captions ≤ 20%; no alpha channel; ≥ 4 portrait shots | Blocking | Asset spec check (launch §5; UX §7) |
| Remote Config safety | Defaults equal shipped constants; malformed JSON falls back; airplane-mode first launch plays | Blocking | Unit tests (retention Q3) |
| M-12 economy health | First affordable item by ~L5; an affordable unowned item every 8–12 levels | Directional | Scripted playthrough (monetization Q5) |
| Production access | Granted | Blocking (owner) | Play Console |

**Staged rollout gates (step 19):**
- Stages are 20% → 50% → 100%, over about a week in total (launch F1).
- Advance a stage only if all of these hold:
  - Q-13 and Q-14 are under threshold for the stage cohort;
  - no new top crash cluster has appeared;
  - Q-24 = 0.
- A breach halts the rollout (§4).

### M3 — Live 1.x (first 90 days after 100% rollout)
| Metric | Target | Gate | Method |
|---|---|---|---|
| North star WRC | Rising 4-week trend; companion rate ≥ 40% | Directional [OPN] | BigQuery |
| E-01 D1 / D7 / D30 | ≥ 30% / ≥ 10% / ≥ 4% (stretch; see §8) | Directional [OWNER] | BigQuery cohorts |
| E-05 Daily participation | ≥ 25% of DAU | Directional [OWNER] | BigQuery |
| E-07 Weekly participation | ≥ 15% of WAU | Directional [OWNER] | BigQuery |
| E-11 / E-12 notifications | Opt-in ≥ 35% of prompted users; disable < 3% per week | Guardrail on E-12 | BigQuery |
| M-01 ARPDAU | $0.02–0.08 band | Directional [IND] audit F.4 | AdMob + RevenueCat |
| M-02 payer conversion | ≥ 1.5% | Directional [OWNER] | RevenueCat |
| M-03 rewarded opt-in | ≥ 20% of offers | Directional [OWNER] | BigQuery |
| M-05 interstitials per DAU | ≤ 1.5 | Guardrail | BigQuery |
| S-01 share rate | ≥ 3% of DAU | Directional [OWNER] | BigQuery |
| S-04 store listing conversion | ≥ 30% (organic) | Directional [OWNER] | Play Console |
| S-05 rating | ≥ 4.5 with volume | Guardrail | Play Console |

## 6. Phase metrics (P0–P12)

Metric IDs are defined in §7. Every phase also passes the MASTER §6 quality gates.

| Phase | Metrics and targets | Gate | Method |
|---|---|---|---|
| **P0** Foundation | 0 open P0 · Q-22 = 0 critical · Q-23 23/23 · Q-24 = 0 · Q-12 ≥ 99.5% (internal) · analytics lint: 0 invalid or reserved names, and 0 `firebase_error` in a DebugView session · logcat "Setting consent" lines correct on an EEA VPN and a US device (retention Q1) | Blocking | CI + device |
| **P1** Physics | Q-01 ≤ 1 px and bit-identical · Q-02 ≤ 1 step · Q-03 100% · Q-04 = 0 · Settings open 10 s mid-level → timer moves ≤ 1 step · app hidden 30 s → no time lost · beam level restarted 20× → identical beam state at a given `simMs` (physics Q3) · platform position at step *k* identical at every Hz | Blocking | Harness + device |
| **P2** Level engine & QA | Q-10 = 100% of levels with id/idea/role · Q-06 150/150 · Q-07 A0–A3 + validators < 3 min in CI · nightly A4–A6 + ablation complete · Q-11 4/4 known defects reproduced (L11/L12 self-solve, L40 wall-hug, L60 decoy, L74 exit-in-hazard) before fixes | Blocking | CI + report |
| **P3** Core loop | Q-25 death → control ≤ 600 ms · Q-26 retry from result = 1 tap; title cards on retry = 0 · F-03/F-04 computable from events · F-12 < 15% in W1–4 (from M1) | Blocking (Q-25, Q-26); directional (F-xx) | Instrumented smoke + BigQuery |
| **P4** Campaign | Q-05 = 0 · Q-08 < 0.85 · Q-09 25–40% · every boss ≥ its world's hardest non-boss level · route-shape quota: ≤ 4 of 10 levels per world share a dominant direction (game-design §1) · F-03 slot targets met in closed test | Blocking (bot); directional (F-03) | Report + BigQuery |
| **P5** UX/visual | Q-20 peak luminance ≥ 230; 2 px line core ≥ original; +4 px halo ≥ 15% (physics Q6) · Q-21 · Q-17 ≤ 20 ms p95 (engineering budget: ≤ 8 ms mid-tier at 120 Hz, ≤ 14 ms low-tier at 60 Hz; physics Q6) · Q-19 · Q-18 tier down-step rate tracked · reduced-motion audit passes (RM never changes brightness, D-13) | Blocking | Captures + device + audits |
| **P6** Retention | E-01 bands · E-05 ≥ 25% DAU · E-11 ≥ 35% · E-12 < 3%/wk · E-13 notif → `level_start` within 30 min tracked · E-06 streak survival tracked · comeback-gift return within 7 days tracked | Directional (guardrail on E-12) | BigQuery |
| **P7** Monetization | M-03 ≥ 20% · M-05 ≤ 1.5 · M-02 ≥ 1.5% · M-11 within ±1 pp · M-12 health targets · M-09 refund rate tracked · currency-migration unit tests idempotent (run twice → identical balances) | Directional; guardrails on M-05 / M-11 | RevenueCat + AdMob + BigQuery + TDD |
| **P8** Gravity Run 2.0 | E-08 ≥ 1.5 runs/DAU among adopters · E-07 ≥ 15% WAU · E-09 median 60–180 s · E-10 ≥ 99% · bot seam pair-check failures = 0 over all chunk pairs (game-design §7) · no chunk repeats within the last 4 | Blocking (bot); directional (E-xx) | Report + BigQuery |
| **P9** Social | S-01 ≥ 3% DAU · S-02 share → install measured · S-05 ≥ 4.5 with volume · App Links verified (`pm get-app-links` shows verified; android Q8) | Directional; blocking for link verification | BigQuery + Play Console + adb |
| **P10** Live ops | E-14 event participation ≥ 20% of WAU · D7 of participants vs non-participants (correlational) · 0 crashes on unknown `kind` values (unit test) | Directional; blocking (unit test) | BigQuery + TDD |
| **P11** Brand/ASO | S-04 ≥ 30% organic · first-two-screenshots experiment run to a winner (≥ 7 days; launch §5) · C-03 verified · S-07 keyword ranks tracked | Directional; blocking (C-03) | Play Console + AdMob |
| **P12** Launch & post-launch | Q-13 < 1.09%, Q-14 < 0.47% · staged rollout 20 → 50 → 100% without regressions · weekly review held (cadence log in `STATUS.md`) · iOS crash-free ≥ 99.5% once the iOS track ships | Blocking (vitals); directional otherwise | Play Console + Crashlytics |

## 7. Metric dictionary (exact definitions)

The default scope for every GA4/BigQuery metric:
- consented users only;
- developer traffic excluded;
- `mode = campaign` and `replay = 0` for level metrics, unless stated otherwise.

"Session" means the GA4 session id in the BigQuery export.

### 7.1 Engineering and content quality (pre-launch measurable)
| ID | Metric | Formula | Source |
|---|---|---|---|
| Q-01 | Physics rate parity | max over fixed scenarios of ‖pos(rate) − pos(60 Hz)‖ at t = 2 s, for rates {30, 60, 90, 120, 144} Hz with ± 1 ms jitter; plus ball state bit-identical after exactly N steps | `src/sim/frameHarness` (D-01) |
| Q-02 | Sim/wall drift | abs(simMs − wallMs) after 10 s, per rate | Harness |
| Q-03 | Replay determinism | replays whose Node hash (outcome, simMs, final state) equals the browser hash ÷ replays recorded | Replay CI (physics Q4) |
| Q-04 | Wall-clock reads | count of `game.loop.time`, `this.time.now`, `Date.now` in gameplay code | Lint test |
| Q-05 | Bot gate failures | levels failing any blocking gate ÷ levels in scope. Gates: A0 wins (non-sandbox); A1 wins after slot L2; A3 wins on a hazard-idea level; own mechanic decorative under ablation (solvable in ≤ 1.1× T_best); boss easier than L9; noisy success outside 40–90%; any static validator | `level-quality-report.json` (game-design §6) |
| Q-06 | Report coverage | levels in report ÷ levels in `LEVELS[]` | Report |
| Q-07 | Fast-agent CI time | wall time of validators + A0–A3 | CI log |
| Q-08 | Duplicate score | max pairwise mirror-aware similarity (12×26 raster + best-route polyline cosine), labelled remixes excluded | Report (game-design §5) |
| Q-09 | Bot par fit | per level, share of A6 noisy-expert runs finishing ≤ `parTimeMs`. Par itself = `ceil_to_0.5s(max(1.30 × T_noisy_median, T_best + 1.5 s))` | Report (game-design §2) |
| Q-10 | Metadata completeness | levels with non-empty `id`, `idea`, `role` ÷ levels | Validator |
| Q-11 | Known-defect reproduction | flagged ÷ 4 (L11/L12 self-solve, L40 wall-hug, L60 decoy chain, L74 exit-in-hazard) | Report (MASTER P2) |
| Q-12 | Crash-free sessions | sessions without a fatal crash ÷ sessions | Crashlytics |
| Q-13 | User-perceived crash rate | Play's definition, 28-day | Play vitals [DOC] |
| Q-14 | User-perceived ANR rate | Play's definition, 28-day | Play vitals [DOC] |
| Q-15 | Excessive partial wake locks | Play's definition | Play vitals [DOC] |
| Q-16 | Renderer-gone rate | `onRenderProcessGone` non-fatals ÷ 1,000 sessions, per device model | Crashlytics (android Q12) |
| Q-17 | p95 frame time | 95th percentile frame time over a 60 s scripted boss run | Debug overlay / remote DevTools / Crashlytics keys |
| Q-18 | Tier down-step rate | sessions with a watchdog down-step ÷ sessions; distribution of `quality_tier` | User property [add] |
| Q-19 | Draw calls per frame | max over the scripted run, per tier | Debug overlay (D-13) |
| Q-20 | Rendered luminance | peak gameplay luminance in captures; 2 px line core vs original; +4 px halo ratio | `readPixels` check (physics Q6; MASTER P5) |
| Q-21 | Rendered accessibility | min HUD text contrast as rendered; count of text < 12 px; count of targets < 48 px | Contrast script + layout audit (UX §1, §6) |
| Q-22 | Critical advisories | `npm audit --omit=dev` critical count | CI |
| Q-23 | Device matrix pass | rows passed ÷ 23 (P1–P15, C1–C3, A1–A5) | Owner device run (monetization) |
| Q-24 | Interstitial during sim | `interstitial_shown` with `sim_running = 1` | Debug instrumentation [add] |
| Q-25 | Death → control latency | ms from the failing step to input re-enabled | Instrumented smoke |
| Q-26 | Retry friction | taps from result screen to a running retry; title cards shown on retry | Instrumented smoke |

### 7.2 Player experience and difficulty
| ID | Metric | Formula | Source |
|---|---|---|---|
| F-01 | Activation | first_open users with `tutorial_complete` in their first session ÷ first_open users. Target ≥ 90% [OPN] | BigQuery |
| F-02 | Time to first win | median (ts of first `level_end{success=1}` − ts of `first_open`) | BigQuery |
| F-03 | **FASR** (first-attempt success rate) | users with `level_end{success=1, attempt=1}` ÷ users with `level_start{attempt=1}`, per `level_id` | BigQuery (retention Q2) |
| F-04 | **APS** (attempts per success) | count `level_start` ÷ count `level_end{success=1}`, per `level_id` | BigQuery |
| F-05 | **QAF** (quit after fail) | users whose last level event in a session is `level_end{success=0}` at L ÷ users with ≥ 1 `level_end{success=0}` at L | BigQuery |
| F-06 | Stuck rate | users with `furthest_level = L` and no session for ≥ 7 days ÷ users who reached L | BigQuery |
| F-07 | Time-to-pass / time-to-abandon | Σ `duration_ms` over attempts until the first success; and Σ `duration_ms` for users who never succeed and are stuck (F-06) | BigQuery (King, game-design §2) |
| F-08 | Abandon-spike flag | abandon rate (L) > 2 × mean(abandon rate L−1, L+1) | BigQuery (game-design §2) |
| F-09 | 3★ rate | users with `stars = 3, assisted = 0` ÷ users who cleared, per level | BigQuery |
| F-10 | Eventual ★1 completion | users who cleared within 14 days of the first start ÷ users who started. Target ≥ 95% (game-design §2) | BigQuery |
| F-11 | Gem rate | users with `gem = 1` ÷ clearers. Flag > 90% as "gem on route" [OPN] (audit C.4: 33 on-route gems) | BigQuery |
| F-12 | Relief usage | attempts with `hint_used{tier ≥ 1}` ÷ attempts, per world | BigQuery [add] |
| F-13 | Skip rate | `hint_used{tier=3}` ÷ levels started, per world. Flag > 5% [OPN] | BigQuery [add] |
| F-14 | World reach | first_open users reaching `world_complete{world = 1, 5, 10, 15}` ÷ first_open users | BigQuery (audit Q Phase 1) |
| F-15 | Retries per session | `level_start{attempt > 1}` per session | BigQuery |

### 7.3 Retention and engagement
| ID | Metric | Formula | Source |
|---|---|---|---|
| E-01 | **Classic D1 / D7 / D30** | users in the install cohort (`first_open` on day 0, property timezone) with ≥ 1 `user_engagement` on **exactly** day N ÷ cohort size. Rolling retention reads higher and is never used for targets (retention Q2) | BigQuery |
| E-02 | Sessions per DAU | count `session_start` ÷ DAU | GA4 |
| E-03 | Session length (observed only) | median engagement time per session. The ideal session is 3–8 min (MASTER §1), but **this is not optimised** (§12) | GA4 |
| E-04 | WRC / CURR | see §3 | BigQuery |
| E-05 | Daily participation | DAU with ≥ 1 `level_start{mode = daily}` ÷ DAU. Also report the share of *eligible* DAU (W1 complete, D-21) | BigQuery |
| E-06 | Streak survival | users with daily streak ≥ 3 at day d who still have an active streak at d + 7 ÷ such users; plus `streak_broken` per streaker | BigQuery |
| E-07 | Weekly participation | WAU with ≥ 1 `level_start{mode = weekly}` ÷ WAU | BigQuery |
| E-08 | Runs per adopter | count `post_score` ÷ DAU with ≥ 1 `post_score` | BigQuery |
| E-09 | Median run | median `post_score.duration_ms` | BigQuery |
| E-10 | Board submit success | `lb_submit{ok = 1}` ÷ `lb_submit` | BigQuery [add] |
| E-11 | Notification opt-in | users with `notif_prompt{stage = os_granted}` ÷ users with `notif_prompt{stage = pre_shown}`; also the `pre_yes` rate | BigQuery (retention Q5) |
| E-12 | Notification disable rate | users whose `notif_state` changed granted → denied during the week ÷ users granted at week start (`areNotificationsEnabled` re-read every launch) | BigQuery |
| E-13 | Notification efficacy | `notif_open` followed by `level_start` within 30 min ÷ `notif_open`, per `type` | BigQuery |
| E-14 | Event participation | WAU with ≥ 1 event-tagged `level_start` ÷ WAU | BigQuery |
| E-15 | Comeback return | users granted the comeback gift who are active again within 7 days ÷ users granted | BigQuery |

### 7.4 Social, store and reputation
| ID | Metric | Formula | Source |
|---|---|---|---|
| S-01 | Share rate | DAU with ≥ 1 `share` ÷ DAU, by `content_type` | BigQuery |
| S-02 | Share → install | `first_open` attributed to `utm_source = share` (Play Install Referrer → GA4) ÷ `share` events | GA4 + Install Referrer (retention Q6) |
| S-03 | Approximate K-factor | installs attributed to share or challenge links in the period ÷ active users in the period | GA4 |
| S-04 | Store listing conversion | store listing acquisitions ÷ store listing visitors, organic, 28-day | Play Console |
| S-05 | Rating | Play rating and its volume; % of month-1 reviews replied to (target 100%, launch §5) | Play Console |
| S-06 | Review prompt reach | users with `review_request` ÷ eligible users; ≤ 1 prompt per user per 60 days | BigQuery (retention Q6) |
| S-07 | Search visibility | keyword ranks and search-term installs | Play Console search terms (launch §5) |

### 7.5 Monetization and economy
| ID | Metric | Formula | Source |
|---|---|---|---|
| M-01 | **ARPDAU** | (AdMob estimated earnings + IAP revenue net of store fee) ÷ DAU, per day, 28-day mean | AdMob + RevenueCat |
| M-02 | **Payer conversion** | (a) distinct payers in the month ÷ MAU; (b) cohort: installs with ≥ 1 purchase by D30 ÷ installs | RevenueCat |
| M-03 | **Rewarded opt-in** | `rewarded_shown` ÷ `rewarded_offered`, per `source` | BigQuery |
| M-04 | Rewarded reach | DAU with ≥ 1 `rewarded_earned` ÷ DAU | BigQuery |
| M-05 | **Interstitials per DAU** | count `interstitial_shown` ÷ DAU | BigQuery / AdMob |
| M-06 | Interstitial cap compliance | shows obeying all D-24 caps (lifetime ≥ 12; ≥ 180 s **and** ≥ 3 completions since the last full-screen ad; ≤ 4/session; ≤ 10/day; never after a death) ÷ shows | BigQuery [add params] |
| M-07 | Rewarded failure rate | `rewarded_result{outcome = unavailable}` ÷ rewarded attempts; watchdog hangs = 0 | BigQuery [add] |
| M-08 | Remove-Ads attach | users who own `no_ads` ÷ users who have seen ≥ 1 interstitial | RevenueCat + BigQuery |
| M-09 | Refund rate | refunded transactions ÷ transactions | RevenueCat |
| M-10 | Pending resolution | `purchase_pending` resolved to an active entitlement within 72 h ÷ `purchase_pending` | BigQuery + RevenueCat |
| M-11 | Ad-cap cohort delta | D1 and D7 (E-01) of the treatment cap ÷ control, in pp | Firebase A/B |
| M-12 | Economy health | % DAU holding an affordable, unowned earnable item; days of currency on hand (balance ÷ trailing 7-day mean daily spend); level of the first affordable item; levels between affordable items | BigQuery `earn/spend_virtual_currency` (monetization Q5) |

## 8. Benchmarks and how the targets were set

| Topic | Benchmark | Source | How we use it |
|---|---|---|---|
| D1 / D7 / D30 (all genres) | Median ~20–22% / < 4% / ~0.7%. Top 25%: > 30% / 6–7% / ~1.7%. No puzzle-specific split | GameAnalytics 2026 via gamedevreports (retention Q4) [IND] | **Floor** = median. **Good** = top quartile. MASTER's D1 ≥ 30% equals top quartile. **D7 ≥ 10% and D30 ≥ 4% exceed the published top quartile**, so they are stretch targets [OWNER] (see RESEARCH-SUMMARY C-16) |
| Difficulty flags | First-attempt completion < 40% flagged; 50% fail ≈ 2 attempts, 80% ≈ 5; "what looks like churn can simply be a pause" | Bruin, SayGames (retention Q2) [IND] | F-03 flag; F-06 uses a 7-day window, not a 1-day one |
| Pass rate vs churn | Weak overall correlation (−0.14), strong before completion (−0.59) | Rovio, CHI PLAY 2020 (game-design §2) [ACAD] | Later worlds may be harder; watch F-05 in early worlds most |
| 3★ / par | ★3 earned by 25–40% of clearers | game-design §2 [OPN] | F-09 band; Q-09 |
| Streaks | 7-day streak → 3.6× course completion; streak freeze +0.38% DAU | Duolingo (retention Q4) [IND] | Pausing rules (D-18), earned freezes |
| Notification opt-in | Android gaming opt-in fell from 85% to 67% after Android 13; gaming floor 21% | Pushwoosh; Airship (retention Q5) [IND] | E-11 target ≥ 35% of *prompted* users (pre-prompt filters intent) [OWNER] |
| Notification fatigue | At 1 per week, 10% would disable; at 2–5 per week, 37% would | Localytics 2017 (retention Q5) [IND] | ≤ 4 per week cap (D-15); E-12 guardrail |
| Rewarded | ~36% of DAU engage in casual games; context placements 38.1% vs 23.8% between levels | Unity 2024 (monetization Q6) [IND] | M-04 reference; stuck-context placements |
| Interstitial spacing | 60–90 s (aggressive) to 120–240 s (puzzle) | Meta; blog consensus (monetization Q6) [IND] | D-24 uses ≥ 180 s + 3 completions |
| Revenue | Payer conversion ~1–3%; ARPDAU ~$0.02–0.08; rewarded eCPM ~$10–30 US / $3–8 blended | audit F.4 heuristics [IND/OPN] | M-01 band; M-02 ≥ 1.5% |
| Store creative | ~60–70% of visitors never scroll past the first frames; decision in ~7 s | StoreMaven/SplitMetrics via UX §7 [IND] | Frames 1–2 carry the verb; P11 experiment order |
| Vitals | Crash 1.09% / ANR 0.47% overall; 8% per model; wake locks 5% | Android vitals (android Q12) [DOC] | Guardrails |
| Store listing conversion | **No benchmark in the briefs** | — | The ≥ 30% target is [OWNER]; refit after 4 weeks of Play data |

## 9. Triggers that re-open deferred systems (D-30)

A deferred item is reconsidered only when **all** of its trigger conditions hold for 4 consecutive weekly reviews.

| Deferred system | Trigger | Label / source |
|---|---|---|
| Battle / season pass | D30 ≥ ~8–10% **and** DAU ≥ ~5–10k **and** a content pipeline that has shipped ≥ 2 on-time event cycles | audit F.4 heuristic [OPN] |
| Event currency | Event progress cannot be expressed with progress meters **and** E-14 ≥ 20% for 3 events | retention Q7 [OPN] |
| Firestore boards / friend ghosts | Web DAU becomes material (≥ 20% of DAU [OPN]) **or** S-02 shows challenge links converting, with friends repeatedly asking for persistent rivals | retention Q8 |
| Referral rewards | A fraud-resistant attribution path exists **and** S-03 organic K is measurable (brief recommends skipping) | retention Q6 #7 |
| FCM campaigns | E-12 < 2% per week for 8 weeks, **and** there is a content update worth announcing (≤ 2 per month) | retention Q5 |
| iOS port (D-29) | Q-13 < 1.09% and Q-14 < 0.47% for 28 days after the 100% rollout, **and** weekly reviews are stable | D-29; launch §8 |
| Phaser 4 (D-28) | Post-launch, **and** the harness + bot are green on a v4 branch | physics Q7 |
| Play Games Level Up (full) | Enrollment is open for the app **and** PGS, cloud save and ≥ 10 achievements are shipped | retention Q7 |
| Paid UA / playable ads | S-04 ≥ 30% **and** D7 ≥ 6–7% (top quartile) **and** ARPDAU known for ≥ 8 weeks (LTV > CPI test possible) | audit L.2; MASTER P11 |
| UGC / level editor | Remix / post-game modes show sustained use **and** bot gates can auto-verify user levels | audit L.2 [OPN] |

## 10. Experiment rules

These are firm rules, from retention Q3 [DOC/IND].
1. **Duration** is fixed in advance, ≥ 14 days. No peeking.
2. **Below about 300 installs/day,** test only large swings: interstitials on or off, par multipliers, the early-difficulty curve. Otherwise use **Rollouts** (a staged percentage plus crash-free monitoring).
3. **Prefer high-frequency, per-user goal metrics,** such as `world_complete{world = 1}` or rewarded opt-in, over D7.
4. **Sample size per arm** at 80% power and α = 0.05:

| Metric | Baseline | Detect | n per arm | Days at 100 installs/day |
|---|---|---|---|---|
| D1 | 25% | +3 pp | ~3,300 | ~67 |
| D1 | 25% | +5 pp | ~1,200 | ~24 |
| D7 | 8% | +2 pp | ~2,900 | ~59 |
| L1–10 completion | 60% | +5 pp | ~1,500 | ~31 |

5. **Every experiment monitors the §4 guardrails.** A guardrail breach ends the experiment early, as a safety stop rather than a result.
6. **Daily / Weekly / event changes are dated Remote Config overrides,** never retroactive (D-14). Otherwise stale clients play a different puzzle and share grids break.
7. **GA4 predictive churn is not used.** It needs ≥ 1,000 churners and ≥ 1,000 non-churners per 7 days, which this game won't reach (retention Q2).

## 11. Review cadence

| Cadence | What is reviewed | Inputs | Output |
|---|---|---|---|
| Every PR | Q-01–Q-04, Q-05 (fast agents), Q-07, Q-22, analytics lint | CI | Merge or block |
| Nightly | Slow bot agents, Q-08, Q-09, ablation | Report JSON + Markdown summary | Flagged-level list |
| **Weekly (Monday)** | §4 guardrails · WRC · E-01 cohorts · F-03 / F-05 / F-08 top-10 flagged levels · M-01 / M-03 / M-05 · E-11 / E-12 · S-04 / S-05 | BigQuery weekly aggregate table, Play Console, AdMob, RevenueCat | A `STATUS.md` entry: 3 decisions max, each with an owner. This review is the P12 metric "weekly review held" |
| Biweekly (during P4 waves) | Content triage: bot flags × FASR / QAF, by world | Report + BigQuery | The next wave's world order (EXECUTION-ORDER "what must wait") |
| Monthly | Economy (M-12), pricing, live-ops calendar (published ≥ 7 days ahead; retention Q7), notification copy | BigQuery + RevenueCat | Remote Config change list |
| Quarterly | Regulation (age-signal laws, EU DFA / CPC), SDK data-disclosure pages, Level Up status | Launch brief §3 checklist | DECISIONS.md amendments if needed |
| Every SDK bump | Data safety parity with SDK disclosures (launch §2) | SDK disclosure pages | Updated Data safety form |
| Every milestone | §5 gate table | All of the above | Gate result: VERIFIED, INFERRED or REQUIRES HUMAN DEVICE TEST (MASTER §6) |

## 12. Metrics we refuse to optimise

We still look at some of these numbers. We never set them as goals, never A/B test *for* them, and never accept a change because it raised them.

| Metric | Why we refuse | What we watch instead |
|---|---|---|
| Raw session length / time in app | It is easiest to raise with dark patterns: auto-advance, sticky loops, padding. The product promises 3–8 min sessions (MASTER §1) | WRC, E-02 sessions/DAU, E-01 |
| Notification sends and opens driven by guilt or urgency | "Protect the channel" (Duolingo, retention Q4). Fatigue is non-linear (Localytics) | E-12 disable rate, E-13 efficacy |
| Streak length via loss-punishing resets | The EU DFA targets "streaks that penalise taking a break" (retention Q4; D-18) | E-06 survival under pause rules |
| Interstitial impressions beyond the D-24 caps | Policy risk (monetization Q4); revenue bought with retention | M-01 *with* the M-11 guardrail |
| Hint / route-ghost revenue | Hints are never sold for money (D-07, D-24) | F-12 relief usage as *difficulty* telemetry |
| Level count | "The level count is an outcome, not a goal" (D-27) | Q-05, Q-08, F-03 |
| 3★ rate inflation (making par easy) | Kills mastery. Juul: players who never fail rate the game lower (game-design §1) | F-09 inside 25–40% |
| Attempts or time-to-abandon inflated to sell relief | Turns difficulty into a monetization lever | F-04 / F-07 against the slot curve |
| Conversion from countdowns, fake "was" prices, modal offers | Omnibus 30-day rule; CPC pressure-selling principles (monetization Q5) | M-02 together with M-09 refunds |
| Rating via review gating ("Do you like it?") | Forbidden by the In-App Review rules (retention Q6) | S-05 organic rating |
| Shares via incentives | Fraud, and poor fit (retention Q6 #7) | S-01 organic share rate |
| DAU from login rewards that reset | DFA pattern (D-18) | E-01, WRC |
| Ad click-through rate | Rewards accidental taps and ads placed near buttons (policy) | M-03 opt-in by choice |
| Tutorial completion by removing the possibility of failure | Self-solving levels are "actively harmful" (game-design §1) | F-03 curve, F-01 activation |
| Faked near-misses | Near-miss messaging must be honest skill feedback (game-design §3; UX §3) | Factual missed-star lines |
