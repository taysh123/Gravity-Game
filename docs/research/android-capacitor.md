# Gravity Flow: Android + Capacitor platform decision log

Researched 2026-10-07 against the repo at `d3c6aab`. Tags: **[DOC]** official docs · **[SRC]** I read the source (Capacitor 8.4.0 in node_modules, plugin tarballs from npm, Chromium `main`, Phaser 3.90) · **[COM]** community · **[OPN]** my opinion.

## Fix first: bugs found in the repo

1. **Leaving the app during a timed level makes it fail when you come back.** **[SRC]** `GameScene.updateCountdown` computes `time - levelStartMs`, and `time` is `game.loop.time` (`performance.now()`). Phaser pauses the loop while the page is hidden, but on resume `TimeStep.resume()` just resets to `now`, so all the time spent in the background counts. The same happens while the Settings overlay is open, because `scene.pause()` doesn't stop `loop.time`. `Clock.now` mirrors loop time too. Fix: in `update()`, add each frame's `delta` to an `activeMs` counter and use that for the countdown, par chip and `winTimeMs`.
2. **Haptics do nothing on Android.** **[SRC]** Chromium's `VibrationManagerAndroid` checks for `VIBRATE` and, if it's missing, logs "requires VIBRATE permission" and ignores every call. Our manifest doesn't declare `VIBRATE`.
3. **Back does nothing useful in the app.** **[SRC]** `BridgeActivity` doesn't register an `OnBackPressedCallback`, and only `@capacitor/app` fires the `backbutton` event. On Android 12+, Back on the root activity sends the task to the background **[DOC]**, and bug 1 then fails the timed level. On Android 11 and lower, Back finishes the activity.
4. **Status bar can be invisible or show a white strip.** **[SRC]** SystemBars `style: DEFAULT` follows the system night mode. On a light-mode phone that gives dark icons on our dark game. SystemBars also paints the decor view with the theme's `windowBackground`, and our `AppTheme.NoActionBar` is DayNight, so that's white in light mode. That white shows in the bar areas wherever SystemBars pads the WebView (API 35+ with WebView < 140).

---

## Q1. Back button and predictive back
- **Sources:** [App API v8](https://capacitorjs.com/docs/apis/app); `AppPlugin.java` (@capacitor/app 8.1.2, Oct 2 2026) **[SRC]**; [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16); [Predictive back guide](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture); [Android 12 root-activity Back](https://developer.android.com/about/versions/12/behavior-changes-all).
- **Finding:** For apps targeting 36 on Android 16, predictive back is on by default. `onBackPressed` isn't called and `KEYCODE_BACK` isn't dispatched **[DOC]**. `@capacitor/app` already uses `getOnBackPressedDispatcher().addCallback(...)` (AndroidX `OnBackPressedCallback`), so it works with predictive back. **[SRC]**
  - With no JS listener, the plugin calls `webView.goBack()` if it can.
  - With a listener, it emits `backButton {canGoBack}` and swallows the event.
  - `toggleBackButtonHandler` calls `callback.setEnabled()`.
  - `exitApp()` calls `finish()`, which means a cold start next time. `minimizeApp()` calls `moveTaskToBack(true)`.
  - An enabled callback blocks the back-to-home animation preview **[DOC]**.
  - `android:enableOnBackInvokedCallback=false` only turns off the system animations. `OnBackPressedCallback` still works with it set **[DOC]**.
- **Recommend:** Install `@capacitor/app@8.1.2`. Register one `App.addListener('backButton', router)` in `main.ts`. The router goes top-down:
  1. Settings or modal overlay open → close it.
  2. `GameScene`/`EndlessScene` running → open the pause menu. If already paused → resume.
  3. Any sub-menu (LevelSelect, WorldMap, Achievements, Cosmetics, RunSelect, End) → go to MainMenu.
  4. MainMenu → call `App.toggleBackButtonHandler({enabled:false})` in `create()` and set it back to `true` on `shutdown`. The system then handles Back with the native back-to-home animation and a warm resume.

  Don't show a "confirm exit" dialog: progress auto-saves, and Android 12+ already keeps the app warm **[OPN]**. Don't call `exitApp()`. Leave `enableOnBackInvokedCallback` unset.
- **Risks:** Players drag the attractor near the screen edges, and an edge swipe there starts the back gesture. In-game that just opens the pause menu, which is annoying but harmless. If playtests show it happens a lot, add `setSystemGestureExclusionRects` on the WebView (max 200dp per edge) **[OPN]**.
- **Validate (physical Android 16 device, gesture nav):** back from each scene; back-to-home animation shows only on MainMenu; back during an interstitial ad; 3-button navigation.

## Q2. What keeps running in the background
- **Sources:** `Bridge.java`, `MockCordovaWebViewImpl.java` (8.4.0) **[SRC]**; Chromium `AwContents.java`, `browser_view_renderer.cc` **[SRC]**; Phaser `core/Game.js`, `VisibilityHandler.js` **[SRC]**; [Ionic forum, Mar 2026](https://forum.ionicframework.com/t/how-to-prevent-media-playback-video-audio-from-pausing-when-capacitor-app-is-backgrounded/250808) **[COM]**.
- **Finding:**
  - Capacitor never calls `webView.onPause()`/`pauseTimers()`. Cordova's `KeepRunning` preference defaults to `true`, so `handlePause(keepRunning)` skips `setPaused`. **[SRC]**
  - Chromium still marks the page hidden when the window isn't visible: `IsClientVisible = !paused && attached && window_visible`. So `visibilitychange` fires and rAF stops. **[SRC]**
  - Phaser's VisibilityHandler then calls `loop.pause()` **[SRC]**.
  - `setTimeout` keeps running, throttled.
  - Nothing suspends our own `AudioContext`, and `AudioSynth` has no `suspend()`. The comment in `main.ts` assumes the WebView suspends audio, but I found nothing in the source that does. Whether the oscillators keep playing while backgrounded is **unverified**; I think they probably do **[OPN]**.
  - App plugin events: `pause` = Activity `onPause`, which also fires for AdMob and RevenueCat activities, permission dialogs and multi-window. `appStateChange{isActive}` = `onResume`/`onStop`. **[SRC]**
- **Recommend:** One `onBackground()` / `onForeground()` pair, driven by `visibilitychange` on all platforms plus `App.addListener('pause')` on native.
  - `onBackground`: if gameplay is active (not won or dying), open the pause overlay. Call `AudioContext.suspend()` (add `AudioSynth.suspend()`) and stop the hum.
  - `onForeground`: `scale.refresh()`. Resume audio only if the Sound/Music settings allow it **and** no pause overlay is up. Never auto-resume gameplay; the player taps "Continue".
  - Also apply fix 1 above.
  - Don't open the pause overlay when the `pause` came from an ad or purchase flow. Gate it with an `Ads.showing` / `IAP.inFlight` flag **[OPN]**.
- **Validate (device):** Home mid-level → is audio silent? Return after 2 minutes → the timer must not fail the level. Same check for the Settings overlay. Also check the notification shade, a split-screen focus change and the recents screen.

## Q3. Edge-to-edge, insets and immersive mode
- **Sources:** [SystemBars v8](https://capacitorjs.com/docs/apis/system-bars); [7→8 migration](https://capacitorjs.com/docs/updating/8-0) (`adjustMarginsForEdgeToEdge` was removed); `SystemBars.java` **[SRC]**; [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16); [cutouts](https://developer.android.com/develop/ui/views/layout/display-cutout); [immersive](https://developer.android.com/develop/ui/views/layout/immersive); [Capacitor PR #8535](https://github.com/ionic-team/capacitor/pull/8535) (in 8.5.2).
- **Finding:**
  - Apps targeting 36 can't opt out of edge-to-edge on Android 16 **[DOC]**.
  - For targetSdk 35+, every cutout mode is treated as `ALWAYS` **[DOC]**.
  - SystemBars is a core plugin and loads automatically. With `insetsHandling:'css'`, WebView ≥ 140 and `viewport-fit=cover` (our `index.html` already has it), insets pass through to the page, so `env()` is correct and `--safe-area-inset-*` gets injected. **[SRC]**
  - Otherwise, on API 35+, SystemBars pads the WebView's parent and the page sees insets of 0, so nothing is hidden behind the bars. **[SRC]**
  - `hide()` doesn't set a bars behavior, so it isn't true "immersive sticky". **[SRC]**
- **Recommend:**
  - `plugins.SystemBars = { style: 'DARK', insetsHandling: 'css' }`. `'DARK'` gives light icons. **[SRC]**
  - Add `<item name="android:windowBackground">#0d0d1a</item>` (via a color resource) to `AppTheme.NoActionBar`.
  - In `a11y.ts`, read `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` **[DOC]**.
  - Keep the status bar visible; with a top HUD it's fine **[OPN]**. If you want immersive later, add 3 lines to `MainActivity`: `setSystemBarsBehavior(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)` + `hide(systemBars())`. The docs recommend that behavior for games **[DOC]**.
- **Validate (device):** API 35/36 with WebView ≥ 140 and an emulator with an older WebView; a hole-punch phone; light and dark mode; 3-button navigation.

## Q4. Orientation lock and large screens
- **Sources:** [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16); [Android 17: restrictions ignored](https://developer.android.com/about/versions/17/changes/ff-restrictions-ignored) (updated 2026-10-01); [`<application>` element](https://developer.android.com/guide/topics/manifest/application-element).
- **Finding:**
  - For apps targeting 36, `screenOrientation`, `resizeableActivity`, min/max aspect ratio and `setRequestedOrientation` are ignored on displays ≥ sw600dp. The `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` opt-out goes away at API 37.
  - **Exemptions:** games (`android:appCategory="game"`), a user opting in via the device's aspect-ratio settings, and screens < sw600dp **[DOC]**.
  - Play requires API 37 around Aug 2027 **[COM]**.
- **Recommend:** Put `android:appCategory="game"` on `<application>` and `android:screenOrientation="portrait"` on `MainActivity`. A manifest lock applies before the first frame, so the ScreenOrientation plugin isn't needed. Its runtime lock goes through `setRequestedOrientation`, which gets ignored on large screens for non-games anyway. The FIT scaler already handles unusual aspect ratios, which covers user overrides.
- **Validate:** a tablet or unfolded-foldable emulator (API 36) with and without `appCategory`; the aspect-ratio override in Settings.

## Q5. Haptics
- **Sources:** [WebView feature table](https://developer.chrome.com/docs/webview) ("Vibration API (requires android.permission.VIBRATE)"); Chromium `VibrationManagerAndroid.java` and `vibration_controller.cc` **[SRC]**; [@capacitor/haptics](https://capacitorjs.com/docs/apis/haptics), 8.0.2 manifest **[SRC]**.
- **Finding:**
  - In the WebView, `navigator.vibrate` needs the host app to hold `VIBRATE`. It also needs the page to be visible and to have had a tap (sticky user activation). It does nothing in silent ringer mode and has no amplitude control. **[SRC]**
  - `@capacitor/haptics` merges in `VIBRATE` itself and uses `VibrationEffect` waveforms with amplitudes, through `VibratorManager` on API 31+. **[SRC]**
  - `VIBRATE` is a normal permission: no runtime prompt and no Play declaration.
- **Recommend:** Now: add `<uses-permission android:name="android.permission.VIBRATE"/>` (1 line, fixes bug 2). Later, optionally `@capacitor/haptics` behind `haptics()` for a crisper `impact({style: Light})`, with `navigator.vibrate` kept for web. Cost: 1 dependency plus `cap sync`, ~20 LOC **[OPN]**.
- **Validate (device only):** win/death patterns; the Haptics toggle; silent mode.

## Q6. `minWebViewVersion`, `androidScheme` and old WebViews
- **Sources:** [Config v8](https://capacitorjs.com/docs/config); `Bridge.java` / `CapConfig.java` **[SRC]**; Chrome support cutoffs: [Nougat stops at 119](https://9to5google.com/2023/11/27/google-chrome-calendar-older-android-version-support/), [Oreo/Pie stop at 138](https://9to5google.com/2025/06/26/google-chrome-android-versions-no-longer-supported-2025/) **[COM]**.
- **Finding:**
  - Default `minWebViewVersion` is 60, and the floor is 55. If the device's WebView is older, Capacitor loads `server.errorPath` if one is set; otherwise it only logs and still loads the app. **[SRC]**
  - Vite 5's default build target is `chrome87`/es2020 (`?.` and `??` need Chrome 80+), so WebView 60–86 gets a black screen.
  - Default `androidScheme` is `https`, giving the origin `https://localhost`.
  - Google publishes no public WebView version breakdown. WebView updates through Play, but Android 7 is stuck at 119 and Android 8/9 at 138.
- **Recommend:** Set `android.minWebViewVersion: 87` and set `build.target: 'es2020'` explicitly in `vite.config.ts` so the two stay matched. Add `server.errorPath: 'webview-update.html'`: a static ES5 page in `public/` with a `market://details?id=com.google.android.webview` link (Capacitor plugins aren't available on that page). **Never change `androidScheme` or `hostname`.** That changes the origin, and all localStorage progress is orphaned.
- **Validate:** emulator API 24 with the stock WebView, and API 28.

## Q7. Local notifications
- **Sources:** @capacitor/local-notifications 8.3.1 source and manifest **[SRC]**; [notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission); [exact alarms](https://developer.android.com/develop/background-work/services/alarms/schedule); [Play Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753).
- **Finding:**
  - The plugin merges in `POST_NOTIFICATIONS`, **`SCHEDULE_EXACT_ALARM`**, `RECEIVE_BOOT_COMPLETED` and `WAKE_LOCK`. **[SRC]**
  - `isExactNotification` **defaults to `true`**. On Android 12+, if exact alarms aren't allowed, `schedule()` **opens the "Alarms & reminders" settings screen**. Android 14+ denies exact alarms by default for new installs **[DOC]**.
  - `schedule()` also asks for `POST_NOTIFICATIONS` implicitly if it isn't granted yet. **[SRC]**
  - Google says non-time-critical reminders should use inexact `setAndAllowWhileIdle` **[DOC]**.
  - On API 33+, notifications are off by default. Ask in context, not at launch **[DOC]**.
  - Play: ads must not imitate notifications or system UI **[DOC]**. **[OPN]** Keep notification content to game features (daily challenge, streak), make it opt-in and cap it at 1 per day.
- **Recommend:**
  - Add `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove"/>`.
  - Pass `isExactNotification:false` and `allowWhileIdle:true` on every schedule.
  - Pre-prompt with our own glass dialog ("Remind me when the Daily is ready?") after the player's first Daily win or around the 3rd session. Call `requestPermissions()` only if they say yes, and `schedule()` only if granted.
  - Cancel and reschedule on every launch.
- **Validate (device API 33–36):** deny → no prompt loop; reboot → reminder still arrives; Doze timing.

## Q8. Sharing and deep links
- **Sources:** @capacitor/share 8.0.3 `SharePlugin.java` **[SRC]**; @capacitor/filesystem 8.1.4; our `res/xml/file_paths.xml`; [App Links verification](https://developer.android.com/training/app-links/verify-android-applinks); [Android Developers: assetlinks on GitHub Pages](https://medium.com/androiddevelopers/android-app-links-deploy-assetlinks-json-in-minutes-d7082dffcac) **[COM]**; probes run today.
- **Finding:**
  - Share only accepts `file://` paths and wraps them through `${applicationId}.fileprovider`. Text and URL get combined into `EXTRA_TEXT`. **[SRC]**
  - Our `file_paths.xml` already has `<cache-path>`. It also has a broad `<external-path path=".">` that we don't need.
  - The `assetlinks.json` file must be at the **host root**, served over HTTPS as `application/json` with no redirects **[DOC]**.
  - Our Pages site is a project site (`taysh123.github.io/Gravity-Game/`). `https://taysh123.github.io/.well-known/assetlinks.json` returns **404**, and the `taysh123.github.io` repo doesn't exist (checked today).
- **Recommend:**
  - **Share:** render the canvas to base64 → `Filesystem.writeFile({directory: Cache, path: 'share/run.png'})` → `Share.share({files:[uri], text, url})`. Keep the clipboard fallback for web. Remove the `external-path` entry.
  - **Links:** create the `taysh123.github.io` user-site repo with `.well-known/assetlinks.json` and `.nojekyll` (Jekyll skips dot-folders). The fingerprints must be the Play App Signing SHA-256 plus the upload key's.
  - Add an `autoVerify` intent filter for `https://taysh123.github.io/Gravity-Game/c/*`, and handle it with `App.addListener('appUrlOpen')`.
  - Make the web path itself a landing page (play on web / Get on Play) for people without the app.
- **Risks:** adding a custom domain later redirects the URLs and breaks verification. Re-verification can take up to 7 days on Android 15+ **[DOC]**.
- **Validate:** `adb shell pm verify-app-links --re-verify` then `pm get-app-links`; share to WhatsApp, Messages and Gmail.

## Q9. Play Games Services (leaderboards, achievements, cloud save)
- **Sources:** [PGS v2 sign-in](https://developer.android.com/games/pgs/android/android-signin); [Saved Games](https://developer.android.com/games/pgs/android/saved-games) (updated 2026-10-06); Google Maven metadata (play-services-games-v2 **22.1.0** is the latest, Sep 15 2026); npm and GitHub API data **[COM]**; [Capacitor custom native code](https://capacitorjs.com/docs/android/custom-code).
- **Finding:**
  - In v2, sign-in happens automatically at launch; manual `signIn()` is optional **[DOC]**.
  - Saved Games are still supported: 3 MB data, 800 KB cover image, with conflict APIs **[DOC]**.
  - Community plugins:

| Plugin | Status |
|---|---|
| `@openforge/capacitor-game-connect` 5.0.2 | Capacitor 5 peer dependency |
| `@osmanraifgunes/capacitor-game-connect` 8.1.0 | Cap 8, but `play-services-games-v2:+` (floating version), 1 star, last push Feb 2026 |
| `@modbender/capacitor-play-games` 0.5.0 | Full v2 surface, but created Sep 8 2026, 0 stars, 0.x, and its buildscript pins **AGP 9.3.1 / Kotlin 2.4.10** vs our AGP 8.13 / Gradle 8.14.3 — likely Gradle conflict **[OPN]** |
| `capacitor-play-games-services` | Capacitor 5 |
| `capacitor-google-game-services` | Capacitor 5 |

- **Recommend (cheapest robust path):** Write a **local in-app plugin** (`PlayGamesPlugin` in `android/app`, registered with `registerPlugin()` before `super.onCreate`). Pin `play-services-games-v2:22.1.0`, call `PlayGamesSdk.initialize` and add the `com.google.android.gms.games.APP_ID` meta-data. Methods: `isAuthenticated`, `signIn`, `submitScore`, `showLeaderboard`, `unlock`/`increment`, `showAchievements`, `loadSave`, `writeSave`.
  - Size: ~200–300 LOC Kotlin plus ~40 LOC TS. modbender's MIT code is a useful reference.
  - **Cloud save:** one snapshot `"progress"` with a pure, TDD-tested `mergeSave()`: max stars, min best time, union of gems and achievements. Soft currency needs a per-device ledger or last-write-wins.
  - Skip Firebase/Firestore (needs Auth plus a backend and rules) and Block Store (meant for small credentials, not save data) **[OPN]**.
  - Effort: ~2–4 dev-days plus Play Console setup (PGS project, OAuth consent, credentials with the upload and app-signing SHA-1s, testers) **[OPN]**.
- **Validate (device + Play internal track):** auto sign-in; submitting while offline; a 2-device save conflict.

## Q10. Save-data durability
- **Sources:** [Auto Backup](https://developer.android.com/guide/topics/data/autobackup); [`<application>` element](https://developer.android.com/guide/topics/manifest/application-element); Chromium `PathUtils.java` / `AwBrowserProcess.java` **[SRC]**; [Capacitor storage guide](https://capacitorjs.com/docs/guides/storage); @capacitor/preferences 8.0.1 **[SRC]**.
- **Finding:**
  - Auto Backup includes `getDir()` directories by default **[DOC]**. The WebView's data directory is `getDir("webview")`, i.e. `app_webview/`, which holds `Default/Local Storage/leveldb` **[SRC]**. So our localStorage is *probably* backed up today, along with everything else (Firebase/AdMob/RevenueCat preferences).
  - Limits: 25 MB, once per 24 h, only when idle on Wi-Fi **[DOC]**.
  - Capacitor calls web storage "transient" **[DOC]**. On Android the realistic ways to lose it are "Clear storage", an origin change and corruption **[OPN]**.
  - Preferences writes `CapacitorStorage.xml` using `apply()` **[SRC]**.
- **Recommend:**
  - **Mirror** saves to `@capacitor/preferences`. Hydrate before `BootScene` finishes, keep the sync in-memory caches and write through to both stores.
  - One-time migration: if Preferences is empty and localStorage has data, copy it over and set `save:migratedV1`.
  - Add `android:dataExtractionRules="@xml/data_extraction_rules"` (API 31+) **and** `android:fullBackupContent="@xml/backup_rules"` (API 24–30). In both, *include* only `sharedpref/CapacitorStorage.xml` and `root/app_webview/Default/Local Storage/`, which keeps third-party IDs from being cloned to other devices **[OPN]**.
- **Validate:** `adb shell bmgr backupnow com.truestorylabs.gravityflow` → uninstall → reinstall → confirm progress is back. Check the real path on a debug build with `run-as ... ls -R app_webview`.

## Q11. Security advisory and upgrades
- **Sources:** [GHSA-rvm3-566m-v7fv](https://github.com/advisories/GHSA-rvm3-566m-v7fv) (published Aug 31 2026, CVSS 9.3); [Capacitor releases](https://github.com/ionic-team/capacitor/releases); npm publish times; [AdMob v8.2.0](https://github.com/capacitor-community/admob/releases/tag/v8.2.0) / [v8.2.1](https://github.com/capacitor-community/admob/releases/tag/v8.2.1); [RevenueCat CHANGELOG](https://raw.githubusercontent.com/RevenueCat/purchases-capacitor/main/CHANGELOG.md); capacitor-firebase CHANGELOG.
- **Finding:**
  - **The advisory:** the internal `/_capacitor_http_interceptor_` proxy path wasn't covered by the navigation guard. It's served even when `CapacitorHttp` is off, so remote content can run at the app's origin with localStorage and plugin access. It needs a malicious link loaded in our WebView. We don't render any user links, so exploitability is low for us, but the severity is critical. Fixed in **8.4.3** and **8.5.1**; 8.5.0 is still vulnerable.
  - **Capacitor 8.5.x:** 8.5.0 only adds iOS UIScene support and TS 7 config loading. 8.5.2 (Sep 11) fixes SystemBars/safe-area issues (#8535). I found no Android breaking changes.
  - **AdMob 8.2.x:** 8.2.0 (Oct 5) **requires Capacitor ≥ 8.5**, makes load errors reject with string `code`s (we don't read codes), changes Android init to wait for the banner view (5 s timeout) and adds AGP 9 fixes. Android SDK stays on 25.4.x. 8.2.1 (Oct 6) adds a native-ads preview.
  - **RevenueCat 13.7.0:** hybrid-common 19.5.0 / Android SDK 10.24.0; nothing Android-breaking since 13.1.5.
  - **Firebase 8.4–8.5.2:** iOS and packaging fixes only.
- **Recommend:**
  ```
  npm i @capacitor/core@8.5.2 @capacitor/android@8.5.2 @capacitor/cli@8.5.2 @capacitor/app@8.1.2 \
        @capacitor-firebase/analytics@8.5.2 @capacitor-firebase/crashlytics@8.5.2 @revenuecat/purchases-capacitor@13.7.0
  npm run cap:sync
  ```
  Bump AdMob to 8.2.1 in a separate commit after a short soak, since it's 1 day old **[OPN]**. `cap sync` only regenerates `capacitor.build.gradle`, `capacitor.settings.gradle`, `assets/capacitor*.json`, `capacitor-cordova-android-plugins/` and `assets/public`. It doesn't touch the manifest, `MainActivity`, styles or `variables.gradle` **[SRC]**.
- **Validate:** `npx cap doctor`; release build; ads, purchases and Crashlytics smoke test.

## Q12. WebView renderer crashes and Android vitals
- **Sources:** [Managing WebView: termination handling](https://developer.android.com/develop/ui/views/layout/webapps/managing-webview); `BridgeWebViewClient.java` **[SRC]**; [Android vitals](https://developer.android.com/topic/performance/vitals) (updated 2026-10-06).
- **Finding:**
  - Capacitor passes `onRenderProcessGone` to each `WebViewListener` and returns `false` unless one of them handles it. Returning `false` **crashes the app**, and a WebView whose renderer died can't be reused **[DOC]** / **[SRC]**.
  - Bad-behavior thresholds:

| Metric | Overall | Per phone model |
|---|---|---|
| User-perceived crash rate | 1.09% | 8% |
| User-perceived ANR rate | 0.47% | 8% |
| Excessive partial wake locks | 5% | — |

  Play evaluates these as 28-day averages; going over can reduce visibility and add a warning to the store listing **[DOC]**.
- **Recommend:** In `MainActivity.onCreate`, after `super`, call `bridge.addWebViewListener(new WebViewListener(){ onRenderProcessGone(v,d){ log (Crashlytics non-fatal: add firebase-crashlytics to app deps); if (++sCount > 2) return false; recreate(); return true; } })`. `sCount` is a static counter to stop crash loops. Progress survives because it's persisted.
- **Validate:** `adb shell am crash` doesn't help here. Use the debug intent `chrome://crash` (open it with `webView.loadUrl` in a debug build) or kill the sandboxed renderer process with `adb shell kill`. Then watch vitals on the internal track.

---

## Manifest and config changes in one place
- `<application>`: `android:appCategory="game"`, `android:dataExtractionRules`, `android:fullBackupContent`. Add `xmlns:tools` to `<manifest>`.
- `MainActivity`: `android:screenOrientation="portrait"`.
- Add `VIBRATE`; remove `SCHEDULE_EXACT_ALARM` with `tools:node="remove"` once local notifications are added.
- `capacitor.config.ts`: `android.minWebViewVersion: 87`, `server.errorPath`, `plugins.SystemBars {style:'DARK', insetsHandling:'css'}`.
- `styles.xml`: dark `windowBackground` on `AppTheme.NoActionBar`.
