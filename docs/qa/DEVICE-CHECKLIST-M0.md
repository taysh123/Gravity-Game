# Device Checklist: M0 (Truthful Build)

Owner device matrix for the M0 gate (validation items V13-V18 in
[`P00-foundation.md`](../roadmap/phases/P00-foundation.md) section 14). Run it on a **release-signed internal-track build**
with Play license testers and test ads. Every row is a **HUMAN DEVICE TEST**; nothing here can be proved by Vitest or the
boot smoke. This is a skeleton: the scenarios and expectations are fixed, the owner records the results. P00-T26 completes
the matrix; later phases append rows (P1: refresh rate and the `FORCE_SCALE` A/B protocol).

How to record: set **Result** to `PASS`, `FAIL` or `N/A`, put the date in **Date**, and put the build, a logcat line or a
bug id in **Notes**. Leave a row blank until it is run. A `FAIL` becomes a bug in `docs/STATUS.md` *Open bugs*.

## Run header

| Field | Value |
|---|---|
| Build (versionCode / tag) | |
| Device model and Android version | |
| Navigation mode (gesture / 3-button) | |
| Account (license tester) | |
| Tester and date | |

## C: Consent (V13)

Consent is requested by `bootServices` after the saves hydrate and never blocks the menu: UMP `requestConsentInfo`, then the form when the status is REQUIRED, then (once the player has answered) the player's real answer is read from the TCF purposes (`ConsentSignals.getTcf`), then the four analytics consent types are written (`FirebaseAnalytics.setConsent`), Crashlytics collection is enabled, and only then is the ad SDK initialised (`AdMob.initialize({ maxAdContentRating: 'ParentalGuidance' })`, never with a child-directed or under-age tag).

Why the purposes are read: after "Do not consent" UMP still answers `OBTAINED` + `canRequestAds: true` (Google serves limited ads), the same as after "Consent". Only `IABTCF_PurposeConsents` (`00000000000` vs `11111111111`) tells them apart, so the four analytics types follow it (purpose 1 gates all four; `ad_user_data` also needs 7; `ad_personalization` also needs 3 and 4).

**Debug-geography builds.** UMP only forces a region on a test device, so C1-C3 use debug APKs built with the region baked in. `VITE_UMP_DEBUG_GEOGRAPHY` is `EEA`, `US`, `OTHER` or `NOT_EEA` (deprecated); `VITE_UMP_TEST_DEVICE_IDS` is a comma-separated list of hashed device ids. They are read at build time, so rebuild `dist` for every region, and they are never uploaded (the release guard in P00-T20 refuses a release build that carries either). From the repo root, Git Bash:

```
# EEA debug APK (the consent form must appear)
VITE_UMP_DEBUG_GEOGRAPHY=EEA VITE_UMP_TEST_DEVICE_IDS=<hashed id> npm run build && npx cap sync android
cd android && ./gradlew -Dorg.gradle.java.home="$JAVA_HOME" assembleDebug && cd ..
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# US debug APK (no form): the same commands with VITE_UMP_DEBUG_GEOGRAPHY=US
```

PowerShell: `$env:VITE_UMP_DEBUG_GEOGRAPHY='EEA'; $env:VITE_UMP_TEST_DEVICE_IDS='<hashed id>'; npm run build`, then `Remove-Item Env:VITE_UMP_DEBUG_GEOGRAPHY, Env:VITE_UMP_TEST_DEVICE_IDS` so the next build is clean. Rebuild without them (`npm run build && npx cap sync android`) before any build you intend to upload. Reset between runs with `adb shell pm clear com.truestorylabs.gravityflow` (UMP remembers the answer, so a second launch shows no form).

**Test device id.** The hashed id is only needed if the form does not honour the geography on a physical phone. Per Google's UMP documentation the SDK then logs `Use new ConsentDebugSettings.Builder().addTestDeviceHashedId("<ID>")` (`adb logcat | grep -i addTestDeviceHashedId`); put that id in `VITE_UMP_TEST_DEVICE_IDS` and rebuild. The same ids are passed to `AdMob.initialize` as testing devices, and only in a debug-geography build. The Android 16 emulator honoured `EEA` and `US` with no id at all.

**The form.** With Google's sample AdMob app id (what `AndroidManifest.xml` has today) UMP serves Google's own "Publisher Test Ads" message, which is what the emulator run showed. For release the owner's AdMob app needs its own published GDPR message (AdMob > Privacy & messaging) and its real app id; that is an owner gate, see `docs/STATUS.md`.

**Logcat.** Enable Firebase's own logging once per device (the plugin and Firebase do not print the words `Setting consent`, so that grep matches nothing; verified on an Android 16 emulator), force-stop and relaunch, then:

```
adb shell setprop log.tag.FA VERBOSE
adb logcat | grep -E "Setting (storage|DMA) consent|Tcf preferences read|UserMessagingPlatform"
adb logcat | grep "To native (Capacitor plugin)"      # the app's own calls, in order
```

What the process-start lines say depends on WHICH launch you are reading, because Firebase persists every `setConsent` value and the persisted value beats the manifest (TECHNICAL-ARCHITECTURE 4.3). **First launch after a fresh install or `adb shell pm clear` ONLY:** `Setting storage consent(FE): source=MANIFEST,ad_storage=denied,analytics_storage=denied` and `Setting DMA consent(FE): source=MANIFEST,ad_user_data=denied` (the manifest defaults; nothing is persisted yet). **Every later launch (force-stop then start, a relaunch):** the manifest defaults are not used any more; the process-start lines are `source=API` with the values of the previous choice (`ad_storage`, `analytics_storage` and `ad_user_data` all `granted` after **Consent**, all `denied` after **Do not consent**), written before the new UMP answer re-applies them. A `source=MANIFEST` line on a relaunch is not the expected result: write the exact lines in Notes instead of marking a UMP or boot failure. Every C row below names the launch it reads. After UMP has answered, on any launch: `source=API` lines with `ad_storage`, `analytics_storage` and `ad_user_data` all `granted` or all `denied`, as the row says. The app's own call order is `AdMob.requestConsentInfo`, `AdMob.showConsentForm` (EEA only), `ConsentSignals.getTcf` (after an answered form), four `FirebaseAnalytics.setConsent`, `FirebaseCrashlytics.setEnabled`, and `AdMob.initialize` last and only when UMP allows ads.

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| C1 | EEA debug APK, fresh install (`adb shell pm clear com.truestorylabs.gravityflow`), tap **Consent**, then force-stop and relaunch once | **First launch (the fresh install):** process-start lines are `source=MANIFEST ...denied`. The menu appears at once; the consent form appears over it **before any ad request** (no `AdMob.initialize` and no ad-network traffic in logcat until the form is answered). No Pause overlay opens behind the form. After **Consent**: `IABTCF_PurposeConsents 11111111111`, four `setConsent` calls `GRANTED`, `FA: ... ad_storage=granted,analytics_storage=granted` and `ad_user_data=granted`, then `AdMob.initialize`. Settings shows **Privacy choices**, **Privacy policy**, **Reset analytics data**. **Relaunch (second launch):** the form is not shown again. The process-start lines are now `source=API` with `ad_storage=granted,analytics_storage=granted` and `ad_user_data=granted` (the persisted answer from the first launch, not the manifest), and after UMP answers (no form) the four `setConsent` calls re-apply `GRANTED` | D-10 | | | |
| C2 | EEA debug APK, fresh install, tap **Do not consent** (also try Manage options, confirm with nothing selected) | Read the first launch (process-start lines `source=MANIFEST ...denied`; a relaunch would show `source=API ...denied` from the persisted answer). Game fully playable, no hang. `IABTCF_PurposeConsents 00000000000`; UMP still answers `OBTAINED` + `canRequestAds: true`, so `AdMob.initialize` runs (limited, non-personalised ads: UMP's decision) **but all four `setConsent` calls are `DENIED`** and FA logs `analytics_storage=denied`, `ad_storage=denied`, `ad_user_data=denied`. `FirebaseCrashlytics.setEnabled` is still called (D-10.5, the STATUS legal-check gate). Privacy choices still shown. Also airplane mode on first launch: the form cannot load, all four are `DENIED`, **no** `AdMob.initialize`, the menu is still usable | D-10, D-24 | | | |
| C3 | US debug APK (`VITE_UMP_DEBUG_GEOGRAPHY=US`), fresh install | Read the first launch (process-start lines `source=MANIFEST ...denied`; a relaunch would show `source=API ...granted`). **No form** and no `showConsentForm` call. UMP answers `NOT_REQUIRED`, so all four `setConsent` calls are `GRANTED`, then `AdMob.initialize`. UMP reports `privacyOptionsRequirementStatus: REQUIRED` for the US state geography, so **Privacy choices is shown here too** (observed); it is hidden only where the requirement is `NOT_REQUIRED` | D-10 | | | |
| C4 | Settings > **Privacy policy** | Any launch (the logcat line is not about consent state). The system browser opens the hosted policy (`https://taysh123.github.io/Gravity-Game/`); Back returns to the game with Settings still open. (Verified on an Android 16 emulator: `ActivityTaskManager: START u0 {act=android.intent.action.VIEW dat=https://taysh123.github.io/... cmp=com.android.chrome/...}` from the game's uid, Chrome resumed.) | D-10 | | | |
| C5 | Settings > **Reset analytics data** (a two-tap confirm: the first tap reads "Tap again to reset", the second runs it; left alone for 4 s it disarms). Then, on the EEA build after **Consent**, Settings > **Privacy choices** > **Do not consent** | Reads the launch where you tapped, no relaunch: the lines that follow each tap, not the process-start lines. A toast "Analytics data reset" and `D/FA: Resetting analytics data (FE)` in logcat. After the withdrawal: `AdMob.showPrivacyOptionsForm`, a fresh `requestConsentInfo` (UMP still says `canRequestAds: true`), `ConsentSignals.getTcf` (purposes all `0`), four `setConsent` `DENIED`. No Pause overlay behind the form | D-10 | | | |

## A: Ads (V15)

Build with Google's test ad units (the defaults in `monetization.config.ts`) and accept consent first: an EEA debug APK after **Consent**, or a US debug APK (rows C1-C3 above). Ads start loading as soon as UMP allows ads; give a fresh launch about 10 s on Wi-Fi before the first offer. An offer is drawn only while a rewarded ad is loaded, so **no offer on screen means no ad was ready**, which is the correct behaviour (D-24). `adb logcat | grep -E "Ads|AdMob|onRewardedVideoAd|interstitialAd"` shows the plugin events (`...Loaded`, `...Showed`, `...Reward`, `...Dismissed`, `...FailedToShow`). The win overlay has no NEXT/RETRY row yet (D-08 is P3): it auto-advances about 2.8 s after the win, and the 2x offer is the only button, below the panel (A-22). The campaign interstitial additionally needs the session grace over (3 completed levels and 2 minutes) and 3 minutes since the last full-screen ad.

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| A1 | Campaign 2x with ad loaded: win a level, tap **2x Stardust** (below the panel), watch to the end, close the ad. Then keep playing until a normal (non-2x) win after the grace | The offer is visible below the panel. The button dims at once. Game audio is silent while the ad plays and comes back after (not if Sound and Music are off). The Stardust grant (+N, shown as "+N x2!") appears **after** the ad is dismissed, exactly once. **No interstitial** follows the 2x: the next level loads about 1 s later. The ad reloads (the next win offers 2x again). A later normal win past the grace shows **one** interstitial over the frozen win overlay and the next level starts only after it is dismissed, never at level start | D-24 | | | |
| A2 | Rewarded, close early (tap X before the reward) | No reward. No hang: the game moves on within 1 s of closing (campaign: straight to the next level, with no interstitial). Audio is back. The offer is gone for now (the used ad is being replaced) | A.9 | | | |
| A3 | Rewarded with airplane mode / no fill (set airplane mode before launch, and again after an ad was shown) | Offer hidden: the win overlay shows no 2x, the Endless run-over shows no REVIVE / 2x (SHARE is centred), the shop's Bundles tab has no Free Fragments card. If an offer was ready when drawn but the ad fails at the tap: "Ad unavailable" within 5 s (the watchdog), then the game moves on (win overlay: shown on the button for about 1 s; Endless and shop: a toast and the offer is removed) | D-24 | | | |
| A4 | Double-tap any rewarded button (win overlay 2x, Endless revive / 2x, shop Free Fragments) | One ad shows, one grant; the Home / system overlay never opens behind the ad (no Pause overlay when the ad closes) | A.11 | | | |
| A5 | Endless 2x and revive double-tap; also tap 2x immediately after REVIVE | One grant / one revive, one ad at a time. A stray tap while an ad is up never returns to the menu | A.11 | | | |

## P: Purchases (V14)

Play license testers; the account and the test cards are set in Play Console.

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| P1 | Each product with "Test card, always approves" | Entitlement active; derived cosmetics owned; a localized `priceString` was shown before purchase | D-09 | | | |
| P2 | Cancel the Play sheet | No toast, no shake, no grant | A.4 | | | |
| P3 | "Always declines" | Friendly error; no grant | A.4 | | | |
| P4 | "Slow test card, approves after a few minutes" | Pending chip; unlocks via the listener or the next foreground, without reinstall or restore | A.5 | | | |
| P5 | "Slow test card, declines after a few minutes" | Pending chip clears (Check status or TTL); no grant | A.5 | | | |
| P6 | Wait more than 3 min after a tester purchase | **Not** auto-refunded (proves Non-consumable + acknowledgement) | A.3 | | | |
| P7 | Try to buy an owned product | Play blocks it, or code 6 then automatic restore, shown as owned | A.4 | | | |
| P8 | Console "Refund + revoke" | Within about 24 h: entitlement gone, derived cosmetics removed, equip falls back, interstitials resume, Stardust unchanged | A.5 | | | |
| P9 | Uninstall/reinstall, same account | Record whether entitlements return automatically. After Restore, all 4 entitlements are back, including bundles. | A.5 | | | |
| P10 | Second device, same account | Restore, everything owned | A.5 | | | |
| P11 | Second Google account on the same device | The cached snapshot is reconciled to the active account at launch | A.1 | | | |
| P12 | Offline launch after purchase / offline buy | Still ad-free with cosmetics owned / "No connection" | A.12 | | | |
| P13 | Play Billing Lab country IN, then DE | Local currency price strings, no "$" | A.6 | | | |
| P14 | Background during purchase (3DS / bank app) | Purchase completes, not cancelled (`singleTop`) | D-09 | | | |
| P15 | Open the shop before offerings load | `...` and disabled buttons, then real prices | A.6 | | | |

Out of M0 scope and kept in [`docs/design/MONETIZATION.md`](../design/MONETIZATION.md) A.15: C4-C7, A6-A13, P16-P21.

## B: Back button and pause (V16)

Run each row twice: Android 16 **gesture** navigation and **3-button** navigation.

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| B1 | Back during a level | Pause overlay opens; the run does not exit the app | D-11 | | | |
| B2 | Back on the pause overlay and on Settings | The overlay closes; gameplay never auto-resumes | D-11 | | | |
| B3 | Back in Level Select, World Map, Achievements, Cosmetics, Gravity Run select, End screen | Returns to the parent screen | D-11 | | | |
| B4 | Back on a dead Gravity Run | Main menu | D-11 | | | |
| B5 | Back on the win overlay | Nothing happens; the auto-advance continues | D-11 | | | |
| B6 | Back on the main menu | The system performs the warm back-to-home exit with the system animation (predictive back); the app is not killed | D-11 | | | |
| B7 | Back gesture while dragging the attractor near a screen edge | May open the pause menu; record how often (gesture exclusion rects are held in reserve) | D-11 | | | |

## G: Lifecycle and audio (V16)

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| G1 | Home button mid-level, then return | Silent while away. On return the pause overlay is showing, the run did not advance, audio stays silent until CONTINUE; no auto-resume | D-11 | | | |
| G2 | Pull the notification shade mid-level | Pause or a clean resume; no stuck state | D-11 | | | |
| G3 | Split screen / resize mid-level | Layout refits; no stuck pause overlay | D-11 | | | |
| G4 | App in the background | Game audio and music are silent | D-11 | | | |
| G5 | Return from the background with Sound and Music off | Audio stays off | D-11 | | | |
| G6 | Incoming phone call mid-level (the call UI covers the game), answer or decline, return | Pause overlay showing on return; the run did not advance; audio silent until CONTINUE | D-11 | | | |
| G7 | Lock the screen mid-level, then unlock | Same as G1: pause overlay, no auto-resume, silent until CONTINUE | D-11 | | | |
| G8 | Rewarded ad or purchase sheet over a level or Gravity Run (needs P00-T16 / T19 to raise `setExternalFlowActive`) | The ad / sheet does not open the pause overlay; the flow completes and audio returns | D-11, D-24 | | | |

## H: Haptics (V16)

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| H1 | Haptics on, win and fail a level | Vibration on win and on fail (needs a prior user tap) | D-11 | | | |
| H2 | Haptics off in Settings | No vibration | D-11 | | | |
| H3 | Phone in silent mode | No vibration (platform behaviour, `navigator.vibrate`) | D-11 | | | |

## S: Saves and backup (V17)

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| S1 | Play to some progress (stars, Stardust, a setting changed), `adb shell bmgr backupnow com.truestorylabs.gravityflow`, uninstall, reinstall | Progress, stars, Stardust and settings are restored. Before uninstalling, `adb shell run-as com.truestorylabs.gravityflow ls -R app_webview shared_prefs` shows `app_webview/Default/Local Storage/leveldb` and `shared_prefs/CapacitorStorage.xml` (the two paths the backup rules include) | D-12 | | | |
| S2 | Cold start with existing progress, debug build, `chrome://inspect` console | Menu appears with no visible delay. `performance.getEntriesByName('boot:saves-wait')[0].duration` (boot time hydrate adds after the fonts) is at most 60 ms (V19); also note `saves:hydrate` (wall time from `main.ts`, overlaps Phaser start-up). Repeat on the lowest-end device available | D-12 | | | |
| S3 | WebView storage loss: with progress saved, clear only the WebView data (`adb shell am force-stop com.truestorylabs.gravityflow`, then `adb shell run-as com.truestorylabs.gravityflow rm -r app_webview`), then relaunch | Progress, stars and settings are back on the first frame of the menu (restored from `CapacitorStorage.xml`); a second relaunch is unchanged. Best-run ghost trails are NOT restored (`ghost:v1` is local-only by design) | D-12 | | | |
| S4 | Upgrade path: install the previous build (before P00-T13), play some progress, install this build over it, launch, then repeat S3 | After the upgrade nothing is lost; `run-as ... cat shared_prefs/CapacitorStorage.xml` lists the `gravity-flow:*` keys and `gravity-flow:save:migratedV1`; S3 then restores everything | D-12 | | | |

## R: Renderer and WebView

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| R1 | Debug build: kill the sandboxed renderer (`adb shell kill <pid>`) up to 3 times | The first 2 times the app recovers (V18); the 3rd falls through to a normal crash report | D-11 | | | |
| R2 | Emulator with a WebView older than 87 | The static update page appears with the Play WebView link | D-11 | | | |
| R3 | Settings, Privacy policy | The policy opens in the system browser | D-10 | | | |

## U: System bars

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| U1 | System in light mode | Status and navigation bars are legible over the dark game; content respects the insets | D-11 | | | |
| U2 | System in dark mode | Same as U1 | D-11 | | | |
| U3 | Cold start | The window background is dark, with no white flash before the first frame | D-11 | | | |

## T: Touch targets (P00-T17b)

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| T1 | REQUIRES HUMAN DEVICE TEST: on a phone, tap the **bottom-right corner** of PLAY (and of WORLDS and DAILY), one **Settings toggle** at its right and lower edge, one **Level Select cell** at its bottom-right corner, and one **shop card** at its bottom-right corner (its price tag); then **scroll the shop to the end of its list and tap each tab** (Skins, Trails, Arrivals, Bundles) once, and open **Settings** and **tap blank space inside the panel** (between two rows) and then the dimmed area outside the panel; then open the **Star Map** (it opens centred on your current world, so an earlier planet sits half hidden under the title): **tap the title area** where a planet is hidden, drag the map to its top and bottom ends and **tap the strip just above Back** at each end; do the same on the title of **Level Select** | Each tap lands: PLAY starts the level, the toggle flips, the cell opens its level, the card acts (buy sheet / equip / jump to its bundle). A tap just outside any of them (up and to the left of PLAY, in the gap between two buttons) does nothing. In the scrolled-to-the-end shop each tab switches to its own list and nothing is bought or equipped (the Stardust balance does not change), even where a card sat behind the tab bar. A tap on blank space inside the Settings panel does nothing and the overlay stays open; a tap outside the panel closes it. On the Star Map and Level Select a tap on the title or on the strip around Back opens nothing (no world warps in, no level starts), while a planet or level cell fully in view still opens. | P00-T17b | | | |

## Sign-off (M0)

- [ ] C1-C5 pass (V13: C1-C3; C4-C5 are the privacy entry points of P00-T18)
- [ ] P1-P15 pass (V14)
- [ ] A1-A5 pass (V15)
- [ ] B, G and H rows pass on gesture and 3-button navigation (V16)
- [ ] S1, S3 and S4 pass (V17); S2 recorded (V19)
- [ ] R1 passes (V18)
- [ ] T1 passes (P00-T17b: hit areas match what the player sees)
- [ ] Results copied to the *Gates* table in [`docs/STATUS.md`](../STATUS.md)
