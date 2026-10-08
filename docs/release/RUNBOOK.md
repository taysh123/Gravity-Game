# Release Runbook: Gravity Flow

How to build, sign, version, tag and release the Android app. This is the only release document; it merges the
retired `release-android.md`, `release-prep.md` and `RELEASE-v1.0.0.md` (kept in [`docs/archive/2026-10-07/`](../archive/2026-10-07/README.md)).

- **State is not kept here.** Which build is uploaded, which gates are open and what happens next are in
  [`docs/STATUS.md`](../STATUS.md). Record every uploaded versionCode in its *Gates* table.
- Decisions behind this file: D-20 (versioning), D-09/D-10/D-24 (billing, consent, ads), A-15 (tags) in
  [`docs/roadmap/DECISIONS.md`](../roadmap/DECISIONS.md). Amendments override entry bodies.
- Items marked *(P00-Tnn)* are not implemented yet; the task that lands them rewrites the matching section.
  P12 extends this runbook with preflight, ledger, halt and hotfix procedures.

The web app is wrapped with **Capacitor**. The native plugins (AdMob, RevenueCat, Firebase Analytics and Crashlytics) sit
behind guarded seams that do nothing on web and activate on device.

## 1. Fixed identifiers

| Item | Value |
|---|---|
| Package id (permanent) | `com.truestorylabs.gravityflow` |
| Upload key alias | `gravityflow-upload` |
| Privacy policy | https://taysh123.github.io/Gravity-Game/ (GitHub Pages, source `master` and `/docs`, served from `docs/index.html`) |
| Signing model | Play App Signing: Google holds the app-signing key; we hold the **upload** key |

Keep `docs/index.html` and `docs/.nojekyll` where they are: the privacy URL above is a live Play Console field.

## 2. One-time accounts and ids

- **Play Console** developer account.
- **AdMob**: the app, one rewarded and one interstitial ad unit. Note the **app id** and both **ad-unit ids**.
  Configure the UMP "Privacy & messaging" consent message so the form shows in the EEA.
- **RevenueCat**: the Android app and its **public SDK key** (`goog_...`). Products, entitlements and the current
  offering follow the D-09 table: entitlements `no_ads`, `pack_starter`, `pack_premium_collection`, `pack_founders`; Play
  products `remove_ads`, `starter_pack`, `premium_collection_pack`, `founders_pack`, all non-consumable. The product set is extended by amendment A-06 in [`docs/roadmap/DECISIONS.md`](../roadmap/DECISIONS.md) (`supporter_pack`, seasonal packs, cosmetic-only "twin" SKUs such as `starter_cosmetic`), with details in [`docs/design/MONETIZATION.md`](../design/MONETIZATION.md) Part A. See also [`docs/launch/EXTERNAL-SERVICES-AUDIT.md`](../launch/EXTERNAL-SERVICES-AUDIT.md).
- **Firebase**: an Android app for `com.truestorylabs.gravityflow`; download `google-services.json`. Enable Analytics and
  Crashlytics.

## 3. Toolchain and JDK

Needs Node, the Android SDK and **JDK 21** (Temurin 21 or the Android Studio bundled JBR). Gradle 8.14 (wrapper) does
**not** run on JDK 25, and a newer system default is common.

- Pass JDK 21 per invocation, through `JAVA_HOME` or `-Dorg.gradle.java.home` on the command line.
- **Never commit `org.gradle.java.home` in `android/gradle.properties`.** It is a machine-specific path; a tracked value
  breaks every other machine and CI. The check is `git grep -n "org.gradle.java.home=" -- android` returning nothing.

PowerShell:
```
$env:JAVA_HOME = '<path to a JDK 21 home>'
cd android; ./gradlew bundleRelease
```
Bash:
```
cd android && ./gradlew -Dorg.gradle.java.home="<path to a JDK 21 home>" bundleRelease
```

## 4. Versioning (D-20)

| Field | Rule |
|---|---|
| `versionName` | the semver in `package.json` (`MAJOR.MINOR.PATCH`) |
| `versionCode` | `MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD`; `BUILD` is `androidBuild` in `package.json` |
| Ranges | `MINOR`, `PATCH`, `BUILD` each 0-99, and the code at most 2_100_000_000 (Google Play's cap); the build fails outside them |
| Rc label | lives only in the git tag, never in `package.json` or the Android version |
| Source of truth | `package.json` only (`version` and `androidBuild`); `build.gradle` has no literal version numbers |

- **An AAB with versionCode 1 is already on Play, so the next upload must be at least 1000001** (version 1.0.0, build 1).
  Play rejects any code that is not strictly higher than one already uploaded.
- A code is never reused. A bad build is superseded by `androidBuild + 1`, not rebuilt under the same code.
- The same AAB is promoted Internal, then Closed, then Production. Rebuild only when something changes, and then bump
  `androidBuild`.
- The derivation is implemented twice and both must print the same number:
  `scripts/lib/versionCode.mjs` (used by `node scripts/version.mjs` and by `scripts/facts.mjs`) and `android/app/build.gradle`
  (reads `package.json` with `JsonSlurper`, fails the build out of range, task `printVersionCode`).
- **Commands.** Run them from the repository root; the Gradle one needs JDK 21 (section 3).

  | Command | Does |
  |---|---|
  | `node scripts/version.mjs --code` | prints the versionCode (1000001 for 1.0.0 build 1) |
  | `node scripts/version.mjs --name` | prints the versionName |
  | `node scripts/version.mjs --check` | exits 1 when `package.json` is not valid D-20 data: not a plain `MAJOR.MINOR.PATCH`, a part out of range, or a code outside 1000001 to 2_100_000_000 |
  | `node scripts/version.mjs --bump-build` | `androidBuild` + 1 in `package.json` (refuses past 99) |
  | `cd android && ./gradlew -q :app:printVersionCode` | prints the versionCode Gradle will build; compare with `--code` |

- **Before every upload:** run `--bump-build` (a code is never reused), commit `package.json`, check that `--code` and
  `printVersionCode` agree, then follow the release sequence in section 6 (which ends in `./gradlew bundleRelease`).
  Record the uploaded code in the *Gates* table of [`docs/STATUS.md`](../STATUS.md) and in its
  `last-uploaded-version-code` marker (section 8): `npm run release:check` refuses a code that is not above it.
- **New version:** edit `version` in `package.json` (and `package-lock.json`) and set `androidBuild` to 1.
  If `androidBuild` reaches 99, bump PATCH instead; the code keeps increasing.

### Git tags (A-15)

Tags are annotated, `vMAJOR.MINOR.PATCH` with an `-rc.N` suffix for candidates, and continue the existing rc series.

| Milestone | Tag | Cut when |
|---|---|---|
| M0 Truthful Build | `v1.0.0-rc.2` | P0 and P1 are done and the owner device checklist ([`docs/qa/`](../qa/DEVICE-CHECKLIST-M0.md)) is signed off |
| M1 Closed Beta | `v1.0.0-rc.3` | the closed-test build is uploaded |
| M2 Launch Candidate | `v1.0.0-rc.4` | the production candidate is locked |
| Launch | `v1.0.0` | once, at public go-live (see section 9) |

Candidates may be published as GitHub **pre-releases**. `v0.15.0` and `v1.0.0-rc.1` predate this scheme.

## 5. Build the web app and sync

```
npm ci                    # reproducible install from package-lock.json
npm run build             # tsc + vite build -> dist/
npx cap sync android      # copy dist/ and the plugin projects into android/
```
`npm run cap:sync` runs the build and the sync together. `npx cap add android` is a one-time scaffold; the `android/`
project is already committed.

## 6. Native configuration

- **`google-services.json`** goes in `android/app/` (gitignored). Without it the Google-services and Crashlytics plugins
  are skipped and Firebase does nothing.
- **AdMob app id is mandatory.** The Mobile Ads SDK's startup provider reads
  `com.google.android.gms.ads.APPLICATION_ID` from `<application>` in `AndroidManifest.xml`. If it is missing the app dies
  on launch (`IllegalStateException ... Missing application ID`, then `Unable to get provider
  com.google.android.gms.ads.MobileAdsInitProvider`). The manifest edit survives `npx cap sync android`. The value is the
  `${admobAppId}` manifest placeholder, set per build type in `android/app/build.gradle`: Google's **test** app id for
  `assembleDebug` (no property needed, so CI and a fresh clone build), and the real id for release, passed as
  `-PADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN` (or set `ADMOB_APP_ID` in your user-level
  `~/.gradle/gradle.properties`, never in the repo). The task `verifyReleaseAdmobAppId` runs before every release variant
  (`bundleRelease`, `assembleRelease`, `lintRelease`) and fails with "Release build refused: ..." when the property is
  missing, is not an AdMob app id, or is Google's test id.
- **Ids in code (the owner supplies them):** in `src/config/monetization.config.ts` paste the real AdMob app id and both
  ad-unit ids into `ADMOB_PROD` and the RevenueCat public Google Play SDK key (starts with `goog_`) into
  `REVENUECAT_API_KEY_PROD`. They are public client ids, safe to commit; they are empty until the owner pastes them, which
  is what keeps a release refused. Only `vite build --mode release` selects them; every other mode (dev, `npm run build`,
  CI) selects Google's test ids and an empty RevenueCat key (`ADMOB_TEST`). Never put a RevenueCat **Test Store** key
  (`test_...`) or a secret key (`sk_...`) in either slot.
- **What the guard refuses** (`scripts/release-check.mjs`, `npm run release:check`, and the same check inside
  `vite build --mode release`): any `ADMOB_PROD` id that is empty, malformed, Google's test publisher
  `ca-app-pub-3940256099942544`, or from a different publisher than the app id; a RevenueCat key that is not `goog_` plus
  a key body; `VITE_UMP_DEBUG_GEOGRAPHY` or `VITE_UMP_TEST_DEVICE_IDS` set (shell, `.env`, `.env.local`, `.env.release`);
  a `versionCode` that is not greater than the last uploaded one in `docs/STATUS.md`. The release Vite build also refuses a
  `NODE_ENV` other than `production`. After `cap sync`, `npm run release:check -- --assets` refuses a synced bundle that
  holds Google's test publisher or a baked-in debug override, which is what a debug bundle synced into a release AAB looks
  like. A release build also ignores the two UMP variables, so `initializeForTesting` cannot be on.

### The release sequence (P00-T20)

From the repository root, JDK 21 for the Gradle step (section 3). The first step is the owner's; every later step stops at
the first problem and lists all of them.

```
# 0. Owner: paste the ids into src/config/monetization.config.ts (ADMOB_PROD, REVENUECAT_API_KEY_PROD).
#    Unset VITE_UMP_DEBUG_GEOGRAPHY / VITE_UMP_TEST_DEVICE_IDS. If a code was uploaded since the last build,
#    node scripts/version.mjs --bump-build, and commit.
npm run release:check -- --admob-app-id ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN   # 1. config; the id must equal ADMOB_PROD.appId
npm run build:release                                                              # 2. tsc + vite build --mode release (re-runs the check)
npx cap sync android                                                               # 3. copy dist/ into android/
npm run release:check -- --assets                                                  # 4. the synced bundle has no test id / debug override
cd android
./gradlew -Dorg.gradle.java.home="<JDK 21 home>" bundleRelease -PADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN   # 5. signs when keystore.properties exists
```

`npm run build` and `npm run cap:sync` make **debug-id** bundles. Never sync one before a release: step 4 refuses it, and
step 3 must always follow step 2. Run `release:check` with no flags at any time to see what is still missing; it changes
nothing.

## 7. Sign and build the AAB

`android/app/build.gradle` loads `android/keystore.properties` when it exists. Without it the release build still
configures and emits an **unsigned** bundle, so fresh clones and CI never break.

1. **Create the upload keystore once** (you choose the passwords). The upload keystore (alias `gravityflow-upload`) **already exists and must never be regenerated**, because replacing it requires a Play Console upload-key reset; back it up instead (see `docs/roadmap/RISK-REGISTER.md`). Run from `android/` only if creating from scratch:
   ```
   keytool -genkeypair -v -keystore <keystore-file>.jks -keyalg RSA -keysize 2048 -validity 10000 -alias gravityflow-upload
   ```
2. **Create `android/keystore.properties`** from `android/keystore.properties.example` and fill `storeFile`, `storePassword`,
   `keyAlias` (`gravityflow-upload`) and `keyPassword`. `storeFile` is resolved relative to `android/app/`; an absolute path also
   works. The `.jks` and `keystore.properties` are gitignored; keep the keystore outside the repository.
   The example file may still say `upload`; the alias is `gravityflow-upload`.
3. **Never commit, paste or log** the keystore, its path or the passwords.
4. **Back up the keystore and its passwords** in two places (a password manager and one offline copy). Losing the upload
   key means a reset request through Play support. Backup is an owner gate in `docs/STATUS.md` (risk R-21).
5. **Build:** follow the release sequence in section 6 (`release:check`, `build:release`, `cap sync`, `release:check --assets`), then
   ```
   cd android; ./gradlew bundleRelease -PADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN     # JDK 21, see section 3
   ```
   Without the property the build fails with "Release build refused" before anything is signed.
   Output: `android/app/build/outputs/bundle/release/app-release.aab`. A debug APK is `./gradlew assembleDebug`.
   Android Studio's Generate Signed Bundle reuses the same keystore.
6. **Verify:** `jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab` prints
   "jar verified" with alias `gravityflow-upload`. A "certificate chain is invalid" warning is expected for a self-signed
   upload key; the signature is still valid and Play does not require a CA-chained certificate.

## 8. Upload and promote

1. Play Console, the app, **Testing, Internal testing**: create a release, upload the AAB, add testers, roll out.
2. Complete **App content**: privacy policy URL (section 1), content rating (puzzle; ads and digital purchases; no
   objectionable content), **Data safety**, ads declaration, target audience (13+, D-25), and the main store listing from
   `docs/store/listing.md` with assets from `docs/store/assets/`.
3. **Data safety** reflects the SDKs: Firebase Analytics (app activity and identifiers, analytics), Crashlytics (crash
   diagnostics, app functionality), AdMob (device and ad id, advertising; rewarded is opt-in, interstitials capped, shared
   with Google) and RevenueCat (purchase history). Progress, stars, times, cosmetics and settings stay on the device.
   The draft is `docs/store/data-safety.md` *(P00-T25)*. Not legal advice.
4. **Closed testing** adds the real AdMob and RevenueCat ids, the Play billing products and license testers. A new personal
   developer account may need 12 testers for 14 days before production access; the owner confirms whether that applies
   (STATUS gate).
5. **Production**: final Data safety, pricing and countries, staged rollout, submit for review.
6. Update `docs/STATUS.md` with the uploaded versionCode: the *Gates* table row **and** the machine-read marker
   `<!-- last-uploaded-version-code: N -->` under it. `npm run release:check` refuses any later release whose
   versionCode is not greater than N, and refuses too if the marker is missing.

CI (`.github/workflows/ci.yml`) runs on master and on phase branches. It has two jobs. **Web** runs Node 22 and: typechecks, runs the test suite (reporting JSON for the facts check), runs the facts block drift check against `docs/STATUS.md` and `README.md`, runs `scripts/version.mjs --check` to validate version data, and builds the production web bundle. **Android-debug** runs Temurin 21 and: syncs Capacitor, assembles an unsigned debug APK, and cross-checks the versionCode from `scripts/version.mjs` against `gradlew printVersionCode`. Both jobs use no secrets and produce no signed artifacts; release builds are made locally per this runbook.

## 9. Device smoke test and the GitHub Release

Run the owner device matrix in [`docs/qa/DEVICE-CHECKLIST-M0.md`](../qa/DEVICE-CHECKLIST-M0.md) on a release-signed
internal-track build with license testers. At minimum: the app launches to the menu; levels play; a rewarded ad grants its
reward exactly once; an interstitial appears only over the win overlay and not after a Remove Ads purchase; purchases and
Restore behave; events appear in Firebase DebugView; a forced error appears in Crashlytics.

**Go/no-go for `v1.0.0`.** Cut it only when all are true:
- the device checklists for the milestone are signed off (or the failing items are tuned and re-run);
- a signed AAB is built, uploaded and smoke-tested on a device;
- the Play Console App content and listing are complete and the production rollout is started.

**GitHub Release** (the `gh` CLI or the web UI):
1. `git tag -a v1.0.0 -m "Gravity Flow v1.0.0"` then `git push origin v1.0.0`.
2. `gh release create v1.0.0 --title "Gravity Flow v1.0.0: first public release" --notes-file <notes>`, or Releases, Draft a
   new release, choose the tag.
3. Notes: the player-facing text from `docs/store/release-notes.md` plus a short highlights list from `CHANGELOG.md`.
4. Leave "Set as pre-release" **unchecked** for `v1.0.0`; check it for any `-rc.N` tag. Attaching the AAB is optional.

## 10. Watch-outs

- GitHub Pages must serve `master` and `/docs`; otherwise `.../Gravity-Game/` serves the game instead of the policy.
- `docs/` is published as-is (`docs/.nojekyll`). Nothing secret may live there; the keystore, `keystore.properties` and
  `google-services.json` are gitignored.
- Do not tag `v1.0.0` before the go/no-go above is met.
