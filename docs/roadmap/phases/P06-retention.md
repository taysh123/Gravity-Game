# P06 — Retention & Meta Progression

**Status:** PLANNED, not started.
- **Step:** 17 in [`../EXECUTION-ORDER.md`](../EXECUTION-ORDER.md).
- **Needs:** M1 (Closed Beta). Runs in parallel with step 16 (P5 system).
- **Unblocks:** step 18 (P7) and M2.
- **Plan date:** 2026-10-07. Baseline `master @ d3c6aab`.
- **Design:** [`../../design/RETENTION.md`](../../design/RETENTION.md).
- **Analytics:** [`../../analytics/ANALYTICS-PLAN.md`](../../analytics/ANALYTICS-PLAN.md).

---

## 1. Summary

P6 turns Gravity Flow's existing retention parts into **one return loop** without notification spam or dark patterns (MASTER-ROADMAP P6). The parts today are a daily challenge, a streak with an earned freeze, a login chest, win-streak tiers, 14 passive achievements, star milestones, collections, Gravity Run Endless/Weekly and a PB ghost.

**The loop has three cadences:**
- **Daily habit:**
  - Daily v2 (D-21): a bot-verified pool, a dated Remote Config schedule, unlimited attempts, one payout per day, a spoiler-free share card, gated after World 1, taught mechanics only
  - 3 missions a day
  - a login calendar that pauses instead of resetting (D-18)
  - visible streak and freeze UI
- **Weekly goal:** the personal Weekly Orbit milestone track, plus the Weekly Run card.
- **Mastery collection:**
  - world mastery trails, Boss Seals and Star Map completion
  - 26 PGS-mappable achievements with progress bars
  - post-campaign hooks: Remix, Boss Rush, Time Attack

**Around the loop:**
- **Opt-in local notifications** (D-15): ≤ 1/day, ≤ 4/week, quiet hours, comeback on days 3/7/14 and then stop.
- **A one-time comeback gift** (D-18).
- **The measurement layer:** analytics taxonomy v2, 10 user properties, Remote Config with clamped defaults, and BigQuery aggregates (D-14).

**Not in P6:**
- economy redesign (P7)
- PGS transport and boards (P8)
- links and review (P9)
- live-ops calendars (P10)
- any battle pass, event currency or server systems (D-30)

---

## 2. Scope

### 2.1 Systems

| System | Deliverable | Design ref |
|---|---|---|
| Analytics taxonomy v2 | 57 custom events, attempt semantics (arm → exactly one `level_end`), killed-attempt marker, 41 dimensions / 16 metrics, 10 user properties, 14 Crashlytics keys | ANALYTICS-PLAN §3–§6, §12 |
| Remote Config | Native seam; pure clamped `rcConfig.ts`; session snapshot; 3 s fetch behind the splash; dated overrides | ANALYTICS-PLAN §10 |
| Daily v2 | ≥ 60-entry pool (Tier I/II/III); `daily_schedule` resolver with hash fallback; DailyStore v2; one payout/day; gating; share card | RETENTION §3 |
| Streaks | Daily streak + freeze UI; cumulative-count rewards; login calendar pause; win-streak first-try rule | RETENTION §4 |
| Weekly | Weekly Orbit (5 milestones, Orbit seals); Weekly Run card; one week boundary | RETENTION §5 |
| Missions | 3/day, 13 types, 1 free swap; Orbit points | RETENTION §6 |
| Mastery collection | 15 world trails, Boss Seals (5/10/15 cosmetics), earn-only collections, Star Map meta | RETENTION §7 |
| Achievements v2 | 26 definitions with `progress()` and PGS mapping; grouped UI with bars | RETENTION §8 |
| Post-game hooks | Remix (mirror + constraint), Boss Rush (3 sets), Time Attack (author ghost medals) via a `GameScene` `mode` | RETENTION §10; mode rules in [`../../design/GAMEPLAY-DESIGN.md`](../../design/GAMEPLAY-DESIGN.md) |
| Comeback | Gift at ≥ 7 days away, once per lapse; welcome-back card | RETENTION §11 |
| Notifications | Plugin, manifest, channels, small icon, pre-prompt, `notifPlan.ts`, lifecycle, tap routing, Settings row | RETENTION §12 |
| Save merge (logic only) | Pure `mergeSave()` + snapshot serializer, for P8's PGS Saved Games transport | D-12 |
| BigQuery and dashboards | Link, dev filter, 9 queries, weekly aggregate job, GA4 admin configuration | ANALYTICS-PLAN §8, §13 |

### 2.2 Dependencies

| Needs | From | Specifically |
|---|---|---|
| Consent-first boot, pre-consent queue, manual `screen_view`, lint test, privacy rows | P0 steps 4–5 (D-10, D-14 hygiene) | `Analytics.ts` queue + `screen()`; Settings privacy rows |
| Durable stores (Preferences mirror, schema + version + backup key) | P0 step 2 (D-12) | Every new store in §5 uses the same pattern |
| App lifecycle (`pause`/`resume`), `@capacitor/app` 8.1.2, Capacitor 8.5.2 | P0 steps 1–2 (D-11) | Notification reconcile/replan hooks |
| Sim clock + armed start | P1 step 6 (D-01, D-02) | `duration_ms`, best time, `level_start` at arm |
| Level data v2: stable `id`, `teaches`/`uses`, explicit world lists | P2 step 8 (D-05) | Daily tiers, mission eligibility, `level_id` |
| `scripts/levelsim/` validators + agents A0–A6, A5 best route | P2 steps 9, 11 (D-06) | Daily gate profile; Time Attack author ghost |
| ResultPanel (NEXT/RETRY/LEVELS), attempt counts, relief ladder, open frontier | P3 step 10 (D-07, D-08) | Daily result; `attempt`; `relief_*`; `world_unlock` |
| W1–3 reworked (P4-α); P4 cut levels | P4 step 13 (D-27) | Gate = W1 boss; pool and Remix raw material |
| UI kit: Modal, Toast, ScrollView, progress bar | P5 step 16 (parallel) | TodayScene, pre-prompt, Achievements bars. **Fallback:** `src/ui/glass.ts` + `Button.ts` if step 16 hasn't landed. |
| Owner (👤) | — | Firebase console (RC template, A/B, GA4 retention 14 months, dimension registration, key events), BigQuery link, Blaze upgrade at M2, device matrix |

**Unblocks:**
- **P7:** RC ad-cap keys, economy telemetry, `Rewards.grant` as the single conversion point for D-23.
- **P8:** PGS achievement mapping, `mergeSave`, `weekWindow`.
- **P9:** native share plumbing, the `share` event, `review_request` name.
- **P10:** the `event_calendar` slot in `rcConfig`.

**Decision conflicts to resolve.** These are listed for the owner, and each task notes its default.

| # | Conflict | P6 default |
|---|---|---|
| C1 | D-12 puts PGS Saved Games cloud save in P6, but the PGS plugin is D-17/P8 (step 20, post-launch) | P6 ships the pure `mergeSave()` + snapshot (T21); P8 wires the transport. Suggest editing D-12's phase to "P6 logic / P8 transport". |
| C2 | D-16 lists the Daily share card as P9 #1, while D-21 (P6) requires it | P6 builds the Daily card end to end, including `@capacitor/share` + Filesystem (T09). P9 keeps links, review and run/world cards. |
| C3 | D-17 moves the `weekKey` boundary in P8, after launch. P6 introduces the Weekly Orbit and the `weekly` notification on the same boundary, so a post-launch flip would shift live weeks. | **Recommend pulling the flip to P6 (T05).** Until the owner edits D-17/EXECUTION-ORDER, `weekWindow` wraps the legacy key. |
| C4 | D-15's prompt trigger "2nd Daily win **or** a streak of 3" is partly redundant: a Daily streak of 3 always comes after the 2nd Daily win. Players who never play the Daily are never prompted automatically. | Implement as written, plus the user-initiated Settings row. Owner question: add a campaign trigger? |
| C5 | Research Q5 caps non-streak players at 2/week, which can't fit D-15's day-3/7 comeback plus a day-1 reminder | Casual cap 3 (within D-15's ≤ 4) |
| C6 | D-21's shared Daily vs "taught mechanics only" | Three tiers per date; shared within a tier; the tier is shown on the share card |
| C7 | MASTER-ROADMAP lists P5 components as a P6 dependency, but EXECUTION-ORDER runs 16 ∥ 17 | UI tasks T14/T15/T20 schedule after step 16's Modal/ScrollView, or use the glass fallback |

### 2.3 Difficulty

| Discipline | Level | Notes |
|---|---|---|
| Engineering | **M** | Many small pure modules, plus 2 native seams (RC, notifications) and one tiny Java plugin |
| Design | **H** | Economy feel, loop calibration, copy honesty, UI density on the main menu |
| QA | **M** | Device-only notification behaviour across API 26/33/34/35/36; DebugView; consent geographies |
| Content | **H** (T06) | ≥ 52 new bot-verified Daily entries |

Estimate: **~34 dev-days** (§16). The long poles are T06 (content) and T17 (post-game modes).

### 2.4 Risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Notifications feel spammy, causing OS disables and uninstalls | M | H | D-15 caps enforced as code invariants with tests (RETENTION §14); kill switch; copy closed set |
| Remote JSON breaks clients | M | H | Pure clamps + fallbacks; schema gate; schedule lint in CI; airplane-mode parity test |
| Daily pool too thin: repeats, fatigue | M | M | ≥ 60 entries; 28/90-day repeat rules; hash fallback; mirror variants |
| Stardust inflation from new faucets (catalog has only 440 ✦ of sinks, audit §F.2) | H | M | Small mission currency; Orbit points instead of currency; all values in RC; P7 rebalances after D-23 |
| Regulation (EU DFA, CPC) | L–M | H | Pause, never reset; count-based streak rewards; earn-only; no timers (RETENTION §15) |
| Menu clutter | M | M | One TODAY card with one dot replaces the DAILY button, caption and chest |
| Post-game modes slip | M | M | T17 is last; each mode has its own `postgame_enabled` flag; Remix first, Boss Rush second, Time Attack third |
| Closed-beta saves lost in migration | L | M | Pure versioned migrations with fixtures; backup keys (D-12); one-release dual-write |

### 2.5 Expected upside

High for D7/D30 (MASTER-ROADMAP P6). Today nothing pulls players back (audit §G.4 #1) and the campaign end is a cliff (§G.1). This phase also produces the first trustworthy level-health data (FASR/QAF), which P4's later waves need to decide what to fix (EXECUTION-ORDER "What must wait").

### 2.6 Success metrics

| Metric | Target | Measured from |
|---|---|---|
| D1 / D7 / D30 | ≥ 30% / ≥ 10% / ≥ 4% | Production cohorts (P12 review) |
| Daily participation | ≥ 25% of DAU | `daily_start` ÷ DAU |
| Notification opt-in | ≥ 35% of prompted players | `notif_prompt` stages |
| Notification disable | < 3% of granted players per week | `notif_disabled` |
| Weekly Orbit | ≥ 50% of WAU at M1; ≥ 20% at M5 | `weekly_milestone` |
| Engineering: analytics correctness | 0 `firebase_error`; 100% of factories pass the schema lint | DebugView; vitest |
| Engineering: RC safety | Airplane-mode first launch plays on defaults; malformed RC → defaults | Device + vitest |
| Engineering: notification invariants | 0 violations over a simulated 28 days × 12 scenarios | `notifPlan.test.ts` |

### 2.7 Must NOT be done yet

- Battle pass, season pass, paid track, event currency, server-run events (D-30; MASTER-ROADMAP P6).
- FCM push campaigns (D-30), PGS plugin, boards or achievement unlock calls (P8, D-17), Firestore, friend ghosts, referral rewards.
- Selling, renting or ad-granting streak freezes or repairs. Selling hints, currency or progress (D-23, D-24).
- Currency merge or shop redesign (P7, D-23); ad-cap tuning (P7). P6 only creates the RC keys.
- Gravity Run content or scoring changes (P8, D-22).
- Challenge links, App Links, in-app review prompts (P9). P6 defines the `review_request` name only.
- Consuming `event_calendar` (P10). P6 only reserves the key.
- Any copy saying "leaderboard" or "everyone" (D-17).
- Raising the level count (D-27; MASTER-ROADMAP P4).

---

## 3. Architecture plan

**Layering** (CLAUDE.md: thin stores, no managers; pure logic is TDD-tested):

```
src/config/*.config.ts        constants + RC defaults (single source; never inline numbers)
src/utils/<pure>.ts           pure logic: no Phaser, no Capacitor, injectable `now`
src/utils/<Name>Store.ts      thin persisted state (localStorage + D-12 Preferences mirror, schema v + backup key)
src/utils/<Seam>.ts           native seam, guarded by Capacitor.isNativePlatform(); web = no-op
src/utils/native/<plugin>.ts  registerPlugin proxy by NAME (pattern of native/firebaseAnalytics.ts)
src/scenes/*, src/ui/*        render + input only; call pure functions and stores
```

**Signal fan-out without a manager.**
- `src/utils/meta.ts` exports plain functions: `onLevelEnd(r)`, `onDailyClear(r)`, `onRunEnd(r)`, `onPortalJump()`, `onCosmeticEquip(id)`.
- Each one updates `StatsStore`, `MissionStore`, `WeeklyTrackStore` and `AchievementStore`, emits analytics, and returns a `MetaResult` (newly completed missions, milestones, achievements and rewards) for the overlay to celebrate.
- It has two callers (GameScene and EndlessScene), which satisfies CLAUDE.md's second-caller rule for extraction.

**Boot and lifecycle sequence:**

```mermaid
sequenceDiagram
  participant B as BootScene
  participant RC as RemoteConfig seam
  participant A as Analytics (P0 queue)
  participant S as Stores
  participant N as Notifications seam
  participant M as MainMenu
  B->>S: hydrate + migrate (D-12, §9)
  B->>RC: activate cached; fetchAndActivate (timeout 3 s, non-blocking)
  B->>A: consent flow (P0) → flush queue
  B->>S: SessionStore.begin(); attemptMarker.check() → level_end{killed}
  B->>N: reconcile() (async): fired log, cancel, plan, schedule
  Note over B,M: CompanySplash + IntroSplash ≈ 5.5 s cover the fetch
  M->>RC: rcConfig.snapshot() — frozen for the session
  M->>S: comeback.check(); daily resolve on TODAY open
  Note over N: App pause / resume / Daily clear → N.replan()
```

**Key modules and their contracts:**

| Module | Signature (sketch) | Pure? |
|---|---|---|
| `rcConfig.ts` | `parseRc(raw: Record<string,string>): RcValues`; `snapshot()`; `get<K>(k)` | yes (parse) |
| `dailySchedule.ts` | `resolveDaily(date, tierMax, schedule, pool) → {dailyNo, tier, levelId, modifier, sched}`; `lintSchedule(json, pool) → Issue[]` | yes |
| `dailyShare.ts` | `shareText(r: DailyShareInput, brand, link?) → string` | yes |
| `loginCalendar.ts` | `nextClaim(state, today) → {slot, cycle, reward, gapDays} \| null` | yes |
| `missions.ts` | `generate(date, salt, ctx, rc) → Mission[]`; `apply(missions, signal) → Mission[]`; `swap(...)` | yes |
| `weeklyTrack.ts` | `addPoints(state, source, date, rc) → {state, milestones[]}`; `rollWeek(state, weekId)` | yes |
| `weekWindow.ts` | `weekWindow(now) → {weekId, startsAt, endsAt}` (boundary constant) | yes |
| `comeback.ts` | `comebackDue(session, today, rc) → Gift \| null` | yes |
| `notifPlan.ts` | `plan(now, snapshot, rc) → Planned[]`; `reconcile(scheduled, pending, now) → firedLog` | yes |
| `mastery.ts` | `worldMastered(progress, world)`, `sealEarned(progress, bossId)`, `constellationPct(...)` | yes |
| `postgame.ts` | `unlocks(progress, stats) → {remix: worldId[], bossRush: 1..3[], timeAttack: (levelId) → bool}` | yes |
| `mirror.ts` | `mirrorLevel(cfg: LevelConfig) → LevelConfig` (x → 360 − x for every entity) | yes |
| `saveMerge.ts` | `mergeSave(a: SaveSnapshotV1, b) → SaveSnapshotV1` | yes |
| `analyticsSchema.ts` | `EVENT_SCHEMA`, `DIMENSIONS`, `METRICS`, `RESERVED_*`, `validateEvent(e) → Issue[]` | yes |
| `analyticsProps.ts` | `userProps(snapshot) → Record<10 keys, string>` | yes |
| `attemptMarker.ts` | `arm(m)`, `clear()`, `pendingKilled() → AnalyticsEvent \| null` | logic pure; storage thin |

**GameScene `mode`.** `init` data goes from `{ level, daily, dailyIndex, dailyModifier }` to `{ mode: GameMode, levelId, level?, daily?: DailyToday, rush?: {set, index, accMs} }`. `GameMode` = `'campaign'|'daily'|'remix'|'bossRush'|'timeAttack'`. A shim maps the old shape so every existing caller keeps working during the transition.

Mode-specific rules are data in `postgame.ts` and `mirror.ts`:
- Remix = mirrored config + modifier
- Time Attack = ghost source "author" (P2 A5 route) + medal thresholds
- Boss Rush = a sequence of boss ids with cumulative `simMs`

There is still no new engine code (CLAUDE.md "LevelConfig is the expansion point").

---

## 4. Files and modules affected

Existing paths were verified on 2026-10-07. Paths marked † are created by an earlier phase (P0/P2/P3/P5) and are only extended here.

### 4.1 Create

| Path | Purpose | Task |
|---|---|---|
| `src/utils/analyticsSchema.ts` (+ `.test.ts`) | Event registry, reserved lists, dimension/metric registry, validator | T01 |
| `src/utils/analyticsProps.ts` (+ `.test.ts`) | 10 user properties + bucketing | T03 |
| `src/utils/attemptMarker.ts` (+ `.test.ts`) | Killed-attempt marker (`gravity-flow:attempt:v1`) | T02 |
| `src/config/remoteConfig.config.ts` | Key catalogue: names, types, defaults (imported constants), clamps | T04 |
| `src/utils/rcConfig.ts` (+ `.test.ts`) | Pure parse/clamp/fallback + session snapshot | T04 |
| `src/utils/RemoteConfig.ts` | Native seam: activate cached, fetchAndActivate with a 3 s timeout | T04 |
| `src/utils/native/firebaseRemoteConfig.ts` | `registerPlugin('FirebaseRemoteConfig')` proxy | T04 |
| `scripts/analytics/rc-template.ts` | Emits the console template JSON from `remoteConfig.config.ts` (`npx vite-node`) | T04 |
| `src/utils/weekWindow.ts` (+ `.test.ts`) | Single week boundary | T05 |
| `scripts/daily/schedule-lint.ts` | CI lint of a `daily_schedule` JSON against the pool (`npx vite-node`) | T07 |
| `src/utils/dailySchedule.ts` (+ `.test.ts`) | Daily resolution + `lintSchedule` | T07 |
| `src/utils/dailyShare.ts` (+ `.test.ts`) | Spoiler-free share text | T09 |
| `src/utils/shareCard.ts` | Off-screen 1080×1350 card renderer (canvas) | T09 |
| `src/utils/native/share.ts`, `src/utils/native/filesystem.ts` | `registerPlugin('Share')`, `registerPlugin('Filesystem')` proxies | T09 |
| `src/utils/loginCalendar.ts` (+ `.test.ts`) | Pause-not-reset calendar | T10 |
| `src/config/missions.config.ts` | 13 mission types, targets, eligibility keys | T12 |
| `src/utils/missions.ts` (+ `.test.ts`) | Generation, progress, swap | T12 |
| `src/utils/MissionStore.ts` | `gravity-flow:missions:v1` | T12 |
| `src/utils/meta.ts` (+ `.test.ts`) | Signal fan-out functions (§3) | T12 |
| `src/utils/weeklyTrack.ts` (+ `.test.ts`) | Orbit points, milestones, seals | T13 |
| `src/utils/WeeklyTrackStore.ts` | `gravity-flow:orbit:v1` | T13 |
| `src/scenes/TodayScene.ts` | Overlay: Daily card, missions, Orbit, calendar, streak strip, Weekly Run card | T14 |
| `src/ui/TodayCard.ts` | Main-menu TODAY card (one dot) | T14 |
| `src/ui/ProgressBar.ts` | Bar (skip if P5 ships an equivalent; then import theirs) | T15 |
| `src/utils/mastery.ts` (+ `.test.ts`) | World mastery, seals, Constellation % | T16 |
| `src/utils/postgame.ts` (+ `.test.ts`) | Unlock rules, medal thresholds, Boss Rush sets | T17 |
| `src/utils/mirror.ts` (+ `.test.ts`) | Mirror transform for Remix and the Daily `mirror` modifier | T17 |
| `src/utils/comeback.ts` (+ `.test.ts`) | Gift eligibility | T18 |
| `src/utils/SessionStore.ts` | `gravity-flow:session:v1` | T18 |
| `src/utils/notifPlan.ts` (+ `.test.ts`) | Scheduling algorithm + reconcile (RETENTION §12.5) | T19 |
| `src/config/notif.copy.ts` (+ `src/utils/notifCopy.test.ts`) | Closed copy set + banned-word test | T19 |
| `src/utils/NotifStore.ts` | `gravity-flow:notif:v1` | T19 |
| `src/utils/Notifications.ts` | Native seam: channels, permission, schedule, cancel, `getPending`, action listener | T19 |
| `src/utils/native/localNotifications.ts` | `registerPlugin('LocalNotifications')` proxy | T19 |
| `src/utils/native/appSettings.ts` | `registerPlugin('AppSettings')` proxy | T19 |
| `android/app/src/main/java/com/truestorylabs/gravityflow/AppSettingsPlugin.java` | `openNotificationSettings()` (≈ 30 LOC) | T19 |
| `android/app/src/main/res/drawable/ic_stat_gravity.xml` | Monochrome notification small icon (vector) | T19 |
| `src/ui/NotifPrePrompt.ts` | Glass pre-prompt (equal-weight buttons) | T20 |
| `src/utils/saveMerge.ts` (+ `.test.ts`) | `SaveSnapshotV1`, `serialize()`, `mergeSave()` | T21 |
| `scripts/analytics/queries/q_level_health.sql`, `q_ttp.sql`, `q_stuck.sql`, `q_retention_dn.sql`, `q_loops.sql`, `q_economy.sql`, `q_ads_funnel.sql`, `q_iap_funnel.sql`, `q_notif.sql` | Metric definitions (ANALYTICS-PLAN §7) | T22 |
| `scripts/analytics/weekly-aggregates.mjs` | Runs the queries via `bq` and writes `analytics-archive/<week_id>/` | T22 |
| `docs/analytics/EXPERIMENTS.md` | A/B pre-registration log (ANALYTICS-PLAN §11) | T22 |

### 4.2 Modify

| Path (verified) | Change | Task |
|---|---|---|
| `src/utils/analyticsEvents.ts` (+ `analyticsEvents.test.ts`) | Taxonomy v2 factories; delete the replaced factories (ANALYTICS-PLAN §14) | T01 |
| `src/utils/Analytics.ts` † (P0 queue) | `setUserProp()`; schema validation in dev builds (console error on an invalid event) | T01, T03 |
| `src/utils/Crash.ts` † | `setKey()` for the 14 custom keys | T03 |
| `src/scenes/BootScene.ts` | RC activate + fetch; `SessionStore.begin`; marker check; `Notifications.reconcile`; `app_launch` | T02, T04, T18, T19 |
| `src/scenes/GameScene.ts` | `mode` param; `level_start` at arm; `level_end` with cause; Daily v2 flow (one payout); `meta.on*`; pre-prompt trigger; CoachMark never on non-campaign modes | T02, T07, T08, T12, T17, T20 |
| `src/scenes/EndlessScene.ts` | `run_start`/`post_score`; `meta.onRunEnd`; week via `weekWindow` | T02, T05, T12 |
| `src/utils/endless.ts` | `weekKey()` delegates to `weekWindow()` (legacy boundary unless C3 is approved) | T05 |
| `src/config/dailyLevels.ts` | `DAILY_POOL: DailyLevel[]` with `id`, `tier`, `uses`; ≥ 60 entries | T06 |
| `src/utils/daily.ts` (+ `daily.test.ts`) | Tier-filtered `dailyChallengeFor`; `streakReward` applied to the cumulative count | T07, T11 |
| `src/utils/DailyStore.ts` | v2 schema (§5.1); migration; `today` record; payout-once; `maxDateSeen`; login calendar fields | T07, T10 |
| `src/utils/currency.ts` | `stardustForWin(stars, isDaily, payout)` takes the `daily_payout` config as a parameter (default = shipped constants), so it stays pure | T07 |
| `src/utils/Leaderboard.ts` | `DailyResult` gains `attempts`, `firstTry`, `tier`, `levelId`; Boss Rush best (`gravity-flow:leaderboard:bossrush`) | T07, T17 |
| `src/utils/Share.ts` | Native path (Filesystem cache + `Share.share`) before Web Share | T09 |
| `android/app/src/main/res/xml/file_paths.xml` | Remove the broad `<external-path path=".">`; keep `<cache-path>` (android brief Q8) | T09 |
| `src/utils/loginBonus.ts` (+ `loginBonus.test.ts`) | `loginBonusFor(slot)` takes a calendar slot | T10 |
| `src/utils/RewardStore.ts` | `todayKey` uses the local `dateKey` instead of the UTC ISO date (fixes the double claim, audit §F.1) | T10 |
| `src/config/retention.config.ts` | `DAILY_EPOCH='2026-11-01'`, mission/Orbit/comeback/notification/mastery constants (the RC defaults) | T07, T12, T13, T18, T19 |
| `src/utils/streak.ts` (+ `streak.test.ts`), `src/utils/StreakStore.ts` | `countsForWinStreak({attempt, prevStars})` first-try rule | T11 |
| `src/utils/Rewards.ts` (+ `Rewards.test.ts`) | `grant(bundle, source)` = the single grant + `earn_virtual_currency`; mission/Orbit/mastery/comeback grants; `ACH_REWARD` for 12 new ids | T12 |
| `src/utils/achievements.ts` (+ `achievements.test.ts`) | 26 definitions, `progress()`, `pgs` mapping, `group` | T15 |
| `src/utils/StatsStore.ts` | New counters + snapshot fields (§5.6) | T15 |
| `src/scenes/AchievementsScene.ts` | Groups + progress bars | T15 |
| `src/config/cosmetics.config.ts` | `CollectionId` += `mastery`, `seals`, `orbit` | T16 |
| `src/utils/cosmetics.ts` | +21 earn-only cosmetics (`acquire:'achievement'`): 15 world trails, 3 seal cosmetics, 3 Orbit cosmetics | T16 |
| `src/utils/cosmeticsLogic.ts` (+ `cosmeticsLogic.test.ts`) | Collection completion counts earnable items only | T16 |
| `src/scenes/WorldMapScene.ts` | Node badges (stars, gems, crown, seal, Remix ring), Boss Rush node, Constellation % | T16, T17 |
| `src/scenes/LevelSelectScene.ts` | Time Attack chip + medal on 3★ tiles | T17 |
| `src/scenes/EndScene.ts` | "Post-game unlocked" card | T17 |
| `src/scenes/MainMenuScene.ts` | TODAY card replaces the DAILY button, caption and chest; welcome-back card; CONTINUE → "Next goal" after the campaign | T14, T17, T18 |
| `src/scenes/SettingsScene.ts` | "Reminders" row (pre-prompt or system settings); "Analytics ID" row | T20, T03 |
| `src/scenes/RunSelectScene.ts` | Copy check "Your best" (D-17; if P0 hasn't done it); "+1 Orbit point" hint | T13 |
| `src/main.ts` | Register `TodayScene`; `localNotificationActionPerformed` → route + `notif_open` | T14, T19 |
| `src/types/index.ts` † (P2 v2) | `GameMode`; `DailyLevel extends LevelConfig { tier: 1\|2\|3 }` | T06, T17 |
| `android/app/src/main/AndroidManifest.xml` | `xmlns:tools`; `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove"/>` | T19 |
| `android/app/src/main/java/com/truestorylabs/gravityflow/MainActivity.java` | `registerPlugin(AppSettingsPlugin.class)` before `super.onCreate` | T19 |
| `capacitor.config.ts` | `plugins.LocalNotifications = { smallIcon: 'ic_stat_gravity', iconColor: '#ffd166' }` | T19 |
| `package.json` | Add `@capacitor/local-notifications` 8.x (android brief Q7 read 8.3.1; pin exactly at install), `@capacitor-firebase/remote-config` 8.5.2 (D-11 parity), `@capacitor/share` 8.0.3, `@capacitor/filesystem` 8.1.4 (android brief Q8) | T04, T09, T19 |
| `scripts/levelsim/` † (P2) | Daily gate profile (RETENTION §3.2 thresholds), run by `--profile daily` | T06 |
| `.gitignore` | `analytics-archive/`, `scripts/analytics/dev-devices.txt` | T22 |
| `docs/store/privacy-policy.md`, `docs/store/listing.md` | SDK table + Data safety: Remote Config/A/B, local notifications (on-device) | T22 |

---

## 5. Data-model changes

All stores follow D-12:
- a Preferences mirror
- a `v` field
- shape validation on load
- a last-good backup key `<key>.bak`
- a corrupt store restores from the backup instead of wiping

Migrations are pure functions `migrate<Name>(raw: unknown) → Stored<Name>V<n>` with fixture tests (§8).

### 5.1 `DailyStore`: key `gravity-flow:daily` (unchanged), v1 → v2

```ts
interface StoredDailyV2 {
  v: 2;
  // daily streak: semantics unchanged (daily.ts#nextStreakWithFreeze)
  lastPlayedDate: string; streak: number; bestStreak: number; freezeCount: number;
  lifetimeClears: number;      // cumulative Daily-clear days → daily_count_rewards
  clearDays: string[];         // last 14 clear dateKeys (7-day strip; prompt trigger)
  maxDateSeen: string;         // clock-rollback guard (no payout/streak for dates ≤ this that aren't today)
  today: DailyToday | null;    // resolved once per local date (never retroactive)
  // login calendar (D-18)
  loginSteps: number;          // lifetime claims; slot = loginSteps % 7 + 1; cycle = floor(loginSteps / 7) + 1
  lastLoginDate: string;       // single local-date idempotency key
  loginStreak: number;         // DUAL-WRITE = loginSteps for one minor release (rollback safety, §10)
}
interface DailyToday {
  date: string; dailyNo: number; tier: 1 | 2 | 3; levelId: string;
  modifier: 'none' | 'timed' | 'gemRush' | 'mirror'; sched: 'rc' | 'hash';
  attempts: number; firstTry: { success: boolean; stars: number; ms: number } | null;
  bestMs: number; bestStars: number; paid: boolean;
}
```

**Migration v1 → v2** (v1 = no `v` field):

| v2 field | Value |
|---|---|
| `loginSteps` | `loginStreak` (position kept, lapsed or not) |
| `lifetimeClears` | `max(streak, number of entries in gravity-flow:leaderboard:daily)` |
| `clearDays` | last 14 dates from that list |
| `maxDateSeen` | `max(lastPlayedDate, lastLoginDate)` |
| `today` | `null` |

### 5.2 `MissionStore`: new key `gravity-flow:missions:v1`

```ts
interface StoredMissionsV1 {
  v: 1; salt: number;           // random uint32 at first creation (per install)
  date: string;                 // local dateKey the set belongs to
  missions: { type: MissionType; difficulty: 'easy' | 'medium' | 'hard'; target: number; progress: number; claimed: boolean }[];
  swapsUsed: number; allBonusClaimed: boolean; lifetimeCompleted: number;
}
```

A date change auto-grants completed but unclaimed missions, then regenerates the set.

### 5.3 `WeeklyTrackStore`: new key `gravity-flow:orbit:v1`

```ts
interface StoredOrbitV1 {
  v: 1; weekId: string; points: number;
  today: { date: string; daily: number; mission: number; run: number; level: number }; // per-source daily caps
  claimed: [boolean, boolean, boolean, boolean, boolean];
  seals: number;                // lifetime completed weeks (cumulative)
  sealRewards: number[];        // seal thresholds already granted (4, 12, 26)
}
```

A week change auto-grants reached but unclaimed milestones, then resets `points`, `today` and `claimed`.

### 5.4 `NotifStore`: new key `gravity-flow:notif:v1`

```ts
interface StoredNotifV1 {
  v: 1; state: 'unasked' | 'declined' | 'granted' | 'denied';
  prePrompts: number; lastPrePromptDate: string;
  scheduled: { id: number; at: number; type: NotifType }[];   // ids 1000–1099
  firedLog: { at: number; type: NotifType }[];                 // pruned to 14 days
  firstPlay: { date: string; minute: number }[];               // last 7 play days (habitual minute)
}
```

### 5.5 `SessionStore`: new key `gravity-flow:session:v1`

```ts
interface StoredSessionV1 {
  v: 1; sessions: number; firstAppVer: string;
  lastActiveDate: string; lastActiveAt: number;
  comebackFor: string;          // lastActiveDate of the lapse already gifted ('' = none)
  modesUsed: string;            // sorted letters C D R W X B T
}
```

### 5.6 Extended stores (additive, no version bump; `{ ...EMPTY, ...stored }` already defaults new fields)

| Store (key) | Added fields |
|---|---|
| `StatsStore` (`gravity-flow:stats`) | `missionsCompleted`, `runsFinished`, `longestRunMs`, `orbitsCompleted`, `remixCleared`, `bossRushSets`, `taGolds`, `equippedEarned` |
| `StatsSnapshot` (`achievements.ts`) | The fields above, plus `dailyClears` (from DailyStore) and `bossesCleared` (derived from ProgressStore + boss ids) |
| `Leaderboard` (`gravity-flow:leaderboard:daily`) | `DailyResult.attempts?`, `firstTry?`, `tier?`, `levelId?` |
| `Leaderboard` (new `gravity-flow:leaderboard:bossrush`) | `{ set: 1 \| 2 \| 3; bestMs: number }[]` |
| `RewardStore` (`gravity-flow:rewards:v1`) | Unchanged shape. Values become local dates. New one-time keys: `mastery:w<NN>`, `seal:w<NN>`, `sealtier:<5\|10\|15>`, `orbitseal:<4\|12\|26>`, `comeback:<date>` |
| `AchievementStore` (`gravity-flow:achievements`) | Unchanged (a set of ids); 12 new ids are additive |
| `ProgressStore` † (P2 v2, keyed by id) | No schema change. Remix progress uses ids `<id>~rx`; Time Attack medals derive from `bestTimeMs` |
| Attempt marker (new `gravity-flow:attempt:v1`) | `{ levelId, mode, attempt, armedAt } \| null` |

### 5.7 Save snapshot for P8 (`saveMerge.ts`)

`SaveSnapshotV1 = { v: 1, progress, achievements, cosmeticsOwned, daily: { bestStreak, lifetimeClears }, orbit: { seals }, stats }`.

**Merge rules (D-12):**
- max stars
- min non-zero best time
- union of gems, achievements and owned cosmetics
- max of every counter

Currencies and live streaks are excluded. They need P8's per-device ledger decision (android brief Q9).

---

## 6. UI changes

| Surface | Change | Notes |
|---|---|---|
| **MainMenu** | The DAILY button, its caption and the top-right chest are replaced by **one TODAY card** under PLAY/WORLDS. The card shows: 🔥 streak · freeze glyphs (≤ 3) · "Daily #214 · III" or "Clear World 1 to unlock the Daily" · missions `1/3` · Orbit mini-bar. **One gold dot** appears only when something is claimable or playable today. | The card is hidden until the first win (session-1 focus). The top-left trophy and palette stay. The menu ends with ≤ 2 gold cues instead of 3 (audit §G.1). |
| **TodayScene** (overlay, launched over a paused MainMenu like SettingsScene) | Sections: **Daily** (play, tier, modifier, today's attempts and best, "New Daily in 7 h"); **Missions** (3 rows: progress bar, reward, claim, 1 swap); **Weekly Orbit** (5-node track, points, rewards, seals count); **Login calendar** (7 slots, "Day 4 of 7 · Cycle 2", claim); **Streak strip** (Mon–Sun Daily clears, best streak, "Next freeze in 3 days"); **Weekly Run** card (your best this week, days until the new seed) | 48 px touch targets; contrast ≥ 4.5:1; scrolls with the P5 ScrollView or a fallback drag |
| **Daily result** (P3 ResultPanel) | Stars, time, "Try N", "First try" badge, streak tick, **Share** (secondary), "New Daily in N h" | The pre-prompt appears only after NEXT is live (D-08) |
| **Share card** | 1080×1350 off-screen: logo, Daily #, tier, stars, time, attempt strip, streak | No level geometry |
| **Notification pre-prompt** | Glass modal with two equal-weight buttons | RETENTION §12.2 copy |
| **Welcome-back card** | Gift claim, a "Last time" recap, today's Daily, paused calendar slot, "Continue" | Once per lapse |
| **World 1 unlock ceremony** | A one-time card: "The Daily, Missions and Weekly Orbit are open" + "Play today's Daily" | Fired from the W1 boss win |
| **Star Map** | Node badges (stars `x/30`, gems `x/10`, crown, seal, Remix ring); a Boss Rush node; a Constellation % header | Static under reduced motion |
| **Level select** | ⏱ Time Attack chip and medal on 3★ tiles | — |
| **Achievements** | 5 groups (Campaign, Daily & Weekly, Gravity Run, Mastery, Post-game) with progress bars | — |
| **Settings** | "Reminders": shows the state; off → the pre-prompt (session ≥ 2); denied → system settings. "Analytics ID" (copy). | Plus P0's privacy rows |
| **EndScene** | A "Post-game unlocked" card | P5 finale ceremony |
| **Run Select** | "Your best" copy; "+1 Orbit point for runs ≥ 20 s" | D-17 |

**Copy rules:**
- No "leaderboard" (D-17).
- No countdown seconds.
- No guilt words (RETENTION §12.4).

---

## 7. Gameplay changes

1. **Daily:**
   - Content comes from `DAILY_POOL` with tiers.
   - The modifier comes from the schedule; `mirror` is new (`mirror.ts`).
   - The payout happens once at the first clear.
   - Later clears record best time and stars only.
   - The CoachMark never shows on the Daily (audit §C.5).
2. **Win streak:** increments only on a first-attempt clear of a level that is not yet 3★. A death still breaks it. Mastered replays are neutral.
3. **Daily count rewards:** the Stardust bonus moves from the streak modulo to the cumulative clear count. The numbers are unchanged.
4. **Post-game modes** reuse `GameScene` with `mode`:
   - **Remix:** a mirrored layout + one constraint (`timed` par+3 s, a −20% goal radius, or `gemRush`).
   - **Boss Rush:** 5 bosses back to back with cumulative sim time. A death restarts the current boss, not the set. Quit ends the set.
   - **Time Attack:** the PB ghost is replaced by the author ghost. Medals are Bronze = par, Silver = par − 15%, Gold = author × 1.10, Author.
   - Final rules come from GAMEPLAY-DESIGN.md. If it changes these, it wins.
5. **Unchanged:** physics, the attractor formula (D-26), par semantics, relief (D-07) and the interstitial policy (D-24).

---

## 8. Test strategy

**TDD targets.** Write the failing test first; `npx vitest run <file>`.

| Test file | Key cases |
|---|---|
| `src/utils/analyticsSchema.test.ts` | Every `EVENT_SCHEMA` entry: name regex/length/reserved/prefix; ≤ 25 params; param names valid; dims ≤ 50, metrics ≤ 50; no `value`+`currency` |
| `src/utils/analyticsEvents.test.ts` (extend) | Each v2 factory's exact shape; enum validation; deleted factories absent |
| `src/utils/analyticsProps.test.ts` | Bucket edges; 10 keys; length limits |
| `src/utils/attemptMarker.test.ts` | Exactly one `level_end` per start across win, death, restart, quit, skip and kill; `killed` emitted once at boot |
| `src/utils/rcConfig.test.ts` | Defaults equal the constants (drift); every clamp edge; malformed JSON; wrong types; D-15/D-18/D-24 bounds uncrossable; newer `rc_schema` ignored; snapshot frozen |
| `src/utils/weekWindow.test.ts` | Legacy boundary = `endless.ts#weekKey` for 1,000 dates; the PGS boundary at Sunday 07:00 UTC; DST |
| `src/utils/dailySchedule.test.ts` | RC hit → tier pick; unknown id → hash fallback for that tier; the same input gives the same output; `dailyNo` from `DAILY_EPOCH`; `lintSchedule` (28-day id repeat, 90-day `(id, mod)` repeat, unknown ids, mod enum, ≥ 7 days ahead) |
| `src/utils/daily.test.ts` (extend) | Tier-filtered hash; count-based rewards; existing streak regression guards stay byte-identical |
| `src/utils/DailyStore` migration (`migrateDaily` in `dailyStoreMigrate.test.ts`) | v1 fixtures (fresh, mid-streak, lapsed, with freezes, with leaderboard history) → v2; idempotent; the dual-written `loginStreak` |
| `src/utils/dailyShare.test.ts` | Exact text for 1-try, 3-try and > 6-fail cases; no link when disabled; the brand from config; streak line only ≥ 2; ≤ 280 chars |
| `src/utils/loginCalendar.test.ts` | Missed days pause (no reset); slot/cycle math; one claim per local date; UTC-midnight edge (the old bug) |
| `src/utils/streak.test.ts` (extend) | `countsForWinStreak` truth table |
| `src/utils/missions.test.ts` | Deterministic per (date, salt); 1 easy + 1 medium + 1 hard; ≥ 2 modes when available; eligibility (no portals before taught, no Remix before unlock); apply/swap; date rollover auto-grant |
| `src/utils/meta.test.ts` | Signal → correct store updates and analytics (with mocked stores, the `Rewards.test.ts` pattern) |
| `src/utils/weeklyTrack.test.ts` | Per-source daily caps; thresholds; week rollover auto-grant; seals cumulative; seal rewards at 4/12/26 once |
| `src/utils/Rewards.test.ts` (extend) | `grant()` emits `earn_virtual_currency` with balance; idempotent one-time keys |
| `src/utils/achievements.test.ts` (extend) | 26 ids unique and stable (snapshot of the id list); `progress()` cur ≤ max; PGS points sum ≤ 1,000 and multiples of 5; ≥ 5 marked first-2h |
| `src/utils/mastery.test.ts` | Mastery and seal predicates; Constellation % edges |
| `src/utils/postgame.test.ts` | Unlock matrix; medal thresholds; Boss Rush set composition |
| `src/utils/mirror.test.ts` | Every entity type mirrored (walls, zones `dir.x` negated, magnets, portals, platforms `to`, hazards `to`, gates, gem, goal); mirror twice = identity |
| `src/utils/cosmeticsLogic.test.ts` (extend) | Completion ignores `acquire:'bundle'` items |
| `src/utils/comeback.test.ts` | < 7 days → none; ≥ 7 → gift once per lapse; the freeze condition; RC can't lower below 7 |
| `src/utils/notifPlan.test.ts` | The 12 invariants of RETENTION §14 over a simulated 28 days × 12 scenarios (opted out, casual, streak + freeze, lapsed 30 days, Daily done early, weekly player, DST start and end, UTC−10 / UTC+14, quiet-hour RC widening, kill switch); `reconcile` builds `firedLog` correctly |
| `src/utils/notifCopy.test.ts` | Banned words; no price or currency patterns; length ≤ 40/90; every type has copy |
| `src/utils/saveMerge.test.ts` | Commutative; idempotent; max/min/union rules; currencies excluded |

**Not unit-tested (by design):**
- Scenes, TodayScene layout, `shareCard.ts` rendering, native seams. These are covered by the boot smoke + Playwright checks (§14) and device tests.

**Seams** (`RemoteConfig.ts`, `Notifications.ts`) get **mocked-plugin tests** for call order and arguments:
- `allowWhileIdle: true`
- the inexact flag
- channel ids
- cancel before schedule

**Content gate:**
- `scripts/levelsim --profile daily` must pass for 100% of `DAILY_POOL`.
- `npx vite-node scripts/daily/schedule-lint.ts <json>` must pass before every RC publish (CI job on `docs/` or `rc/` schedule files).

---

## 9. Migration

**Order at boot** (after the D-12 hydrate, before any scene reads stores):
1. `DailyStore` v1 → v2.
2. `RewardStore` keeps its shape. Only the date semantics change, so there is no migration. On the upgrade day a UTC-dated `free_fragments` claim may allow one extra claim; that is accepted. Login no longer uses RewardStore.
3. Create `MissionStore`, `WeeklyTrackStore`, `NotifStore` and `SessionStore` lazily on first access.
4. Initialize `SessionStore.firstAppVer`:
   - from the current version on first creation
   - for upgraded closed-beta installs, from the progress present: if any progress exists, use `"<=1.0.0-beta.1"`
5. **Retroactive achievements:** run `AchievementStore.syncAndGetNew(snapshot)` once silently at the first post-upgrade MainMenu, then grant rewards via `Rewards.grant`. There is one consolidated toast, "N achievements unlocked", instead of N toasts.
6. **Retroactive mastery and seals:** the same consolidated pass (`mastery.ts`). Cosmetics are granted silently with one toast.

**Analytics.** The old events stop at the P6 build (ANALYTICS-PLAN §14). Register the new GA4 definitions the day the build ships to the closed track.

**Remote Config.** Publish the template generated by `scripts/analytics/rc-template.ts` (defaults = constants) **before** the P6 build reaches testers. The first `daily_schedule` covers ≥ 14 days.

**Every migration:**
- is pure
- is versioned
- is idempotent: running it twice gives the same result
- writes the `.bak` key before the first v2 write
- is covered by fixture tests built from real v1 JSON shapes copied from a closed-beta device (anonymized)

---

## 10. Rollback

| Lever | Effect | Time to act |
|---|---|---|
| RC `notif_enabled=false` | Cancel all on the next launch; schedule nothing | ≤ 12 h (fetch interval) |
| RC `missions_per_day=0` | Missions hidden; Orbit still works without mission points | ≤ 12 h |
| RC `weekly_track_enabled=false` | Orbit hidden (state kept) | ≤ 12 h |
| RC `share_enabled=false` / `share_link_enabled=false` | Share button hidden / link line dropped | ≤ 12 h |
| RC `postgame_enabled=false` | Remix/Boss Rush/Time Attack entry points hidden (progress kept) | ≤ 12 h |
| RC `daily_schedule={}` | Every client uses the deterministic hash fallback | ≤ 12 h |
| RC `comeback_gift.sd=0` | Gift card suppressed | ≤ 12 h |
| Hotfix build reverting P6 | Old code reads `gravity-flow:daily` via `{...EMPTY, ...stored}`; the extra v2 fields are ignored; `loginStreak` is still dual-written, so the old chest keeps its position. The hotfix must include `LocalNotifications.cancel` of ids 1000–1099 on boot so no stale reminders fire. | One release cycle |
| Store restore | Each store's `.bak` key restores the pre-P6 shape if v2 validation fails (D-12) | Automatic |

**Never rolled back:** granted currency, cosmetics and achievements, which are additive and kept.

---

## 11. Performance

| Item | Budget | How |
|---|---|---|
| Gameplay frame cost | +0 per frame | No per-frame meta work. `meta.on*` runs at end-of-attempt only. The marker write at arm is 1 localStorage write (≈ 0.1 ms); the D-12 Preferences mirror is async. |
| MainMenu TODAY card | ≤ 6 draw calls; static Graphics; no tweens under reduced motion | Within the D-13 Low-tier budget of ≤ 40 draw calls |
| TodayScene | ≤ 30 draw calls; text pre-measured; no particles except the claim burst (≤ 16 particles) | Respects the < 50 particles ceiling (CLAUDE.md) |
| Share card | One off-screen 1080×1350 canvas render on tap (≈ 30–60 ms, INFERRED); freed after the write | Never during gameplay |
| Stores | Each JSON ≤ 10 KB (`firedLog` ≤ 14 entries, `clearDays` ≤ 14, `firstPlay` ≤ 7) | Bounded arrays |
| `notifPlan` | ≤ 1 ms; ≤ 6 schedule calls per replan | Pure; batched `schedule({notifications:[…]})` |
| RC fetch | Native; ≤ 3 s timeout behind the splash; never blocks MainMenu | Cached activate first |
| Analytics volume | ≈ 2 events per attempt + ≈ 10 per session; batched by the SDK | Well within the free tier; no frame impact |
| Boot | +≤ 50 ms of JS work (migrations + plan), measured by `app_launch.boot_ms` | Regressions flagged in DB-TECH |

---

## 12. Platform

**Target and test devices.** `minSdkVersion 24`, `compileSdk 36`, `targetSdk 36` (verified in `android/variables.gradle`).

| Concern | Rule |
|---|---|
| **Android 13+ (API 33) notification permission** | `POST_NOTIFICATIONS` is a runtime permission and off by default for new installs. Request it only after the in-game "Yes" (`requestPermissions()`), never at launch. After repeated denials the OS stops showing the dialog: state `denied`; the Settings row opens system settings via `AppSettingsPlugin` (`Settings.ACTION_APP_NOTIFICATION_SETTINGS` + `EXTRA_APP_PACKAGE`; `ACTION_APPLICATION_DETAILS_SETTINGS` fallback on API 24–25). |
| Android ≤ 12 (API 24–32) | No runtime permission. We still require the in-game opt-in before scheduling anything (D-15 opt-in for everyone). |
| **Inexact alarms only** | Every schedule passes `allowWhileIdle: true` with exact disabled (`setAndAllowWhileIdle`). The plugin defaults to exact and, when exact isn't allowed, `schedule()` opens the "Alarms & reminders" screen (android brief Q7 [SRC]). That must never happen; the mocked-plugin test asserts the flags. |
| **`SCHEDULE_EXACT_ALARM` removal** | The plugin merges it. We add `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove"/>` (with `xmlns:tools` on `<manifest>`). Android 14+ denies it by default anyway. Verified in the merged manifest (`app/build/intermediates/merged_manifests/…`). `USE_EXACT_ALARM` must also be absent. |
| Reboot and Doze | `RECEIVE_BOOT_COMPLETED` (merged by the plugin) restores schedules after reboot. Doze defers inexact alarms to maintenance windows, and OEM battery managers may delay further. The 20:00 latest time leaves an hour before quiet hours. Accepted (research Q5). |
| Channels (API 26+) | `gf_daily`, `gf_streak`, `gf_weekly`, `gf_comeback`; importance DEFAULT, no sound, no vibration. Created at the first grant. |
| Small icon | `res/drawable/ic_stat_gravity.xml`: a white-on-transparent vector, set via `capacitor.config.ts`. A missing icon shows a blank square. |
| Tap handling | `localNotificationActionPerformed` → route by `extra.type` → `notif_open`. With `singleTask`/`singleTop` (D-09/D-11 launch mode) the warm start delivers to the running activity. |
| Play policy | Notifications only for integral game features; no ads, offers or prices in notifications (android brief Q7) |
| Share | FileProvider `${applicationId}.fileprovider` already exists. Keep `<cache-path>`; remove the unused broad `<external-path path=".">` (android brief Q8). |
| Remote Config | Needs `google-services.json`. `android/app/build.gradle` applies google-services only if present, so CI debug builds without it run on defaults, which is the intended behaviour. |
| Web build | Notifications, AppSettings and the native share are hidden (`Capacitor.isNativePlatform()`). RC = defaults. Everything else is identical. |
| iOS | Deferred (D-29). Seams are platform-neutral. |

---

## 13. Documentation

| Doc | Update |
|---|---|
| `docs/STATUS.md` † (P0) | P6 progress, gates, open decisions C1–C7 |
| `CHANGELOG.md` | Player-facing summary per task merge |
| `docs/design/RETENTION.md` | As-built deltas (numbers changed after the beta) |
| `docs/analytics/ANALYTICS-PLAN.md` | Final event/param list if it changed; GA4 registration date |
| `docs/analytics/EXPERIMENTS.md` (new) | Experiment log |
| `docs/roadmap/DECISIONS.md` | Owner edits for C1 (D-12 phase), C2 (D-16 note), C3 (D-17 timing), C4 (D-15 trigger), if approved |
| `docs/store/privacy-policy.md`, `docs/store/listing.md` | RC/A/B + local notifications in the SDK table and Data safety notes |
| `CLAUDE.md` | Architecture-only additions: new stores, `meta.ts`, TodayScene, `GameMode` (no state, per P0 step 0) |
| This file | Status line → IN PROGRESS / DONE with dates; task checkboxes |

---

## 14. Validation criteria

Evidence labels follow MASTER-ROADMAP §6: **VERIFIED** = command output; **INFERRED** = code review or reasoning; **HUMAN DEVICE TEST** = owner on hardware.

| # | Criterion | Evidence |
|---|---|---|
| V1 | `npx tsc --noEmit`, `npx vitest run`, `npm run build` all green | VERIFIED |
| V2 | All §8 TDD files exist and pass; analytics schema lint covers 57/57 custom events | VERIFIED |
| V3 | `notifPlan.test.ts`: 0 invariant violations across 12 scenarios × 28 simulated days | VERIFIED |
| V4 | `scripts/levelsim --profile daily`: 60/60 pool entries pass; tier counts I ≥ 12, II ≥ 18, III ≥ 30 | VERIFIED |
| V5 | `schedule-lint` passes on the first published 30-day schedule | VERIFIED |
| V6 | Merged manifest contains no `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`; `./gradlew assembleDebug` green | VERIFIED |
| V7 | Headless boot smoke: every scene including TodayScene opens with 0 console errors (web); RC defaults path exercised | VERIFIED |
| V8 | Playwright (`--disable-gpu --use-gl=swiftshader`): fresh profile → W1 → unlock ceremony → Daily → share text copied → TODAY shows streak 1, calendar slot 1, missions 3 | VERIFIED |
| V9 | Clamps make D-15/D-18/D-24 bounds unreachable from RC | VERIFIED (test) + INFERRED (review of `remoteConfig.config.ts`) |
| V10 | No "leaderboard"/"everyone" copy in `src/` (grep) | VERIFIED |
| V11 | Migration fixtures from a real closed-beta device round-trip without loss | VERIFIED |
| V12 | Draw calls: MainMenu ≤ 40 on the Low tier with the TODAY card | INFERRED (count) + HUMAN DEVICE TEST (perf HUD) |
| V13 | Android 13 / 14 / 15 / 16 (API 33–36): pre-prompt → OS dialog → grant → a reminder arrives at the planned time ± inexact window; deny → no dialog loop; deny twice → the Settings row opens system notification settings | HUMAN DEVICE TEST |
| V14 | Android ≤ 12 device (API 26–32): no OS dialog; nothing scheduled before the in-game "Yes" | HUMAN DEVICE TEST |
| V15 | Reboot → pending reminders survive; Doze (`adb shell dumpsys deviceidle force-idle`) → delivery deferred, not lost; `adb shell dumpsys alarm` shows no exact alarms for the package | HUMAN DEVICE TEST |
| V16 | Clearing the Daily cancels today's reminder; reopening reschedules; 0 notifications in 21:00–09:00 over a 7-day soak | HUMAN DEVICE TEST |
| V17 | DebugView checklist (ANALYTICS-PLAN §15.2) items 1–12 pass, including 0 `firebase_error` | HUMAN DEVICE TEST |
| V18 | EEA (VPN) vs US: consent form ordering; events queued until consent; logcat "Setting consent" | HUMAN DEVICE TEST |
| V19 | Airplane-mode first launch: full play on defaults; Daily via hash; no crash | HUMAN DEVICE TEST |
| V20 | Native share card to WhatsApp, Messages and Gmail: image + text; no level geometry visible | HUMAN DEVICE TEST |
| V21 | Clock moved back a day → no second payout, streak unchanged | HUMAN DEVICE TEST |
| V22 | A closed-beta tester upgrade keeps progress, streak, freezes and calendar position | HUMAN DEVICE TEST |

---

## 15. Exact completion definition

P6 is **DONE** when **all** of the following hold:

1. Tasks P06-T01 … P06-T23 meet their "done when" (§16).
2. V1–V11 are **VERIFIED**, with the command output pasted into `docs/STATUS.md`.
3. V12–V22 are signed off by the owner as **HUMAN DEVICE TEST** on at least one API 33–34 device and one API 35–36 device, plus one API ≤ 32 device for V14.
4. The P6 build has run on the closed track for ≥ 7 days with real testers, and DB-ACT, DB-LVL, DB-LOOP and DB-NOTIF show live data for every event in ANALYTICS-PLAN §5. There are 0 `firebase_error` events in that window.
5. **Remote Config:**
   - The template generated from code is published.
   - `daily_schedule` covers ≥ 30 days ahead.
   - `EXPERIMENTS.md` exists. Running no experiment is acceptable.
6. **GA4 admin:**
   - retention set to 14 months
   - 41 dimensions, 16 metrics and 10 user properties registered
   - 5 key events marked
   - the BigQuery link active
   - the weekly aggregate job run at least once successfully
7. The owner has decided C3 (week boundary) and C4 (prompt trigger), and the decisions are recorded in `DECISIONS.md`. The code matches the decision.
8. **Code review** (`superpowers:requesting-code-review`) has no open Critical/Important findings. `STATUS.md`, `CHANGELOG.md` and this file's status line are updated.

The retention **targets** (D1/D7/D30, opt-in, participation) are *not* completion criteria. They are measured on production cohorts in P12's weekly review, because a closed beta can't produce meaningful Day-N rates.

---

## 16. Task breakdown

**Order:**

```
T01 → T02 → T03
T04 → T05
T06 ∥ T07 → T08 → T09
T10 → T11
T12 → T13 → T14
T15 → T16 → T17
T18
T19 → T20
T21
T22 → T23
```

T06 (content) runs in parallel from day 1.

**Effort:** ≈ 34 dev-days.

### P06-T01: Analytics taxonomy v2 + schema lint (1 d)
- **Goal:** replace the v1 factories with the 57 v2 events (ANALYTICS-PLAN §5) behind a validated registry.
- **Files:**
  - `src/utils/analyticsSchema.ts` (new)
  - `src/utils/analyticsEvents.ts`
  - `src/utils/Analytics.ts` (dev-build validation)
- **Tests:** `analyticsSchema.test.ts` (new); `analyticsEvents.test.ts` (rewritten).
- **Done when:** every factory passes the validator; the reserved superset and prefixes are rejected; 41 dims / 16 metrics are registered; no v1-only factory remains; `tsc` and `vitest` are green.

### P06-T02: Attempt semantics + Gravity Run events (1 d)
- **Goal:** `level_start` at arm, exactly one `level_end` with `cause`, the killed marker, and `run_start`/`post_score`.
- **Files:**
  - `src/utils/attemptMarker.ts` (new)
  - `src/scenes/GameScene.ts`: `triggerWin`, `triggerDeath`, `triggerRestart`, nav/quit, the arm hook from P1/P3
  - `src/scenes/EndlessScene.ts`
  - `src/scenes/BootScene.ts`: the killed check and `app_launch`
- **Tests:** `attemptMarker.test.ts`; golden sequences in `analyticsEvents.test.ts`.
- **Done when:** the golden sequences match for win, death→retry, quit, skip and kill; the Daily logs `mode:'daily'` (no more level 0); EndlessScene emits `post_score` with `revived`.

### P06-T03: User properties + Crashlytics keys (0.5 d)
- **Goal:** set the 10 user properties and 14 crash keys at the moments in ANALYTICS-PLAN §6/§12; add the Settings "Analytics ID" row.
- **Files:**
  - `src/utils/analyticsProps.ts` (new)
  - `src/utils/Analytics.ts` (`setUserProp`)
  - `src/utils/Crash.ts` (`setKey`)
  - `src/scenes/SettingsScene.ts`
- **Tests:** `analyticsProps.test.ts`.
- **Done when:** bucket edges pass; on device, the DebugView device row shows all 10 properties; Crashlytics shows the keys on a test non-fatal.

### P06-T04: Remote Config seam + clamps (1.5 d)
- **Goal:** cached activate, 3 s fetch behind the splash, session snapshot, clamped values (ANALYTICS-PLAN §10).
- **Files:**
  - `src/config/remoteConfig.config.ts`, `src/utils/rcConfig.ts`, `src/utils/RemoteConfig.ts`, `src/utils/native/firebaseRemoteConfig.ts` (all new)
  - `src/scenes/BootScene.ts`
  - `scripts/analytics/rc-template.ts` (new)
  - `package.json` (`@capacitor-firebase/remote-config` 8.5.2)
- **Tests:** `rcConfig.test.ts` (drift, clamps, malformed, schema gate); a mocked-plugin seam test (timeout path).
- **Done when:**
  - the airplane-mode path uses defaults
  - a malformed value falls back
  - the snapshot doesn't change mid-session
  - the template JSON generated from code equals the defaults
  - `cap sync` + `assembleDebug` are green

### P06-T05: One week boundary (0.5 d)
- **Goal:** `weekWindow()` used by the Weekly Run seed, the Orbit and the `weekly` notification.
- **Files:**
  - `src/utils/weekWindow.ts` (new)
  - `src/utils/endless.ts` (`weekKey` delegates)
  - `src/scenes/EndlessScene.ts`, `src/scenes/RunSelectScene.ts` (days-until-reset)
- **Tests:** `weekWindow.test.ts`.
- **Default and decision:** the boundary constant is `LEGACY` (bit-identical to today's `weekKey`). If the owner approves C3, flip it to `PGS_SUNDAY_0700_UTC` in the same task.
- **Done when:** 1,000-date parity with the legacy key passes (or the PGS boundary test passes if C3 is approved); RunSelect's "days until new seed" uses it.

### P06-T06: Daily pool v2: content + bot gate (4 d, content)
- **Goal:** ≥ 60 bot-verified Daily entries with `id`, `tier` and `uses` (RETENTION §3.2).
- **Files:**
  - `src/config/dailyLevels.ts` (→ `DAILY_POOL`)
  - `src/types/index.ts` (`DailyLevel`)
  - `scripts/levelsim/` † (daily profile)
- **Tests:** the bot profile (blocking in CI); a vitest check that ids are unique and match `^dly-t[123]-\d{4}$`, `uses` ⊆ the tier set, and tier counts are met.
- **Done when:** the V4 counts are met; D6/D7 duplicates are resolved (relabelled or dropped); the quality report is committed under the P2 report path.

### P06-T07: Daily resolver + DailyStore v2 + one payout (1.5 d)
- **Goal:** resolve today's Daily (RC → tier → id; hash fallback), persist `today`, record attempts/first-try/best, and pay once.
- **Files:**
  - `src/utils/dailySchedule.ts` (new)
  - `scripts/daily/schedule-lint.ts` (new)
  - `src/utils/daily.ts`, `src/utils/DailyStore.ts`, `src/utils/currency.ts`, `src/utils/Leaderboard.ts`
  - `src/config/retention.config.ts` (`DAILY_EPOCH`)
  - `src/scenes/GameScene.ts`
- **Tests:** `dailySchedule.test.ts`; `daily.test.ts` (extend); `dailyStoreMigrate.test.ts`.
- **Done when:** a second clear on the same date grants 0 ✦ and sends no second `daily_complete`; clock rollback grants nothing; migration fixtures pass; schedule lint runs in CI.

### P06-T08: Daily gating + taught tiers (0.5 d)
- **Goal:** Daily, missions and Orbit locked until the W1 boss is cleared; tier from taught mechanics; no CoachMark outside the campaign.
- **Files:**
  - `src/utils/dailySchedule.ts` (`tierFor(taught)`)
  - `src/scenes/GameScene.ts` (`maybeShowCoach` guard)
  - `src/scenes/MainMenuScene.ts` (locked state)
- **Tests:** a `dailySchedule.test.ts` tier matrix.
- **Done when:** a fresh profile can't open the Daily before the W1 boss; magnets, portals and gates never appear in Tier I or II; the CoachMark never fires on the Daily (Playwright).

### P06-T09: Daily result + share card (1.5 d)
- **Goal:** the ResultPanel Daily variant, spoiler-free text + image, and native share (RETENTION §3.5–3.6).
- **Files:**
  - `src/utils/dailyShare.ts`, `src/utils/shareCard.ts`, `src/utils/native/share.ts`, `src/utils/native/filesystem.ts` (new)
  - `src/utils/Share.ts`, `src/scenes/GameScene.ts`
  - `android/app/src/main/res/xml/file_paths.xml`
  - `package.json` (`@capacitor/share` 8.0.3, `@capacitor/filesystem` 8.1.4)
- **Tests:** `dailyShare.test.ts`.
- **Done when:** the text snapshot tests pass; on device, the share sheet shows image + text (V20); the web clipboard fallback works; the `share` event fires with `content_type:'daily'`.

### P06-T10: Login calendar pause + local-date fix (1 d)
- **Goal:** D-18 pause-not-reset, a single local key, the 7-slot UI.
- **Files:**
  - `src/utils/loginCalendar.ts` (new)
  - `src/utils/loginBonus.ts`, `src/utils/DailyStore.ts`, `src/utils/RewardStore.ts`
- **Tests:** `loginCalendar.test.ts`; `loginBonus.test.ts` (extend).
- **Done when:** missing 3 days resumes on the same slot; the double-claim around UTC midnight is impossible (test at local 23:30 and 00:30 in UTC+3 and UTC−7); the `login_bonus` event carries `gap_days`.

### P06-T11: Streak visibility + count rewards + win-streak rule (0.5 d)
- **Goal:** cumulative-count Daily rewards; the first-try win-streak rule; streak and freeze data for the UI.
- **Files:**
  - `src/utils/daily.ts`, `src/utils/DailyStore.ts`
  - `src/utils/streak.ts`, `src/utils/StreakStore.ts`
  - `src/scenes/GameScene.ts`
- **Tests:** `daily.test.ts`; `streak.test.ts` (extend).
- **Done when:** a broken streak still pays the 7th-clear bonus on the 7th lifetime clear; replays of 3★ levels don't change the win streak; the existing regression guards are unchanged.

### P06-T12: Missions + signal fan-out + single grant (2 d)
- **Goal:** 3/day missions (RETENTION §6) and `meta.ts` fan-out; `Rewards.grant` as the only grant path, emitting `earn_virtual_currency`.
- **Files:**
  - `src/config/missions.config.ts`, `src/utils/missions.ts`, `src/utils/MissionStore.ts`, `src/utils/meta.ts` (new)
  - `src/utils/Rewards.ts`, `src/utils/StatsStore.ts`
  - `src/scenes/GameScene.ts`, `src/scenes/EndlessScene.ts`
  - `src/config/retention.config.ts`
- **Tests:** `missions.test.ts`, `meta.test.ts`; `Rewards.test.ts` (extend).
- **Done when:** missions are deterministic per (date, salt); eligibility holds; swap = 1/day; unclaimed missions auto-grant at rollover; every currency grant in `src/` goes through `Rewards.grant` (grep shows no direct `CurrencyStore.add` outside it).

### P06-T13: Weekly Orbit (1.5 d)
- **Goal:** the points, milestones, rewards and cumulative seals of RETENTION §5.1.
- **Files:**
  - `src/utils/weeklyTrack.ts`, `src/utils/WeeklyTrackStore.ts` (new)
  - `src/utils/meta.ts`, `src/scenes/RunSelectScene.ts`
- **Tests:** `weeklyTrack.test.ts`.
- **Done when:** per-source caps hold; rollover auto-grants; seal cosmetics at 4/12/26 are granted once; `weekly_*` events fire.

### P06-T14: TODAY card + TodayScene (2 d; after P5 Modal/ScrollView or the glass fallback)
- **Goal:** the single daily-layer entry point (§6).
- **Files:**
  - `src/ui/TodayCard.ts`, `src/scenes/TodayScene.ts` (new)
  - `src/scenes/MainMenuScene.ts` (remove the DAILY button/caption/chest)
  - `src/main.ts`
- **Tests:** none unit (UI); V7/V8 smoke.
- **Done when:**
  - the menu has one TODAY card with ≤ 1 dot
  - the overlay shows all 6 sections
  - all touch targets are ≥ 48 px
  - reduced motion is static
  - contrast is ≥ 4.5:1 (P5 audit tool)
  - the card is hidden before the first win

### P06-T15: Achievements v2 (1.5 d)
- **Goal:** 26 definitions with `progress()`, `pgs` and `group`; StatsStore counters; the grouped UI with bars.
- **Files:**
  - `src/utils/achievements.ts`, `src/utils/StatsStore.ts`, `src/utils/Rewards.ts` (`ACH_REWARD`)
  - `src/scenes/AchievementsScene.ts`
  - `src/ui/ProgressBar.ts` (new or from P5)
- **Tests:** `achievements.test.ts` (extend).
- **Done when:** the id snapshot is stable; points ≤ 1,000; ≥ 5 first-2h; the bars render for counters; the retroactive pass produces one consolidated toast.

### P06-T16: Mastery collection + Star Map meta (1.5 d)
- **Goal:** world trails, Boss Seals, earn-only collections, Constellation %.
- **Files:**
  - `src/utils/mastery.ts` (new)
  - `src/utils/cosmetics.ts`, `src/config/cosmetics.config.ts`, `src/utils/cosmeticsLogic.ts`
  - `src/scenes/WorldMapScene.ts`
- **Tests:** `mastery.test.ts`; `cosmeticsLogic.test.ts` (extend).
- **Done when:** 21 new earn-only cosmetics exist; mastery and seal grants are idempotent; no collection's completion depends on a bundle item; the Star Map shows badges and the % header.

### P06-T17: Post-game hooks: Remix, Boss Rush, Time Attack (4 d)
- **Goal:** the unlock rules, entry points and a `GameScene` `mode` (§3, §7). Ship order: Remix → Boss Rush → Time Attack. Each has its own entry point behind `postgame_enabled`.
- **Files:**
  - `src/utils/postgame.ts`, `src/utils/mirror.ts` (new)
  - `src/scenes/GameScene.ts`, `src/scenes/WorldMapScene.ts`, `src/scenes/LevelSelectScene.ts`, `src/scenes/EndScene.ts`, `src/scenes/MainMenuScene.ts` ("Next goal")
  - `src/utils/Leaderboard.ts` (Boss Rush best)
  - `src/types/index.ts`
- **Tests:** `postgame.test.ts`, `mirror.test.ts`.
- **Done when:**
  - mirrored levels pass the P2 validators (all Remix ids bot-solvable)
  - the unlock matrix matches RETENTION §10
  - medals compute from sim time
  - the old `init` data shape still works (shim)
  - the Remix/Boss Rush/Time Attack events carry the right `mode`

### P06-T18: Comeback gift (0.5 d)
- **Goal:** the D-18 gift once per lapse plus the welcome-back card.
- **Files:**
  - `src/utils/comeback.ts`, `src/utils/SessionStore.ts` (new)
  - `src/scenes/MainMenuScene.ts`, `src/scenes/BootScene.ts`
- **Tests:** `comeback.test.ts`.
- **Done when:** < 7 days gives no card; ≥ 7 gives one gift; reopening the same day gives no second gift; the freeze rule holds; `comeback_gift` fires.

### P06-T19: Local notifications core (2.5 d)
- **Goal:** the plugin, manifest, channels, icon, plan, reconcile, lifecycle and tap routing (RETENTION §12).
- **Files:**
  - `src/utils/notifPlan.ts`, `src/config/notif.copy.ts`, `src/utils/NotifStore.ts`, `src/utils/Notifications.ts`, `src/utils/native/localNotifications.ts`, `src/utils/native/appSettings.ts` (new)
  - `android/app/src/main/java/com/truestorylabs/gravityflow/AppSettingsPlugin.java`, `android/app/src/main/res/drawable/ic_stat_gravity.xml` (new)
  - `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/truestorylabs/gravityflow/MainActivity.java`
  - `capacitor.config.ts`, `src/main.ts`, `src/scenes/BootScene.ts`
  - `package.json`
- **Tests:** `notifPlan.test.ts`, `notifCopy.test.ts`; a mocked-plugin seam test.
- **Done when:** V3 and V6 are VERIFIED; on device, a test schedule fires inexactly; tapping a notification routes correctly and logs `notif_open`; the kill switch cancels everything.

### P06-T20: Pre-prompt flow + Settings row (1 d)
- **Goal:** the D-15 trigger, equal-weight pre-prompt, OS request, re-ask rules and Settings entry.
- **Files:**
  - `src/ui/NotifPrePrompt.ts` (new)
  - `src/scenes/GameScene.ts` (Daily result hook), `src/scenes/SettingsScene.ts`
  - `src/utils/NotifStore.ts`
- **Tests:** `notifPlan.test.ts` (prompt-eligibility function: session 1, 14-day wait, ≤ 2 lifetime, denied).
- **Done when:** V13 and V14 pass on device; `notif_prompt` emits every stage; no prompt in session 1 (Playwright fresh profile).

### P06-T21: Save snapshot + `mergeSave` (0.5 d)
- **Goal:** the pure D-12 merge logic, ready for P8's transport.
- **Files:** `src/utils/saveMerge.ts` (new).
- **Tests:** `saveMerge.test.ts`.
- **Done when:** commutativity, idempotence and the rules hold; currencies and live streaks are excluded; P8 is handed the interface.

### P06-T22: BigQuery, dashboards, GA4 admin, privacy docs (1.5 d, plus 👤 console work)
- **Goal:** ANALYTICS-PLAN §8, §9.5 and §13 operational.
- **Files:**
  - `scripts/analytics/queries/*.sql` (9), `scripts/analytics/weekly-aggregates.mjs`, `docs/analytics/EXPERIMENTS.md` (new)
  - `.gitignore`, `docs/store/privacy-policy.md`, `docs/store/listing.md`
- **Tests:** none unit; each query is dry-run against the beta export (`bq query --dry_run`).
- **Done when:**
  - 👤 GA4 retention is at 14 months
  - definitions are registered
  - key events are marked
  - the BigQuery link is live
  - the first weekly archive is written
  - the dashboards DB-ACT/LVL/LOOP/NOTIF render beta data
  - the privacy docs list RC/A/B and local notifications

### P06-T23: Device validation + docs close-out (1.5 d)
- **Goal:** run V12–V22, fix findings, and update the §13 docs.
- **Files:** `docs/STATUS.md` †, `CHANGELOG.md`, this file, `CLAUDE.md` (architecture lines), `docs/design/RETENTION.md` (as-built).
- **Tests:** the full gate set (MASTER-ROADMAP §6: tsc, vitest, build, `assembleDebug`, validators + bot, boot smoke, multi-rate harness, `npm audit --omit=dev`, code review).
- **Done when:** §15 is satisfied in full.
