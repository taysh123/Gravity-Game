# P12 — Launch & Post-Launch Optimisation

**Status:** PLANNED.
- **Release engineering** (T01–T08) is pulled forward to M0 and M1, because the first internal upload needs versionCode ≥ 1000001.
- **Production launch** (T09–T15) is EXECUTION-ORDER step 19, after M2.
- **The optimisation loop** (T16–T17) runs from launch onwards.
- **The iOS track** (T18–T21) is step 23 and DEFERRED until Android is stable (D-29).

Baseline `master @ d3c6aab` · 2026-10-07.

> **Conforms to:**
> - D-20: versionCode formula, semver versionName, rc label in the tag, same AAB promoted, Play App Signing plus an upload-key backup.
> - D-11: never change `androidScheme`/`hostname`.
> - D-12: saves survive updates.
> - D-19: production refuses a working-title brand.
> - D-24: ad policy at launch.
> - D-29: iOS after Android.
>
> **Console checklist and launch-day runbook:** [`../../launch/STORE-LAUNCH-PLAN.md`](../../launch/STORE-LAUNCH-PLAN.md) §11–§16. **Brand gate:** [`P11-brand-aso.md`](P11-brand-aso.md).

## 1. Summary
P12 ships the game safely and then improves it with data. It has four parts:
1. **Release engineering.** One version file, with versionCode derived by the D-20 formula. A preflight script blocks bad uploads: test ad IDs, an empty RevenueCat key, a working-title brand on production, unexpected merged permissions, critical advisories, or a versionCode that doesn't increase. There is a CI Android build, an append-only release ledger with AAB SHA-256s, and milestone tags with GitHub Releases. The **same AAB** is promoted Internal → Closed → Production.
2. **Launch.** The production-access application, then a staged rollout of 20 → 50 → 100% with explicit gates and halt criteria, plus vitals and Crashlytics alerting.
3. **Optimisation loop.** A weekly 30-minute metrics review with a written log, a measure → hypothesise → ship → evaluate loop that uses Remote Config, listing experiments or releases, and a predictable release train.
4. **iOS track.** About 6–10 developer days plus 1–2 review cycles, started only after Android meets the stability criteria in §3.8.

## 2. Scope
| Aspect | Detail |
|---|---|
| **Systems** | Versioning (`package.json`, `android/app/build.gradle`); release scripts (`scripts/release/`); CI (`.github/workflows/ci.yml`); release docs (`docs/release/`); Settings version footer; Crashlytics version keys; Play Console tracks, rollout and vitals; Firebase/AdMob/RevenueCat monitoring; GitHub tags and Releases; iOS platform (`ios/`, plugins, App Store Connect) |
| **Dependencies** | P0 step 0 (versionCode scheme adopted; P12-T01 verifies and extends it). P0 steps 3–4 (real AdMob/RC IDs, consent; preflight enforces them). P11 (`brand:check --release`, listing, creative, website). M2 sign-off for T09+. P6 Remote Config (kill switches and optimisation levers; until it ships, levers need releases). 👤 production access, rollout decisions, Mac access for iOS. |
| **Difficulty** | Engineering **M** · design **L** · QA **H** (Play-installed device tests; rollout watch) |
| **Risk** | Review rejection (metadata, Data safety, ads policy). Vitals breach (WebView renderer crashes count). Shipping the wrong binary. A lost upload key. A public-repo secrets leak through CI. Mitigation: preflight, ledger SHA match, keystore backup ×2, signed builds kept out of public CI artifacts (§3.4). |
| **Upside** | It realises the value of every earlier phase. A safe rollout protects the rating, and the weekly loop compounds improvements. iOS roughly doubles the addressable market later. |
| **Success metrics** | Crash rate **< 1.09%** and ANR **< 0.47%** overall, < 8% on any phone model (internal targets < 0.5% / < 0.2%). Crashlytics crash-free sessions **≥ 99.5%**. Staged rollout 20 → 50 → 100% with **0 halts caused by a release regression**. **Weekly review held every week** for the first 12 weeks. Every upload in the ledger with preflight green. iOS: App Store approval in ≤2 review cycles. |
| **Must NOT do yet** | iOS before the stability criteria (D-29). R8/minify for 1.0 (D-20). Rebuilding the AAB for production (promote instead). Attaching an AAB, mapping file or keystore to a public GitHub Release or a public CI artifact. Automated Play uploads before the owner creates a service account. Open testing or pre-registration. Any `androidScheme`/`hostname` change (D-11). Paid UA before listing conversion and D1 targets are met. |

## 3. Architecture plan

### 3.1 Version source and derivation (D-20)
- **One version file: `package.json`.**
  - `"version": "1.0.0"` is plain semver and becomes the `versionName`. Today it is `"1.0.0-rc.1"` [REPO]; the rc label moves to the git tag.
  - A new top-level `"androidBuild": 1` (integer 1–99) is the BUILD part.
  - If P0 step 0 chose a different file, T01 adopts that one instead. There must be exactly one.
- **Formula:** `versionCode = MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD`. For example, 1.0.0 build 1 = **1000001**, 1.0.1 build 1 = 1000101, 1.1.0 build 1 = 1010001.
  - Constraints: MINOR ≤ 99, PATCH ≤ 99, BUILD 1–99. Bump PATCH if BUILD runs out. The maximum code is 2,100,000,000.
- **Gradle:** `android/app/build.gradle` reads `../../package.json` with `groovy.json.JsonSlurper` and computes both values, replacing the hard-coded `versionCode 1` / `versionName "1.0.0"` at lines 21–22 [REPO]. It fails the build on a prerelease suffix or an out-of-range part. A `printVersion` task feeds CI.
- **JS mirror:** `scripts/release/version.mjs` is a pure `versionCode()` plus `bump build|patch|minor|major` (MINOR and above reset BUILD to 1) and `print`. CI asserts that `node scripts/release/version.mjs code` equals `./gradlew -q printVersion`.
- **Vite `define`:** `__APP_VERSION__` and `__APP_BUILD__`, used by the Settings footer and Crashlytics custom keys.
- **Milestone numbering:** all pre-launch builds are `1.0.0` with BUILD 1, 2, 3… The launch binary is the promoted M2 build. Post-launch: hotfix = PATCH+1; feature release = MINOR+1.

### 3.2 Release ledger (append-only)
`docs/release/ledger.json` holds one entry per uploaded AAB:
```json
{ "versionName": "1.0.0", "versionCode": 1000001, "tag": "v1.0.0-rc.2", "commit": "<sha>",
  "aabSha256": "<hex>", "builtAt": "2026-..", "preflight": "green",
  "tracks": [{ "track": "internal", "date": "..", "rollout": 100 }], "notes": "M0" }
```
- Code `1` (the 2026-08-01 upload, owner-reported) is seeded as entry 0, so monotonicity holds from the start.
- The ledger is never edited retroactively. Promotions append a `tracks[]` item.
- **Public repo:** the SHA-256 and versionCode aren't secrets, so the ledger can live in the repo.

### 3.3 Preflight (`scripts/release/preflight.mjs --track internal|closed|production --aab <path>`)
| # | Check | Tracks |
|---|---|---|
| 1 | Git tree clean; HEAD equals the commit to be tagged | all (production: tag exists) |
| 2 | versionCode > ledger max (new upload) **or** AAB SHA-256 equals the ledger entry being promoted | internal: new; closed/production: promote = same SHA |
| 3 | `versionName` is semver with no prerelease | all |
| 4 | No Google test AdMob IDs (`ca-app-pub-3940256099942544`) in the AAB manifest or `assets/public` bundle | closed, production (internal allowed with `--allow-test-ads`) |
| 5 | RevenueCat key matches `^goog_` (not empty; not the Test Store key) | closed, production |
| 6 | `npm run brand:check`; production adds `--release` (fails while `BRAND.status = 'working-title'`, D-19) | all / production |
| 7 | `npm run store:check` + `storeCopy` tests (P11) | closed, production |
| 8 | Merged manifest (`bundletool dump manifest`) permissions equal `release/manifest-permissions.allow`; **any new permission fails**, including `FOREGROUND_SERVICE_*`, `RECEIVE_BOOT_COMPLETED` or `SCHEDULE_EXACT_ALARM` (D-15) | all |
| 9 | Manifest `targetSdkVersion` = 36, `minSdkVersion` = 24 | all |
| 10 | `npm audit --omit=dev --audit-level=critical` exits 0 | all |
| 11 | `CHANGELOG.md` has a section for the version; release-notes block ≤500 characters | closed, production |

- **Output:** a Markdown report, with a summary line stored in the ledger.
- **Manual checks per runbook:** 16 KB page alignment and Play Billing ≥ 8, re-verified each release [LC§7 D2]. Today both are compliant (16 KB alignment, billing 8.3.0) [AUD§B.2].
- **bundletool** is a pinned jar, downloaded with checksum verification and **not committed**.
- **Allowlist seed:** the shipped AAB's set [ESA], plus `VIBRATE` (D-11).

### 3.4 CI and build flow
| Job | Trigger | Steps | Secrets |
|---|---|---|---|
| `web` (exists) | push/PR | Node **20 → 24** (local is 24.18 [AUD§B.2]; 20 is EOL); `npm install` → **`npm ci`** once the P0 step 1 lockfile lands; tsc, test, build; `brand:check`, `store:check` | none |
| `android-debug` (new) | push/PR | `actions/setup-java` **temurin 21** (the commented sketch says 17, but the toolchain is 21); `android-actions/setup-android`; `gradle/actions/setup-gradle` cache; `npm ci && npm run build && npx cap sync android`; `./gradlew assembleDebug`; `printVersion` cross-check. `google-services.json` is optional because `build.gradle` already skips the plugin when it is absent [REPO]. | none |
| `android-release-verify` (new) | tag `v*` | `./gradlew bundleRelease` **unsigned** (no `keystore.properties` → unsigned by design [REPO] `build.gradle:3-12`), then preflight on it (checks 3–11). **No artifact upload.** | none |
| `play-internal` (optional, 👤 later) | manual `workflow_dispatch`, `environment: release` with the owner as required reviewer | Decode the keystore and `google-services.json` from secrets → signed `bundleRelease` → preflight → upload to the Play **internal** track with a pinned-SHA upload action and a service-account JSON → append to the ledger in a PR. **No artifact retained.** | keystore, passwords, alias, `google-services.json`, Play service account |

- **Signed builds for M0–launch** run locally with `npm run release:build`: build → sign → preflight → print the SHA-256 → ledger PR. The owner uploads manually in Console.
- **Reason:** on a public repo, Actions artifacts can be downloaded by any signed-in user [LC§7 advises against public AABs].

### 3.5 Tags, GitHub Releases, same-AAB promotion
- **Annotated tags** on the exact build commit: M0 `v1.0.0-rc.2` · M1 `v1.0.0-beta.1` · M2 `v1.0.0-rc.3` · launch `v1.0.0` (EXECUTION-ORDER). Hotfixes `v1.0.x`, features `v1.x.0`. A tag of an uploaded build is **never** deleted or moved.
  - **Caveat:** in semver, `beta.1` sorts *below* `rc.2`, so `git tag --sort=v:refname` and GitHub show M1 before M0. versionCode is unaffected, because it comes from the BUILD number. This plan keeps the EXECUTION-ORDER labels and flags the ordering for the owner. A monotonic alternative is M0 `rc.2`, M1 `rc.3`, M2 `rc.4`.
- **GitHub Release** per tag: `gh release create <tag> --notes-file <CHANGELOG section> [--prerelease]`, generated by `scripts/release/notes.mjs`. **No binaries.**
- **Promotion:** in Console, Internal → *Promote release* → Closed → *Promote release* → Production. The production preflight requires the SHA to match the closed-track ledger entry.
- During the 14-day closed test, builds may iterate (new BUILD numbers through internal → closed). Production takes the closed build with ≥72 h of soak. D-20's "same AAB" applies **per release**.

### 3.6 Staged rollout, vitals and alerting
- **Rollout:** 20% → (≥48–72 h) → 50% → (≥72 h) → 100%. The gates and halt criteria are in STORE-LAUNCH-PLAN §16.
  - **Halt** = Console *Halt rollout*. There is no binary rollback: ship BUILD+1 or PATCH+1 → internal smoke (≥2 h) → production at the halted percentage.
  - After P6 ships, ads and offers have Remote Config kill switches.
- **Monitoring sources:**

  | Signal | Source | Cadence D0–D14 | Afterwards |
  |---|---|---|---|
  | User-perceived crash and ANR (overall, per model), slow cold start, wake locks | Play Console → Android vitals (email alerts on) | daily | weekly |
  | Crash-free users/sessions, new and regressed issues, velocity | Crashlytics (email alerts: new fatal, regressed, velocity) with custom keys `app_version_code`, `scene`, `level_id` | 3×/day on D0–D2, then daily | weekly |
  | Purchases, refunds, pending | RevenueCat charts | daily | weekly |
  | Impressions/DAU, policy center, app-ads.txt status | AdMob | daily | weekly |
  | Ratings and reviews (reply to all in month 1) | Console | daily | 2×/week |
  | Policy inbox | Console + email | daily | daily |

- **Low-volume caveat:** vitals need volume. Until Console shows data, Crashlytics crash-free sessions **≥ 99.5%** is the proxy gate.

### 3.7 Weekly review and optimisation loop
- **Cadence:** every Monday, 30 minutes, owner plus Claude. Logged in `docs/release/WEEKLY-REVIEW-LOG.md` (template below). Held every week for the first 12 weeks, then at least every 2 weeks.

  | Block | Metrics (source) | Target (MASTER-ROADMAP / SUCCESS-METRICS) |
  |---|---|---|
  | Health | Crash/ANR, crash-free sessions, top 3 issues (vitals, Crashlytics) | < 1.09% / < 0.47%; ≥ 99.5% |
  | Acquisition | Store visitors, installs, **listing conversion**, top search terms (Store performance) | ≥ 30% organic |
  | Retention | D1/D7/D30 cohorts (Firebase) | ≥ 30% / 10% / 4% |
  | Loop | FASR/APS for W1–3, relief usage, level-quit hot spots (analytics v2 once P6 ships; before that, level-complete events only) | Per P3/P4 targets |
  | Money | Rewarded opt-in, interstitials/DAU, payer conversion, ARPDAU, refunds (AdMob, RevenueCat) | ≥ 20%; ≤ 1.5; ≥ 1.5% |
  | Voice | Rating, review themes (tag by theme) | ≥ 4.5 |

- **Output:** 1–3 actions with an owner and a lever, copied into `docs/STATUS.md` "Next actions". Decisions with lasting effect go to DECISIONS.md.
- **The loop:** observe → hypothesis (one metric, one expected delta) → rank (FEATURE-MATRIX score) → lever → ship → evaluate → keep, revert or iterate.
  - **Levers:** (a) a Remote Config value (P6; no release); (b) a store listing experiment (P11-T15); (c) a data/content release; (d) a code release.
  - **Evaluate** after ≥7 days and a minimum sample (for example 1,000 sessions per arm), comparing cohorts by `app_version_code`.
  - **Rule:** one change per metric at a time.
- **Release train:** hotfixes any time. Minor releases every 2–4 weeks, each through internal (≥24 h, device smoke) → production staged 20 → 100%. The closed track is optional for minors and recommended for large changes.

### 3.8 iOS track (D-29)
- **Start criteria:**
  1. Android at 100% for ≥14 days;
  2. crash and ANR under thresholds in 2 consecutive weekly reviews;
  3. 0 open P0s;
  4. 👤 Mac access confirmed (an own Mac, a rented cloud Mac, or macOS CI runners).

  Once all four hold, flip D-29 to ACCEPTED.
- **Work:**
  - `npx cap add ios` with Xcode 26 / iOS 26 SDK; Capacitor plugins for iOS (AdMob, Firebase Analytics/Crashlytics, RevenueCat).
  - `GoogleService-Info.plist`; AdMob iOS app and units; `GADApplicationIdentifier`; **SKAdNetworkItems**.
  - UMP plus **ATT** (`NSUserTrackingUsageDescription`).
  - `PrivacyInfo.xcprivacy`; App Privacy labels mirroring the Data safety matrix.
  - RevenueCat iOS key and App Store non-consumables (same ids and entitlements as D-09); Restore Purchases (exists, `CosmeticsScene.ts:127-134`).
  - Haptics through `@capacitor/haptics`, behind a new `src/utils/haptics.ts` seam (today `navigator.vibrate` is called in `GameScene.ts`, and WKWebView has no `navigator.vibrate`).
  - Safe area, audio unlock and share-sheet checks; brand-sync writes `CFBundleDisplayName`.
  - Store assets: 1024² icon with no alpha, 6.9" screenshots, the new age-rating questionnaire, the support URL from P11, EU DSA trader status.
  - TestFlight internal → external → App Review (4.2 minimum functionality, 3.1.1) → **phased release** over 7 days.
- **Effort:** 6–10 developer days + 1–2 review cycles [LC§8].

## 4. Files/modules affected
| Action | Path | Purpose |
|---|---|---|
| Modify | `package.json` | `version` `1.0.0-rc.1` → `1.0.0`; add `androidBuild`; scripts `release:version`, `release:build`, `release:preflight`, `release:notes` |
| Modify | `android/app/build.gradle` | Derive `versionCode`/`versionName` from `package.json` (lines 21–22); `printVersion` task; `proguard-android-optimize.txt` if P0 step 0 hasn't switched it (D-20) |
| Create | `scripts/release/version.mjs` + `scripts/release/version.test.mjs` | Pure version math, bump, print |
| Create | `scripts/release/preflight.mjs` + `scripts/release/preflight.test.mjs` | Checks §3.3, with fixture manifests |
| Create | `scripts/release/build.mjs` | Local signed build → preflight → SHA-256 → ledger stub |
| Create | `scripts/release/notes.mjs` | CHANGELOG section → GitHub Release notes |
| Create | `release/manifest-permissions.allow` | Permission allowlist |
| Modify | `vite.config.ts` | `define` `__APP_VERSION__`/`__APP_BUILD__`; `test.include` adds `scripts/**/*.test.mjs` |
| Modify | `src/vite-env.d.ts` | Declare the defines |
| Modify | `src/scenes/SettingsScene.ts` | Version footer |
| Modify | `src/utils/Crash.ts` | Custom keys `app_version_code` (+ `scene`, `level_id` if P0 step 5 hasn't added them) |
| Modify | `.github/workflows/ci.yml` | Node 24, `npm ci`, `android-debug`, `android-release-verify`; optional `play-internal` (environment-protected) |
| Create | `docs/release/RUNBOOK.md` | Build, sign, JDK, version, preflight, upload, promote, rollout, halt, hotfix. Merges `docs/release-android.md`, `release-prep.md` and `RELEASE-v1.0.0.md` (archived by P0 step 0). |
| Create | `docs/release/ledger.json` | §3.2 |
| Create | `docs/release/WEEKLY-REVIEW-LOG.md` | §3.7 template + entries |
| Modify | `android/keystore.properties.example` | `keyAlias=gravityflow-upload` (line 19 says `upload`) |
| Modify | `CHANGELOG.md`, `docs/store/release-notes.md` | One section per tag; store notes by versionName |
| Modify | `docs/launch/STORE-LAUNCH-PLAN.md`, `docs/STATUS.md` | Status flips, gates |
| Create (iOS, T18+) | `ios/` (generated), `src/utils/haptics.ts`, `ios/App/App/PrivacyInfo.xcprivacy`, `ios/App/App/Info.plist` entries | iOS platform |
| Modify (iOS) | `src/scenes/GameScene.ts` (haptics through the seam), `capacitor.config.ts` (an `ios` block if needed), `scripts/brand-sync.mjs` (`CFBundleDisplayName`) | iOS deltas |

## 5. Data-model changes
- **Config:** `package.json.androidBuild` (number). The ledger entry schema (§3.2). The allowlist file format: one permission per line, `#` comments.
- **Build-time constants:** `__APP_VERSION__`, `__APP_BUILD__`.
- **Telemetry:** Crashlytics custom key `app_version_code`. Analytics user property `app_build` (aligned with the P6 taxonomy).
- **Player saves:** **no change.** The guardrail: `androidScheme`/`hostname` are untouched, so localStorage and Preferences survive every update (D-11, D-12).

## 6. UI changes
| Surface | Change | Spec |
|---|---|---|
| Settings footer | `v1.0.0 (1000001)` for support and bug reports | Exo 2, ≥12 px, contrast ≥4.5:1, non-interactive |
| Everything else | None. Store-facing creative belongs to P11. | — |
| iOS | System ATT prompt (after UMP); Restore Purchases already visible | Apple 3.1.1 |

## 7. Gameplay changes
None. P12 changes no gameplay. Post-launch tuning goes through the owning phase (P3/P4/P6/P7) under the optimisation loop, never as an ad-hoc release edit.

## 8. Test strategy
| Layer | Test | Gate |
|---|---|---|
| Unit | `version.test.mjs`: formula examples (1.0.0+1 = 1000001; 1.0.1+1 = 1000101; 1.1.0+1 = 1010001), range errors, bump resets | CI |
| Unit | `preflight.test.mjs`: fixtures for a test-ID manifest, an extra `FOREGROUND_SERVICE_DATA_SYNC`, a duplicate versionCode, a SHA mismatch on promotion, the working-title brand on production. Each must fail. | CI |
| CI | `android-debug` (`assembleDebug`) and the `printVersion` cross-check on every PR; `android-release-verify` on tags | CI blocking |
| Release | Preflight green for every upload, recorded in the ledger | Per upload |
| Device (Play-installed) | Install from the **internal track**, not sideloaded: billing works only on Play installs, and Play App Signing is in effect. Smoke list: STORE-LAUNCH-PLAN §11. | HUMAN DEVICE TEST |
| Upgrade | Install the previous track build, play, then update: progress, stars, cosmetics and settings persist (D-12) | HUMAN DEVICE TEST |
| Rollout | Gate checks at 20% and 50% (§3.6) | Owner + Claude |
| iOS | TestFlight smoke: ATT/UMP order, purchase/restore sandbox, haptics, audio unlock, safe areas | HUMAN DEVICE TEST |

## 9. Migration
- **Version file:** `package.json` `1.0.0-rc.1` → `1.0.0` + `androidBuild: 1`. The rc label moves to tags (D-20). CHANGELOG headings switch to `[1.0.0]`-style versions plus tag references.
- **versionCode:** hard-coded `1` → derived `1000001`. The ledger is seeded with code 1.
- **Testers:** anyone with a **sideloaded** upload-key or debug build must uninstall before installing from Play. The signatures differ (Play re-signs with the app-signing key), and uninstalling loses local saves unless Auto Backup restores them. Put this in the closed-test instructions.
- **Docs:** the three release docs merge into `docs/release/RUNBOOK.md`; the originals are archived (P0 step 0).

## 10. Rollback
| Situation | Action |
|---|---|
| Regression during staged rollout | **Halt rollout**, fix forward with a higher versionCode, resume at the halted percentage. Binaries cannot be downgraded. |
| Ads or offers misbehaving | Remote Config kill switch (once P6 ships); otherwise a hotfix |
| Listing or metadata rejection | Fix the copy or asset, resubmit; the binary is unaffected |
| CI job breaks | Revert the workflow commit; the local `release:build` path remains |
| Bad ledger entry | Append a correcting entry; never rewrite |
| iOS issue | Pause the phased release; expedited review for a fix; remove from sale only as a last resort |

## 11. Performance
- **AAB:** 12.0 MB today [AUD§B.2]. Preflight logs the size, and a jump of more than 10% needs a note in the ledger.
- **R8:** stays off (D-20). The DEX vital applies only to games above 50 MB of DEX [LC§0.3].
- **Watched in vitals:** slow cold start, excessive partial wake locks (5% threshold; `WAKE_LOCK` comes from WorkManager [ESA]), and per-device crash clusters, which matter for low-end WebViews.
- **Footer:** the Settings version footer is static text with no per-frame cost.

## 12. Platform
- **Android:**
  - targetSdk **36**, minSdk **24** (`android/variables.gradle`); compliant with 16 KB pages; Play Billing 8.3.0 [AUD§B.2].
  - Android 16 behaviours (predictive back, edge-to-edge, `appCategory="game"`) are delivered by P0 step 2 and re-checked on the release build.
  - Play App Signing; upload key `gravityflow-upload`, backed up ×2 (owner).
- **iOS:** Xcode 26 / iOS 26 SDK (required since 2026-04-28), ATT, SKAdNetwork, privacy manifests, StoreKit through RevenueCat, `@capacitor/haptics` (D-29).
- **Web:** unaffected. The Vercel build continues; its free-grant IAP stub remains a web-only concern (P0).

## 13. Documentation
| Doc | Content |
|---|---|
| `docs/release/RUNBOOK.md` | Single release runbook (§4) |
| `docs/release/ledger.json` | Every upload |
| `docs/release/WEEKLY-REVIEW-LOG.md` | Weekly entries |
| `CHANGELOG.md` | One section per tag (Keep-a-Changelog) |
| `docs/store/release-notes.md` | Store "What's new" per versionName (≤500 characters) |
| `docs/STATUS.md` | Gates: M0/M1/M2/launch, rollout %, next actions |
| `docs/launch/STORE-LAUNCH-PLAN.md` | Status column updates |
| `docs/roadmap/DECISIONS.md` | D-29 → ACCEPTED when iOS starts; any rollout policy change |

## 14. Validation criteria
| # | Criterion | Label |
|---|---|---|
| V1 | `node scripts/release/version.mjs code` = `./gradlew -q printVersion` = ledger entry, for every upload | VERIFIED |
| V2 | The preflight test suite passes, and every negative fixture fails | VERIFIED |
| V3 | The `android-debug` CI job is green on `master` | VERIFIED |
| V4 | The production AAB's SHA-256 equals the closed-track ledger entry | VERIFIED (ledger + `sha256sum`) |
| V5 | Merged manifest = allowlist; Console shows no foreground-service or other declaration task | VERIFIED (bundletool) + owner Console check |
| V6 | Tags `v1.0.0-rc.2` / `beta.1` / `rc.3` / `v1.0.0` exist with GitHub Releases and no binaries attached | VERIFIED (`gh release view`) |
| V7 | A Play-installed build passes purchase/restore/ads/consent smoke; the upgrade keeps saves | HUMAN DEVICE TEST |
| V8 | Rollout reached 100% with vitals below thresholds at each gate | VERIFIED (Console screenshots in the log) / INFERRED while vitals lack data (Crashlytics proxy) |
| V9 | 12 consecutive weekly reviews logged, each with 1–3 actions | VERIFIED (log) |
| V10 | iOS build approved; TestFlight smoke passed | HUMAN DEVICE TEST |

## 15. Exact completion definition
- **P12-A, Launch: complete when**
  1. `v1.0.0` (the promoted M2 AAB, SHA-matched) is at **100%** in production;
  2. it has stayed there **≥14 days** with crash < 1.09% and ANR < 0.47% (or the Crashlytics proxy ≥ 99.5% while vitals lack data);
  3. there was no unresolved halt;
  4. the GitHub Release `v1.0.0` exists;
  5. the ledger, CHANGELOG and STATUS are updated;
  6. every STORE-LAUNCH-PLAN §2 form shows complete.
- **P12-B, Optimisation loop: complete when**
  1. 12 consecutive weekly reviews are logged;
  2. at least 1 listing experiment (with P11-T15) and at least 1 data-driven release or Remote Config change have been evaluated and recorded;
  3. a minor release has shipped through the release train with preflight green.
- **P12-C, iOS: complete when**
  1. the App Store version is live after a phased release;
  2. App Privacy labels match Data safety;
  3. purchase/restore is verified on TestFlight;
  4. D-29 is updated.

  P12-C is tracked separately and does not block A or B.

## 16. Task breakdown
| ID | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P12-T01** | Single version file + Gradle derivation (verify or extend P0 step 0) | `package.json`, `android/app/build.gradle` | `version.test.mjs`; `printVersion` | `assembleRelease` prints versionCode 1000001 / versionName 1.0.0 |
| **P12-T02** | Version CLI + ledger seed | `scripts/release/version.mjs`, `docs/release/ledger.json` (entry 0 = code 1) | `version.test.mjs` | `bump build` → 1000002; refuses to go ≤ the ledger max |
| **P12-T03** | Preflight + permission allowlist | `scripts/release/preflight.mjs`, `preflight.test.mjs`, `release/manifest-permissions.allow` | Negative fixtures | V2; running it on the 2026-08-01 AAB flags the test IDs and the missing `VIBRATE` |
| **P12-T04** | CI modernisation + `android-debug` | `.github/workflows/ci.yml`, `vite.config.ts` (`test.include`) | CI run | V3 green on a PR |
| **P12-T05** | Tag verification job + local signed build | `ci.yml` (`android-release-verify`), `scripts/release/build.mjs`, `package.json` scripts | Dry run on a test tag in a fork or branch | Unsigned verify passes; the local build prints SHA-256 and writes a ledger stub |
| **P12-T06** | Runbook consolidation + alias fix | `docs/release/RUNBOOK.md`, `android/keystore.properties.example` | Doc review | Old release docs archived; alias = `gravityflow-upload` |
| **P12-T07** | Tags + GitHub Releases tooling | `scripts/release/notes.mjs`, `CHANGELOG.md` | Notes snapshot test | `v1.0.0-rc.2` released at M0, with no binaries |
| **P12-T08** | Settings version footer + Crashlytics version key | `src/scenes/SettingsScene.ts`, `src/utils/Crash.ts`, `vite.config.ts`, `src/vite-env.d.ts` | Boot smoke; unit test for the format string | Footer shows `v1.0.0 (1000001)`; the key is visible in a Crashlytics test crash |
| **P12-T09** | 👤 Production-access application pack | `docs/release/RUNBOOK.md` (answers draft from the closed-test feedback log) | — | Submitted on day ≥14 with ≥12 opted-in testers |
| **P12-T10** | Launch rehearsal on internal: promote flow, Managed publishing, halt/resume drill | Runbook | Drill log | Owner has done promote and halt once on internal |
| **P12-T11** | 👤 Alerting setup | Console notifications, Crashlytics alerts, AdMob/RevenueCat emails (documented in the runbook) | Test alert (Crashlytics test crash) | Alerts arrive at the owner's email |
| **P12-T12** | 👤 Production 20% (launch day, STORE-LAUNCH-PLAN §16) | Ledger, STATUS | Day-0 smoke on 2 Play-installed devices | 20% live; ledger appended |
| **P12-T13** | 👤 50% → 100% with gates | Ledger, weekly log | Gate checks | V8 |
| **P12-T14** | `v1.0.0` tag + GitHub Release + STATUS | `CHANGELOG.md`, ledger | V6 | Release published |
| **P12-T15** | Hotfix procedure validated | Runbook | First real or rehearsed hotfix (BUILD+1) | Hotfix path takes under 24 h end to end |
| **P12-T16** | Weekly review cadence | `docs/release/WEEKLY-REVIEW-LOG.md` | — | V9 after 12 weeks |
| **P12-T17** | Optimisation loop operating | Weekly log, STATUS, DECISIONS | Experiment and release evaluations | P12-B criteria met |
| **P12-T18** | 👤 iOS preflight: start criteria (§3.8), Mac access, App Store Connect record, AdMob iOS app, RevenueCat iOS app | DECISIONS (D-29), STATUS | — | D-29 ACCEPTED with a date |
| **P12-T19** | iOS platform + plugins + haptics seam | `ios/`, `src/utils/haptics.ts`, `src/scenes/GameScene.ts`, `capacitor.config.ts`, `scripts/brand-sync.mjs` | `tsc`/`vitest`; Xcode build | Simulator boot smoke passes |
| **P12-T20** | iOS compliance: ATT/UMP, SKAdNetwork, privacy manifest, App Privacy labels, age rating, assets | `Info.plist`, `PrivacyInfo.xcprivacy`, App Store Connect | TestFlight smoke | V10 TestFlight part |
| **P12-T21** | 👤 iOS review + phased release | App Store Connect | Review outcome | P12-C criteria met |
