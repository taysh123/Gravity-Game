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
| Code version | `0.15.0` (`package.json`) · git tag **`v0.15.0`** |
| Android | `versionName 1.0.0` / `versionCode 1` · pkg `com.truestorylabs.gravityflow` · target SDK 36 / min 24 |
| Repo | `master` synced · https://github.com/taysh123/Gravity-Game |
| Privacy policy | https://taysh123.github.io/Gravity-Game/ (Pages → `docs/index.html`) |
| **Google Play readiness** | **~70%** overall (repo-side ~95%; remainder = your account + device work) |
| **App Store readiness** | **~10%** (no iOS platform/assets/account; macOS-blocked) |

---

## A. Launch Readiness Audit

### ✅ Complete (repo-side)
- **Game**: feature- & content-complete (150 levels, Star Map, Gravity Run, Daily, achievements, cosmetics,
  dual-currency economy). `tsc` + 103 tests + build green; web boot zero console errors.
- **Android**: Capacitor wrap, release **signing pipeline** (gitignored keystore, valid to 2051), branded
  adaptive launcher icon (all densities), Firebase `google-services.json` in place.
- **Monetization/telemetry wiring**: AdMob (rewarded + interstitial + **UMP consent**), RevenueCat
  (Remove-Ads/`premium`), Firebase **Analytics + Crashlytics** — all guarded seams (web-safe, activate on device).
- **Store**: icon-512 (32-bit), feature-1024×500, **8 screenshots** (1080×2160), concept alternatives — all
  present under `docs/store/assets/`. Listing + ASO + data-safety + content-rating drafts.
- **Privacy policy**: finalized + hosted source (`docs/index.html`); contact `truestorylabs@gmail.com`.
- **CI**: web typecheck/test/build on push (`.github/workflows/ci.yml`); Android job is a ready-to-enable sketch.

### 🟡 Stale → fixed in this pass (repo-side)
- **Store listing/ASO** rewritten 56→**150** levels, 8→**15** worlds, + Star Map + **Gravity Run** + leaderboard.
- **Release tracker / changelog / release notes / versioning display** brought to v0.15.0 / current state.
- **Screenshots flagged**: the 8 shots **predate the Star Map + 150-level expansion** → re-capture
  `06-world-map` (now the Star Map) + add a GRAVITY RUN shot via `scripts/capture_store_shots.py` before the
  *production* listing. (Internal/closed testing can ship with the current shots.)

### 🔴 Blocked on YOU + external accounts (cannot be automated here)
Play Console app + all App-content forms + billing products + tracks + uploads · real AdMob app/ad-unit ids +
UMP message · RevenueCat SDK key/product/entitlement · **rebuild + upload the signed AAB** (needs your local
Android SDK) · **device 1★ fairness + monetization smoke** · confirm GitHub Pages live.

### ⛔ Blocked (platform): App Store / iOS
No `ios/` platform exists; adding it needs **macOS + Xcode + Apple Developer ($99/yr)** — none available on this
(Windows) build machine. Documented below as a roadmap; not implementable here.

---

## B. Remaining blockers — ranked
| # | Blocker | Owner | Priority | Track |
|---|---|---|---|---|
| 1 | Store listing claimed 56/8 (now fixed) → **paste updated copy** into Play Console | You | P0 | Listing |
| 2 | **Rebuild the signed AAB** (current is stale: predates UMP + branded icon + all v0.15.0 content) | You | P0 | All |
| 3 | **Create Play Console app + App content** (privacy URL, data safety, rating, ads, target audience) | You | P0 | Internal |
| 4 | **GitHub Pages live** (`master`/`/docs`) so the privacy URL renders | You | P0 | Internal |
| 5 | Real **AdMob** app + 2 ad-unit ids + **UMP message**; **RevenueCat** key/product/entitlement; **Play billing** products | You | P1 | Closed |
| 6 | On-device **ad / IAP / Restore / Analytics DebugView / Crashlytics** smoke | You (device) | P1 | Closed |
| 7 | **Device 1★ fairness** + Endless/Star-Map feel pass | You (device) | P1 | Production |
| 8 | Final **data safety / pricing / countries**; promote → review | You | P2 | Production |
| 9 | **iOS**: add platform on macOS, Apple Developer, iOS assets, App Store Connect | You (macOS) | P3 | App Store |

---

## C/D. Readiness breakdown
**Google Play ~70%** = repo-side ~95% (code ✅, signing ✅, assets ✅, privacy ✅, copy ✅ now) **but** the
remaining 30% is **only doable by you**: Play Console setup, real ids, AAB rebuild+upload, device QA. Internal
Testing can begin the moment you do steps 2–4 (test AdMob ids are fine there).
**App Store ~10%** = the web/Capacitor codebase is iOS-portable, but nothing iOS-specific exists (no platform,
no App-Store-sized assets, no account). All net-new and macOS-gated.

---

## E. Roadmaps (exact next actions per actor)

### 1) Google Play — overall path
Internal Testing → Closed Testing → Production. Test AdMob ids are acceptable until Closed.

### 2) Internal Testing roadmap (start here — fastest path to a live build)
- **[You · local]** Rebuild AAB: `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`
  → verify `jarsigner -verify` shows `gravityflow-upload`. (Full runbook: `release-android.md`.)
- **[You · GitHub]** Settings → Pages → source `master` / `/docs`; confirm https://taysh123.github.io/Gravity-Game/ renders the policy.
- **[Play Console]** Create app (name, default language, Game, Free). **App content**: privacy URL, **Data
  safety** (from `store/listing.md`), **Content rating** (Everyone; ads + purchases), **Ads** = yes, **Target
  audience**, **Government/COVID** = no. **Main store listing**: paste title/short/full from `store/listing.md`;
  upload `store/assets/icon-512.png`, `feature-1024x500.png`, the 8 screenshots; set category Puzzle.
- **[Play Console]** Testing → **Internal testing** → create release → upload the AAB → add tester emails → roll out → share the opt-in link.
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
  (`device-playtest-checklist.md`); tune `parTimeMs`/hazard timings / `ENDLESS_*` if needed (data only, no new code).
- **[You]** Re-capture the **Star Map** + a **GRAVITY RUN** screenshot for the production listing.
- **[Play Console]** Finalize data safety / pricing (free) / countries → **promote to Production** → submit for review.

### 5) App Store / iOS roadmap (future, macOS-gated)
- **[You · macOS]** `npx cap add ios` → open in **Xcode**; set bundle id, signing team (Apple Developer $99/yr).
- **[You]** iOS assets (1024 icon, screenshots per device class), App Store privacy nutrition labels, ATT if ads
  track. RevenueCat/AdMob/Firebase have iOS SDKs — add the iOS app in each console.
- **[App Store Connect]** Create the app, paste listing copy (reuse `store/listing.md`), upload build via Xcode/Transporter → TestFlight → review.
- *Reuse:* the entire web/game codebase, the listing copy, the privacy policy. *New:* the iOS platform, assets, account.

---

## F. Exact next actions — quick table
| Actor | Next action |
|---|---|
| **Claude (me)** | Done this pass: refreshed all store copy + trackers + this audit + changelog + versioning. Next: on request, re-capture Star Map/Run screenshots (local Playwright), or wire real ids into config once you provide them. |
| **You** | (1) Rebuild AAB, (2) enable GitHub Pages, (3) create Play Console app + App content + listing, (4) upload to Internal testing. |
| **Play Console** | Create app · App content forms · store listing (paste copy + assets) · Internal testing release · later: billing products, Closed/Production. |
| **Firebase** | Done (`google-services.json`); verify DebugView/Crashlytics on device during Closed. |
| **AdMob** | Closed: real app + rewarded/interstitial ids + UMP message → into config + manifest. |
| **RevenueCat** | Closed: SDK key + Remove-Ads product + `premium` entitlement → into config. |
| **Apple Developer** | Future (macOS): account, add iOS platform, iOS assets, App Store Connect. |

---

## G. Phase 3 — Commercial Readiness Review (highest-ROI, no new systems)
The game is commercially solid; these are *launch-tuning* nudges, not new systems.
- **First session (strong):** L1 coach + Star Map onboard well; the hook ("bring the lost star home") is clear.
  *Nudge:* ensure the listing's first screenshot + short description lead with the verb (done in copy).
- **Retention (strong foundations):** Daily + streaks + Weekly Challenge + achievements already drive return.
  *Nudge:* nothing to build pre-launch; watch D1/D7 + streak-keep + weekly-board return in Analytics.
- **Monetization (ethical, ready):** rewarded-optional + Remove-Ads + cosmetic bundles; revives off the ranked
  board (no P2W). *Nudge:* confirm interstitial cap reads as non-intrusive on device; a first-purchase Supporter
  framing is the top post-launch lever (already documented in `growth-architecture.md`).
- **Replayability (strong):** 3★ mastery + ghost trails + Gravity Run (Endless + Weekly). *Nudge:* none pre-launch.
- **Long-term growth:** events/LTC/PGS/social seams documented in `growth-architecture.md` — build only when
  live metrics justify. **Do not add new systems before launch.**
- **#1 highest-ROI pre-launch item:** the **device fairness + feel playtest** (the only thing that can sink
  reviews) — it gates Production and needs you on a phone.

## Watch-outs
- ⚠️ **Rebuild the AAB** before any upload (stale).
- GitHub Pages must serve `master` → `/docs` or the privacy URL hits the game, not the policy.
- Serving `/docs` publishes all internal docs via Jekyll (no secrets — keystore + `google-services.json`
  gitignored); `docs/.nojekyll` added to skip Jekyll processing.
- Screenshots predate v0.15.0 — fine for internal/closed; re-capture for production.
- This is not legal advice — the privacy policy is standard for this app type; a formal review is optional but prudent.
