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

Debug-geography builds for C1-C3 need `VITE_UMP_DEBUG_GEOGRAPHY` (`EEA` or `NOT_EEA`) and `VITE_UMP_TEST_DEVICE_IDS`; they
are never uploaded (the release guard refuses them).

## C: Consent (V13)

`adb logcat | grep "Setting consent"` shows the analytics consent lines.

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| C1 | Fresh install, `debugGeography: EEA` | The consent form appears before **any** ad request (no ad network calls in logcat beforehand). "Privacy choices" shows in Settings. | D-10 | | | |
| C2 | EEA, "Do not consent" / Manage, reject all | Game fully playable. If `canRequestAds` is false, ads stay uninitialised and offers are hidden. No hang. | D-10, D-24 | | | |
| C3 | `NOT_EEA` geography | No form. Privacy row hidden unless the status is REQUIRED. | D-10 | | | |

## A: Ads (V15)

| ID | Scenario | Expected | Ref | Result | Date | Notes |
|---|---|---|---|---|---|---|
| A1 | Campaign 2x with ad loaded | Offer visible; reward granted exactly once **after** dismissal; ad reloads | D-24 | | | |
| A2 | Rewarded, close early | No reward. UI back to normal within 1 s. No hang. | A.9 | | | |
| A3 | Rewarded with airplane mode / no fill | Offer hidden. If it was ready at render but fails at tap: "Ad unavailable" within 5 s (watchdog). | D-24 | | | |
| A4 | Double-tap any rewarded button | One show, one grant | A.11 | | | |
| A5 | Endless 2x and revive double-tap | One grant / one revive | A.11 | | | |

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
| T1 | REQUIRES HUMAN DEVICE TEST: on a phone, tap the **bottom-right corner** of PLAY (and of WORLDS and DAILY), one **Settings toggle** at its right and lower edge, one **Level Select cell** at its bottom-right corner, and one **shop card** at its bottom-right corner (its price tag); then **scroll the shop to the end of its list and tap each tab** (Skins, Trails, Arrivals, Bundles) once, and open **Settings** and **tap blank space inside the panel** (between two rows) and then the dimmed area outside the panel | Each tap lands: PLAY starts the level, the toggle flips, the cell opens its level, the card acts (buy sheet / equip / jump to its bundle). A tap just outside any of them (up and to the left of PLAY, in the gap between two buttons) does nothing. In the scrolled-to-the-end shop each tab switches to its own list and nothing is bought or equipped (the Stardust balance does not change), even where a card sat behind the tab bar. A tap on blank space inside the Settings panel does nothing and the overlay stays open; a tap outside the panel closes it. | P00-T17b | | | |

## Sign-off (M0)

- [ ] C1-C3 pass (V13)
- [ ] P1-P15 pass (V14)
- [ ] A1-A5 pass (V15)
- [ ] B, G and H rows pass on gesture and 3-button navigation (V16)
- [ ] S1, S3 and S4 pass (V17); S2 recorded (V19)
- [ ] R1 passes (V18)
- [ ] T1 passes (P00-T17b: hit areas match what the player sees)
- [ ] Results copied to the *Gates* table in [`docs/STATUS.md`](../STATUS.md)
