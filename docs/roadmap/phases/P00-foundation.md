# P00 — Foundation & Launch-Blocker Correctness

Status: PLANNED · Milestone: M0 (Truthful Build, with P1) · Steps: 0–5 of [`../EXECUTION-ORDER.md`](../EXECUTION-ORDER.md) · Decisions: D-09, D-10, D-11, D-12 (mirror + validation), D-14 (P0 hygiene), D-20, D-24 (plumbing), D-25, D-28 · Baseline: `master @ d3c6aab` · Architecture: [`../../architecture/TECHNICAL-ARCHITECTURE.md`](../../architecture/TECHNICAL-ARCHITECTURE.md)

> Evidence labels used below: **[V]** verified on 2026-10-07 by reading the cited file/line or running the cited command · **[I]** inferred · **[D]** needs a physical device or an external console.

---

## 1. Summary

| | |
|---|---|
| **Objective** | Turn `v1.0.0-rc.1` into a correct, compliant, honest, maintainable baseline: one trusted state document, a clean repo, a monotonic versionCode, a patched native runtime, a real Android platform contract, durable saves, working purchases, consent-first ads and analytics, a frame-loop error boundary, and store copy that tells the truth. |
| **Player outcome** | Purchases work, restore on a new device, and never charge for the wrong item. Ads never appear over live play and rewarded ads never hang. Back pauses instead of killing the run; leaving the app pauses and silences it. Haptics work. Progress survives reinstall/backup and corrupt data. The game never freezes on a script error. |
| **Business outcome** | The app can earn (RevenueCat + AdMob correctly wired) and can pass Play/AdMob review (consent, privacy entry points, Data Safety, honest listing, no interstitial at level start). Telemetry is lawful. The docs can be trusted again, and every later step is built on Capacitor 8.5.2. |

---

## 2. Scope

### 2.1 Systems affected
| System | Current state [V] | P0 change |
|---|---|---|
| Docs SSOT | 3 conflicting state docs (`project-status.md`, `session-handoff.md`, `LAUNCH-READINESS.md`, now in `docs/archive/2026-10-07/`); CLAUDE.md lines 5-7, 15, 37-56, 216-231 carry state | `docs/STATUS.md` with a generated facts block; `scripts/facts.mjs --check` in CI; stale docs archived; CLAUDE.md state-free |
| Repo hygiene | JDK path `android/gradle.properties:19`; tracked dead symlinks `.ai/*` (mode 120000); `proguard-android.txt` at `android/app/build.gradle:43` | JDK from the command line/env; `.ai/` untracked + ignored; `proguard-android-optimize.txt` |
| Versioning | `versionCode 1`, `versionName "1.0.0"` hard-coded (`build.gradle:21-22`); `package.json:4` = `1.0.0-rc.1` | D-20 formula from `package.json`; next upload `1000001` |
| Dependencies | Capacitor 8.4.0 (1 critical), admob 8.0.0, purchases 13.1.5, firebase 8.3.0; caret ranges | exact pins per D-11; `@capacitor/app`, `@capacitor/preferences` added; AdMob 8.2.1 soak commit |
| Platform | no Back, no pause, audio never suspended (`main.ts:92-100`), manifest gaps (`AndroidManifest.xml:5,21-27,49`), DayNight theme (`styles.xml:12`), no WebView floor, empty `MainActivity` | D-11 contract in full |
| Persistence | localStorage only, no validation/backup (`ProgressStore.ts:26-35` pattern in 16 persisting modules: 11 `*Store.ts`, `Leaderboard.ts`, `IAP.ts`, `Ads.ts`, two scene-local keys) | Preferences mirror, hydrate, migrations ladder, shape validation, `:bak` keys (D-12) |
| Purchases | `'PurchasesPlugin'` (`native/revenueCat.ts:19`), empty key (`monetization.config.ts:26`), `[0]` fallback (`IAP.ts:110`), `\|\| true` (`IAP.ts:152`), local-only bundle grants, hard-coded USD (`monetization.config.ts:40-67`) | D-09 entitlement-as-truth |
| Ads + consent | lazy UMP (`Ads.ts:57-81`), `initialize()` without options (`:75`), fake readiness (`:84-86`), hanging rewarded (`:100-105`), interstitial after restart (`GameScene.ts:1163-1166`), interstitial after a 2× rewarded (`GameScene.ts:1404` → `:1163`) | D-10 consent-first boot + D-24 plumbing |
| Errors + analytics | uncaught frame error freezes the loop; Crashlytics message-only (`Crash.ts:58-67`); reserved `session_start` (`analyticsEvents.ts:39`, `BootScene.ts:19`); no consent gate (`Analytics.ts:26-33`); camelCase `bundleId` (`analyticsEvents.ts:70`) | frame guard + overlay + stack traces + keys; analytics hygiene |
| Store copy + compliance docs | "leaderboard" claims (`docs/store/listing.md:33,37`, `docs/store/release-notes.md:11`, `README.md:45`, `docs/store/aso.md:14`); incomplete Data Safety (`docs/store/listing.md:55`); policy effective 10 June 2026 (`docs/index.html:93`) | honest copy + `storeCopy.test.ts`; `docs/store/data-safety.md`; privacy policy draft |

### 2.2 Dependencies
- **Upstream:** none (first phase). Owner inputs are needed for the 👤 rows (Play/AdMob/RevenueCat consoles, license testers, device runs).
- **Downstream:** P1 needs step 2 (lifecycle pause hooks, `PauseScene`). M0 needs steps 3, 4, 5 and P1 step 7.

### 2.3 Difficulty, risk, upside
| Engineering | Design | QA | Risk | Expected upside |
|---|---|---|---|---|
| M | L | **H** (device-only behaviours) | Medium: native behaviour is only fully provable on a device. Mitigated by TDD on every pure decision (router, lifecycle, codec, entitlements, consent, ad state) and the M0 device checklist. | A shippable, monetizable, policy-safe build; the base every later phase is tested on. |

### 2.4 Success metrics
| Metric | Target | How measured |
|---|---|---|
| Open P0 defects in `docs/STATUS.md` | 0 | STATUS "Open bugs" table |
| `npm audit --omit=dev` | 0 critical | CI `web` job |
| License-tester matrix rows P1–P15 (monetization brief) | all pass | 👤 `docs/qa/DEVICE-CHECKLIST-M0.md` |
| Consent rows C1–C3, ad rows A1–A5 | all pass | 👤 same checklist |
| Interstitial shown after `scene.restart` | never (P0); "never with `simMs` running" is re-verified at M0 after P1 | `interstitial_shown` always precedes the next `level_start` in DebugView + device row A1 |
| Crash-free sessions on internal track | ≥ 99.5% | Crashlytics, 👤 after M0 upload |
| `facts.mjs --check` | green on every push | CI |

### 2.5 Must NOT be done yet
- No gameplay, physics or content change (P1 owns the clock; P2–P4 own content). The level timer stays wall-clock until P1 step 6 — see §7.
- No visual redesign (P5): `PauseScene` and new Settings rows reuse `Button`, `IconButton`, `drawGlass` as-is.
- No economy redesign (P7), no ad-cap tuning beyond D-24 plumbing (caps are P7 via Remote Config).
- No result-screen NEXT/RETRY (P3, D-08); P0 keeps the auto-advance and awaits the interstitial inside it.
- No renaming of the app, package or display name (D-19).
- No Remote Config, analytics taxonomy v2 or user properties (P6), no Age Signals plugin (scheduled before 2027-01-01 under D-25; tracked as a STATUS gate dated 2026-12-15).
- No `@capacitor/haptics` (iOS track, D-29); haptics stay on `navigator.vibrate` + `VIBRATE`.

---

## 3. Architecture plan

The target layering is defined in TECHNICAL-ARCHITECTURE §3. P0 creates `src/platform/` and `src/services/`, and leaves `src/sim/` to P1.

### Step 0 — Docs SSOT, hygiene, versioning
- **`docs/STATUS.md`** (≤150 lines) is the only state document. Sections: *Facts* (between `<!-- facts:start -->` and `<!-- facts:end -->`, generated), *Gates* (owner, date, state), *Next 5 actions*, *Open bugs* (id, severity, link), *Decisions* (a link to `docs/roadmap/DECISIONS.md`, never copied).
- **`scripts/facts.mjs`** collects deterministic facts only: `package.json` `version` + `androidBuild` → derived versionCode/versionName; installed versions of phaser, `@capacitor/core|android`, admob, purchases, firebase (from `package-lock.json`); compile/target/min SDK (`android/variables.gradle`); CI Node version (`ci.yml`); counts of `LEVELS`, `WORLDS`, `DAILY_LEVELS`, `CHUNKS`, `ACHIEVEMENTS`, `COSMETICS`, `BUNDLES`, registered scenes (`src/main.ts` scene array), level files on disk and retired files; test files/tests from a Vitest JSON report. TS-derived counts come from `npx vite-node scripts/facts/collect.ts`, which prints JSON (the configs it imports already load under Vitest's node environment). **Git-derived values (HEAD, last tag, commits since tag) are printed to the console but kept out of the checked block**: a committed file cannot contain its own commit hash, so including them would make `--check` fail on every commit.
- **Modes:** `node scripts/facts.mjs` rewrites the blocks in `docs/STATUS.md` and the one-line `<!-- facts:readme:start/end -->` block in `README.md`; `--check` exits 1 and prints a diff when a block is stale; `--vitest-json <path>` reuses a report produced by CI.
- **Versioning (D-20):** `package.json` gains `"androidBuild": 1` and its `version` becomes `"1.0.0"` (the rc label moves to git tags). `android/app/build.gradle` parses `../../package.json` with `groovy.json.JsonSlurper` and sets `versionCode = MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD` and `versionName = version`; it fails the build when any part is out of range (MINOR/PATCH/BUILD 0–99). A `printVersionCode` Gradle task prints the value so CI can compare it with `node scripts/version.mjs --code`.

### Step 1 — Security dependencies
Exact pins (TECHNICAL-ARCHITECTURE §10): `@capacitor/core|android|cli` 8.5.2, `@capacitor/app` 8.1.2, `@capacitor/preferences` 8.0.1, `@capacitor-firebase/analytics|crashlytics` 8.5.2, `@revenuecat/purchases-capacitor` 13.7.0, `phaser` 3.90.0; then `npm run cap:sync`. `cap sync` only regenerates `capacitor.build.gradle`, `capacitor.settings.gradle`, `assets/capacitor*.json`, `capacitor-cordova-android-plugins/` and `assets/public` (android brief Q11), so manifest/`MainActivity`/styles edits in step 2 are not overwritten. AdMob 8.2.1 lands later in its own soak commit (8.2.0 requires Capacitor ≥ 8.5, rejects load errors with string codes and changes Android init to wait for the banner view).

### Step 2 — Platform contract (D-11) and save mirror (D-12)
- **`src/platform/backRouter.ts`** — pure `routeBack(state)`, priority: open overlay (`SettingsScene`, `PauseScene`) → close it; running `GameScene`/`EndlessScene` → open `PauseScene`; ended run (`EndlessScene` dead) → `MainMenuScene`; won level → `none` (auto-advance in progress until P3); sub-menu → parent from `PLATFORM.PARENT_SCENE` (`LevelSelectScene→WorldMapScene`, `WorldMapScene|AchievementsScene|CosmeticsScene|RunSelectScene|EndScene→MainMenuScene`); splash scenes → `none`; `MainMenuScene` → `system`. Wiring in `src/platform/lifecycle.ts` registers one `App.addListener('backButton', …)`. `MainMenuScene.create` calls `App.toggleBackButtonHandler({ enabled: false })` and re-enables it on `Phaser.Scenes.Events.SHUTDOWN`, so the system performs the warm back-to-home exit. `exitApp()` is never called; a defensive `system` action calls `App.minimizeApp()`.
- **`src/scenes/PauseScene.ts`** — overlay launched exactly like `SettingsScene` (`scene.pause(caller)` + `scene.launch('PauseScene', { caller })`). Actions: CONTINUE (primary; resumes caller and audio), RESTART, SETTINGS, HOME. Actions are delivered to the caller through `this.scene.get(caller).events.emit('pause-action', action)`, so the caller keeps owning its teardown (`goHome`, `triggerRestart`, `EndlessScene.retry`).
- **Pausable contract** — `GameScene` and `EndlessScene` gain `requestPause(reason: 'back' | 'background'): void`. It is a no-op when `isWon`, `isDying`, `leaving` (GameScene) or `isDead` (EndlessScene); otherwise it stops the hum, releases the attractor and opens `PauseScene`. Gameplay never auto-resumes.
- **`src/platform/lifecycle.ts`** — one `onBackground()`/`onForeground()` pair driven by `document.visibilitychange` (all platforms) and `App.addListener('pause'|'resume')` (native). The pure `lifecycleDecision()` decides: background → `requestPause('background')` on the active gameplay scene unless `Ads.isShowing()` or `IAP.inFlight()`; always `AudioSynth.suspend()`. Foreground → `game.scale.refresh()`; resume audio only if `SettingsStore` sound/music allow it **and** no `PauseScene` is open. This replaces `main.ts:92-100`. `AudioSynth` gains `suspend(): void` (`ctx.suspend()` + `stopHum()`).
- **Manifest/config/theme** — see §4 and task P00-T09. A guard test pins `androidScheme`/`hostname` to "unset" forever.
- **Renderer-crash recovery** — `MainActivity.onCreate` adds a `WebViewListener` whose `onRenderProcessGone` calls `recreate()` and returns `true` up to `RENDERER_MAX_RECOVERIES = 2` per process (static counter), then returns `false`. Each recovery increments the `platform:rendererGone` key in `CapacitorStorage` SharedPreferences; the next JS boot reads it through `Saves`, reports a non-fatal, and clears it. No new native dependency is needed.
- **`src/platform/saves.ts`** — `Saves.hydrate()` starts in `main.ts` before `new Phaser.Game(...)` and `BootScene.create` awaits it in parallel with fonts. Hydrate: list Preferences keys; if Preferences holds no `gravity-flow:*` key and localStorage does, copy every key and set `gravity-flow:save:migratedV1`; for keys present in Preferences but missing from localStorage, restore them; then `runMigrations()`. All 16 persisting modules keep their synchronous in-memory caches and replace `localStorage.setItem` with `Saves.write(key, json)`: localStorage synchronously, Preferences asynchronously, coalesced per key in a microtask so bursts (e.g. `StatsStore.recordPortalJump`) cost one bridge call. On web, `Saves` is localStorage only.

### Step 3 — Purchases (D-09)
- **Move** `src/utils/{Ads,IAP,Analytics,analyticsEvents,Crash,interstitial}.ts`, their tests and `src/utils/native/*` to `src/services/` (`git mv`, import fixes only), so steps 3–5 edit files in their final home.
- **`src/services/entitlements.ts`** (pure) — the D-09 table as data: `no_ads ← remove_ads|starter_pack|founders_pack`, `pack_starter ← starter_pack`, `pack_premium_collection ← premium_collection_pack`, `pack_founders ← founders_pack`; `ENTITLEMENT_COSMETICS` (`pack_starter → trail_galaxy`, `pack_premium_collection → cosmic_blackhole, arrival_bolt`, `pack_founders → mythic_phoenix, mythic_dragon`); `deriveOwnership(active)`; `findPackage(offerings, packageId, productId)` (identifier match, then product id, **never `[0]`**); `classifyPurchaseError(code)` (`1→cancelled`, `6→already_owned`, `20→pending`, `10|35→network`, else `error`).
- **`src/services/IAP.ts`** — native only, `const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor')` inside the native guard (the proxy is never returned from an async function). Init: `setLogLevel(DEBUG)` in DEV → `configure({ apiKey })` (no `appUserID`) → `addCustomerInfoUpdateListener(apply)` → `apply(await getCustomerInfo())` (mandatory: the Android listener does not replay current info, monetization brief §0) → `getOfferings()` cached as `{packageId → package, priceString}`. `apply(info)` writes the `gravity-flow:entitlements:v1` snapshot `{ active, at, pending }` and re-derives bundle cosmetics; if the equipped cosmetic is no longer owned (refund, other account) it falls back to the default. `buy(packageId)` passes the exact package object from `getOfferings()`, returns `'purchased'` only when the target entitlement is active, runs `restorePurchases()` on code 6, persists a pending marker on code 20, and exposes `inFlight()` for the lifecycle. `restore()` covers all entitlements and returns what was restored. Prices come only from `priceString`.
- **Web** — no purchase stub, dev included: `buy` and `restore` resolve `'unavailable'` and write nothing, so the web build never grants (the public Vercel build used to give paid items away, audit F.1; P00-T17 deleted the stub).
- **`CosmeticStore`** — `ownedIds()` = stored ids ∪ `deriveOwnership(snapshot.active).bundleCosmetics`; `grant()` is no longer called for bundle items.

### Step 4 — Consent-first boot (D-10) + ad plumbing (D-24)
- **`src/services/consentState.ts`** (pure) maps the UMP `AdmobConsentInfo` (`status`, `canRequestAds`, `privacyOptionsRequirementStatus`) to a `ConsentOutcome` (TECHNICAL-ARCHITECTURE §4.3): consent not required → all four Firebase types granted; obtained → granted per `canRequestAds`; required but unresolved or error → all denied, `canRequestAds=false`.
- **`src/services/Consent.ts`** — `resolve()`: `requestConsentInfo({ debugGeography, testDeviceIdentifiers })` (debug values only from `VITE_UMP_DEBUG_GEOGRAPHY` / `VITE_UMP_TEST_DEVICE_IDS`, refused by the release guard) → `showConsentForm()` when `status === 'REQUIRED'` → outcome. Consent is never cached by the app (Google guidance); every launch re-requests it. `showPrivacyOptions()` calls `showPrivacyOptionsForm()` then re-resolves.
- **`src/services/bootServices.ts`** — one ordered function, started from `BootScene.create` after `Saves.hydrate()` and not awaited by the menu: `Consent.resolve()` → `Analytics.applyConsent(outcome)` (calls `FirebaseAnalytics.setConsent` for `ANALYTICS_STORAGE`, `AD_STORAGE`, `AD_USER_DATA`, `AD_PERSONALIZATION`, then flushes the pre-consent queue) → `Ads.init(outcome)` only when `canRequestAds` (with `maxAdContentRating: MaxAdContentRating.ParentalGuidance`, `initializeForTesting` only in debug-geography builds, no child-directed tags, D-25) → `Crash.enable()` (D-10.5 default, pending the legal check recorded as a STATUS gate).
- **Manifest** — `google_analytics_default_allow_analytics_storage|ad_storage|ad_user_data|ad_personalization_signals = false`, `google_analytics_automatic_screen_reporting_enabled = false`, `firebase_crashlytics_collection_enabled = false`.
- **`src/services/adState.ts`** (pure reducer) — per format `{ ready, loading, loadedAt, retryIdx }` plus `showing` and `busy`. Events: `loaded`, `failedToLoad`, `showed`, `failedToShow`, `dismissed`, `reward`, `watchdog`, `tick(now)`. Effects: reload after `dismissed|failedToShow`; retry `failedToLoad` after `AD_RETRY_BACKOFF_MS = [30000, 60000, 120000, 300000]`; reload when `now − loadedAt > AD_MAX_AGE_MS (55 min)`; rewarded outcome `earned|dismissed|unavailable` resolved on `dismissed` (after `AD_LATE_REWARD_GRACE_MS = 300`) or `failedToShow`, or `unavailable` when `showed` has not arrived within `AD_SHOW_WATCHDOG_MS = 5000`.
- **`src/services/Ads.ts`** — registers the plugin listeners once (`onRewardedVideoAdLoaded|FailedToLoad|Showed|FailedToShow|Dismissed|Reward`, `interstitialAdLoaded|FailedToLoad|Showed|FailedToShow|Dismissed`, verified in `@capacitor-community/admob/dist/esm/definitions.d.ts`), feeds the reducer, and exposes `isRewardedReady()`, `showRewarded(source)` (fires `showRewardVideoAd()` without awaiting it, busy-guarded), `showInterstitialIfEligible(ctx)` (skips when not preloaded, never waits on a load, resolves on Dismissed/FailedToShow/watchdog), and `isShowing()`. Any rewarded view writes `lastShownMs` (the interstitial clock reset of D-24). Game audio is muted while an ad shows.
- **Callers** — `GameScene.advanceAfterWin` becomes `async` and awaits `Ads.showInterstitialIfEligible()` before `scene.restart` (overlay held, input off); the 2× handler (`GameScene.ts:1396-1408`) disables the button before awaiting, sets a flag that skips the interstitial for this advance, and the button only renders when `Ads.isRewardedReady()`. `EndlessScene` revive/2× and `CosmeticsScene` free-fragments render only when ready, disable before awaiting, and check `this.scene.isActive()` before granting (audit H.4 double-grant / destroyed-world fix).

### Step 5 — Error boundary, store validation, analytics hygiene, honest copy
- **`src/platform/frameGuard.ts`** — `installFrameGuard(game)` from `main.ts`, inside the existing `READY` listener (Phaser emits `READY` at `node_modules/phaser/src/core/Game.js:416` and binds `this.step` at `:438`, so replacing `game.step` there is picked up). The pure `frameGuardDecision(errorTimes, now)` returns `overlay` at `FRAME_ERROR_BURST = 3` errors within `FRAME_ERROR_WINDOW_MS = 2000`, else `continue`. Overlay: `game.loop.sleep()` + `src/platform/errorOverlay.ts` (plain DOM, independent of Phaser) "Something went wrong · Tap to restart" → `location.reload()`.
- **Crash** — `recordException({ message, stacktrace: parseStack(err.stack) })` (`src/services/stackParse.ts`, V8 frame format → `{ functionName, fileName, lineNumber }`), dedup by message hash, ≤ `CRASH_MAX_PER_SESSION = 5`; `setCustomKey` for `scene`, `level`, `mode`, `webview_ver` (from the UA), `renderer` (WebGL/Canvas), `build` (versionCode); scene transitions logged with `log()`.
- **`src/platform/storeCodec.ts`** — `decodeStore()` (primary → `:bak` → defaults; raw corrupt value copied to `:corrupt` and reported) and `encodeStore()` (copies the previous good value to `:bak` before writing). Each store gets a validator in `src/utils/storeSchemas.ts`.
- **Analytics** — delete `sessionStart` and its `BootScene.ts:19` call; pre-consent queue (`ANALYTICS_QUEUE_MAX = 100`, drop-oldest) in `src/services/analyticsQueue.ts`; `Analytics.screen(name)` via `FirebaseAnalytics.setCurrentScreen({ screenName, screenClassOverride })`, installed once in `main.ts` by subscribing to each registered scene's `sys.events` `create`; `bundleId` → `bundle_id`; a name/param lint test; `Analytics.resetData()` → `resetAnalyticsData()`.
- **Store copy + compliance drafts** — replace every "leaderboard" claim with "your best" (D-17), correct the "new mechanic in every world" and "one Best Value bundle" claims (audit I.2); `docs/store/data-safety.md` from the launch brief §2 matrix; privacy policy deltas P1–P10 (launch brief §4) in `docs/store/privacy-policy.md` and the hosted `docs/index.html`.

---

## 4. Files / modules affected

### Create
| Path | Purpose | Task |
|---|---|---|
| `docs/STATUS.md` | single state document with generated facts | T01 |
| `scripts/facts.mjs`, `scripts/facts/collect.ts`, `scripts/facts/factsLib.mjs`, `scripts/facts/factsLib.test.mjs` | facts generator/checker | T01 |
| `docs/archive/2026-10-07/README.md` | index of archived docs with "superseded by" links | T02 |
| `docs/release/RUNBOOK.md` | build/sign/JDK/version/tag/release (merges `release-android.md`, `release-prep.md`, `RELEASE-v1.0.0.md`) | T02, T05 |
| `docs/qa/DEVICE-CHECKLIST-M0.md` | owner device matrix (C1–C3, A1–A5, P1–P15, back/pause/haptics/backup/WebView rows) | T02, T26 |
| `scripts/version.mjs`, `scripts/lib/versionCode.mjs`, `scripts/lib/versionCode.test.mjs` | D-20 helpers | T05 |
| `src/config/platform.config.ts` | `PLATFORM` constants: `PARENT_SCENE`, `PRIVACY_POLICY_URL = 'https://taysh123.github.io/Gravity-Game/'`, `SAVE_PREFIX`, `SAVE_MIRROR_ENABLED = true`, `FRAME_ERROR_BURST = 3`, `FRAME_ERROR_WINDOW_MS = 2000`, `CRASH_MAX_PER_SESSION = 5`, `ANALYTICS_QUEUE_MAX = 100` | T09 |
| `src/config/capacitorConfig.test.ts` | origin guard + `minWebViewVersion` + SystemBars | T09 |
| `public/webview-update.html` | ES5 static page with a `market://details?id=com.google.android.webview` link (`server.errorPath`) | T09 |
| `android/app/src/main/res/values/colors.xml` | `gravity_background` `#0d0d1a` | T09 |
| `src/platform/backRouter.ts` + `.test.ts` | pure Back routing | T10 |
| `src/scenes/PauseScene.ts` | pause overlay | T10 |
| `src/platform/lifecycle.ts` + `lifecycle.test.ts` | background/foreground + Back wiring; pure `lifecycleDecision` | T10, T11 |
| `src/platform/haptics.ts` | `Haptics.pulse()` (moves `GameScene.ts:187-191`) | T11 |
| `src/platform/saves.ts` + `saves.test.ts`, `src/platform/migrations.ts` + `migrations.test.ts` | Preferences mirror, hydrate, migration ladder | T13 |
| `android/app/src/main/res/xml/data_extraction_rules.xml`, `backup_rules.xml` | include only `sharedpref/CapacitorStorage.xml` + `root/app_webview/Default/Local Storage/` | T13 |
| `src/services/entitlements.ts` + `entitlements.test.ts` | D-09 mapping, package lookup, error codes | T15 |
| `src/services/consentState.ts` + `.test.ts`, `src/services/Consent.ts`, `src/services/bootServices.ts` | consent-first boot | T18 |
| `src/services/adState.ts` + `adState.test.ts` | ad cache/show state machine | T19 |
| `scripts/release-check.mjs`, `src/config/releaseConfig.test.ts` | refuse test ids / Test Store key / debug geography in release | T20 |
| `src/platform/frameGuard.ts` + `.test.ts`, `src/platform/errorOverlay.ts`, `src/services/stackParse.ts` + `.test.ts` | error boundary | T21 |
| `src/platform/storeCodec.ts` + `.test.ts`, `src/utils/storeSchemas.ts` + `.test.ts` | validation + backups | T22 |
| `src/services/analyticsQueue.ts` + `.test.ts` | pre-consent queue | T23 |
| `scripts/harness/lib/server.mjs`, `scripts/harness/lib/browser.mjs`, `scripts/harness/boot-smoke.mjs` | Node Playwright boot smoke (reused by P1) | T24 |
| `src/config/storeCopy.test.ts`, `docs/store/data-safety.md` | honest copy + Data Safety draft | T25 |

### Modify
| Path | Change | Task |
|---|---|---|
| `CLAUDE.md` | remove state (lines 5-7, 15, 37-56, 216-231); fix scene flow (line 95: 13 scenes + overlays), folder tree (line 145 `level1…level22.ts`, line 162 "text wordmark" → logo PNG); add `src/platform`, `src/services`, `docs/STATUS.md`; browser-testing row (line 211) → tracked Node Playwright harness | T03, T24 |
| `README.md` | facts block replacing the stale test count; "your best" wording (line 45) | T03, T25 |
| `android/gradle.properties` | delete lines 14-19 (JDK comment + `org.gradle.java.home`), add one comment pointing to `docs/release/RUNBOOK.md` | T04 |
| `.gitignore` | add `.ai/` | T04 |
| `android/app/build.gradle` | `proguard-android-optimize.txt` (line 43); versionCode/versionName from `package.json` (lines 21-22); `printVersionCode` task; `manifestPlaceholders` for the AdMob app id | T04, T05, T20 |
| `package.json` | `version` → `1.0.0`; `androidBuild: 1`; exact pins; new deps; scripts `facts`, `facts:check`, `version`, `smoke`, `release:check` | T05, T07, T24 |
| `.github/workflows/ci.yml` | Node 22, `npm ci`, facts check, audit gate, `android-debug` and `smoke` jobs | T06, T07, T24 |
| `vite.config.ts` | `build.target: 'es2020'`; `test.include` adds `scripts/**/*.test.mjs` | T01, T09 |
| `android/app/src/main/AndroidManifest.xml` | `xmlns:tools`; `appCategory="game"`; `dataExtractionRules`/`fullBackupContent`; `screenOrientation="portrait"`; `launchMode="singleTop"`; `VIBRATE`; Firebase consent/screen/Crashlytics meta-data; AdMob id `${admobAppId}` | T09, T13, T18, T20 |
| `android/app/src/main/res/values/styles.xml` | `android:windowBackground` = `@color/gravity_background` on `AppTheme.NoActionBar` | T09 |
| `android/app/src/main/res/xml/file_paths.xml` | remove the broad `<external-path path=".">` | T09 |
| `capacitor.config.ts` | `android.minWebViewVersion: 87`, `server.errorPath: 'webview-update.html'`, `plugins.SystemBars: { style: 'DARK', insetsHandling: 'css' }`, comment forbidding `androidScheme`/`hostname` | T09 |
| `src/utils/a11y.ts` | safe-area probe reads `var(--safe-area-inset-*, env(safe-area-inset-*, 0px))` (lines 41-44) | T09 |
| `android/app/src/main/java/com/truestorylabs/gravityflow/MainActivity.java` | renderer-crash recovery listener | T12 |
| `src/main.ts` | start `Saves.hydrate()`; replace `visibilitychange` block (92-100) with `installLifecycle(game)`; `installFrameGuard`; screen-view hook; register `PauseScene` | T10, T11, T13, T21, T23 |
| `src/scenes/BootScene.ts` | await hydrate with fonts; drop `sessionStart` (line 19); start `bootServices()` | T13, T18, T23 |
| `src/scenes/GameScene.ts` | `requestPause`; `Haptics.pulse`; async `advanceAfterWin` (1149) awaiting the interstitial; 2× guard (1396-1408) | T10, T11, T19 |
| `src/scenes/EndlessScene.ts` | `requestPause`; ready-gated revive/2× with busy + scene-alive guards (465-494) | T10, T19 |
| `src/scenes/MainMenuScene.ts` | toggle the back handler on create/shutdown | T10 |
| `src/scenes/SettingsScene.ts` | rows: Privacy choices (when required), Privacy policy, Reset analytics data; Remove Ads label from `IAP.price('remove_ads')`; restore feedback toast | T17, T18 |
| `src/scenes/CosmeticsScene.ts` | prices from `IAP.price()`; "…" disabled while loading; Starter hidden when `no_ads`; Founder's "Remove Ads ✓ already yours"; pending/network messages; free-fragments offer only when ready | T17, T19 |
| `src/utils/AudioSynth.ts` | `suspend()` | T11 |
| the 11 `src/utils/*Store.ts` modules, `src/utils/Leaderboard.ts`, `src/services/IAP.ts`, `src/services/Ads.ts`, `src/scenes/GameScene.ts:90-106`, `src/scenes/EndlessScene.ts:146-160` | persist via `Saves.write`; load via `decodeStore` | T13, T22 |
| `src/utils/CosmeticStore.ts` | ownership derived from entitlements | T16 |
| `src/config/monetization.config.ts` | `ENTITLEMENTS`, `PACKAGES`; `BundleDef` loses `priceLabel`, gains `packageId`/`entitlement`; delete `REMOVE_ADS_PRICE_LABEL`; test vs prod id sets; ad plumbing constants | T15, T19, T20 |
| `docs/store/listing.md`, `release-notes.md`, `aso.md`, `privacy-policy.md`, `docs/index.html` | honest copy, policy draft | T25 |

### Move
`src/utils/{Ads,IAP,Analytics,analyticsEvents,analyticsEvents.test,Crash,interstitial,interstitial.test}.ts` and `src/utils/native/{admob,revenueCat,firebaseAnalytics,firebaseCrashlytics}.ts` → `src/services/` and `src/services/native/` (13 importing files updated, T14). Archive moves are listed in T02.

---

## 5. Data-model changes

| Item | Before | After | Notes |
|---|---|---|---|
| `package.json` | `"version": "1.0.0-rc.1"` | `"version": "1.0.0"`, `"androidBuild": 1` | versionCode 1000001; rc label in tag `v1.0.0-rc.2` at M0 |
| `gravity-flow:premium` | `'1'\|'0'` (web stub could set it) | migrated into `gravity-flow:entitlements:v1` `{ "active": ["no_ads"]?, "at": 0, "pending": [] }`; legacy key deleted after the first successful `getCustomerInfo` reconcile | migration 2 |
| `gravity-flow:entitlements:v1` | — | `{ active: Entitlement[]; at: number; pending: string[] }` | synchronous reads for `IAP.isPremium()` and cosmetic ownership |
| `gravity-flow:save:schema` / `save:migratedV1` | — | integer ladder version / flag | `src/platform/migrations.ts` |
| `<key>:bak`, `<key>:corrupt` | — | last good JSON / quarantined raw value | written by `storeCodec` for every validated store |
| `gravity-flow:progress:v1…v8`, `cosmetics:v1` | dead keys never cleaned (audit H.4) | deleted by migration 3 (after `cosmetics:v2` exists) | irreversible but unused |
| Preferences (`CapacitorStorage`) | — | same keys and values as localStorage | write-through, native only |
| `platform:rendererGone` | — | integer count written by `MainActivity` | read + cleared at hydrate |
| `monetization.config.ts` | `REVENUECAT.premiumEntitlementId = 'premium'`, `BundleDef.priceLabel`, `REMOVE_ADS_PRICE_LABEL` | `ENTITLEMENTS` (D-09 ids), `PACKAGES` (`remove_ads`, `starter`, `premium_collection`, `founders`), `ADMOB_TEST` / `ADMOB_PROD`, `AD_*` plumbing constants | owner fills prod ids |
| Analytics events | `session_start` (reserved), `bundle_cross_sell{bundleId}`, `purchase_completed` on resolve | removed; `bundle_cross_sell{bundle_id}`; `purchase_completed` only when the entitlement is active; new `purchase_pending{product}`, `rewarded_unavailable{source}` | taxonomy v2 is P6 |

---

## 6. UI changes
- **New `PauseScene`** overlay: glass panel, title "PAUSED", CONTINUE (primary, ≥ 48 px tall), RESTART, SETTINGS, HOME. Respects reduced motion. Same visual language as `SettingsScene`; no redesign.
- **Settings** (`SettingsScene.ts`): new rows "Privacy choices" (only when `privacyOptionsRequired`), "Privacy policy" (opens `PLATFORM.PRIVACY_POLICY_URL` via `window.open(url, '_blank')`), "Reset analytics data" (confirm, then `Analytics.resetData()`); Remove Ads shows the store `priceString` or a disabled "…"; Restore shows "Restored: …" or "No purchases found for this Google account".
- **Shop** (`CosmeticsScene.ts`): store prices only; Starter card hidden once `no_ads` is owned; Founder's shows "Remove Ads ✓ already yours" when applicable; "Payment pending — unlocks automatically" state; "Check your connection" on codes 10/35; free-fragments button hidden when no rewarded ad is loaded.
- **Win overlay / run-over** (`GameScene`, `EndlessScene`): rewarded buttons render only when an ad is loaded; buttons disable on tap.
- **Error overlay** (DOM): full-screen dark panel, one line + "Tap to restart".
- **WebView floor**: `webview-update.html` with an "Update Android System WebView" link.
- **System bars**: light icons on the dark game (`SystemBars style: 'DARK'`), dark window background instead of white bands.

---

## 7. Gameplay changes
- Rules, physics, content and par are untouched.
- Behavioural changes the player feels: Back opens the pause menu; leaving the app pauses and mutes; the interstitial (when eligible) appears **over the win overlay before** the next level instead of 1–3 s into it; no interstitial follows a watched 2× rewarded ad; Endless can be paused.
- **Known interim limitation:** level timers still read the wall clock (`GameScene.ts:213, 616, 653, 1027`) until P1 task P01-T08, so time spent in the pause overlay still drains a countdown. M0 requires P1, so this state is never uploaded.

---

## 8. Test strategy

### 8.1 TDD (failing test first; Vitest)
| Test file | Covers |
|---|---|
| `scripts/facts/factsLib.test.mjs` | block extraction/replacement, rendering order, `--check` diff, missing markers error |
| `scripts/lib/versionCode.test.mjs` | `1.0.0+1 → 1000001`, `1.2.3+4 → 1020304`, range errors (MINOR/PATCH/BUILD > 99), monotonic bump |
| `src/platform/backRouter.test.ts` | every row of the routing table incl. overlay-over-gameplay, ended Endless run, won level, splash, MainMenu → `system` |
| `src/platform/lifecycle.test.ts` | `lifecycleDecision` for hidden/visible × gameplay running/ended × pause overlay open × ad showing × IAP in flight × sound/music settings |
| `src/platform/saves.test.ts` | fake `KV`/`AsyncKV`: first-run copy + flag, restore missing keys, idempotent second hydrate, write-through coalescing, web mode |
| `src/platform/migrations.test.ts` | ladder order, idempotency, migration 2 (`premium` → entitlements), migration 3 (dead-key cleanup keeps live keys) |
| `src/services/entitlements.test.ts` | D-09 table → ownership; `findPackage` never returns `[0]`; error-code classification 1/6/20/10/35/other |
| `src/services/consentState.test.ts` | NOT_REQUIRED / OBTAINED / REQUIRED-unresolved / error → outcome + privacy-options flag |
| `src/services/adState.test.ts` | load/backoff/expiry, rewarded `earned` (reward then dismiss), `dismissed` (early close), `unavailable` (failedToShow, 5 s watchdog), late reward within 300 ms, busy guard, rewarded resets the interstitial clock |
| `src/config/capacitorConfig.test.ts` | `androidScheme` and `hostname` unset; `minWebViewVersion === 87`; `server.errorPath`; SystemBars config |
| `src/config/releaseConfig.test.ts` | prod id selection by mode; test ids rejected in prod mode |
| `src/platform/frameGuard.test.ts`, `src/services/stackParse.test.ts` | burst window; V8 stack lines with/without function names |
| `src/platform/storeCodec.test.ts`, `src/utils/storeSchemas.test.ts` | primary ok / primary corrupt + bak ok / both corrupt → defaults + quarantine; each validator accepts current shapes and rejects `"null"`, arrays, negative numbers |
| `src/services/analyticsQueue.test.ts` | queue cap, drop-oldest, flush after consent |
| `src/services/analyticsEvents.test.ts` (extended) | every factory: name `^[a-zA-Z][a-zA-Z0-9_]{0,39}$`, not reserved (list from retention brief Q1), no `firebase_\|google_\|ga_` prefix, ≤ 25 params, keys `^[a-z][a-z0-9_]{0,39}$`, string values ≤ 100 |
| `src/config/storeCopy.test.ts` | `docs/store/*.md` and `README.md` contain no "leaderboard"; title ≤ 30, short ≤ 80, full ≤ 4000 chars |

### 8.2 Harnesses
- **Boot smoke** `node scripts/harness/boot-smoke.mjs`: starts `vite` (DEV, so `window.__game` from `main.ts:117-120` exists), launches Playwright 1.63.0 Chromium with `--disable-gpu --use-gl=swiftshader`, waits for `MainMenuScene`, then starts every registered scene (`GameScene` for level 1, a boss level and the daily; `EndlessScene` in both modes; `SettingsScene` and `PauseScene` overlays) and fails on any `console.error` or `pageerror`. CI job `smoke`.
- **Android build** `./gradlew assembleDebug` in CI (`android-debug`), JDK from `actions/setup-java` (Temurin 21) via `JAVA_HOME`.

### 8.3 Device-only (👤, `docs/qa/DEVICE-CHECKLIST-M0.md`)
Consent C1–C3 (EEA/US debug geography), ads A1–A5, license-tester purchases P1–P15 (monetization brief matrix), Back on Android 16 gesture + 3-button navigation, background audio silence, renderer kill recovery, `bmgr backupnow` → uninstall → reinstall restore, haptics on/off/silent mode, status bar in light and dark system mode, WebView < 87 emulator showing the update page, privacy-policy link opening the browser.

---

## 9. Migration strategy
1. **Saves (T13).** Migration 1 copies localStorage → Preferences once (`save:migratedV1`). It never deletes localStorage. A device that lost localStorage but kept Preferences is restored at hydrate.
2. **Entitlements (T16).** Migration 2 seeds `entitlements:v1` from the legacy `premium` flag, then the first successful `getCustomerInfo()` replaces it with the store truth (a web-stub "premium" on a native device is therefore corrected on first launch).
3. **Dead keys (T22).** Migration 3 removes `progress:v1…v8` and `cosmetics:v1` (only when `cosmetics:v2` exists).
4. **Validation (T22).** Existing data is accepted by the validators (tests use real shapes from the current stores); anything rejected is quarantined to `:corrupt`, never dropped.
5. **Versioning (T05).** The first upload after P0 is `1000001` (> the uploaded `1`). Record each uploaded code in STATUS Gates.
6. **Docs (T02).** Archived files keep their content and get a banner "Archived 2026-10-07 — superseded by `docs/STATUS.md` / `docs/roadmap/`".

## 10. Rollback considerations
| Change | Rollback |
|---|---|
| Capacitor 8.5.2 bump | revert the commit; fall back to **8.4.3**, which also fixes GHSA-rvm3-566m-v7fv |
| AdMob 8.2.1 | separate commit → `git revert` returns to 8.0.0 with no code change (P0 code targets the 8.0.0 API) |
| Preferences mirror | `PLATFORM.SAVE_MIRROR_ENABLED = false` stops writes and hydrate restores; localStorage was never removed |
| Store validation | validators only add a fallback path; reverting restores the old parse-or-default behaviour; `:bak` keys are harmless |
| Entitlement model | not reversible to the broken model; a regression is fixed forward. The snapshot keeps the last known entitlements offline |
| Consent-first boot | not reversible (compliance); a faulty UMP flow degrades to "ads off, analytics denied", never to a crash |
| `singleTop`, portrait, `appCategory` | manifest revert; no data impact |
| Versioning | versionCode only increases; a bad build is superseded by `androidBuild + 1`, never re-used |
| Frame guard | `installFrameGuard` is one call in `main.ts`; removing it restores Phaser's default loop |

## 11. Performance considerations
- Hydrate: ~20 `Preferences.get` bridge calls run in parallel with font loading in `BootScene`; budget ≤ 60 ms added [I, measured on device in T13].
- Write-through is async and coalesced per key per microtask; localStorage stays synchronous, so gameplay never waits on the bridge.
- `:bak` copies double localStorage writes; all stores are small JSON (largest is `ghost:v1`, ≤ 90 points per level).
- Frame guard: one `try/catch` per frame (negligible in V8).
- Ads: one preloaded rewarded + one interstitial in memory; reloads are event-driven, no polling except an expiry check on `tick`.
- Boot smoke and Android build add CI minutes only.

## 12. Platform considerations
- **Android 16 / targetSdk 36:** predictive back is on; `@capacitor/app` uses `OnBackPressedCallback`, so the router works and the back-to-home animation appears only on MainMenu. Edge-to-edge is mandatory; `SystemBars insetsHandling: 'css'` + `viewport-fit=cover` deliver insets via `--safe-area-inset-*` on WebView ≥ 140, and SystemBars pads the WebView otherwise.
- **Large screens:** `appCategory="game"` keeps the portrait lock honoured on ≥ sw600dp (Android 16 rule); the FIT scaler covers user aspect overrides.
- **WebView floor:** Vite's es2020 output needs Chrome ≥ 87; Android 7 is stuck at 119 and 8/9 at 138, so the floor excludes nobody who can update.
- **Background:** Capacitor never pauses the WebView timers; only `visibilitychange` + rAF stop. `App 'pause'` also fires for ad/purchase activities and permission dialogs, hence the in-flight exclusions.
- **Back gesture vs. attractor drags near edges:** may open the pause menu (harmless); `setSystemGestureExclusionRects` is held in reserve if the device checklist shows it is frequent.
- **Haptics:** `VIBRATE` is a normal permission (no prompt, no Play declaration); `navigator.vibrate` still needs a prior user tap and does nothing in silent mode.
- **Web build:** `Saves`, lifecycle `App` listeners, consent and ads are native-guarded; web keeps localStorage and `visibilitychange`; purchases are never granted on web, dev included (`buy` / `restore` resolve `'unavailable'`).

## 13. Documentation changes
- New: `docs/STATUS.md`, `docs/release/RUNBOOK.md`, `docs/qa/DEVICE-CHECKLIST-M0.md`, `docs/store/data-safety.md`, `docs/archive/2026-10-07/README.md`.
- Archived to `docs/archive/2026-10-07/` (from `docs/`): `project-status.md`, `session-handoff.md`, `LAUNCH-READINESS.md`, `release-prep.md`, `RELEASE-v1.0.0.md`, `release-android.md` (after its content moves to the RUNBOOK), `growth-architecture.md`, `device-playtest-checklist.md`, and (from `docs/store/`) `monetization-review.md`; `docs/superpowers/plans/*` (10 completed plans) → `docs/archive/plans/` with a "Completed — historical record" banner (new plans keep going to `docs/superpowers/plans/`).
- Rewritten: `CLAUDE.md` (architecture + conventions only), `README.md` facts line, store copy files, privacy policy, `CHANGELOG.md` `[Unreleased]` entry for Waves 1–4, the title-fit fix and P0.
- This file's status line → `DONE` with the closing commit hash at phase end.

---

## 14. Validation criteria
| # | Criterion | Label | Command / method |
|---|---|---|---|
| V1 | Type check clean | VERIFIED-by-command | `npx tsc --noEmit` |
| V2 | All unit tests green, including every new TDD file in §8.1 | VERIFIED-by-command | `npx vitest run` |
| V3 | Web build | VERIFIED-by-command | `npm run build` |
| V4 | Facts block current | VERIFIED-by-command | `node scripts/facts.mjs --check` |
| V5 | 0 critical advisories | VERIFIED-by-command | `npm audit --omit=dev --audit-level=critical` |
| V6 | Android debug build without any tracked JDK path | VERIFIED-by-command | `cd android && ./gradlew -Dorg.gradle.java.home="$JAVA_HOME" assembleDebug`; `git grep -n "org.gradle.java.home=" -- android` returns nothing |
| V7 | versionCode derived = 1000001 in both tools | VERIFIED-by-command | `node scripts/version.mjs --code` and `./gradlew -q :app:printVersionCode` |
| V8 | Boot smoke: every scene, zero console errors | VERIFIED-by-command | `node scripts/harness/boot-smoke.mjs` |
| V9 | No reserved/invalid analytics names; no "leaderboard" copy | VERIFIED-by-command | covered by V2 (`analyticsEvents.test.ts`, `storeCopy.test.ts`) |
| V10 | Merged manifest has `VIBRATE`, portrait, `appCategory`, `singleTop`, Firebase consent defaults false | VERIFIED-by-command | `./gradlew :app:processDebugMainManifest`, then search the merged `AndroidManifest.xml` under `android/app/build/intermediates/` (debug variant) for each attribute |
| V11 | `.ai/*` untracked | VERIFIED-by-command | `git ls-files .ai` returns nothing |
| V12 | No stale state left in CLAUDE.md | VERIFIED-by-command | `git grep -nE "project-status\|session-handoff\|v1.0.0-rc.1\|levels 1–6" CLAUDE.md` returns nothing |
| V13 | Consent before any ad request; analytics consent lines in logcat | REQUIRES HUMAN DEVICE TEST | C1–C3 with `VITE_UMP_DEBUG_GEOGRAPHY=EEA` and `US` debug APKs; `adb logcat \| grep "Setting consent"` |
| V14 | Purchases, restore, pending, refund, second account, offline, local prices | REQUIRES HUMAN DEVICE TEST | P1–P15, license testers, internal track |
| V15 | Interstitial only over the win overlay, never after a 2× rewarded; rewarded never hangs | REQUIRES HUMAN DEVICE TEST | A1–A5 |
| V16 | Back routing, pause on background, silent audio while hidden, haptics | REQUIRES HUMAN DEVICE TEST | Android 16 gesture + 3-button, Home mid-level, notification shade, split screen |
| V17 | Backup/restore of progress | REQUIRES HUMAN DEVICE TEST | `adb shell bmgr backupnow com.truestorylabs.gravityflow` → uninstall → reinstall |
| V18 | Renderer-crash recovery ≤ 2, then normal crash | REQUIRES HUMAN DEVICE TEST | debug build kill of the sandboxed renderer (`adb shell kill <pid>`) |
| V19 | Hydrate cost ≤ 60 ms | INFERRED until measured | `performance.now()` around `Saves.hydrate()` logged in a debug build |
| V20 | Data Safety form + privacy policy match the SDKs | INFERRED (draft) → owner sign-off | `docs/store/data-safety.md` vs launch brief §2; not legal advice |

## 15. Exact completion definition
- [ ] `docs/STATUS.md` exists, ≤ 150 lines, facts block generated; `facts.mjs --check` runs in CI and is green.
- [ ] Stale docs archived with banners; CLAUDE.md contains no state; README facts line generated.
- [ ] `android/gradle.properties` has no `org.gradle.java.home`; `.ai/` untracked and ignored; `proguard-android-optimize.txt` in use.
- [ ] versionCode derived from `package.json` (= 1000001); RUNBOOK documents JDK, versioning, signing, tags, promotion.
- [ ] CI: Node 22, `npm ci`, `web` + `android-debug` + `smoke` jobs green; audit gate at 0 critical.
- [ ] Capacitor 8.5.2 family + `@capacitor/app` 8.1.2 + `@capacitor/preferences` 8.0.1 + firebase 8.5.2 + purchases 13.7.0 + phaser 3.90.0, exact pins, synced; AdMob 8.2.1 in its own commit after the soak (or explicitly deferred in STATUS with the reason).
- [ ] Every D-11 item implemented: back router, pause/foreground contract with audio suspend and in-flight exclusions, `appCategory`, portrait, `VIBRATE`, backup rules, dark `windowBackground`, `minWebViewVersion` 87 + error page, SystemBars, es2020, renderer recovery, origin guard test.
- [ ] D-12 mirror + hydrate + migrations 1–3 + validation + `:bak` keys across all stores.
- [ ] D-09 complete in code (plugin import, entitlements, exact packages, error codes, pending listener, explicit `getCustomerInfo`, store prices, Starter hidden, `singleTop`); dashboard items (non-consumable flags, entitlements, current offering, license testers) recorded as 👤 gates.
- [ ] D-10 + D-24 plumbing complete; Settings privacy rows live; release guard refuses test ids.
- [ ] Frame guard + overlay + Crashlytics stacks and keys; analytics hygiene complete; store copy honest; Data Safety + privacy drafts committed.
- [ ] V1–V12 VERIFIED; V13–V18 have owner results recorded in `docs/qa/DEVICE-CHECKLIST-M0.md` (may complete during the M0 device session); STATUS Gates updated.

---

## 16. Task breakdown

Each task: own branch or commit series, TDD where pure, gates V1–V3 before commit, `npm run facts` re-run once P00-T01 exists (new tests change the facts block, and CI rejects a stale block), STATUS updated at task end.

### Step 0 — Docs SSOT + hygiene + versioning
**P00-T01 — STATUS.md + facts generator**
- Goal: one trusted state document with machine-generated facts and a CI drift check.
- Files: create `docs/STATUS.md`, `scripts/facts.mjs`, `scripts/facts/collect.ts`, `scripts/facts/factsLib.mjs`; modify `vite.config.ts` (`test.include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs']`), `package.json` (scripts `facts`, `facts:check`; devDependency `vite-node` 1.6.1).
- Tests: `scripts/facts/factsLib.test.mjs`.
- Done when: `node scripts/facts.mjs` writes the block (150 levels, 15 worlds, 28 files / 221 tests at baseline) and `--check` passes; editing a number in the block makes `--check` exit 1.

**P00-T02 — Archive stale docs, create RUNBOOK and QA folder**
- Goal: no doc contradicts STATUS.
- Files: move the §13 list into `docs/archive/2026-10-07/` and `docs/archive/plans/` with banners; create `docs/archive/2026-10-07/README.md`, `docs/release/RUNBOOK.md` (content from `release-android.md`, `release-prep.md`, `RELEASE-v1.0.0.md`, with the real keystore alias `gravityflow-upload`), `docs/qa/DEVICE-CHECKLIST-M0.md` (skeleton rows).
- Tests: `node scripts/facts.mjs --check`; `git grep -nE "docs/project-statu[s]\.md" -- ':!docs/archive'` returns nothing (the bracket keeps this line from matching itself).
- Done when: every inbound link points at STATUS, RUNBOOK or the archive index.

**P00-T03 — CLAUDE.md state-free + README facts line**
- Goal: CLAUDE.md = architecture and conventions only.
- Files: `CLAUDE.md` (edits listed in §4), `README.md`.
- Tests: V12 grep; `facts.mjs --check`.
- Done when: CLAUDE.md names `docs/STATUS.md` for state and `docs/architecture/TECHNICAL-ARCHITECTURE.md` for layering, and contains no version, count or sprint status.

**P00-T04 — Repo hygiene**
- Goal: the repo builds on any machine; no dead tracked links; AGP 9 ready.
- Files: `android/gradle.properties` (delete lines 14-19), `.gitignore` (`.ai/`), `git rm --cached .ai/skills .ai/superpowers .ai/ui-ux-pro-max-skill`, `android/app/build.gradle:43` → `proguard-android-optimize.txt`; 👤 confirm `git stash drop stash@{0}` ("abandoned sprint4 wip", 2026-05-31).
- Tests: V6, V11.
- Done when: `./gradlew -Dorg.gradle.java.home=<JDK21> assembleDebug` succeeds with a clean tracked tree.

**P00-T05 — Versioning (D-20)**
- Goal: monotonic versionCode from one file.
- Files: `package.json` (`version: "1.0.0"`, `androidBuild: 1`), `android/app/build.gradle` (JsonSlurper derivation, range check, `printVersionCode`), `scripts/version.mjs` (`--code`, `--name`, `--bump-build`, `--check`), `scripts/lib/versionCode.mjs`, `docs/release/RUNBOOK.md` §Versioning, `CHANGELOG.md` `[Unreleased]`.
- Tests: `scripts/lib/versionCode.test.mjs`; V7.
- Done when: both tools print 1000001 and STATUS Gates lists "last uploaded versionCode = 1".

**P00-T06 — CI v2**
- Goal: reproducible CI with an Android build.
- Files: `.github/workflows/ci.yml` (Node 22, `npm ci`, vitest JSON report → `facts.mjs --check --vitest-json`, job `android-debug` with `actions/setup-java` Temurin 21 + `android-actions/setup-android`, `npm run build`, `npx cap sync android`, `./gradlew assembleDebug`, version cross-check).
- Tests: the CI run itself.
- Done when: both jobs are green on a push to a branch.

### Step 1 — Security dependencies
**P00-T07 — Capacitor 8.5.2 family + pins**
- Goal: patched runtime before any other native change.
- Files: `package.json`, `package-lock.json` (`npm i -E @capacitor/core@8.5.2 @capacitor/android@8.5.2 @capacitor/cli@8.5.2 @capacitor/app@8.1.2 @capacitor/preferences@8.0.1 @capacitor-firebase/analytics@8.5.2 @capacitor-firebase/crashlytics@8.5.2 @revenuecat/purchases-capacitor@13.7.0 phaser@3.90.0`), `npm run cap:sync` outputs, `.github/workflows/ci.yml` (audit step).
- Tests: V1–V3, V5, V6; `npx cap doctor`.
- Done when: audit shows 0 critical and `assembleDebug` passes in CI.

**P00-T08 — AdMob 8.2.1 soak commit**
- Goal: current AdMob plugin without destabilising step 4.
- Files: `package.json`, `package-lock.json` (`@capacitor-community/admob@8.2.1`), sync outputs.
- Tests: V2, V6; 👤 A1–A5 re-run.
- Done when: committed on or after 2026-10-13 (≥ 7 days after 8.2.0's 2026-10-05 release), after P00-T19 is green and the plugin's issue tracker shows no Android regression; otherwise STATUS records the deferral reason.

### Step 2 — Platform contract (D-11) + save mirror (D-12)
**P00-T09 — Manifest, theme, WebView floor, system bars**
- Goal: the static half of D-11.
- Files: `AndroidManifest.xml` (`xmlns:tools`, `android:appCategory="game"`, `android:screenOrientation="portrait"`, `android:launchMode="singleTop"`, `<uses-permission android:name="android.permission.VIBRATE"/>`), `styles.xml`, `res/values/colors.xml`, `res/xml/file_paths.xml`, `capacitor.config.ts`, `public/webview-update.html`, `vite.config.ts` (`build.target: 'es2020'`), `src/utils/a11y.ts:41-44`, `src/config/platform.config.ts`.
- Tests: `src/config/capacitorConfig.test.ts`; V10.
- Done when: merged manifest shows every attribute; boot smoke still green.

**P00-T10 — Back router + PauseScene**
- Goal: Back never kills a run and never exits the app from inside it.
- Files: `src/platform/backRouter.ts`, `src/platform/lifecycle.ts` (Back wiring), `src/scenes/PauseScene.ts`, `src/main.ts` (register `PauseScene`), `GameScene.ts` / `EndlessScene.ts` (`requestPause`, `pause-action` handling), `MainMenuScene.ts` (`toggleBackButtonHandler`).
- Tests: `src/platform/backRouter.test.ts`; boot smoke opens `PauseScene` over both gameplay scenes.
- Done when: every routing-table row passes in tests; 👤 V16 Back rows pass.

**P00-T11 — Background/foreground contract**
- Goal: hidden = paused + silent; visible = refit, never auto-resume.
- Files: `src/platform/lifecycle.ts`, `src/platform/haptics.ts`, `src/utils/AudioSynth.ts` (`suspend()`), `src/main.ts` (replace lines 92-100), `GameScene.ts:187-191` → `Haptics.pulse`.
- Tests: `src/platform/lifecycle.test.ts`.
- Done when: unit table green; 👤 Home mid-level → silent, returns to the pause overlay.

**P00-T12 — Renderer-crash recovery**
- Goal: a dead renderer recreates the activity instead of crashing (max 2).
- Files: `MainActivity.java` (`onCreate` override, static counter, `WebViewListener`), `src/platform/saves.ts` hydrate reads/clears `platform:rendererGone` and calls `Crash.recordError('renderer_gone')`.
- Tests: V6 (compiles); 👤 V18.
- Done when: a killed renderer reloads the game with progress intact twice, then crashes normally.

**P00-T13 — Preferences mirror + hydrate + backup rules**
- Goal: saves survive WebView storage loss and are backed up selectively.
- Files: `src/platform/saves.ts`, `src/platform/migrations.ts` (migration 1), `src/main.ts`, `src/scenes/BootScene.ts`, all stores' `persist()` → `Saves.write`, `AndroidManifest.xml` (`android:dataExtractionRules="@xml/data_extraction_rules"`, `android:fullBackupContent="@xml/backup_rules"`), the two XML files.
- Tests: `src/platform/saves.test.ts`, `src/platform/migrations.test.ts`.
- Done when: unit tests green; 👤 V17 restores progress after reinstall.

### Step 3 — Purchases (D-09)
**P00-T14 — Move service seams to `src/services/`**
- Goal: final home for SDK seams before rewriting them.
- Files: `git mv` per §4 Move; update the 13 importing files (`src/main.ts`, `BootScene.ts`, `CosmeticsScene.ts`, `EndlessScene.ts`, `GameScene.ts`, `SettingsScene.ts`, `DailyStore.ts`, `Rewards.ts`, and the moved files/tests).
- Tests: V1–V3 unchanged results (221 tests).
- Done when: no file under `src/utils/` imports a moved module by its old path.

**P00-T15 — Entitlement model**
- Goal: D-09 mapping as pure, tested data.
- Files: `src/services/entitlements.ts`, `src/config/monetization.config.ts` (`ENTITLEMENTS`, `PACKAGES`, `BundleDef` changes).
- Tests: `src/services/entitlements.test.ts`.
- Done when: every product → entitlement → cosmetic row and every error code is covered.

**P00-T16 — IAP rewrite**
- Goal: entitlement-as-truth purchases on device.
- Files: `src/services/IAP.ts`, `src/services/native/revenueCat.ts` (deleted in favour of the dynamic package import), `src/utils/CosmeticStore.ts`, `src/platform/migrations.ts` (migration 2), `src/main.ts` (`IAP.init()` after hydrate).
- Tests: `entitlements.test.ts`, `migrations.test.ts`; 👤 P1–P15.
- Done when: `isPremium()` and bundle ownership read only the snapshot; no `[0]`, no `|| true`, no local bundle grant remains (`git grep -nE "availablePackages\[0\]|\|\| true" src` returns nothing).

**P00-T17 — Purchase UI honesty**
- Goal: store prices, correct visibility, clear outcomes.
- Files: `src/scenes/CosmeticsScene.ts` (lines 280, 289, 351, 362, 133), `src/scenes/SettingsScene.ts` (lines 3, 148-150, 170-173), `src/config/monetization.config.ts` (delete `priceLabel` at lines 56-58 and `REMOVE_ADS_PRICE_LABEL` at line 67; rewrite the `bestValue` comment at lines 44-53 without dollar amounts, since the framing must hold in every currency).
- Tests: V1–V3; boot smoke opens the shop; 👤 P1, P2, P3, P12.
- Done when: `git grep -nE "priceLabel|REMOVE_ADS_PRICE_LABEL|\\$[0-9]" src` returns nothing.

### Step 4 — Consent-first boot + ad plumbing
**P00-T18 — Consent-first boot + privacy entry points**
- Goal: nothing is requested or logged before consent is applied.
- Files: `src/services/consentState.ts`, `Consent.ts`, `bootServices.ts`, `src/services/native/admob.ts` (consent + listener typings), `src/services/Analytics.ts` (`applyConsent`, `resetData`), `src/services/native/firebaseAnalytics.ts` (`setConsent`, `setCurrentScreen`, `resetAnalyticsData`), `src/services/Crash.ts` (`enable()`), `AndroidManifest.xml` (6 meta-data entries), `src/scenes/BootScene.ts`, `src/scenes/SettingsScene.ts`.
- Tests: `src/services/consentState.test.ts`; 👤 V13.
- Done when: unit tests green; EEA debug APK shows the form before any ad request and Settings shows "Privacy choices"; US debug APK shows no form.

**P00-T19 — Ad plumbing (D-24)**
- Goal: preloaded, event-driven, policy-safe ads.
- Files: `src/services/adState.ts`, `src/services/Ads.ts`, `src/services/interstitial.ts` (rewarded resets the clock), `src/config/monetization.config.ts` (`AD_SHOW_WATCHDOG_MS`, `AD_LATE_REWARD_GRACE_MS`, `AD_RETRY_BACKOFF_MS`, `AD_MAX_AGE_MS`), `GameScene.ts:1149-1168, 1380-1408`, `EndlessScene.ts:420-494`, `CosmeticsScene.ts:230-264`.
- Tests: `src/services/adState.test.ts`, existing `interstitial.test.ts`; 👤 V15.
- Done when: no caller awaits `showRewardVideoAd()` directly; `advanceAfterWin` awaits the interstitial before `scene.restart`; offers are hidden when not ready.

**P00-T20 — Release configuration guard**
- Goal: impossible to ship test ids, the Test Store key or debug geography.
- Files: `src/config/monetization.config.ts` (`ADMOB_TEST`/`ADMOB_PROD`, RC key per mode), `android/app/build.gradle` (`manifestPlaceholders = [admobAppId: …]`; release fails without `-PADMOB_APP_ID`), `AndroidManifest.xml:17-19` → `${admobAppId}`, `scripts/release-check.mjs`, `package.json` (`release:check`), `docs/release/RUNBOOK.md`.
- Tests: `src/config/releaseConfig.test.ts`; `node scripts/release-check.mjs` fails today (prod ids empty) with a clear message.
- Done when: debug builds keep test ids; the release path refuses them until the owner supplies real ids (👤 gate in STATUS).

### Step 5 — Error boundary, validation, analytics hygiene, honest copy
**P00-T21 — Frame guard + error overlay + Crashlytics**
- Goal: no permanent freeze; actionable crash reports.
- Files: `src/platform/frameGuard.ts`, `src/platform/errorOverlay.ts`, `src/services/stackParse.ts`, `src/services/Crash.ts` (stack traces, keys, dedupe, cap), `src/main.ts`.
- Tests: `frameGuard.test.ts`, `stackParse.test.ts`; boot smoke with a DEV-only `window.__crashTest()` that throws inside `update` shows the overlay after 3 throws.
- Done when: the injected failure path is covered by the smoke run; 👤 Crashlytics shows a stack-traced test non-fatal from the internal build.

**P00-T22 — Store validation + backups + cleanup**
- Goal: corrupt or wrong-shaped data never freezes or wipes progress.
- Files: `src/platform/storeCodec.ts`, `src/utils/storeSchemas.ts`, every store's `load()`, `src/platform/migrations.ts` (migration 3).
- Tests: `storeCodec.test.ts`, `storeSchemas.test.ts`, `migrations.test.ts`.
- Done when: writing `"null"` into `gravity-flow:progress:v9` in the browser restores from `:bak` (manual check in the boot-smoke harness: DEV hook writes the bad value then reloads).

**P00-T23 — Analytics hygiene (D-14 P0 part)**
- Goal: lawful, valid, measurable events.
- Files: `src/services/analyticsEvents.ts` (delete `sessionStart`, `bundle_id`, add `purchasePending`, `rewardedUnavailable`), `src/services/analyticsQueue.ts`, `src/services/Analytics.ts` (`screen()`), `src/main.ts` (screen-view hook), `src/scenes/BootScene.ts:4,19`.
- Tests: extended `analyticsEvents.test.ts`, `analyticsQueue.test.ts`.
- Done when: `git grep -n "session_start" src` matches only the reserved-name list in the test; 👤 DebugView shows one `screen_view` per scene and zero `firebase_error`.

**P00-T24 — Boot smoke harness**
- Goal: every scene boots with zero console errors, in CI.
- Files: `scripts/harness/lib/server.mjs`, `scripts/harness/lib/browser.mjs`, `scripts/harness/boot-smoke.mjs`, `package.json` (`playwright` 1.63.0 dev, script `smoke`), `.github/workflows/ci.yml` (job `smoke` with `npx playwright install --with-deps chromium`), `CLAUDE.md` line 211.
- Tests: V8.
- Done when: the job is green and fails when a scene logs `console.error` (verified once with a temporary injected error).

**P00-T25 — Honest store copy + Data Safety + privacy drafts**
- Goal: listing and disclosures match the build.
- Files: `docs/store/listing.md` (lines 33, 37, 55-66), `docs/store/release-notes.md:11`, `docs/store/aso.md:14`, `README.md:45`, new `docs/store/data-safety.md`, `docs/store/privacy-policy.md`, `docs/index.html` (effective date, SDK table, GDPR/US-state/retention/deletion/Israel blocks, in-app link mention).
- Tests: `src/config/storeCopy.test.ts`.
- Done when: test green; drafts marked "DRAFT — owner review, not legal advice"; 👤 owner sign-off recorded in STATUS before the Play form is filled.

**P00-T26 — Device checklist + phase close**
- Goal: M0-ready P0 with recorded evidence.
- Files: `docs/qa/DEVICE-CHECKLIST-M0.md` (all rows from §8.3 with expected results), `docs/STATUS.md` (Gates, Open bugs), this file's status line.
- Tests: V1–V12 re-run; code review (`superpowers:requesting-code-review`).
- Done when: §15 checklist is complete except owner device rows, which are scheduled in the M0 device session.
