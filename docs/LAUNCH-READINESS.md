# GRAVITY FLOW — Launch Readiness Audit & Roadmap

> **The single launch command-center.** Per-track checklists: [`release-prep.md`](./release-prep.md).
> Hands-on signing/AAB steps: [`release-android.md`](./release-android.md). Store copy:
> [`store/listing.md`](./store/listing.md) · [`store/aso.md`](./store/aso.md) ·
> [`store/release-notes.md`](./store/release-notes.md). Project state: [`project-status.md`](./project-status.md).

## Snapshot
| | |
|---|---|
| Game / studio | GRAVITY FLOW — **True Story Labs** |
| Content | **150 levels · 15 worlds** · Star Map · Gravity Run (Endless + Weekly) · Daily · achievements · cosmetics |
| Post-RC waves | **Waves 1-4 on top of the RC** (all shipped): Wave 1 *Make it Alive* (feel/FX) · Wave 2 *Make it Addictive* (retention) · Wave 3 *Monetization Tuning* · Wave 4 *Launch Readiness Polish* (media refresh, this doc pass). Waves 1-3 + the Wave 4 plan are on `master`; Wave 4's implementation is on `feat/wave4-launch-media`, pending merge. |
| Code version | **`1.0.0-rc.1`** (`package.json`) · last stable tag `v0.15.0` · launch plan: [`RELEASE-v1.0.0.md`](./RELEASE-v1.0.0.md) |
| Quality | `tsc` clean · **210 tests** (was 103 pre-wave) · `npm run build` clean · Playwright boot zero console errors · no new dependency |
| Android | `versionName 1.0.0` / `versionCode 1` · pkg `com.truestorylabs.gravityflow` · target SDK 36 / min 24 |
| Repo | `master` synced · https://github.com/taysh123/Gravity-Game |
| Privacy policy | https://taysh123.github.io/Gravity-Game/ (Pages → `docs/index.html`) |
| Media package | **Refreshed 2026-07-02** (Wave 4): 8 Play screenshots @ 1080×2160 showcasing the Wave 1-3 juice + 2 new hero GIFs — `docs/media/README.md` |
| **Signed AAB** | 🚨 **STALE** — last built 2026-06-16, predates Waves 1-4. **Must be rebuilt** before any Play upload. |
| **Google Play readiness** | **~72%** overall (repo-side **~99%** — code/tests/media done, but the **AAB needs a rebuild**; remainder = your account + device work) |
| **App Store readiness** | **~10%** (no iOS platform/assets/account; macOS-blocked) |

---

## EXTERNAL-LAUNCH CHECKLIST — you own this (Claude does NOT attempt any of this)

One consolidated list of everything left before Play launch. Nothing below has been done by this pass —
it is **surfaced, not attempted**. Detailed step-by-step roadmaps for each item are in §E below.

- [ ] **[You · local] Rebuild the signed AAB** (now stale — must include Waves 1-4):
  ```
  npm run build && npx cap sync android && cd android && ./gradlew bundleRelease
  ```
  Set `JAVA_HOME` to the Android Studio JBR / JDK 21 first (Gradle 8.14 rejects JDK 25). Full runbook:
  [`docs/release-android.md`](./release-android.md).
- [ ] **[GitHub]** Confirm **Pages is live** (Settings → Pages → source `master` / `/docs`) and that
  https://taysh123.github.io/Gravity-Game/ renders the privacy policy (not the game).
- [ ] **[Play Console]** Create/finish the app · **App-content forms** (privacy URL, data safety, content
  rating, ads declaration, target audience) · paste the refreshed listing (`docs/store/listing.md`) +
  upload the refreshed 8 screenshots + icon/feature · **tracks** (Internal → Closed → Production) ·
  **billing products** (`remove_ads` + the 3 bundles: `starter_pack`, `premium_collection_pack`,
  `founders_pack`) · **upload the rebuilt AAB**.
- [ ] **[AdMob]** Real app + rewarded/interstitial ad-unit ids → `src/config/monetization.config.ts` +
  `android/app/src/main/AndroidManifest.xml`; configure the **UMP consent** message ("Privacy & messaging").
- [ ] **[RevenueCat]** Public SDK key + Remove-Ads product + `premium` entitlement →
  `src/config/monetization.config.ts`.
- [ ] **[Device]** The **1★ fairness playtest** (`docs/device-playtest-checklist.md`) + on-device
  ad/IAP/Restore/Analytics(DebugView)/Crashlytics smoke, **and** a device feel pass on the Wave 1-3
  additions (celebrations, streaks, daily reward, interstitial cadence, store nudge) at 60fps on a
  mid-range Android.
- [ ] **[Optional polish]** Fix the filed boss-title-card overflow/HUD-collision bug
  (`docs/media/README.md §E`) before the store shots are considered final — or accept the current
  routed-around media set (short-title levels substituted / frames cropped) as-is for launch.

---

## A. Launch Readiness Audit

### ✅ Complete (repo-side)
- **Game**: feature- & content-complete (150 levels, Star Map, Gravity Run, Daily, achievements, cosmetics,
  dual-currency economy) **plus four post-RC waves**: Wave 1 *Make it Alive* (living FX, tiered
  celebrations), Wave 2 *Make it Addictive* (win streaks, milestone/daily-reward retention, analytics
  funnel), Wave 3 *Monetization Tuning* (flow-safe interstitials, purchase-lifecycle + per-surface rewarded
  analytics, honest store discoverability), Wave 4 *Launch Readiness Polish* (this media refresh). `tsc` +
  **210 tests** (was 103) + build green; web boot zero console errors; perf ceiling held (no new physics
  bodies); reduced-motion honored throughout; no P2W; no new dependency.
- **Android**: Capacitor wrap, release **signing pipeline** (gitignored keystore, valid to 2051), branded
  adaptive launcher icon (all densities), Firebase `google-services.json` in place. 🚨 **Signed AAB is
  STALE** — last built 2026-06-16 (11.4 MB, `gravityflow-upload`, `jarsigner` verified), predating Waves
  1-4. **Must be rebuilt** before upload (see the EXTERNAL-LAUNCH CHECKLIST above).
- **Monetization/telemetry wiring**: AdMob (rewarded + interstitial + **UMP consent**), RevenueCat
  (Remove-Ads/`premium`), Firebase **Analytics + Crashlytics** — all guarded seams (web-safe, activate on
  device); Wave 3 layered flow-aware interstitial gating + per-surface rewarded analytics + purchase-
  lifecycle analytics on top, still guarded/native-seamed.
- **Store**: icon-512 (32-bit), feature-1024×500, **8 screenshots** (1080×2160, **refreshed 2026-07-02 —
  Wave 4 — to showcase the Wave 1-3 juice**: 3-star celebration escalation, daily-reward chest + streak
  protection, honest bundle/BEST VALUE framing), concept alternatives — all present under
  `docs/store/assets/`. Listing + ASO + data-safety + content-rating drafts.
- **Media & presentation**: full **Screenshot & Media Production Pass**, refreshed 2026-07-02 — multi-
  destination visual package in `docs/media/` (Play / App Store / GitHub / portfolio / LinkedIn) + 2
  new/refreshed hero GIFs (win-celebration escalation, living-world background) + 2 supporting GIFs;
  **portfolio-grade root `README.md`**. Reproducible: `scripts/capture_media.py` → `curate_media.mjs`.
  Strategy/captions: `docs/media/README.md`. **§E of that doc files (does not fix) a boss title-card
  overflow/HUD-collision bug** at 1080×2160 — routed around in the committed set; see Open Issues in
  `project-status.md`.
- **Privacy policy**: finalized + hosted source (`docs/index.html`); contact `truestorylabs@gmail.com`.
- **CI**: web typecheck/test/build on push (`.github/workflows/ci.yml`); Android job is a ready-to-enable sketch.

### 🟡 Stale → fixed in earlier passes (repo-side)
- **Store listing/ASO** rewritten 56→**150** levels, 8→**15** worlds, + Star Map + **Gravity Run** + leaderboard.
- **Release tracker / changelog / release notes / versioning display** brought to the current
  **`v1.0.0-rc.1`** state (milestone `v0.15.0`), now with the Wave 1-4 additions layered on top.
- **Screenshots — refreshed again (media pass 2026-07-02, Wave 4):** the 8 Play shots were **re-curated**
  to lead with the new Wave 1-3 juice (3-star celebration, daily reward, honest bundles) alongside the
  Star Map + 150-level content; a full multi-destination media package was re-produced (`docs/media/`).
  Production-ready, modulo the filed title-card bug noted above (routed around, not blocking).

### 🔴 Blocked on YOU + external accounts (cannot be automated here)
Play Console app + all App-content forms + billing products + tracks + uploads · real AdMob app/ad-unit ids +
UMP message · RevenueCat SDK key/product/entitlement · **rebuild + upload the signed AAB** (stale since
2026-06-16 — predates Waves 1-4) · **device 1★ fairness + monetization smoke + a Wave 1-3 feel pass** ·
confirm GitHub Pages live. See the consolidated **EXTERNAL-LAUNCH CHECKLIST** above.

### ⛔ Blocked (platform): App Store / iOS
No `ios/` platform exists; adding it needs **macOS + Xcode + Apple Developer ($99/yr)** — none available on this
(Windows) build machine. Documented below as a roadmap; not implementable here.

---

## B. Remaining blockers — ranked
| # | Blocker | Owner | Priority | Track |
|---|---|---|---|---|
| 1 | 🚨 **Rebuild the signed AAB** — stale since 2026-06-16, predates Waves 1-4 | You | P0 | All |
| 2 | Store listing/media now refreshed for Waves 1-3 → **paste updated copy + upload refreshed screenshots** into Play Console | You | P0 | Listing |
| 3 | **Create Play Console app + App content** (privacy URL, data safety, rating, ads, target audience) | You | P0 | Internal |
| 4 | **GitHub Pages live** (`master`/`/docs`) so the privacy URL renders | You | P0 | Internal |
| 5 | Real **AdMob** app + 2 ad-unit ids + **UMP message**; **RevenueCat** key/product/entitlement; **Play billing** products | You | P1 | Closed |
| 6 | On-device **ad / IAP / Restore / Analytics DebugView / Crashlytics** smoke | You (device) | P1 | Closed |
| 7 | **Device 1★ fairness** + Endless/Star-Map feel pass, **plus a Wave 1-3 feel pass** (celebrations, streaks, daily reward, interstitial cadence, store nudge) | You (device) | P1 | Production |
| 8 | Final **data safety / pricing / countries**; promote → review | You | P2 | Production |
| 9 | **Optional:** fix the filed boss-title-card overflow/HUD-collision bug (`docs/media/README.md §E`) before store shots are final | You (dev) | P3 | Polish |
| 10 | **iOS**: add platform on macOS, Apple Developer, iOS assets, App Store Connect | You (macOS) | P3 | App Store |

---

## C/D. Readiness breakdown
**Google Play ~72%** = repo-side ~99% (code ✅ incl. Waves 1-4, signing pipeline ✅, assets ✅ refreshed,
privacy ✅, copy ✅, 210 tests ✅) **but** the remaining ~28% is **only doable by you**: rebuild the now-
stale AAB, Play Console setup, real ids, upload, device QA (incl. a Wave 1-3 feel pass). Internal Testing
can begin the moment you rebuild the AAB and do the Play Console + Pages steps (test AdMob ids are fine
there).
**App Store ~10%** = the web/Capacitor codebase is iOS-portable, but nothing iOS-specific exists (no platform,
no App-Store-sized assets, no account). All net-new and macOS-gated.

---

## E. Roadmaps (exact next actions per actor)

### 1) Google Play — overall path
Internal Testing → Closed Testing → Production. Test AdMob ids are acceptable until Closed.

### 2) Internal Testing roadmap (start here — fastest path to a live build)
- **[You · local]** 🚨 **Rebuild the signed AAB first** — the last build (2026-06-16) predates Waves 1-4:
  `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`
  (set `JAVA_HOME` to the Android Studio JBR first — Gradle 8.14 rejects JDK 25). Full runbook: `release-android.md`.
- **[You · GitHub]** Settings → Pages → source `master` / `/docs`; confirm https://taysh123.github.io/Gravity-Game/ renders the policy.
- **[Play Console]** Create app (name, default language, Game, Free). **App content**: privacy URL, **Data
  safety** (from `store/listing.md`), **Content rating** (Everyone; ads + purchases), **Ads** = yes, **Target
  audience**, **Government/COVID** = no. **Main store listing**: paste title/short/full from `store/listing.md`;
  upload `store/assets/icon-512.png`, `feature-1024x500.png`, the **refreshed 8 screenshots** (Wave 4); set category Puzzle.
- **[Play Console]** Testing → **Internal testing** → create release → upload the rebuilt AAB → add tester emails → roll out → share the opt-in link.
- **[Firebase]** Already wired; optionally verify the app shows in the console after first device run.

### 3) Closed Testing roadmap (adds real monetization)
- **[AdMob]** Create app (pkg `com.truestorylabs.gravityflow`) + a **rewarded** + an **interstitial** ad unit →
  put the **app id** in `AndroidManifest.xml` meta-data and the two ad-unit ids in
  `src/config/monetization.config.ts`; configure the **"Privacy & messaging" UMP** consent message.
- **[RevenueCat]** Add the Android app → set the **public SDK key** in `monetization.config.ts`; create the
  **Remove-Ads** product + a **`premium`** entitlement.
- **[Play Console]** Create billing products: `remove_ads` + the 3 bundles from `BUNDLES`
  (`starter_pack`, `premium_collection_pack`, `founders_pack`).
- **[You · local]** Rebuild AAB with real ids → upload to **Closed testing**.
- **[You · device]** Smoke: rewarded grants reward · interstitial appears (≥3-min cap) & is suppressed after a
  Remove-Ads test purchase · **Restore** re-grants · events in **DebugView** · forced error in **Crashlytics**.
- **[You]** Satisfy Play's closed-test tester-count + duration window (new personal accounts).

### 4) Production roadmap
- **[You · device]** **1★ fairness playtest** of the campaign + Endless ramp / Star-Map feel
  (`device-playtest-checklist.md`); tune `parTimeMs`/hazard timings / `ENDLESS_*` if needed (data only, no
  new code). **Also new:** a device feel pass on the Wave 1-3 additions (celebrations, streaks, daily
  reward, interstitial cadence, store nudge) at 60fps on a mid-range Android.
- **Production screenshots — ✅ done, refreshed again 2026-07-02** (Wave 4 media pass; `docs/media/store/android/` + `docs/store/assets/screenshots/`).
- **[Optional]** Fix the filed boss-title-card overflow/HUD-collision bug (`docs/media/README.md §E`)
  before treating the store shots as final, or accept the current routed-around set.
- **[Play Console]** Finalize data safety / pricing (free) / countries → **promote to Production** → submit for review.

### 5) App Store / iOS roadmap (future, macOS-gated)
- **[You · macOS]** `npx cap add ios` → open in **Xcode**; set bundle id, signing team (Apple Developer $99/yr).
- **[You]** iOS assets (1024 icon, screenshots per device class), App Store privacy nutrition labels, ATT if ads
  track. RevenueCat/AdMob/Firebase have iOS SDKs — add the iOS app in each console.
- **[App Store Connect]** Create the app, paste listing copy (reuse `store/listing.md`), upload build via Xcode/Transporter → TestFlight → review.
- *Reuse:* the entire web/game codebase, the listing copy, the privacy policy. *New:* the iOS platform, assets, account.

---

## EXACT NEXT ACTIONS

Split by who/what each step needs. Detailed roadmaps with full commands are in §E above.

### Actions only Tay can perform (no extra account/device)
- 🚨 **Rebuild the signed AAB** — the last build (2026-06-16) predates Waves 1-4, so it must be rebuilt
  before upload (`npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`, with
  `JAVA_HOME` → Android Studio JBR since Gradle 8.14 rejects JDK 25). Runbook: `docs/release-android.md`.
- **Enable GitHub Pages** (Settings → Pages → source `master` / `/docs`) and confirm
  https://taysh123.github.io/Gravity-Game/ renders the policy.
- At public launch: bump `package.json` → `1.0.0`, commit, tag **`v1.0.0`**, create the GitHub Release
  (`RELEASE-v1.0.0.md`). **Do not tag `v1.0.0` before the device playtest passes.**

### Actions requiring an Android device
- **1★ fairness + Endless/Star-Map feel playtest** (`device-playtest-checklist.md`); tune
  `parTimeMs`/hazard timings/`ENDLESS_*` (data only, no new code) if needed. **Also new:** a feel pass on
  the Wave 1-3 additions (celebrations, streaks, daily reward, interstitial cadence, store nudge) at 60fps
  on a mid-range Android.
- (Closed) On-device smoke: rewarded grants reward · interstitial appears (≥3-min cap) & is suppressed
  after a Remove-Ads test purchase · **Restore** re-grants · Analytics **DebugView** events · forced
  **Crashlytics** error.

### Actions requiring Play Console
- Create the app (Game, Free). **App content**: privacy URL, Data safety, Content rating (Everyone; ads +
  purchases), Ads = yes, Target audience.
- **Main store listing**: paste copy from `store/listing.md`; upload `store/assets/icon-512.png`,
  `feature-1024x500.png`, the **refreshed 8 screenshots** (Wave 4, category Puzzle).
- **Internal testing** → upload the **rebuilt** AAB → testers → roll out. Later: billing products
  (`remove_ads` + the 3 bundles) → Closed → final data-safety/pricing/countries → **Production**.

### Actions requiring AdMob
- Create the app (pkg `com.truestorylabs.gravityflow`) + a **rewarded** + an **interstitial** ad unit →
  app id into `AndroidManifest.xml`, ad-unit ids into `src/config/monetization.config.ts`.
- Configure the **"Privacy & messaging" UMP** consent message (so the wired consent shows in the EEA).
  *(Test ids are fine until Closed testing.)*

### Actions requiring RevenueCat
- Add the Android app → set the **public SDK key** in `monetization.config.ts`; create the **Remove-Ads**
  product + a **`premium`** entitlement.

### Actions requiring Apple Developer / macOS (future)
- On macOS: `npx cap add ios` → Xcode (bundle id, signing team; Apple Developer $99/yr) → iOS assets
  (1024 icon, per-device screenshots), App Store privacy labels, ATT if ads track → add the iOS app in
  AdMob/RevenueCat/Firebase → App Store Connect → TestFlight → review. Reuse the web codebase + listing
  copy + privacy policy.

### Future optional improvements (post-launch; build only when live metrics justify)
- Real ambient soundtrack (beyond the pad) · Play Games Services leaderboards (interface ready) ·
  events / limited-time challenges / social seams (`growth-architecture.md`) · the retired "Expert" level
  packs on disk · a first-purchase Supporter framing.

### Quick-reference table
| Actor | Next action |
|---|---|
| **Claude (me)** | Done: shipped **Waves 1-4** (feel/FX, retention, monetization tuning, media refresh) on top of the RC; refreshed all store copy + trackers + audit + changelog + versioning; **re-ran the Screenshot & Media Production Pass** (Wave 4 — 8 refreshed Play shots + 2 new hero GIFs); reconciled all docs to `v1.0.0-rc.1` / 150-15 / **210 tests**; ran full QA (tsc / 210 tests / build green); filed (not fixed) the boss title-card overflow bug. Next: on request, wire real AdMob/RevenueCat ids into config once you provide them. |
| **You** | (1) **rebuild the now-stale signed AAB**, (2) enable GitHub Pages, (3) create Play Console app + App content + listing (refreshed copy + screenshots), (4) **upload the rebuilt AAB** to Internal testing, (5) device 1★ fairness playtest + a Wave 1-3 feel pass. |
| **Play Console** | Create app · App content forms · store listing (paste copy + assets) · Internal testing release · later: billing products, Closed/Production. |
| **Firebase** | Done (`google-services.json`); verify DebugView/Crashlytics on device during Closed. |
| **AdMob** | Closed: real app + rewarded/interstitial ids + UMP message → into config + manifest. |
| **RevenueCat** | Closed: SDK key + Remove-Ads product + `premium` entitlement → into config. |
| **Apple Developer** | Future (macOS): account, add iOS platform, iOS assets, App Store Connect. |

---

## G. Phase 3 — Commercial Readiness Review (highest-ROI, no new systems)
The game is commercially solid; these are *launch-tuning* nudges, not new systems. Waves 1-4 already
delivered most of the nudges this section used to flag as future work — see below.
- **First session (strong):** L1 coach + Star Map onboard well; the hook ("bring the lost star home") is
  clear; Wave 2 added a one-time first-win beat + early next-unlock nudge on top.
  *Nudge:* ensure the listing's first screenshot + short description lead with the verb (done in copy).
- **Retention (strong, now with active hooks):** Daily + streaks + Weekly Challenge + achievements already
  drove return pre-Wave; **Wave 2** added win-streak momentum (`×N BLAZE`), a daily login bonus with earned
  streak protection, and milestone/collection-complete celebrations on top.
  *Nudge:* nothing left to build pre-launch; watch D1/D7 + streak-keep + weekly-board return in Analytics
  (the funnel events are now live per Wave 2).
- **Monetization (ethical, ready, now tuned):** rewarded-optional + Remove-Ads + cosmetic bundles; revives
  off the ranked board (no P2W); **Wave 3** added flow-aware interstitial gating (never interrupts an active
  attempt, first-session grace), per-surface rewarded analytics, purchase-lifecycle analytics, and an honest
  win-overlay spend nudge + bundle value framing.
  *Nudge:* confirm the interstitial cadence reads as non-intrusive on device (part of the Wave 1-3 feel
  pass in the EXTERNAL-LAUNCH CHECKLIST); a first-purchase Supporter framing is the next post-launch lever
  (documented in `growth-architecture.md`).
- **Replayability (strong):** 3★ mastery + ghost trails + Gravity Run (Endless + Weekly); Wave 1's tiered
  celebration ladder makes every win read as more of an event. *Nudge:* none pre-launch.
- **Presentation/media (fresh):** Wave 4 re-curated the Play/media package to showcase the Wave 1-3 juice
  (celebration escalation, daily reward, honest bundles); a title-card overflow bug was filed but not fixed
  (game code frozen for the media wave) — optional pre-launch polish, see the checklist.
- **Long-term growth:** events/LTC/PGS/social seams documented in `growth-architecture.md` — build only when
  live metrics justify. **Do not add new systems before launch.**
- **#1 highest-ROI pre-launch item:** the **device fairness + feel playtest** (the only thing that can sink
  reviews), now scoped to also cover the Wave 1-3 additions — it gates Production and needs you on a phone.

## Watch-outs
- 🚨 **The signed AAB is STALE** (last built 2026-06-16, predates Waves 1-4) — **rebuild before any Play
  upload**; rebuild again only on real-id/version change thereafter. See the EXTERNAL-LAUNCH CHECKLIST above.
- GitHub Pages must serve `master` → `/docs` or the privacy URL hits the game, not the policy.
- Serving `/docs` publishes all internal docs via Jekyll (no secrets — keystore + `google-services.json`
  gitignored); `docs/.nojekyll` added to skip Jekyll processing.
- Screenshots **refreshed twice** — for the Star Map + 150-level build (media pass 2026-06-14), then again
  2026-07-02 (Wave 4) to lead with the Wave 1-3 juice — production-ready.
- **Filed, not fixed:** a long boss/signature title card overflows its pill and collides with the HUD icon
  cluster at 1080×2160 (`docs/media/README.md §E`); routed around in every committed asset this wave — no
  clipped frame ships. Candidate for a future gameplay/polish wave.
- This is not legal advice — the privacy policy is standard for this app type; a formal review is optional but prudent.
