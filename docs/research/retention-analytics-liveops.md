# Gravity Flow: Retention, Analytics & Live-Ops Decision Log

Research date: 2026-10-07. Scope: unlaunched Android (Capacitor 8 + Phaser) one-touch physics puzzler, solo developer.
Evidence labels: **[DOC]** official platform docs · **[IND]** industry or practitioner source · **[OPN]** my recommendation or judgment.
Code read (read-only): `analyticsEvents.ts`, `Analytics.ts`, `Leaderboard.ts`, `daily.ts`, `DailyStore.ts`, `streak.ts`, `loginBonus.ts`, `achievements.ts`, `docs/growth-architecture.md`.

## TL;DR: ordered actions
1. **Pre-launch blockers (analytics hygiene + consent).** Delete the custom `session_start`: it is a reserved name, so Firebase drops it and logs an error. Default all four consent types to denied in the manifest, then resolve them through UMP before analytics starts. Log `screen_view` manually per Phaser scene. Add user properties. Move to the recommended game event names now, while there is no history to lose.
2. **Remote Config.** Activate cached values at boot. Fetch during the roughly 5.5s splash, which is the "behind a loading screen" pattern Firebase recommends for A/B tests. Validate and clamp every value in a pure, TDD-tested module.
3. **Local notifications.** Opt in only after a value moment such as the 2nd daily win, behind a pre-prompt. Max 1 per day, use inexact alarms, keep quiet hours, and cancel the reminder once the daily is done.
4. **Daily share grid + In-App Review** at positive moments.
5. **Play Games Services (PGS) v2.** Map achievements (add at least 1 to reach 15), add a Weekly Run leaderboard, and align `weekKey` with PGS's weekly reset.
6. **Remote Config event calendar.** Rotate a weekly modifier on the Weekly seed, plus one earned-only monthly cosmetic.
7. **Web-playable challenge links.** The web build is the zero-install landing page, with Play Install Referrer handling the deferred deep link.
8. **Defer:** battle pass, event currency, Firestore leaderboards, friend ghosts, FCM campaigns.

---

## Q1. Firebase Analytics for games, consent, Crashlytics

**Sources:** GA collection limits (support.google.com/firebase/answer/9237506) · event naming rules (support.google.com/analytics/answer/13316687) · GA4 recommended events reference (developers.google.com/analytics/devguides/collection/ga4/reference/events) · automatic events (support.google.com/analytics/answer/9234069) · screen views (firebase.google.com/docs/analytics/screenviews) · custom definitions quotas (support.google.com/analytics/answer/14240153) · data retention (support.google.com/analytics/answer/7667196) · BigQuery export (support.google.com/analytics/answer/9823238; docs.cloud.google.com/bigquery/docs/sandbox) · DebugView (firebase.google.com/docs/analytics/debugview) · app consent mode (developers.google.com/tag-platform/security/guides/app-consent) · TCF mapping (…/implement-TCF-strings) · UMP + consent mode (developers.google.com/admob/android/privacy/consent-mode) · Crashlytics customization (firebase.google.com/docs/crashlytics/android/customize-crash-reports) · Capawesome plugins (github.com/capawesome-team/capacitor-firebase). All accessed 2026-10-07.

**Key findings**
- **Limits [DOC]:**

  | Item | Limit |
  |---|---|
  | Distinct event names per app | 500 |
  | Event name length | 40 characters |
  | Parameters per event | 25 |
  | Parameter name length | 40 characters |
  | Parameter value length | 100 characters |
  | User properties | 25 (name ≤24 characters, value ≤36 characters) |
  | Custom dimensions | 50 event-scoped, 25 user-scoped |
  | Custom metrics | 50 |

  Custom definitions show up 24–48 hours after registration. Avoid high-cardinality dimensions. Default data retention for Explorations is 2 months. Switch it to 14 months on day one: the change is retroactive within the current window.
- **Reserved event names (app) [DOC]:** `ad_activeview, ad_click, ad_exposure, ad_query, ad_reward, adunit_exposure, app_clear_data, app_exception, app_install, app_remove, app_store_refund, app_update, app_upgrade, dynamic_link_*, error, firebase_campaign, firebase_in_app_message_*, first_open, first_visit, notification_dismiss, notification_foreground, notification_open, notification_receive, notification_send, os_update, session_start, user_engagement`.
  - The `firebase_`, `google_` and `ga_` prefixes are reserved.
  - Reserved parameter names include `session_id` and `user_id`. Parameter names cannot start with `_`, `firebase_`, `ga_`, `google_` or `gtag.`.
  - Reserved user property names include `first_open_time`, `session_number` and `non_personalized_ads`.
  - An event with an invalid name is dropped and a `firebase_error` event is logged instead.
- **Recommended game events [DOC]:**
  - `level_start(level_name)`
  - `level_end(level_name, success)`
  - `level_up(level, character)`
  - `post_score(score*, level, character)`
  - `unlock_achievement(achievement_id*)`
  - `earn_virtual_currency(virtual_currency_name, value)`
  - `spend_virtual_currency(value*, virtual_currency_name*, item_name)`
  - `tutorial_begin` and `tutorial_complete` (no parameters)
  - `select_content(content_type, content_id)`
  - `share(method, content_type, item_id)`

  `*` = required.
- **Automatic events [DOC]:**
  - `first_open`, `session_start` and `user_engagement` (app in the foreground for at least 1s).
  - `screen_view`. On Android this is driven by Activity changes, so a single-activity Capacitor app reports only `MainActivity`. Turn this off with the manifest flag `google_analytics_automatic_screen_reporting_enabled=false` and log `screen_view(screen_name, screen_class)` yourself.
  - `in_app_purchase` (Play billing), `app_remove`, `app_update`, `os_update`, and `notification_*` for FCM only.
  - The Mobile Ads SDK auto-logs `ad_impression`, `ad_reward`, `ad_click` and `ad_exposure` once AdMob is linked.
- **BigQuery [DOC].** Linking is free and the sandbox costs nothing. Sandbox limits: 10 GiB lifetime storage and 1 TiB of queries per month. **All sandbox tables expire after 60 days**, and the sandbox has no streaming. Standard properties have a 1M events/day cap on the daily export.
- **DebugView [DOC].** Enable with `adb shell setprop debug.firebase.analytics.app <pkg>` and disable with `.none.`. Debug events *are* exported to BigQuery, so add a developer-traffic filter.
- **Consent [DOC].**
  - There are four consent types: `analytics_storage`, `ad_storage`, `ad_user_data` and `ad_personalization`.
  - Manifest defaults use the `google_analytics_default_allow_*` keys. The two v2 keys also accept `eu_consent_policy`.
  - `setConsent` overrides the defaults and persists across launches. `setAnalyticsCollectionEnabled` also persists.
  - With `analytics_storage` denied, the SDK sends measurements "without signals", i.e. no identifiers.
  - UMP ≥3.2.0 "can interpret GDPR consent choices for Google Consent Mode", including analytics storage. Initialize Firebase *before* UMP.
  - The TCF integration maps Purpose 1 to `ad_storage`/`ad_user_data` and Purposes 3/4 to `ad_personalization`. It governs ad signals only.
  - Verify in logcat by looking for "Setting consent".
- **Crashlytics [DOC].** 64 custom keys (1 kB each), 64 kB of logs per session, and only the 8 most recent non-fatals per session are kept. Opt-in reporting uses the manifest flag `firebase_crashlytics_collection_enabled=false` plus `setCrashlyticsCollectionEnabled(true)`. Analytics events become crash breadcrumbs.
- The Capawesome Capacitor 8 plugins expose `setConsent`, `setUserProperty`, `setCurrentScreen`, `setEnabled` and `setSessionTimeoutDuration` [DOC].

**Implications for Gravity Flow (code review)**
- `analyticsEvents.sessionStart()` emits `session_start`. It is **silently dropped** and pollutes the property with `firebase_error`. Delete it, because the automatic one already exists. If a cold-start marker is wanted, use `app_launch`.
- `Analytics.ts` has no consent gate, no user properties and no screen tracking. It loads the plugin on the first `track()` call, so the first event fires before consent. `sanitizeParams` truncates values but does not validate names, the 25-parameter cap or reserved names. `bundleCrossSell` uses a camelCase key (`bundleId`).
- Local notifications do not auto-log anything. Never name a custom event `notification_open`, which is reserved; use `notif_open`.

**Recommended implementation [OPN]**
1. **Manifest:**
   - Set all four `google_analytics_default_allow_*` keys to `false` (advanced mode).
   - Set `google_analytics_automatic_screen_reporting_enabled=false`.
   - Set `firebase_crashlytics_collection_enabled=false`.
2. **Boot order:** Firebase init → UMP `requestConsentInfoUpdate` → branch:
   - If consent is not required, call `setConsent` with all types granted.
   - If consent was obtained, let UMP write consent mode, then verify it.
   - Then enable Crashlytics. Under legitimate interest this can happen regardless of the ad choice, but **get a legal check**.
   - Add a Settings toggle, "Share anonymous usage data", that calls `setEnabled(false)` and sets denied.
3. **`Analytics.ts`:** add `setUserProp(k, v)`, `screen(name)` (called from each scene's `create`), and a pre-consent queue. Add a TDD test that asserts every factory name matches `^[a-zA-Z][a-zA-Z0-9_]{0,39}$`, is not in the reserved list, has ≤25 parameters, and uses snake_case keys.
4. **Crashlytics keys:** `scene`, `level`, `mode`, `webview_ver` (from the UA), `renderer` (WebGL/Canvas), `build`.
   - Route `window.onerror` and `unhandledrejection` to `recordException`, deduped by message hash and capped at 5 per session.
   - Log scene transitions with `log()`.
5. **Day one:** set retention to 14 months, link AdMob and Play, and link BigQuery (sandbox). Because of the 60-day sandbox expiry, either schedule a weekly query that writes aggregates or enable billing; storage at this scale costs pennies [OPN].

**Risks:** advanced-mode modeling needs volume we won't have, so denied users are simply lost. Accept that. **Validation:** DebugView session showing a manual `screen_view` per scene and zero `firebase_error`; logcat consent lines on an EEA VPN and on a US device.

---

## Q2. Product-question-driven event taxonomy

**Sources:** GameAnalytics funnels docs (docs.gameanalytics.com/features/funnels) · King GDC via mobilegamer.biz (2024-03-27) · SayGames difficulty post (blog.say.games, 2026-07-30) · Bruin difficulty-spike use case (getbruin.com) · Lily's Garden difficulty modelling (arXiv 2107.03305) · devtodev and GoPractice on retention definitions · GA4 predictive metrics (support.google.com/analytics/answer/9846734).

**Key findings**
- **Difficulty metrics in use [IND]:**
  - Attempts per user per level, % completed, and fails.
  - Churn per level, meaning users who passed the previous step but not this one.
  - Bruin flags levels whose first-attempt completion is **below 40%** and checks them for same-day churn.
  - SayGames: a 50% fail rate means about 2 attempts and 80% means about 5. Averages hide tails of 10 to 50 attempts. "What looks like churn can simply be a pause."
  - King tracks time-to-pass and time-to-abandon, and prunes its "100 least fun levels". Its finding: "hard levels should be short."
- **Churn definitions vary [IND]:** inactivity windows of 7, 10, 14 or 30 days are all common. Classic Day-N retention ≠ rolling retention, which always reads higher. GA4's churn probability means not active in the next 7 days, and it needs **≥1,000 returning churners and ≥1,000 non-churners** in a 7-day window, which a small game won't reach [DOC].

**Implication:** the current events cover outcomes but not **attempt number, mode, or quit vs. death**, so quit-after-fail and first-attempt success can't be computed. Rename now, before launch, because there is no history to lose.

**Recommended event set [OPN]** (snake_case; `level` is an int 1–150, `world` an int 1–15, `mode` ∈ `campaign|daily|weekly|endless`)

| Event | Params | Product question answered |
|---|---|---|
| `tutorial_begin` / `tutorial_complete` | n/a (complete = first win, replaces `onboarding_complete`) | Activation: % of `first_open` reaching first win in session 1; time to first win |
| `level_start` | level, world, mode, attempt (lifetime attempt # for this level), replay (0/1 already starred) | Funnel reach per level; retry depth |
| `level_end` (replaces `level_complete`, `level_fail`, `retry`) | level, world, mode, attempt, success (1/0), cause (`win/hazard/timeout/oob/restart/quit`), duration_ms, stars, gem, under_par, hint (0/1), streak (daily only) | First-attempt success rate, attempts per success, abandon vs death, par tuning, gem discoverability |
| `world_start` / `world_complete` | world | Macro progression; key event for A/B goals |
| `post_score` (Gravity Run end) | score, mode (`weekly/endless`), new_best, revived, duration_ms | Mode adoption and depth; revive impact |
| `unlock_achievement` | achievement_id | Meta engagement (replaces `achievement_unlocked`) |
| `earn_virtual_currency` | virtual_currency_name (`stardust/fragments`), value, source, balance | Economy faucets (replaces `fragment_earned`, `reward_double_stardust`) |
| `spend_virtual_currency` | virtual_currency_name, value, item_name, balance | Sinks; hoarding (high balance with no spend) |
| `share` | method (`web_share/clipboard`), content_type (`daily/run/world/level`), item_id | Viral-loop volume |
| `notif_prompt` | stage (`pre_shown/pre_yes/pre_no/os_granted/os_denied`) | Opt-in funnel |
| `notif_open` | type (`daily/streak/weekly/comeback`) | Notification efficacy |
| `review_request` | trigger | Review-prompt reach |
| Keep as-is | `login_bonus`, `daily_start`(optional), `streak_frozen`, `streak_broken`, `win_streak`, `hint_used`, `shop_open`, `store_tab`, `bundle_cross_sell(bundle_id)`, `store_nudge_*`, `cosmetic_equip`, `purchase_initiated/completed/failed`, `first_purchase`, `restore`, `rewarded_offered/shown/earned(source)`, `interstitial_shown/suppressed(reason)`, `collection_complete` | Ad funnel per surface, IAP funnel, cadence audit |

Total is about 35 events, well under 500. **Register** these event-scoped dimensions: level, world, mode, attempt, success, cause, source, reason, product, item_name, content_type, type, stage, trigger. Register these metrics: duration_ms, value, balance, score.

**User properties (10 of 25) [OPN]:**

| Property | Values |
|---|---|
| `furthest_level` | 1–150 |
| `furthest_world` | 1–15 |
| `stars_bucket` | 0–29, 30–89, 90–199, 200+ |
| `daily_streak_bkt` | 0, 1–2, 3–6, 7–13, 14–29, 30+ |
| `payer` | `none`, `noads`, `bundle` |
| `notif_state` | `unasked`, `granted`, `denied` (re-read `areNotificationsEnabled` each launch) |
| `modes_used` | e.g. `CDWE` |
| `first_app_ver` | app version at first launch |
| `pgs` | 0/1 |
| `reduce_motion` | 0/1 |

**Derived metrics and thresholds [OPN, IND-anchored]:**

| Metric | Definition | Target / flag |
|---|---|---|
| First-attempt success rate (FASR) | `level_end{success=1, attempt=1}` ÷ `level_start{attempt=1}` | W1–3 ≥ 70%. Flag any non-boss level < 40% (Bruin). |
| Attempts per success (APS) | `level_start` ÷ `level_end{success=1}` | ≤ 3, or ≤ 6 for bosses |
| Quit-after-fail (QAF) | Users whose last level event in a session is `success=0` at L, ÷ users failing L | A difficulty wall is QAF > 2× the world median |
| Stuck rate | Users with `furthest_level = L` and no session for ≥ 7 days | Use BigQuery |
| Time-to-pass | Summed `duration_ms` until the first success | King-style signal |

**Churn-risk indicators [OPN]:**
- 3 or more consecutive same-level fails in one session.
- QAF.
- A broken daily streak with no return within 48h.
- A growing gap between sessions.
- No `tutorial_complete` in session 1.
- Store browsing without any `level_start`.

**Validation:** a BigQuery query per metric; manual playthrough of one cohort in DebugView.

---

## Q3. Remote Config + A/B Testing

**Sources:** RC loading strategies (firebase.google.com/docs/remote-config/loading) · RC Android get-started · RC parameters and conditions limits (…/remote-config/parameters) · custom signals (RC Android SDK 22.1.0+) · A/B config (firebase.google.com/docs/ab-testing/abtest-config) · A/B concepts (…/ab-concepts) · sample-size rule n≈16σ²/δ² (arXiv 2305.16459).

**Key findings [DOC]:**
- RC's default minimum fetch interval is 12h, and the fetch timeout is 1 minute. Real-time listeners bypass the interval.
- There are three loading strategies:
  - Fetch and activate on load.
  - Activate behind a loading screen. Firebase "strongly recommend[s]" this one for A/B tests.
  - Load for next startup.
- Quotas: 3,000 parameters and 2,000 conditions. Conditions can use app version, country, user property, random percentile, first open, and custom signals.
- A/B Testing allows 300 experiments per project with 24 running at once. Goals can be retention D1–D15+, crash-free users, revenue or a custom event. Results use frequentist p < 0.05, and Firebase recommends running **at least 14 days**.

**Implication:** the splash sequence (CompanySplash plus IntroSplash, about 5.5s) is a free "loading screen". First-session users can be bucketed before gameplay with no added wait.

**Determinism risk:** `dailyChallengeFor` hashes the date. If Remote Config changed the pool or the modifier weights directly, stale clients would play a *different* daily, which breaks share grids and boards. Changes must therefore be **dated overrides**.

**Recommended implementation [OPN]:**
- At boot: `activate()` cached values immediately, then `fetchAndActivate()` with a 3s timeout during the splash. Gameplay reads values only through a pure `rcConfig.ts` that does `parse → clamp → fall back to the shipped constant` (TDD).
- No real-time listener; it keeps a socket open and adds nothing here.
- Defaults equal the current shipped constants, so offline behaviour is identical.

| Key | Type | Default |
|---|---|---|
| `rc_schema` | int | 1 |
| `par_time_mult` | number | 1.0 (clamp 0.8–1.5) |
| `par_mult_by_world` | JSON | `{}` |
| `time_limit_mult` | number | 1.0 |
| `hint_after_fails` | int | current value |
| `ads_interstitial_enabled` | bool | true (kill switch) |
| `ads_inter_min_levels` | int | = ads config |
| `ads_inter_min_secs` | int | = ads config |
| `ads_inter_grace_levels` | int | = ads config |
| `rewarded_surfaces` | JSON | all on |
| `login_ladder` | JSON | = `RETENTION.LOGIN_BONUS_LADDER` |
| `daily_streak_rewards` | JSON | `{"3":10,"7":25,"14":50,"30":100}` |
| `streak_freeze_every` | int | = RETENTION |
| `streak_freeze_max` | int | = RETENTION |
| `daily_schedule` | JSON | `{}` (date→{index,modifier}; publish ≥3 days ahead) |
| `event_calendar` | JSON | `[]` (see Q7) |
| `store_nudge_cooldown` | int | current value |
| `review_min_wins` | int | 15 |
| `notif_max_per_week` | int | 4 |
| `notif_quiet_start` | int | 21 |
| `notif_quiet_end` | int | 9 |
| `share_enabled` | bool | true |

**A/B sample sizes [OPN, formula IND]:** 80% power, α = 0.05, two arms. n is per arm.

| Metric | Baseline | Detect | n per arm | Days at 100 installs/day |
|---|---|---|---|---|
| D1 retention | 25% | +3 pp | ~3,300 | ~67 |
| D1 retention | 25% | +5 pp | ~1,200 | ~24 |
| D7 retention | 8% | +2 pp | ~2,900 | ~59 |
| Levels 1–10 completion | 60% | +5 pp | ~1,500 | ~31 |

**Rules for running tests:**
- Below about 300 installs/day, only test large swings: whether interstitials run at all, par multipliers, and the early-difficulty curve.
- Prefer high-frequency per-user metrics such as `world_complete{world=1}` or rewarded opt-in.
- Fix the test duration in advance; no peeking.
- Otherwise use **Rollouts**: staged percentage plus crash-free monitoring.

**Validation:** airplane-mode first launch plays on defaults; a malformed JSON value falls back without a crash (unit test).

---

## Q4. Retention mechanics: evidence and fit

**Sources:** Duolingo streak blog (2022-01-31) · Lenny's "How Duolingo reignited user growth" (Jorge Mazal, 2023-02-28) · Lenny's "Behind the product: Duolingo streaks" (2024-12-15) · Duolingo leagues (duolingo.deconstructoroffun.com/mechanics/leagues) · Naavik "Converging live ops trends in mobile puzzle" (2025-11-16) · GameAnalytics 2026 benchmarks (via gamedevreports, 2026-06-04) · GameRefinery "Four ways mobile games re-engage lapsed players" · EU CPC key principles on in-game virtual currencies (2025-03) · Digital Fairness Act briefs (Goodwin 2025-11; BEUC 2026 checklist).

**Key findings [IND]:**
- **Duolingo streaks:**
  - Learners who reach a 7-day streak are **3.6× likelier to finish a course**.
  - A new streak animation gave **+1.7% D7** for new users.
  - Letting learners equip 2 streak freezes gave **+0.38% DAU**. Slack *raises* commitment.
  - Making streaks easier (1 exercise) did **not** raise DAU.
  - Retention is "most fragile in the first seven days."
  - Late-day "streak saver" notifications were a major win.
- **Duolingo leagues:** weekly cohorts of 30 similar-pace users with promotion and demotion. Learning time rose **+17%**, highly engaged learners tripled, and D1/D7 improved.
- **Duolingo's north star** was current-user retention (CURR), with 5× the impact of the next-best lever. Its rule for push was "protect the channel."
- **Top puzzle games** converge on daily "jackpot" events solvable in the first session of the day, weekly leaderboard events with *parallel personal milestone tracks* (so everyone earns), and endlessly repeatable collections.
- **Benchmarks (all genres):**

  | | Median | Top 25% |
  |---|---|---|
  | D1 | ~20–22% | >30% |
  | D7 | <4% | 6–7% |
  | D30 | ~0.7% | ~1.7% |

  No puzzle-specific breakdown was published.
- **Regulation is tightening.** The EU Digital Fairness Act (proposal expected Q3–Q4 2026) targets "daily streaks that penalise taking a break" and "daily login rewards where missing a day resets progress". The CPC network's principles require transparent virtual-currency pricing and no forced currency purchases.

**Implications for Gravity Flow:**
- The daily streak, the earned-only freeze and the 3/7/14/30 milestones are well aligned with this evidence.
- The **login chest resets** to day 1 on any missed day (`nextStreak` returns 1). That is exactly the pattern the DFA flags.
- There are no weekly multi-day goals yet, and no comeback gift.

**Recommendations [OPN]:**

| Window | Recommendation |
|---|---|
| D1 | FTUE to first win in under 30s (already designed). End session 1 with a visible "tomorrow" hook: the next daily unlock time and a Day-2 chest preview. Keep W1 FASR ≥ 70%. |
| D7 | The daily is the habit loop. Make the login calendar **pause rather than reset**: it advances one step per login day and never resets. Add a **weekly personal track**: e.g., 5 dailies plus 3 runs earns a bonus, giving Royal-Match-style milestones without a global board. |
| D30 | Rely on the 150 levels and 3-star mastery. Add a collection meta on the Star Map, plus the PGS weekly board (Q8). |
| Comeback | A one-time "welcome back" gift after 7 or more days away: Stardust plus 1 freeze if the streak was ≥7. Never more than 1 gift per lapse. |
| Avoid | Purchasable freezes or repairs; guilt-based copy; fake timers; permanently missable cosmetics. |

**Validation:** compare D7 for users who completed ≥2 dailies by D3 against those who didn't (correlational). Run an A/B test on the weekly track using `world_complete` and D7 as goals.

---

## Q5. Push and local notifications

**Sources:** Android notification permission (developer.android.com/develop/ui/views/notifications/notification-permission) · Android 14 exact alarms (developer.android.com/about/versions/14/changes/schedule-exact-alarms) · Play policy on ads and notifications (support.google.com/googleplay/android-developer/answer/9857753) · FCM product page (firebase.google.com/products/cloud-messaging) · Pushwoosh Android 13 research (2024-10-07) · Airship 2026 benchmarks (2025 data) · Localytics survey via MarketingProfs (2018) · Duolingo KDD'20 bandit paper (research.duolingo.com/papers/yancey.kdd20.pdf) · Meta notification best practices.

**Key findings:**
- **Android permissions [DOC]:**
  - On Android 13+, notifications are **off by default** for new installs.
  - Request the permission in context, "after users familiarize themselves" with the app, and **not at first launch**.
  - Apps targeting 13+ may re-prompt, but after repeated denials the system stops showing the dialog.
  - On Android 14, `SCHEDULE_EXACT_ALARM` is denied by default. Use `setAndAllowWhileIdle` or `setWindow` instead.
  - Play allows system notifications for "integral features… a game that notifies users of in-game promotions", but no notification ads.
- **Opt-in and frequency [IND]:**
  - Gaming apps lost nearly ⅓ of their opted-in users after Android 13. Android opt-in fell from 85% to 67% (Pushwoosh).
  - Airship records a gaming floor of 21% opt-in on Android.
  - At 1 notification per week, only 10% of users would disable notifications. At 2–5 per week, 37% would, and 22% would stop using the app (Localytics, 2017).
  - Duolingo's notification-content bandit gave +0.5% DAU and +2% new-user retention by **optimizing content, not volume**.
- **Delivery [DOC]:** FCM is free and its composer targets GA audiences. Local notifications need no server.

**Implication:** the audience is opted-out by default and fragile. Local notifications can be personalized from state that already exists on-device (streak, daily done, weekly PB) with zero backend.

**Notification rules [OPN]** (`@capacitor/local-notifications`, inexact scheduling, one channel per type):
1. **Ask:**
   - Never in session 1.
   - Show an in-game glass pre-prompt after the **2nd daily win**, or when the streak reaches 3: "Want a heads-up when tomorrow's Daily drops?" Only a Yes leads to the OS prompt.
   - If declined, wait 14 days. At most 2 pre-prompts per lifetime; after that the option lives only in Settings, which deep-links to the system settings.
2. **Types:**
   - `daily`: the new daily is ready.
   - `streak`: streak saver, only when the streak is ≥3 and the daily isn't done.
   - `weekly`: a new weekly seed or modifier.
   - `comeback`: on days 3, 7 and 14 after the last session, then **stop**.
3. **Caps:** max 1 per day. Max 4 per week with an active streak ≥3, otherwise 2 (Remote Config `notif_max_per_week`).
4. **Timing:** the user's habitual hour, i.e. the median local hour of the first `level_start` over the last 7 sessions, clamped to 09:00–21:00. Default 18:30. Quiet hours run 21:00–09:00.
5. **Lifecycle:** on every app resume, cancel everything and reschedule the next 7 days. Completing the daily cancels today's streak reminder.
6. **Copy:** specific and honest. "Day 12 streak · today's Daily is a Timed run (~40s)." No guilt, no fake urgency.
7. **FCM:** later and optional. Use it only for ≤2 announcements a month (a new world or event) via the composer. Skip it at launch: it brings token handling and an extra plugin.

**Risks:** OEM battery killers delay inexact alarms, which is acceptable. **Validation:** opt-in rate per `notif_prompt` stage; `notif_open` → `level_start` within 30 minutes; weekly change in `notif_state` from granted to denied (target < 3%).

---

## Q6. Social and viral loops

**Sources:** Wordle (Wikipedia: 90 players on 2021-11-01, then 300k on 2022-01-02, then 2M a week later; 1.2M shared results on Twitter between Jan 1 and 13) · Firebase Dynamic Links FAQ (firebase.google.com/support/dynamic-links-faq) · Play Install Referrer (developer.android.com/google/play/installreferrer/library) · GA4 Play campaign attribution (support.google.com/analytics/answer/10311900; Tatvic/InfoTrust) · Play In-App Review (developer.android.com/guide/playcore/in-app-review).

**Key findings:**
- **Dynamic Links shut down on 2025-08-25 [DOC].** The replacements are App Links plus third-party providers.
- **Install Referrer [DOC]:** data is available for 90 days, so read it once at first launch. GA4 attributes `first_open` to `utm_*` values carried in the Play `&referrer=` parameter [IND].
- **In-App Review [DOC]:** a hidden, time-bound quota applies. **Never** gate the prompt with "do you like it?", never trigger it from a button, and never alter the card.
- **Wordle [IND]:** the spoiler-free emoji grid of a shared daily puzzle was the growth engine.

**Implication:** the web build is a unique asset. A challenge link can open *playable* in a browser, with an install CTA, at no SDK cost.

**Ranked by fit [OPN]:**

| # | Feature | Retention | Virality | Cost | Moderation |
|---|---|---|---|---|---|
| 1 | **Daily share grid**: `Gravity Flow Daily #214 ★★★ 12.4s 🔥7` plus a per-attempt line such as `🟥🟥🟩` and a UTM'd link | Med | Med–High | Low | None |
| 2 | **In-App Review** after `world_complete` (W2+) or a 7-day streak; never after a fail; at most once per 60 days, 3 per lifetime | n/a | Store conversion | Low | None |
| 3 | **Weekly-seed challenge link** (`gravityflow.app/w/2026-W41`). Web plays it instantly; Android opens it via App Links; the Play `referrer=challenge%3D…` value deep-links it after install | Med | High | Med | None |
| 4 | **PGS weekly leaderboard** (Q8) | Med–High | Low | Med | PGS handles it |
| 5 | **Creator-friendly features**: visible seed codes, a "custom seed" entry, a clean HUD toggle for capture | Low | Med | Low | None |
| 6 | **Friend ghost via link**: needs ghost storage, a backend and abuse handling | Med | Med | High | Med. **Defer.** |
| 7 | **Incentivized referral rewards**: hard to make fraud-proof and a poor fit | Low | Low–Med | Med | Med. **Skip.** |

**Validation:** count `share` events by `content_type`; attribute `first_open` by `utm_source=share`; and check that reviews in the Play Console track the timing of `review_request`.

---

## Q7. Live-ops for a solo indie

**Sources:** Naavik (2025-11-16) · GameRefinery battle-pass prevalence (in about 60% of top-grossing games; growth reports via PocketGamer.biz) · Google Play Promotional Content page (play.google.com/console/about/programs/liveopsbeta) · Play Games Level Up blog (2025-09-23) · Level Up guidelines (developer.android.com/games/guidelines) · `docs/growth-architecture.md`.

**Key findings:**
- Weekly leaderboard events with milestone tracks are the near-universal puzzle cadence [IND].
- Battle passes concentrate in top-grossing games with deep content pipelines [IND].
- Promotional Content has historically been limited to eligible apps. Google now bundles Play Console "engagement tools" (promotional content, You tab, Play Points) with the **Level Up program** [DOC].
- The two Level Up sources disagree on timing. The 2025 blog says milestones begin July 2026. The current guidelines page says enrollment opens on 2026-09-01.
- Level Up's guidelines require:
  - PGS v2 initialized at startup.
  - At least 10 achievements, with 4 earnable in the first hour.
  - Cloud save with conflict resolution.
  - Sidekick.
  - Play Games Reward offers (2 by 2026-09-30).
  - Large-screen support, keyboard and mouse or controller input, and PC.

  The program is voluntary [DOC].

**Implication:** live-ops for this game is *data, not content*. The existing seeds, modifiers, hub row and `RewardStore` already make every event a JSON row. Full Level Up compliance (Sidekick, PC, rewards, controller) is heavy, so target only its cheap subset: PGS, achievements and cloud save.

**Build first [OPN]:**
1. **`event_calendar` Remote Config JSON:** `[{id, start, end, kind:'weekly_mod'|'season_palette'|'cosmetic_drop', seedKey?, modifier?, palette?, rewardId?, goal?}]`, with dates in UTC. The client ignores unknown kinds, so old builds are safe. Cosmetics ship in the binary and dates only unlock them.
2. **Weekly modifier rotation** on the Weekly Gravity Run, cycling 6–8 existing modifiers. Show it as a "This Week" card in `RunSelectScene`. Cadence is weekly and content cost is zero.
3. **Monthly earned cosmetic:** reach a goal such as 5 weekly runs or score ≥ X. Each cosmetic returns in a later "vault" rotation, so it is never permanently missable.
4. **Seasonal palette:** 4 per year, reusing `worldThemes`.
5. **Personal weekly milestone track** (Q4) as the always-on event.

**Defer:**
- **Battle pass:** needs a content treadmill, needs ≥ thousands of DAU to pay back, and adds DFA/FOMO risk.
- **Event currency:** a third currency complicates the dual economy and the CPC transparency requirements. Use progress meters instead.
- Team events, guilds, and server-run events.

**Cadence:** prepare one month of calendar per sitting and publish it ≥7 days ahead, which covers the 12h fetch interval and app-update lag.

**Validation:** `level_start{mode=weekly}` WAU share; D7 for event participants vs. non-participants; zero crashes on unknown `kind` values (unit test).

---

## Q8. PGS v2 leaderboards vs. Firebase/Firestore

**Sources:** PGS leaderboards (developer.android.com/games/pgs/leaderboards) · PGS data collection (developer.android.com/games/pgs/data-collection) · PGS v2 migration blog (2025-06-30) · Firestore quotas (firebase.google.com/docs/firestore/quotas) · Play Integrity quotas (developer.android.com/google/play/integrity/setup) · OpenForge capacitor-game-connect (GitHub).

**Key findings [DOC]:**
- **PGS leaderboards:**
  - Daily, weekly and all-time versions are created automatically for every leaderboard. Daily resets at UTC-7 midnight; weekly resets at the Saturday-to-Sunday midnight UTC-7.
  - There are social and public collections.
  - Score formats are numeric, time or currency, and ordering can be larger-is-better or smaller-is-better. The ordering is fixed once published.
  - **Tamper protection is on by default** for new boards. You can also set score bounds and hide players manually.
  - Up to 70 leaderboards per game.
  - PGS collects the gamertag, avatar, scores and achievements. Users control profile visibility and can delete their data through Google.
  - v1 is gone from the SDK as of May 2026.
  - The blog recommends **≥15 achievements, 5 of them within 2 hours**.
- **Firestore:** the free tier is 50k reads, 20k writes and 20k deletes per day, plus 1 GiB. Server-side validation needs Cloud Functions, which means the Blaze plan. App Check via Play Integrity has a default quota of 10k requests/day.
- The community Capacitor PGS plugin targets Capacitor ≤5 [IND].

| | PGS v2 | Firestore + Functions |
|---|---|---|
| Cost | Free | Free tier, then Blaze plan; plus your time |
| Anti-cheat | Built-in tamper protection + score bounds | DIY: Integrity, Functions validation, replay checks |
| Privacy / Data safety | Google is the controller of the profile. Disclose "game service data". | You store user IDs and scores. Must disclose, build deletion, and moderate display names (UGC). |
| Web build | No | Yes |
| Custom windows | Fixed resets | Any window |

**Implications for Gravity Flow:**
- `Leaderboard.ts` is already PGS-shaped.
- The daily uses a **local-midnight** `dateKey`. That suits habit-building but mismatches PGS's UTC-7 daily reset, so **do not put the daily on PGS**.
- Weekly fits PGS, but only if the Weekly seed's `weekKey` boundary matches PGS's Sunday 07:00 UTC reset. Otherwise the previous seed's scores bleed into the new week.

**Recommendations [OPN]:**
1. Write a thin local Capacitor plugin (about 200 lines of Kotlin) covering: `PlayGamesSdk.initialize`, `isAuthenticated`, `submitScore`, `showLeaderboard`, `unlockAchievement`, and later `SnapshotsClient` for cloud save.
2. Create two boards:
   - Weekly Run: larger is better, read through the weekly span, with a score upper bound.
   - Endless all-time: no revives.
3. Map the 14 achievements to PGS and add ≥1 early one, such as "First Daily" or "First Gravity Run", to reach the recommended 15.
4. Keep web scores local.
5. Revisit Firestore only if web DAU becomes material, or for friend ghosts.

**Validation:** submit from 2 test accounts; check the weekly-boundary switchover against `weekKey`; confirm that tamper-hidden scores appear in the Play Console.

---

_Sources are cited inline per question (URL + publication date where known; all accessed 2026-10-07)._
