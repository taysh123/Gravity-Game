# Android Release Runbook — GRAVITY FLOW

How to take the (already-wired) web build to a signed Android **AAB** on the Play
Console **internal-testing** track. The app code is done; everything below needs
your accounts + local Android toolchain (none of it can run on the build machine).

> The web app is wrapped with **Capacitor**. Native monetization/telemetry plugins
> (AdMob, RevenueCat, Firebase Analytics + Crashlytics) are already wired behind
> guarded seams (`src/utils/Ads.ts`, `IAP.ts`, `Analytics.ts`, `Crash.ts`) — they
> no-op on web and activate on device. You only need to supply ids/config + build.

## 0. One-time accounts & ids you must create
- **Play Console** developer account ($25 one-time).
- **AdMob** account → create the app + a **rewarded** and an **interstitial** ad
  unit → note the **app id** and both **ad-unit ids**.
- **RevenueCat** project → add the Android app → note the **public SDK key**;
  create a **Remove-Ads** product (matching the Play Console product id) and a
  **`premium`** entitlement attached to it.
- **Firebase** project → add an Android app with applicationId
  `com.truestorylabs.gravityflow` → download **`google-services.json`**. Enable
  **Analytics** and **Crashlytics**.

## 1. Install + reconcile the lockfile (you have disk; the build machine did not)
```
npm install        # installs Capacitor + AdMob + RevenueCat + Firebase plugins,
                   # and regenerates package-lock.json to include them
npm run build      # emit dist/
```

## 2. Add the Android platform (one-time)
```
npx cap add android      # scaffolds the android/ Gradle project (needs Android SDK)
npx cap sync android     # copies dist/ + the native plugins into the project
```

## 3. Wire the native config
- Put **`google-services.json`** in `android/app/`.
- 🚨 **REQUIRED or the app crashes on launch.** `cap add android` does NOT write the AdMob app id, but the
  Mobile Ads SDK's startup `ContentProvider` (`MobileAdsInitProvider`) demands it. In
  `android/app/src/main/AndroidManifest.xml`, **inside `<application>`**, add the **AdMob app id** meta-data
  (use Google's TEST id below to boot without an AdMob account; swap for your real id before production):
  ```xml
  <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
             android:value="ca-app-pub-3940256099942544~3347511713"/>
  ```
  **Symptom if missing:** `java.lang.IllegalStateException: ... Missing application ID` →
  `Unable to get provider com.google.android.gms.ads.MobileAdsInitProvider` → "keeps stopping" on launch.
  (This edit survives `npx cap sync android`; it's lost only if you delete + re-`cap add` android/.)
- In `src/config/monetization.config.ts`, replace the **AdMob test ids** with your
  real rewarded/interstitial ids and set `REVENUECAT.apiKey` (+ confirm
  `removeAdsProductId` / `premiumEntitlementId`). Then re-run `npm run build &&
  npx cap sync android`.
- Apply the Google-services Gradle plugin if `cap sync` didn't (Firebase): add
  `classpath 'com.google.gms:google-services:4.4.x'` (project `build.gradle`) and
  `apply plugin: 'com.google.gms.google-services'` (app `build.gradle`).

## 4. Sign + build the AAB
Release signing is wired into Gradle (`android/app/build.gradle`): it loads the
keystore from `android/keystore.properties` if that file exists, otherwise it
configures cleanly and emits an *unsigned* release (so fresh clones / CI never break).

1. **Generate an upload keystore** (you pick the passwords — **keep the `.jks` +
   passwords safe; losing them means you can never update the app**). From `android/`:
   ```
   keytool -genkeypair -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. **Create `android/keystore.properties`** — copy `android/keystore.properties.example`
   and fill in `storeFile` / `storePassword` / `keyAlias` / `keyPassword`. Both the
   `.jks` and `keystore.properties` are gitignored — never commit them.
3. **Build the signed AAB** — either:
   ```
   cd android; ./gradlew bundleRelease     # → android/app/build/outputs/bundle/release/app-release.aab
   ```
   or `npx cap open android` and **Build → Generate Signed Bundle/APK → Android App
   Bundle** (the dialog will reuse the same keystore).

## 5. Upload to internal testing
- Play Console → your app → **Testing → Internal testing** → create a release →
  upload the **AAB** → add testers → roll out.
- Complete the required forms: **content rating** (puzzle, no objectionable
  content), **data safety** (see `docs/store/listing.md` — Analytics + Crashlytics +
  AdMob collect device/usage identifiers, crash data; rewarded ads opt-in), and a
  hosted **privacy policy** URL.

## 6. Smoke-test on a device (the Phase-3 fairness playtest also happens here)
- App launches to the cosmic splash → menu; levels play; **1★ is reachable** on the
  Phase-3 hazard levels (rotating arms, lasers, route saws, capture-cost spikes).
- A **rewarded** ad (test id) grants its reward; an **interstitial** appears (≥3 min
  cap) and is **suppressed after** a Remove-Ads test purchase.
- A **Remove-Ads** test purchase flips premium; **Restore** re-grants it.
- Events appear in **Firebase DebugView**; a forced error appears in **Crashlytics**.

## Notes
- App id: `com.truestorylabs.gravityflow` (change in `capacitor.config.ts` +
  `cap sync` if needed).
- The CI workflow (`.github/workflows/ci.yml`) typechecks/tests/builds the **web**
  app on every push; the Android job is a commented sketch to enable once your
  keystore + `google-services.json` + ids are stored as repo secrets.
