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
- In `android/app/src/main/AndroidManifest.xml`, add the **AdMob app id** meta-data:
  ```xml
  <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
             android:value="ca-app-pub-XXXXXXXX~XXXXXXXX"/>
  ```
- In `src/config/monetization.config.ts`, replace the **AdMob test ids** with your
  real rewarded/interstitial ids and set `REVENUECAT.apiKey` (+ confirm
  `removeAdsProductId` / `premiumEntitlementId`). Then re-run `npm run build &&
  npx cap sync android`.
- Apply the Google-services Gradle plugin if `cap sync` didn't (Firebase): add
  `classpath 'com.google.gms:google-services:4.4.x'` (project `build.gradle`) and
  `apply plugin: 'com.google.gms.google-services'` (app `build.gradle`).

## 4. Sign + build the AAB
```
npx cap open android     # opens Android Studio
```
- Create a **keystore** (Build → Generate Signed Bundle/APK → Android App Bundle →
  Create new…). **Keep the keystore + passwords safe** — losing them means you can
  never update the app.
- Build a **signed release AAB** (Build → Generate Signed Bundle).

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
