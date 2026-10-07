# Risk Register

> **Status:** plan of record from 2026-10-07 (baseline `master @ d3c6aab`).
> **Review:** at the weekly metrics review ([`SUCCESS-METRICS.md`](SUCCESS-METRICS.md) §11) and at every milestone gate.
> **Conforms to:** [`DECISIONS.md`](DECISIONS.md). Every row cites the brief, audit or decision it comes from.
> **Evidence shorthand** follows [`FEATURE-MATRIX.md`](FEATURE-MATRIX.md) §1: physics, android, monetization, game-design, retention, UX, launch, NAMING-STUDY, audit.

## Scales and legend

**Likelihood, if unmitigated (1–5):**

| Score | Meaning |
|---|---|
| 1 | Rare |
| 2 | Unlikely |
| 3 | Possible |
| 4 | Likely |
| 5 | Near-certain, or already true today |

**Impact (1–5):**

| Score | Meaning |
|---|---|
| 1 | Negligible |
| 2 | Minor annoyance or rework under 1 day |
| 3 | Noticeable player, revenue or schedule damage |
| 4 | Blocks a milestone or causes serious revenue or reputation damage |
| 5 | Launch blocked, legal exposure, data or key loss, or a forced rename |

**Exposure** = Likelihood × Impact, from 1 to 25. **≥ 15 is red** and gets reviewed every week.

**Owner:**
- **Owner:** Tay. Covers consoles, accounts, legal, pricing and device testing.
- **Dev:** repository implementation (Claude, with owner review).
- **Owner + Dev:** shared.

**Status:**

| Status | Meaning |
|---|---|
| **Open** | Not yet addressed |
| **Planned (step N)** | Mitigation is scheduled in EXECUTION-ORDER |
| **Owner-gated** | Waits on an owner decision |
| **Monitoring** | Mitigated; watching the trigger |
| **Accepted** | Consciously tolerated |
| **Deferred** | Moves with a deferred decision |

## Register

| ID | Risk | Category | L | I | Exp. | Owner | Mitigation | Trigger / early-warning signal | Status | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | **FORCE_SCALE calibration is wrong.** The dev display is 120 Hz, so all 150 levels were felt at about 2× nominal force. A wrong uniform scale makes every later retune wrong. | tech | 3 | 4 | 12 | Owner + Dev | Provisional 2.08 preserves the authored feel. At M0 the owner runs an A/B (1.0 / 1.5 / 2.08) on a 120 Hz and a 60 Hz device. The bot always runs at the configured scale. P4 retunes against the bot. The scale is a single constant (D-26 formula unchanged). | A/B verdict differs from 2.08. The simulated 2.08× vs measured 2.2× gap matters in feel. Closed-test W1 FASR comes in < 70% or > 95%. Testers say "floaty" or "snappy". | Open (decision at M0) | D-01; physics Q1 |
| R-02 | **The determinism refactor regresses behaviour.** The fixed-step loop changes feel, gate timing, platform push, ghost timestamps and Endless. | tech | 4 | 4 | 16 | Dev | Multi-rate harness; before/after trajectory snapshots; constants unchanged. `PLATFORM_IMPART_VELOCITY=false` for parity. The loop respects `world.enabled` (`triggerDeath` pauses the world). EndlessScene uses the same stepper. Side effects are queued. Ghosts are converted or reset. | Harness divergence > 1 px. Replay hash mismatch. A bot-winnable level stops winning. Endless runs differ. | Planned (steps 6–7) | physics Q1–Q3 risks; MASTER P1 |
| R-03 | **Tunnelling at the chosen force scale.** The brief's "no tunnelling" margin assumed nominal force (~8 px/step top speed). At ~2× force the top speed rises towards the 144 Hz figure (~22 px/step), and bars are 12 px thick. | tech | 2 | 3 | 6 | Dev | The harness reports max speed per level at the configured scale. A collision test checks the thinnest bar. A validator sets a minimum bar thickness. An optional swept-capsule check covers hazards and goals. | Ball passes through a 12 px bar in the harness or bot. Max speed > 16 px/step. | Open | physics Q1 implications, Q2 |
| R-04 | **Bot false positives and negatives.** Bots find exploits humans never would, or miss human cheese. Snapshot restores drift. | tech / content | 4 | 3 | 12 | Dev | Tiered agents. Every found solution is re-verified from a cold start. Human triage of flags. 5–8 watched human playtesters per world. Calibration against human data (best-5% agent features). A designer quick-check under 30 s. | Triage overrules more than 30% of flags [OPN]. A level flagged by FASR passed the bot, or the reverse. | Planned (steps 9, 11) | game-design §6 risks; MASTER P2, §7 |
| R-05 | **Content rework overruns.** P4 is XH design across 150 levels. | content / solo-dev | 4 | 4 | 16 | Owner + Dev | Only P4-α (W1–3) is needed for M1. Data-informed waves after that. D-27 allows cutting or merging (8–12 levels per world). Systemic data fixes repair dozens of levels at once (saw sweeps 40↔320, side-wall stubs, walls to the floor). Bot gates make "done" objective. | P4-α takes > 2× its estimate. M2 slips > 2 weeks. A wave finishes with gate failures outstanding. | Open | MASTER P4; audit C.2 systemic fixes; D-27 |
| R-06 | **Trademark conflict on "Gravity Flow".** GRAVITY FLOW Reg. 8281133 (Rocketgenius, IC 9/42) is live. The FLOW / FLOW FREE family covers mobile puzzle. Two Play games already use the name, so the mark is not registrable for us. | brand / compliance | 3 | 5 | 15 | Owner | D-19: choose a name from NAMING-STUDY. Attorney knockout before the first public listing. A single `BRAND` config switch. The package id stays. | Negative knockout opinion. A cease-and-desist letter. Reviews accrue under the old name. | Owner-gated | launch §0.1, §6; NAMING-STUDY §1; audit K#7; D-19 |
| R-07 | **Closed-test calendar (12 testers × 14 continuous days)** for a personal account created after 2023-11-13, plus about 7 days of production review. | business / ops | 5 | 3 | 15 | Owner | Confirm the account type now. Recruit 18–20 testers so the count never drops below 12. Start the test at M1 without waiting for perfection (test ad IDs are fine). Keep a feedback log for the production-access form. | Opted-in testers < 14. The continuous-day counter resets. Production access is refused. | Open (owner to confirm the account type) | launch A1, E2, E4; audit K#8, I.1 |
| R-08 | **AdMob limited ad serving without app-ads.txt.** A project-path Pages site can't verify. | business | 4 | 4 | 16 | Owner + Dev | Host at a domain root: the `taysh123.github.io` user site or a custom domain. Use the exact `google.com, pub-…, DIRECT, f08c47fec0942fa0` line. Decide the domain once (see R-34). | AdMob shows a "limited ad serving" notice. app-ads.txt isn't "Verified" 48 h after the listing goes live. | Open (owner) | monetization Q4; launch §0.4, A4 |
| R-09 | **Data safety rejection or under-declaration.** | compliance | 3 | 4 | 12 | Owner + Dev | Use the launch §2 matrix: approximate location, app interactions, crash logs, diagnostics, device IDs, purchase history; GMA marked "shared". Re-check SDK disclosure pages before every SDK bump. The deletion process is actually delivered. | Policy email. The SDK disclosure page changed since the last check (Firebase updated it 2026-10-06, AdMob 2026-10-02). The policy text disagrees with the form. | Planned (step 5) | launch §2, §4; audit I.3 |
| R-10 | **Interstitial policy violation.** Today an interstitial appears 1–3 s into the next level. | compliance | 5 | 5 | 25 | Dev | D-24 plumbing: awaited before `scene.restart`, only after NEXT, skipped if not ready. Caps, a Remote Config kill switch and an AdMob server-side frequency cap. The Q-24 instrument. | Any `interstitial_shown` with `sim_running=1`. An AdMob policy-centre warning. Reviews say "ad during level". | Planned (steps 4, 10) | monetization Q4; audit F.1, O#2; D-24 |
| R-11 | **Consent misconfiguration.** The plugin README orders `initialize()` before consent. The briefs disagree on the Firebase defaults. Whether GA4F reads the UMP TCF string automatically is unverified. Crashlytics' legal basis is unconfirmed. | compliance | 3 | 4 | 12 | Owner + Dev | D-10 boot order. Manifest defaults all denied. `setConsent` from the UMP outcome. A privacy-options row when REQUIRED. EEA and US debug-geography tests. A legal check on Crashlytics. | Ad request before `canRequestAds`. Events before consent in DebugView. No privacy-options row in the EEA. Missing "Setting consent" lines in logcat. | Planned (step 4) | monetization Q3–Q4; retention Q1; D-10 |
| R-12 | **The payments-profile address becomes public** for any monetizing account. | business | 5 | 2 | 10 | Owner | Use a business or virtual address before enabling payments. Declare EU DSA trader status. | The payments-profile setup step. | Owner-gated | launch §0.5, A3 |
| R-13 | **EU DFA and CPC regulation.** It targets streak resets, layered currencies and pressure selling. | compliance | 3 | 3 | 9 | Owner | D-18 (pause, never reset). D-23 (one earned currency; money buys items). No countdowns. Omnibus 30-day prior-price rule for any discount. Quarterly review. | DFA proposal text published (expected Q3–Q4 2026). CPC enforcement news. | Monitoring | retention Q4; monetization Q5; D-18, D-23 |
| R-14 | **US state age laws.** Texas SB 2420 is in force since 2026-06-04. California AB 1043 starts 2027-01-01. Utah and Louisiana are phasing in. | compliance | 3 | 3 | 9 | Owner + Dev | 13+ audience (D-25). A Play Age Signals plugin before 2027-01-01, with signals used only for compliance. Counsel reviews the Texas duties. Quarterly re-check. | Play Console notice. Age Signals leaves beta. A law changes. | Planned (FEATURE-MATRIX F84) | launch §3; D-25 |
| R-15 | **The app is judged to "appeal to children"**, pulling it into the Families policy. | compliance | 2 | 4 | 8 | Owner | Abstract, non-childish art and marketing. No mascot. `maxAdContentRating=PG`. Target audience 13+. | Play review feedback. The store creative drifts toward cute. | Monitoring | launch §3; D-25 |
| R-16 | **Low-end WebView performance.** Three full-target post-FX passes, about 1.7 MB of JS to parse, and 120 Hz doubling GPU cost. | tech | 3 | 4 | 12 | Dev | D-13: remove bloom and ball glow; quality tiers; persisted watchdog; draw-call budgets. A low-end reference device. A 10-minute thermal soak. | p95 > 33 ms on Low. Tier down-steps in > 30% of sessions [OPN]. ANR clustering on one model. | Planned (step 12) | physics Q6; UX §5; audit H.6 |
| R-17 | **Blank screen on old WebViews.** The ES2020 bundle meets Capacitor's default minimum WebView of 60. | tech | 2 | 3 | 6 | Dev | `minWebViewVersion: 87`, a `server.errorPath` update page, and `build.target: 'es2020'`. | Blank-screen reports from Android 7–9 devices. The pre-launch report. | Planned (step 2) | android Q6; audit H.4 |
| R-18 | **WebView renderer crashes** become app crashes and count toward vitals. | tech | 3 | 4 | 12 | Dev | An `onRenderProcessGone` listener: recreate, at most 2 times, and log a non-fatal. | Q-16 rising. A WebView crash cluster in vitals. | Planned (step 2) | android Q12 |
| R-19 | **Save loss.** localStorage is "transient", an origin change orphans saves, and corrupt JSON resets. | tech | 3 | 5 | 15 | Dev | D-12: Preferences mirror, shape validation, last-good backup key, backup rules. **Never change `androidScheme`/`hostname`.** PGS cloud save later. | "Lost progress" support mail. The backup-restore counter goes above 0. The `bmgr` reinstall test fails. | Planned (step 2) | android Q6, Q10; audit H.4, K#10; D-12 |
| R-20 | **The level-id migration maps wrongly** (`progress:v9` index keys → stable ids), stranding stars and unlocks. | tech | 3 | 4 | 12 | Dev | TDD migration with an idempotent version key. Old keys are kept until the migration is verified. Backup key. | A migration test fails. Star totals change after the update. | Planned (step 8) | D-05; MASTER P2 |
| R-21 | **Upload keystore loss.** Only one copy has been seen. | ops | 2 | 5 | 10 | Owner | Play App Signing. Back up the upload key and its passwords in a password manager plus one offline copy. A lost *upload* key can be reset through support. | Only one copy exists today. A disk failure. | Open (owner action now) | launch D3; audit B.2, K#9; D-20 |
| R-22 | **Solo-dev scope creep and burnout** (the post-RC "waves" pattern). | solo-dev | 4 | 5 | 20 | Owner | EXECUTION-ORDER plus the per-step working agreement. The MASTER §7 guardrails and the "must NOT be done yet" lists. Closed test first. Live ops as data, not content. At most 3 decisions per weekly review. | A step runs > 2× its estimate. Work starts outside the current step. The weekly review is skipped twice. | Monitoring | audit K#12, R; MASTER §7 |
| R-23 | **Notifications are perceived as spam.** | business / brand | 3 | 3 | 9 | Dev | D-15 caps (≤ 1/day, ≤ 4/week). A pre-prompt only after a value moment. Quiet hours. Honest copy. Comeback reminders stop after day 14. | E-12 disable rate > 3%/week (SUCCESS-METRICS). Reviews that mention notifications. | Planned (step 17) | retention Q5; android Q7; D-15 |
| R-24 | **Exact-alarm misconfiguration.** The plugin defaults to `isExactNotification: true` and merges `SCHEDULE_EXACT_ALARM`, so on Android 12+ `schedule()` opens the Alarms settings screen. | tech / compliance | 3 | 3 | 9 | Dev | `tools:node="remove"` on the permission. `isExactNotification:false` + `allowWhileIdle:true`. A merged-manifest audit. | The merged manifest contains the permission. The settings screen opens during scheduling. | Planned (step 17) | android Q7 |
| R-25 | **Economy migration bugs** (Fragments → Stardust ×10). | tech | 3 | 3 | 9 | Dev | A pure, TDD-tested migration with an idempotent version key. Value-neutral by construction. Backup key. | Balances double or vanish. Spend fails. Support complaints. | Planned (step 18) | monetization Q5 risks; D-23 |
| R-26 | **PGS plugin maintenance.** The plugin is local Kotlin, exposed to AGP/Gradle drift, and no community plugin fits. | tech | 3 | 3 | 9 | Dev | Pin `play-services-games-v2:22.1.0`. Keep the surface small (~200–300 LOC). Use modbender's MIT code as reference. A unit-tested TS wrapper. Re-test on every AGP bump. | The build breaks on AGP 9. SDK deprecations. E-10 board-submit success < 99% (SUCCESS-METRICS). | Planned (step 20) | android Q9; retention Q8; D-17 |
| R-27 | **Store assets under-convert.** | business | 3 | 4 | 12 | Owner + Dev | Re-shoot after P5-A. The verb in frames 1–2. Burned-in captions. 9:16 shots. A promo video. Experiments once there are ≥ 1,000 visitors/week. Facts-first copy for Ask Play. | S-04 < 25% after 4 weeks [OPN]. Frame-1 experiment loses. | Planned (steps 12–14) | UX §7; launch §5; audit I.2 |
| R-28 | **Phaser 3 end-of-life.** 3.90 is the last 3.x, there's no published EOL notice, and Phaser 4 removes the pipeline system. | tech | 2 | 3 | 6 | Dev | D-28: stay on 3.90 for 1.0. Keep `src/sim/` engine-agnostic. Renderer-independent visuals (sprites, no custom pipelines). Evaluate v4 after launch, behind the bot. | An unpatched Phaser 3 security issue. A WebView change breaks 3.90. | Accepted | physics Q7; audit H.8; D-28 |
| R-29 | **iOS rejection under guideline 4.2** (minimum functionality for WebView wrappers). | business | 2 | 3 | 6 | Owner + Dev | A full offline game with haptics (`@capacitor/haptics`), StoreKit IAP via RevenueCat with a visible Restore, and Game-Center-ready features. Done under D-29 only. | App Review rejection. | Deferred (D-29) | launch §8; audit I.6 |
| R-30 | **Refund abuse** (refund, then keep the cosmetics). Revocation lags up to 24 h. | business | 2 | 2 | 4 | Dev | Entitlement-as-truth: a refund revokes the entitlement and the equipped item falls back to the default. CustomerInfo listener. No purchasable consumable currency. | M-09 refund rate > 5% [OPN]. The P7 device-matrix row fails. | Planned (step 3) | monetization Q1, device matrix P7; D-09 |
| R-31 | **Analytics quotas and BigQuery sandbox expiry.** Sandbox tables expire after 60 days; GA4 retention defaults to 2 months; 500 event names and 25 params max; custom definitions take 24–48 h to appear. | ops | 4 | 3 | 12 | Owner + Dev | Set 14-month retention on day one. A weekly scheduled aggregate into a durable table, or enable billing. Event-name lint. Keep to about 35 events. | Sandbox tables older than 45 days with no aggregate. `firebase_error` events appear. Quota warnings. | Planned (P0 settings; step 17) | retention Q1 |
| R-32 | **IAP products configured as consumable.** Billing Library 8 can't restore a consumed lifetime unlock for anonymous users. | business / tech | 3 | 5 | 15 | Owner | Flag every product Non-consumable in RevenueCat. Use the license-tester 3-minute auto-refund as the smoke test (device-matrix rows P5–P6). | A tester purchase is refunded after 3 min. A rebuy is allowed. | Planned (step 3; dashboard) | monetization Q1–Q2 |
| R-33 | **RevenueCat's anonymous ID isn't backed up.** D-11's include-only backup rules omit RevenueCat's SharedPreferences, which the monetization brief says to back up. A reinstall therefore creates a new anonymous ID. | tech | 3 | 2 | 6 | Owner + Dev | Restore is offered in Settings and the shop. Device-matrix row P8 records whether entitlements return without Restore. Decide whether to add RevenueCat's prefs file to the include list (privacy trade-off). | P8 shows entitlements missing after reinstall until Restore is tapped. | Open (decision needed) | monetization Q1; android Q10; D-11 |
| R-34 | **App Links / domain churn.** Adding a custom domain later redirects github.io URLs. Android 15+ re-verification can take up to 7 days. assetlinks needs both the app-signing and upload SHA-256s. | tech | 2 | 3 | 6 | Owner | Choose the final domain once, after naming. Include both fingerprints. | `pm get-app-links` doesn't show verified. Links open the browser. | Open (tied to R-06, R-08) | android Q8 |
| R-35 | **Remote Config stale clients diverge.** A non-dated change to the daily pool or modifiers gives different clients different dailies. | tech | 2 | 3 | 6 | Dev | Dated overrides published ≥ 3–7 days ahead. `rc_schema`. Clamped parsing. Defaults equal the shipped constants. | Two clients show a different Daily #. Share-grid mismatches. | Planned (step 17) | retention Q3, Q7; D-14 |
| R-36 | **Underpowered A/B decisions** at low install volume. | business | 4 | 2 | 8 | Owner | SUCCESS-METRICS §10 rules: only large swings, Rollouts otherwise, durations fixed in advance. | An experiment launched below the n table. A decision cites a non-significant result. | Monitoring | retention Q3 |
| R-37 | **Low installs are the binding constraint.** Ask Play and Guided Search push organic results down, and "gravity" and "flow" are crowded terms. | business | 4 | 4 | 16 | Owner | A distinctive name (D-19). Keyword plan. Custom store listings. Indie Games Festival / Indie Corner pitch. Short-form video. The web build as a landing page. | Organic installs/day flat after week 2. No keyword ranks in S-07. | Open | launch §5; audit F.4, L.2; MASTER P11 |
| R-38 | **"It plays itself" first impression.** Minutes 6–10 self-solve and 3★ is free. | content | 4 | 4 | 16 | Dev | D-02 armed sim. D-04 zone retune. P4-α before M1. Bot A0/A1 gates. | A0/A1 wins in the report. Closed-test feedback says it plays itself. | Planned (steps 6, 13) | audit K#13, C.2 |
| R-39 | **Difficulty wall behind strict sequential unlock.** | content | 3 | 4 | 12 | Dev | D-07 relief ladder plus open frontier. F-05 and F-06 telemetry flags. | QAF > 2× the world median. Stuck-rate spikes. | Planned (step 10) | audit K#4, G.4#2; D-07 |
| R-40 | **Android developer-verification deadline missed.** Apps not registered by 2026-09-30 face global removal, and that date has already passed. | compliance | 2 | 5 | 10 | Owner | Check the app's registration status on the Play Console Home page **now** (new apps are expected to register themselves). | A Console warning. | Open (urgent) | launch A2 |
| R-41 | **Regressions from the brand-new AdMob 8.2.x.** It is 1 day old, needs Capacitor ≥ 8.5, rejects load errors with string codes, and makes init wait for the banner view (5 s timeout). | tech | 3 | 3 | 9 | Dev | A separate soak commit after the Capacitor bump. Device smoke test. Error handling reads the string codes. | Ad load errors after the bump. Slower init. | Planned (after step 1) | android Q11; D-11 |
| R-42 | **Public docs exposure.** Pages serves all of `docs/`, including the monetization strategy and "Make it Addictive" wording. | brand | 3 | 2 | 6 | Owner + Dev | Deploy Pages from a `site/` folder containing only the policy, support and data-deletion pages. Keep strategy docs private. | Screenshots in reviews or press. | Open | audit J.1 (public exposure) |
| R-43 | **The public web build grants paid items for free** (web IAP stub on Vercel). | brand / business | 3 | 2 | 6 | Dev | Disable purchases on web, or label the build a demo, before challenge links send traffic there (P9). | Web traffic grows from links. | Open | audit B.1, F.1; EXTERNAL-SERVICES-AUDIT |
| R-44 | **Edge back-gesture conflicts with attractor drags.** Predictive-back edge swipes open the pause menu. | tech / UX | 3 | 2 | 6 | Dev | The pause is harmless. Closing the wall-hug lanes reduces edge play. If needed, `setSystemGestureExclusionRects` (≤ 200 dp per edge). | Accidental pause-opens show up in playtests. Tester complaints. | Monitoring | android Q1 risks; audit C.2 fact 4 |
| R-45 | **Owner device-testing bottleneck.** Many gates are REQUIRES HUMAN DEVICE TEST. | ops / solo-dev | 4 | 3 | 12 | Owner | Batch the device checklists per milestone. Unit-test the pure logic. Use the Robo pre-launch report. Get hold of a 60 Hz low-end device and a 120 Hz device. | M0 waits on a device run for more than a week. | Open | MASTER P0 risk, §6 |
| R-46 | **The merged manifest's `FOREGROUND_SERVICE` permission triggers a declaration.** | compliance | 2 | 2 | 4 | Dev | Merged-manifest audit (`bundletool dump manifest`). `tools:node="remove"` if no foreground service is used. Otherwise answer the declaration. | Console asks for an FGS declaration. | Open | EXTERNAL-SERVICES-AUDIT; launch B10 |
| R-47 | **AGP 9 rejects `proguard-android.txt`.** | tech | 3 | 2 | 6 | Dev | Switch to `proguard-android-optimize.txt` now (D-20). R8 stays off for 1.0. | Build failure on an AGP upgrade. | Planned (step 0) | launch §0.3, §7; D-20 |

## Red risks (exposure ≥ 15), reviewed weekly

| ID | Exposure | Why it is red | Next action |
|---|---|---|---|
| R-10 | 25 | True today; violates a Play ban directly | Steps 4 + 10 plumbing; Q-24 instrument |
| R-22 | 20 | The historical failure mode of this project | Hold to EXECUTION-ORDER; weekly review discipline |
| R-02 | 16 | It touches every level's feel | Harness before any tuning (step 7) |
| R-05 | 16 | The biggest effort in the plan | Limit M1 to P4-α; data-led waves |
| R-08 | 16 | It caps ad revenue at launch | Owner chooses the domain root |
| R-37 | 16 | Revenue is limited by installs, not SKUs | Naming + store creative + ASO before M2 |
| R-38 | 16 | Testers judge the first hour | Steps 6 and 13 before the closed test |
| R-06 | 15 | A forced rename after launch loses reviews and ASO | Owner decision + attorney knockout |
| R-07 | 15 | Calendar-bound; can't be compressed | Confirm the account type; recruit 18–20 testers |
| R-19 | 15 | Data loss is unrecoverable trust damage | Step 2 save mirror + validation |
| R-32 | 15 | A consumable misflag makes purchases unrecoverable | Flag non-consumable; 3-minute refund smoke |

**Urgent owner actions, independent of the step order:**
- R-40: check developer-verification registration.
- R-21: back up the keystore.
- R-07: confirm the account type.
- R-12: payments-profile address.
- R-06: naming decision.
