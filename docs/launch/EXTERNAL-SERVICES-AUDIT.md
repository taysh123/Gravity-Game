# External Services Configuration Audit

**Date:** 2026-10-07 · **Commit:** `master @ d3c6aab` · **Method:** I read the code, tracked config, untracked local config files and the full git history, plus the manifest decoded from the 2026-08-01 AAB.

**Secrets:** none are printed. Values are reported only as *present/absent*, or masked as `abcd…xyz (len N)`.

**Evidence labels:**
- **[V]** verified from repo/history/build artifact
- **[U]** unknowable from the repo (lives in a dashboard you control)
- **[I]** inferred

## Summary
| Service | In code | Configured in repo | Prod vs placeholder | Used at runtime | Priority |
|---|---|---|---|---|---|
| **Firebase (project)** | yes | **yes**: `android/app/google-services.json` present (untracked, correct) | **Production**: project `gravity-flow-e8dff`, app id `1:27…5e6 (len 45)`, API key present, package matches | yes (native only) | P0 (consent gating) |
| **Firebase Analytics** | yes (`src/utils/Analytics.ts`, `native/firebaseAnalytics.ts`, ~35 events) | yes (Gradle plugin + capacitor-firebase-analytics 8.3.0) | Production project; **no consent gating**; no Consent Mode v2 defaults | yes: logs from boot on native (`BootScene.ts:19`); web prod = no-op | **P0** |
| **Firebase Crashlytics** | yes (`src/utils/Crash.ts`) | yes (crashlytics Gradle plugin 3.0.3 applied, `app/build.gradle:77`) | Production project | yes: `setEnabled(true)` at boot on native | P1 (stack traces, custom keys) |
| **AdMob (+ UMP consent)** | yes (`src/utils/Ads.ts`, `native/admob.ts`, plugin 8.0.0) | **placeholder only** | **Google TEST ids** everywhere: app id `ca-app-pub-3940…~3347511713` (manifest + config), test rewarded + interstitial units. **No real AdMob publisher id has ever been committed** (full-history scan) | yes, lazily at the first ad request; UMP requested there | **P0** |
| **RevenueCat** | yes (`src/utils/IAP.ts`, `native/revenueCat.ts`, plugin 13.1.5) | **not configured** | `apiKey: ''`; no `goog_…` key ever in history. Plugin also registered under the wrong name (`'PurchasesPlugin'` ≠ native `"Purchases"`) | **effectively no**: `configure()` skipped, so every purchase/restore fails on device | **P0** |
| **Google Play Billing** | via RevenueCat | product ids referenced: `remove_ads`, `starter_pack`, `premium_collection_pack`, `founders_pack`; entitlement `premium` | `com.android.vending.BILLING` merged into the AAB manifest; Billing Library 8.3.0 in the bundle | only through RC (broken) | **P0** |
| **Google Play Console** | n/a | signing: `android/keystore.properties` present (untracked) with all 4 keys set; the `.jks` it points to exists on disk; upload cert CN=Tay Shofer, O=True Story Labs, valid to 2051 | App **exists** and an AAB was uploaded (per you). Repo builds still use **versionCode 1**, so the next upload must be ≥2. Package id `com.truestorylabs.gravityflow` is now permanent. | n/a | **P0** (versionCode) |
| **Apple Developer / App Store Connect** | no | **nothing**: no `ios/`, no `@capacitor/ios`, no `GoogleService-Info.plist` | n/a | no | P3 (post-Android) |
| **GitHub Pages** | n/a | `docs/` served from `master:/docs` (privacy policy at `taysh123.github.io/Gravity-Game/`) | **live** [V] | n/a | P1 (app-ads.txt can't live on a project path) |
| **Vercel** | n/a | `.vercel/project.json` linked (projectId/orgId present, untracked) | serves the HEAD web build at `gravity-flow-six.vercel.app`; **the web IAP stub grants purchases for free** | web only | P2 |
| **GitHub Actions CI** | `.github/workflows/ci.yml` | web job only (tsc/test/build), Node 20 (EOL); Android job commented out | — | CI | P2 |
| **Google Play Games Services** | no | none | — | no | P2 (leaderboards/cloud save later) |
| **Firebase Remote Config / A/B Testing** | no | none (project exists, so enabling is cheap) | — | no | P1 |
| **Google Fonts** | no (fonts self-hosted woff2) | — | — | no runtime dependency | — |
| **Firebase Dynamic Links** | no | `google-services.json` lists `appinvite_service` (legacy default, harmless) | — | no | — |

## Merged-manifest permissions in the shipped AAB [V]
`INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `BIND_JOB_SERVICE`, `FOREGROUND_SERVICE`, `DUMP`, `com.android.vending.BILLING`, `com.google.android.gms.permission.AD_ID`, `ACCESS_ADSERVICES_AD_ID/ATTRIBUTION/TOPICS`.

- **`FOREGROUND_SERVICE`** comes from a transitive library, likely WorkManager via Firebase/GMA [I]. On targetSdk 34+, Play may ask for a foreground-service declaration. Verify in Console; remove it with `tools:node="remove"` if no FGS is used.
- **`VIBRATE` is absent**, so `navigator.vibrate` haptics may be dead on device.

## Per service: what you configure (U) vs what I fix in the repo (D)

### AdMob + UMP
**You (dashboard):**
1. Confirm whether an AdMob app exists for `com.truestorylabs.gravityflow`. If not, create it and link it to the Play listing.
2. Create one rewarded and one interstitial unit (optionally a rewarded unit per surface for reporting).
3. In **Privacy & messaging**, create a GDPR message and a US-states message.
4. Set up app-ads.txt on a root domain. A GitHub *user* site or a custom domain works; the project-path Pages URL won't verify.
5. Register test devices.

**Me (repo):**
- An id seam that is honest about what's missing: a single `monetization.config` with a build-time switch that refuses to ship test ids in a release build.
- UMP at startup, `canRequestAds` gating, a privacy-options button, and `initialize({ maxAdContentRating: 'PG' })`.
- Preload with timeouts, interstitials only after NEXT and awaited, rewarded calls that settle on dismiss/fail, busy guards.

**Missing:** real ids, the consent messages, app-ads.txt, a privacy-options entry point.

### RevenueCat + Play Billing
**You (dashboards):**
1. In RevenueCat, create the project and Android app (package above), and upload Play service-account credentials for receipt validation (+ RTDN via Pub/Sub, recommended).
2. In Play Console, create the one-time products `remove_ads`, `starter_pack`, `premium_collection_pack`, `founders_pack`. The product UI unlocks after a BILLING-permission AAB upload, which you've done.
3. In RevenueCat, create the entitlements (proposal in the monetization plan), attach the products, and put all products in the **current Offering**.
4. Add license testers.
5. Paste the **public** Android SDK key (`goog_…`) into the repo config. It's a public client key, safe to commit.

**Me (repo):**
- Plugin name `'Purchases'` and correct init.
- Restore and grant from `customerInfo`, so bundles survive reinstall.
- Remove `|| true` and the `[0]` fallback.
- Handle pending purchases, add a customer-info listener, use store prices.
- A test matrix.

**Missing:** everything dashboard-side, unknown whether any of it exists; the repo has never held an RC key.

### Firebase Analytics + Crashlytics
**You:**
1. Confirm in the Firebase console that the Android app is registered (it is in `google-services.json`).
2. Set GA4 data retention.
3. Link the Firebase project to AdMob (optional).
4. Register custom dimensions after the taxonomy lands.
5. Optional: create a separate debug Firebase app or project.

**Me:**
- Consent Mode v2 defaults: analytics *denied* until UMP resolves, via the manifest `google_analytics_default_allow_*` flags plus `setConsent`.
- Rename the reserved `session_start`; implement the new taxonomy.
- Crashlytics stack traces + custom keys.
- An in-app "Reset analytics data" option.

### Play Console
**You:**
1. Check the account type and creation date, and whether this app shows an "apply for production" requirement (12 testers × 14 days for post-2023-11-13 personal accounts).
2. Complete App content: Data safety (use the matrix in the launch plan), Ads = yes, Advertising ID = yes, Target audience **13+**, Content rating, App access.
3. Payments profile (its address is public for monetized apps).
4. Enroll in Play App Signing; back up the upload keystore.

**Me:**
- versionCode scheme (next ≥2, monotonic, derived).
- Honest listing copy.
- Data-safety and privacy-policy rewrite.
- Store assets.

### Apple (later)
**You:** the account exists. Create the App Store Connect record only when the iOS port starts.
**Me:** `npx cap add ios` needs macOS + Xcode 26. Everything else is deferred to the Phase 12 iOS track.
