# Store Launch Plan: Google Play (iOS later)

> **Status:** plan of record, 2026-10-07 · baseline `master @ d3c6aab` · deliverable #13.
> **App:** working title "Gravity Flow" (the name is not final; renaming is owner-gated, D-19) · package `com.truestorylabs.gravityflow` (**permanent**: an AAB has already been uploaded to the owner's Play Console app) · studio True Story Labs · target audience 13+ (D-25).
> **Conforms to:** [`../roadmap/DECISIONS.md`](../roadmap/DECISIONS.md), especially D-09, D-10, D-16, D-17, D-19, D-20, D-24, D-25, D-27 and D-29. Execution order: [`../roadmap/EXECUTION-ORDER.md`](../roadmap/EXECUTION-ORDER.md), steps 5, 14, 19 and 23, plus the 👤 items. Phase plans: [`../roadmap/phases/P11-brand-aso.md`](../roadmap/phases/P11-brand-aso.md) and [`../roadmap/phases/P12-launch.md`](../roadmap/phases/P12-launch.md).
> **Not legal advice.** The trademark, GDPR, US-state and Israel items need a professional check (D-19).
> **Do not trust older docs.** `docs/store/listing.md`, `release-notes.md`, `assets/README.md`, `LAUNCH-READINESS.md` and `release-prep.md` (both now in `docs/archive/2026-10-07/`) are stale on the points listed in §0. Where they disagree with this file, this file wins.

**Legend**
- **Owner column:** **Owner** = you, working in Play Console, AdMob, RevenueCat, a registrar or Firebase. **Claude** = a change in this repo. **Both** = Claude prepares it, you submit it.
- **Status column:** **DONE** = verified in the repo today, or reported by you (marked *owner-reported*). **OPEN** = work remains. **UNKNOWN** = it lives in a dashboard, so the repo can't tell; check where the row says.
- **Source tags:**
  - **[LC§n]**: `docs/research/play-launch-compliance-aso.md` section n; its [S#] source list applies.
  - **[UX§7]**: `docs/research/ux-visual-motion.md` §7.
  - **[RT-Q6]**: `docs/research/retention-analytics-liveops.md` Q6.
  - **[MZ]**: `docs/research/monetization.md`.
  - **[ESA]**: `docs/launch/EXTERNAL-SERVICES-AUDIT.md`.
  - **[AUD§x]**: `docs/audit/2026-10-07/STATE-AUDIT.md`.
  - **[REPO]**: verified in the repo on 2026-10-07 (`path:line`).
  - **[PH]**: Play Help pages fetched 2026-10-07 (preview assets, answer/9866151; foreground services, answer/13392821).
  - **[AD]**: AdMob Play data-disclosure page, fetched 2026-10-07.

---

## 0. What changed compared with the old store docs

| # | Old doc says | Truth on 2026-10-07 | Source |
|---|---|---|---|
| 1 | The Data safety draft in `listing.md` is complete | It is missing approximate location, the app set ID, the Firebase installation ID, purchase history, the fraud-prevention and advertising purposes, and the "shared" flags. §2.7 replaces it. | [LC§2], [AUD§I.3] |
| 2 | "Weekly Challenge … for the leaderboard" | The leaderboard is local-only, so the claim is misleading metadata. Until Play Games boards ship, copy says "your best" (D-17). | [REPO] `docs/store/listing.md:33,37`, `release-notes.md:11`, `README.md:45` |
| 3 | Title `GRAVITY FLOW — Physics Puzzle` | ALL CAPS is allowed only when it is the brand. Use title case (§6.1). | [LC§5] |
| 4 | First release is "versionCode 1" | `versionCode 1` is already used by the uploaded AAB. The next upload must be **≥ 1000001** (D-20). | [REPO] `android/app/build.gradle:21-22`, [ESA] |
| 5 | "Captions in Play's editor" | Play has no caption editor. Captions must be baked into the image. | [AUD§I.2] |
| 6 | Screenshots are "ready" | They are 8 × 1080×2160 RGB images. That is valid for the listing but **not 9:16**, the first two frames fail the "verb first" rule, and #6 shows USD prices. Re-shoot them (§7). | [REPO] (sharp metadata), [AUD§I.2] |
| 7 | The developer website is `taysh123.github.io/Gravity-Game/` | AdMob ignores the URL path, so app-ads.txt must sit at a **domain root** (§9). | [LC§0.4] |

---

## 1. Account and app state

| # | Item | Exact action / answer | Owner | Status | Source |
|---|---|---|---|---|---|
| 1.1 | App exists in Play Console | Package `com.truestorylabs.gravityflow`, default language en-US, **Game**, **Free**. Free is effectively permanent. | Owner | DONE (owner-reported) | [ESA] |
| 1.2 | AAB already uploaded | That upload used versionCode 1, so every future upload is **≥ 1000001** and strictly increasing. Never reuse a code, even after a rejected upload. | Owner | DONE (owner-reported); repo still hard-codes `versionCode 1` → OPEN for Claude (P0 step 0, D-20) | [REPO] `build.gradle:21`, [LC§7] |
| 1.3 | Account type and creation date | Console → Developer account → Account details. A **personal account created after 2023-11-13** must run a closed test with **≥12 testers opted in for 14 continuous days** before Production unlocks. Confirm on the app **Dashboard**: if the requirement applies, it shows an "Apply for production" task. | Owner | **UNKNOWN**. Check first, because it sets the calendar. | [LC§1 A1, S1] |
| 1.4 | Identity verification and Android developer verification | Check the Console Home page for the account and package registration status. The two sources disagree on the date: the research cites a **2026-09-30** registration deadline [S2], which has already passed, while the audit says the global rollout is in 2027 [AUD§I.1]. Either way, confirm now that the app shows as registered. | Owner | **UNKNOWN (urgent)** | [LC§1 A2, S2] |
| 1.5 | Contact details | A developer contact email (required) and a verified phone. Recommended email: `truestorylabs@gmail.com`, the address already in the policy [REPO] `docs/store/privacy-policy.md:6`. | Owner | UNKNOWN | [LC§1 C1] |
| 1.6 | Managed publishing | Turn on **Publishing overview → Managed publishing**, so approved changes go live only when you press Publish. You control the launch-day timing. | Owner | OPEN | INDUSTRY |

## 2. App content: every form, with the exact answers

### 2.1 Privacy policy
| Field | Answer | Owner | Status | Source |
|---|---|---|---|---|
| Privacy policy URL | After §9 this is the website's `/privacy/` URL. Until then: `https://taysh123.github.io/Gravity-Game/` (live). It must be public, not geofenced, HTML rather than PDF, and titled "Privacy Policy". | Owner | URL live = DONE; content = **OPEN** (deltas P1–P10 in §10) | [AUD§B.1], [LC§4] |
| In-app link | Play requires a link **inside the app**. Settings gets a "Privacy policy" row plus "Privacy choices" whenever UMP reports REQUIRED (D-10). | Claude (P0 step 4) | **OPEN**. `src/` has no privacy link today; the only match is a comment at `src/utils/Ads.ts:66`. | [REPO], [LC§4 P1] |

### 2.2 App access
| Question | Answer | Status |
|---|---|---|
| Is any part restricted (login, membership, location)? | **"All functionality is available without special access."** There are no accounts, and purchases are not needed to review the app. | UNKNOWN (Console) [LC§1 B3] |

### 2.3 Ads
| Question | Answer | Status |
|---|---|---|
| Does your app contain ads? | **Yes.** AdMob rewarded and interstitial ads (D-24). The listing shows "Contains ads". | UNKNOWN (Console) [LC§1 B4] |

### 2.4 Content rating (IARC questionnaire)
Category: **Game**. Enter the contact email for the IARC certificate.

| IARC question group | Answer | Why |
|---|---|---|
| Violence (realistic, fantasy, blood, against characters) | **No** | An abstract orb "puffs" on contact with a hazard. There are no characters, no blood and no weapons (OPINION). |
| Fear / horror | **No** | Fail feedback is a red flash. |
| Sexuality / nudity | **No** | — |
| Language / profanity | **No** | — |
| Controlled substances (drugs, alcohol, tobacco) | **No** | — |
| Crude humour | **No** | — |
| Simulated gambling | **No** | — |
| Real-money gambling | **No** | — |
| Random items bought with real money (loot boxes) | **No** | Paid bundles grant **fixed** cosmetics ([REPO] `src/config/monetization.config.ts` `BUNDLES[].grants`). Login-chest and other random rewards use earned currency only (Claude re-verifies before submitting; D-23 keeps real money buying items, never currency). |
| Users can interact or exchange content in-app | **No** | No chat or UGC. The OS share sheet is not in-app interaction (OPINION). |
| Shares the user's location with other users | **No** | — |
| Digital purchases | **Yes** | Remove Ads and the cosmetic bundles. |
| Unrestricted internet / web browser | **No** | — |

**Expected result:** ESRB **E**, PEGI **3**, USK 0, IARC 3+, with the interactive element **"In-App Purchases"**. This is consistent with D-25 ("Everyone" rating, 13+ audience). **Status:** UNKNOWN (Console). **Owner:** you submit; Claude verifies the loot-box answer. **Source:** [LC§1 B5].

### 2.5 Target audience and content (D-25)
| Question | Answer | Status |
|---|---|---|
| Target age groups | **13–15, 16–17, 18 and over.** Do **not** tick any under-13 band; that would put the app into the Families policy. | UNKNOWN (Console) |
| Could the app unintentionally appeal to children? | Answer honestly that it is not designed for children. Keep the marketing non-childish: no mascot and no "for kids" tone [LC§3]. | — |
| Repo side | `AdMob.initialize({ maxAdContentRating: 'PG' })`, no global child-directed tags (D-10, D-25). A Play Age Signals plugin is planned before **2027-01-01** (CA AB 1043). | Claude, OPEN (P0 step 4) |

### 2.6 Other required declarations
| Form | Answer | Status |
|---|---|---|
| News app | **No** | UNKNOWN |
| Government app | **No** | UNKNOWN |
| Financial features | **"My app doesn't provide any financial features"** | UNKNOWN |
| Health | **"My app does not have any health features"** | UNKNOWN |

All four are required even when the answer is "no" [LC§1 B7].

### 2.7 Data safety
**Basis.** "Collected" means the data leaves the device. A transfer to a service provider acting for you is not "shared". GMA collects **and shares** its data [LC§2], [AD]. Ephemeral processing: answer **No** for every type (the conservative answer). Re-check the SDK disclosure pages before every SDK bump; Firebase's page was updated 2026-10-06 and AdMob's 2026-10-02.

**Per SDK (what each one sends):**

| SDK (version in the shipped AAB) | Data it sends | Shared? | Purposes |
|---|---|---|---|
| Google Mobile Ads 24.9.0 + UMP 4.0.0 | IP (used for approximate location), user product interactions, diagnostics (launch time, hang rate, energy), Android ad ID, app set ID, account-related identifiers | **Yes** | Advertising or marketing · Analytics · Fraud prevention, security and compliance [AD] |
| Firebase Analytics 23.0.0 | Coarse location from a masked IP, app interactions (screens, sessions, events), app-instance ID, ad ID, purchase events (product id, name, price) | No (service provider) | Analytics |
| Firebase Crashlytics 20.0.3 + Installations | Stack traces, diagnostics and device metadata, Firebase installation ID (FID) | No | App functionality · Analytics |
| RevenueCat (purchases 10.8.0) | Purchase history, anonymous app-user ID | No | App functionality · Analytics |
| On-device stores (progress, stars, ghosts, currencies, cosmetics, settings) | Stays on the device; not declared | — | — |

**Form answers by data type:**

| Play data type | Collected | Shared | Required / optional | Purposes to tick |
|---|---|---|---|---|
| Location › **Approximate location** | Yes | **Yes** | Required | Advertising or marketing, Analytics, Fraud prevention |
| App activity › **App interactions** | Yes | **Yes** | Required | Analytics, Advertising or marketing, Fraud prevention |
| App info & performance › **Crash logs** | Yes | No | Required | App functionality, Analytics |
| App info & performance › **Diagnostics** | Yes | **Yes** | Required | App functionality, Analytics, Advertising or marketing, Fraud prevention |
| **Device or other IDs** | Yes | **Yes** | Required | Advertising or marketing, Analytics, Fraud prevention, App functionality |
| Financial info › **Purchase history** | Yes | No | Required | App functionality, Analytics |
| Everything else (personal info, precise location, messages, photos/videos, audio, files, calendar, contacts, health, web history, installed apps) | **No** | — | — | — |

Mark the data "Required", not "Optional", even though EEA users can refuse consent: users outside consent regions cannot turn the collection off.

**Remaining questions:**
- **Encrypted in transit:** **Yes** (TLS) [LC§2], [AD].
- **Account creation:** **"My app does not allow users to create an account."**
- **Deletion requests:** **Yes**, via email. It only counts if it is real: delete the RevenueCat customer, run the GA User Deletion API by app-instance ID, offer an in-app **"Reset analytics data"** (D-10), and point users to the ad-ID reset.
- **Independent security review:** **No.**

**Owner:** Both. Claude keeps `docs/store/data-safety.md` (P0 step 5) matching this table; you submit it. **Status:** OPEN. The draft is incomplete [AUD§I.3].

### 2.8 Advertising ID
| Question | Answer | Status |
|---|---|---|
| Does your app use an advertising ID? | **Yes.** `play-services-ads` merges `com.google.android.gms.permission.AD_ID` (present in the shipped AAB). | UNKNOWN (Console) |
| Purposes | **Advertising or marketing · Analytics · Fraud prevention, security and compliance** | — |

Sources: [ESA] merged-manifest list, [LC§1 B9]. This form has never appeared in the old docs [AUD§I.3 #5].

### 2.9 Permissions and foreground-service check
| Item | Finding | Action | Owner | Status |
|---|---|---|---|---|
| Merged permissions in the shipped AAB | `INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, BIND_JOB_SERVICE, FOREGROUND_SERVICE, DUMP, BILLING, AD_ID, ACCESS_ADSERVICES_AD_ID/ATTRIBUTION/TOPICS`. **`VIBRATE` is absent.** | Add `VIBRATE` (D-11, P0 step 2) | Claude | OPEN |
| `FOREGROUND_SERVICE` (untyped, transitive, probably WorkManager via Firebase/GMA) | Play's declaration covers **foreground-service *types*** for apps targeting Android 14+. The plain permission is not listed as a trigger [PH answer/13392821]. No `FOREGROUND_SERVICE_<TYPE>` permission is merged. | (1) Run `bundletool dump manifest` on every release AAB and diff it against the allowlist (P12-T03). (2) If Console → App content shows a "Foreground service permissions" task, either remove the permission with `tools:node="remove"` (only after confirming that no plugin calls `setForeground`/`startForeground`) or declare it accurately. | Both | **UNKNOWN**: check App content after the next upload |
| Photo/video, SMS/call log, location, exact alarm, all-files access | Not requested | N/A. `SCHEDULE_EXACT_ALARM` stays out (D-15). | — | DONE (N/A) |

## 3. Payments profile, public address and EU trader status
| # | Item | Exact action | Owner | Status | Source |
|---|---|---|---|---|---|
| 3.1 | Payments profile / merchant account | Required for in-app products. Link it under Console → Setup → Payments profile. | Owner | UNKNOWN | [LC§1 A3] |
| 3.2 | **Public address** | Monetized accounts **show the payments-profile address on Google Play**. Use a business or virtual-office address if you have one; check that Console accepts it. Otherwise your home address becomes public. | Owner (decision) | UNKNOWN | [LC§0.5, S21] |
| 3.3 | EU DSA trader status | Declare **Trader**: a monetized app is almost certainly a trader. Your address, email and phone are then shown to EU users. | Owner | UNKNOWN | [LC§1 A3] |
| 3.4 | Tax forms | Play and AdMob payments profiles: tax info (for example, a W-8BEN for a non-US developer). | Owner | UNKNOWN | INDUSTRY |
| 3.5 | Privacy-policy controller | The entity named in the listing must match the policy: "True Story Labs" as a registered entity, or your legal name trading as True Story Labs (P3 in §10). | Owner (decision) | UNKNOWN | [LC§4 P3] |

## 4. Signing: Play App Signing and the upload key
| # | Item | Action | Owner | Status | Source |
|---|---|---|---|---|---|
| 4.1 | Play App Signing | Confirm under Setup → App signing that Google holds the app-signing key. That is the default for AAB uploads, so it is likely already active (INFERRED). Copy the **app-signing SHA-256**, because `assetlinks.json` (P9) and RevenueCat need it. | Owner | UNKNOWN | [LC§1 D3] |
| 4.2 | Upload key backup | The keystore (alias `gravityflow-upload`, CN=Tay Shofer, O=True Story Labs, valid to 2051) has **one copy on disk**. Back up the `.jks` and its passwords in **two places**: a password manager plus one offline copy (D-20). | Owner | **OPEN** | [AUD§B.2, I.4] |
| 4.3 | Lost upload key | It can be reset through Console support, which is the reason to keep Play App Signing. | — | — | [LC§1 D3] |
| 4.4 | Keystore secrets stay out of git | `android/keystore.properties` and `google-services.json` are git-ignored (`android/.gitignore:50,57`). | Claude | DONE | [REPO] |
| 4.5 | Runbook alias fix | `keystore.properties.example:19` says `keyAlias=upload`; the real alias is `gravityflow-upload`. | Claude | OPEN | [REPO], [AUD§I.4] |

## 5. Product setup (non-consumables, D-09)
The product UI unlocks after you upload an AAB that has the BILLING permission, which you have done [ESA].

| Play product id | Type | RevenueCat flag | Entitlements | Status |
|---|---|---|---|---|
| `remove_ads` | One-time, one "Buy" option (backwards-compatible) | **Non-consumable** | `no_ads` | UNKNOWN |
| `starter_pack` | One-time | **Non-consumable** | `no_ads`, `pack_starter` | UNKNOWN |
| `premium_collection_pack` | One-time | **Non-consumable** | `pack_premium_collection` | UNKNOWN |
| `founders_pack` | One-time | **Non-consumable** | `no_ads`, `pack_founders` | UNKNOWN |

**Setup steps:**
1. Set per-country prices from a USD anchor and Play's local price templates. The app shows **only** the store's `priceString` (D-09); hard-coded `$x.99` labels are removed in P0 step 3.
2. In Google Cloud, enable the Play Android Developer API and create a service account with the Play Console permissions. Upload its JSON to RevenueCat (allow up to 36 h), and set up RTDN through Pub/Sub [MZ].
3. In RevenueCat, put all products in offering `default` (current). Paste the **public** `goog_…` SDK key into the repo; today it is `apiKey: ''` at `monetization.config.ts:26` (OPEN, P0 step 3).
4. Add **license testers** under Setup → License testing. **Smoke test:** a tester purchase that is still *not* auto-refunded after 3 minutes proves the non-consumable flag and acknowledgement are set up [MZ].

RevenueCat does not support Play one-time discount offers, so any "sale" needs its own product id [MZ].

## 6. Store listing

### 6.1 Text rules and copy
| Field | Limit / rule | Proposal (working title) | Status |
|---|---|---|---|
| App name (title) | ≤30 characters. No emoji. ALL CAPS only if it is the brand. No "free", "#1", "best", "new" or prices [LC§5] | `Gravity Flow: Physics Puzzle` (28). After D-19: `<Name>: Physics Puzzle`, taken from `BRAND.storeTitle` (P11). | OPEN |
| Short description | ≤80 characters | `Hold to pull a lost star home: one-touch gravity puzzles, bosses & endless runs` (79). It has no count, so it survives D-27 level cuts. With counts: `Hold to pull the star home: 150 one-touch physics puzzles, bosses & endless mode` (80), only if the facts script confirms 150. | OPEN |
| Full description | ≤4000 characters. Put **concrete facts first** (Ask Play and AI summaries read the listing plus the website). No repeated keywords. No unattributed testimonials. **Unwrap the hard line breaks**, which Play keeps. | Opening facts line: levels · worlds · 7 mechanics · offline play · cosmetic-only store · ads removable. All numbers come from `scripts/facts.mjs` at M2. | OPEN |
| Developer name | The same rules apply | `True Story Labs` | UNKNOWN |
| Category / tags | Games › **Puzzle**; up to 5 tags chosen from Play's list (for example Puzzle, Casual, Brain games, Offline, Physics if offered) | — | UNKNOWN |

### 6.2 Honest-copy deltas (P0 step 5 / P11-T05)
| Current claim (location) | Problem | Replace with |
|---|---|---|
| "everyone races the same seeded course for the leaderboard" (`listing.md:33`); "weekly challenge leaderboard" (`listing.md:37`, `release-notes.md:11`, `README.md:45`) | Local-only. This is misleading metadata (D-17). | "Weekly Challenge: the same seeded course for every player. Beat your own best." (78) |
| "A new mechanic and a memorable boss in every world" (`listing.md:38`) | Worlds 9–15 reuse the 7 mechanics | "7 gravity mechanics, combined in new ways, and a boss at the end of every world" |
| "one straightforward Best Value bundle" (`listing.md:47-48`) | There are 3 bundles | "cosmetic bundles (one tagged Best Value) and an optional Remove Ads" |
| "Play offline." (`listing.md:50`) | Ads and IAP need a network | "Play offline. No Wi-Fi needed to play." |
| "150 hand-tuned levels across 15 worlds" | D-27 lets the count change | Take the number from `LEVELS.length` / `WORLDS.length` at M2. The `storeCopy` test enforces it (P11-T04). |
| "relaxing or thrilling" | "Relaxing" isn't backed until there is a Zen mode or soundtrack [AUD§L.3] | "Play at your own pace" |
| Release notes "First release (v1.0 / versionCode 1)" | Wrong versionCode | Key the notes by versionName; codes live in the release ledger (P12) |

### 6.3 Keyword plan (no paid tools)
| Slot | Terms | Rule |
|---|---|---|
| Title | brand + "Physics Puzzle" | Strongest generic term |
| Short description | "hold to pull", "one-touch", "gravity puzzles" | Verb plus fantasy |
| Full description (2–3 natural uses each) | gravity puzzle, physics puzzle, one-touch / one-finger, space puzzle, brain teaser, logic puzzle, offline puzzle game, endless mode, daily challenge, star map | Never stuff keywords |
| Excluded until true | "leaderboard" (D-17), "relaxing" (see above), "multiplayer" | — |

**Process:**
- **Before launch:** Play search autocomplete ("gravity puzzle", "physics puzzle", "one touch"), the top-10 competitor listings (Flow Free, Cut the Rope-likes, gravity games) and Google Trends.
- **After launch:** each month, review Console → Store performance → search terms and the Grow-page keyword recommendations [LC§5].

## 7. Graphic assets

### 7.1 Screenshots
| Rule | Value | Source |
|---|---|---|
| Count | 2–8. Ship **8**. | [LC§5] |
| Game-promotion eligibility | **≥3 portrait 9:16 shots at ≥1080×1920** (or 3 landscape 16:9 at ≥1920×1080) | [PH answer/9866151] |
| Format | JPEG or **24-bit PNG with no alpha**. Each side 320–3840 px; long side ≤ 2× short side. | [LC§5] |
| Target spec | **1080×1920 RGB**, caption band in the top ~18% (**≤20% of the image**), Exo 2 800 at ≥72 px, 3–6 words | [UX§7] |
| Forbidden | Device frames, people handling a device, "Download now", prices, time-limited text | [UX§7], [LC§5] |
| Show the touch as | The in-game attractor glow, not a drawn finger | [UX§7] |
| Shoot when | **After** P5-A (bright render, transparent logo, hint fix; step 12) and P4-α (step 13). The current captures render dim. | EXECUTION-ORDER "What must wait" |
| Current state | 8 × 1080×2160 RGB, no alpha. 2:1 rather than 9:16. #1 is the Star Map, not the verb. #6 shows USD prices. No captions. | [REPO], [AUD§I.2] |

**Storyboard (verb first; frames 1–3 do most of the converting):**

| # | Caption | Shot |
|---|---|---|
| 1 | "Hold to pull the star." | Bright mid-pull: attractor ring, pull line, curved trail arcing into the goal (a W1–3 level) |
| 2 | "7 forces. One touch." | 2×2 tiles: currents, magnets, portals, gates, each in its world's colour |
| 3 | "Beat the boss of every world." | Boss with hazards, then WORLD CLEARED stars |
| 4 | "Master every level." | 3★ result panel (NEXT/RETRY, D-08) with the factual par line |
| 5 | "Endless Gravity Run." | The climb plus a NEW BEST badge ("your best", D-17) |
| 6 | "A new puzzle every day." | Daily with streak (after P6). Fallback: the Star Map journey. |
| 7 | "Make the star yours." | Skin/trail preview with **no prices** |
| 8 | "No energy. No pay-to-win." | The honest store or accessibility options; only claims that are true at capture time |

**Owner:** Claude (capture plus caption compositor, P11-T09/T10); you sign off on the set. **Status:** OPEN.

### 7.2 Feature graphic
| Rule | Value | Status |
|---|---|---|
| Size / format | Exactly **1024×500**, JPEG or **24-bit PNG, no alpha** [PH] | Format DONE: the current file is RGB with no alpha [REPO] |
| Safe zone | Focal art centred, ≥64 px margins. If a promo video is attached, Play overlays a play button in the centre, so keep the wordmark out of the central ~200 px. No "Free", "Sale", "#1" or dates. | OPEN |
| Creative | The current version clips "GRAVITY" at the right edge, and its straight trail reads as "thrown", not "pulled". Redo it with a curved pull. The wordmark comes from BRAND, so this frame is made **after** D-19. | OPEN [AUD§I.2] |

### 7.3 Icon
| Rule | Value | Status |
|---|---|---|
| Play hi-res icon | **512×512, 32-bit PNG with alpha, ≤1024 KB**, full square (Play applies the corner mask and shadow) [PH] | Format DONE: 512² RGBA, 213 KB [REPO] |
| Creative | **No text.** One bright star with a vortex swirl on full-bleed indigo. Check legibility at 48 and 96 px on light and dark launchers. Unify the three current marks (icon, in-app logo, feature graphic) [UX§7], [AUD§I.2]. | OPEN |
| In-build adaptive icon | The foreground/background layers exist, but there is **no `<monochrome>` layer** for Android 13 themed icons ([REPO] `mipmap-anydpi-v26/ic_launcher.xml`) | OPEN |

### 7.4 Promo video
| Rule | Value |
|---|---|
| Hosting | A YouTube URL, **public or unlisted**, **monetization off**, not age-restricted, embeddable [PH] |
| Behaviour | The first 30 s autoplay **muted**, so burn captions in. Gameplay starts within the first 3 s (Play's rule is 10 s). At least 80% in-game footage. |
| Cut (20–30 s) | 0–2 s hold-pull hook with no logo intro → 2–8 s three escalating mechanics → 8–20 s boss and celebration → 20–26 s Gravity Run → 26–30 s wordmark plus tagline [UX§7] |
| End card | Wordmark plus "Bring the lost star home." **No "Download now" or "Free" call-to-action text** (metadata policy; this deviates from UX§7's "Free on Google Play"). |
| Masters | 1080×1920 (Shorts, Reels, TikTok) and a 1920×1080 Play cut with the portrait play area centred and captions on the side panels (OPINION) |
| Status | OPEN. None has been produced [REPO] `listing.md:85`. Made after D-19 because of the end card. |

## 8. Localization order
Default listing language is **en-US**. Order: **es-419, pt-BR → de-DE, fr-FR → ja-JP, ko-KR → id, tr-TR, hi-IN** [LC§5].
- **ru-RU** is listing-only and low priority: Play billing has been suspended in Russia since 2022 (INDUSTRY).
- **Method:** Console's Gemini pre-fill from a CSV. A person reviews the **title and short description** only.
- Keep the brand untranslated.
- The game itself stays English-only for 1.0. Each localized full description ends with "Game text is in English." (OPINION; prevents mismatch reviews).
- Captioned screenshots are localized only for the top two locales. **Owner:** Both. **Status:** OPEN (P11-T13).

## 9. Developer website, app-ads.txt and assetlinks.json
| # | Item | Action | Owner | Status | Source |
|---|---|---|---|---|---|
| 9.1 | Choose the host | **Recommended:** a **studio** domain (truestorylabs.&lt;tld&gt;; availability UNKNOWN). It is neutral to a game rename, so D-19 can't strand it. **Fallback:** the GitHub user site `taysh123.github.io` (repo `taysh123/taysh123.github.io`). **Do not buy a game-name domain before D-19.** If one is bought on decision day (`NAMING-STUDY.md` §7), either domain can be the Play "Website"; app-ads.txt must sit at whichever root is listed. | Owner (decision) | OPEN | [LC§1 A4], D-16, D-19 |
| 9.2 | Site content | Home/game page that mirrors the listing facts; `/privacy/`; `/support/`; `/delete-data/` (deletion steps, §2.7); `/.nojekyll`; `CNAME` for a custom domain | Claude (separate repo, P11-T06) | OPEN | [LC§5] |
| 9.3 | `app-ads.txt` at the **domain root** | One line: `google.com, pub-<your 16-digit AdMob publisher id>, DIRECT, f08c47fec0942fa0`. **Your publisher ID is UNKNOWN**: no real AdMob ID has ever been committed. Apps added after Jan 2025 without verification get *limited ad serving*. | Both | OPEN | [ESA], [MZ] |
| 9.4 | Play Store settings → Website | The site root (for example `https://truestorylabs.<tld>/`). AdMob crawls `<root>/app-ads.txt`; crawling and verification take up to 24 h. | Owner | OPEN | [LC§0.4] |
| 9.5 | `/.well-known/assetlinks.json` | Served at the host root as `application/json`, with no redirects. Fingerprints: the app-signing SHA-256 (§4.1) plus the upload key's. **Lands in P9** (challenge links, D-16). The site is built for it now. | Claude (P9) | OPEN (deferred) | android brief Q-links |
| 9.6 | Old policy URL | `taysh123.github.io/Gravity-Game/` keeps serving the policy, or a meta-refresh to the new URL, for at least 12 months. The old AAB and any listing draft point to it. | Claude | OPEN | — |

## 10. Privacy policy deltas (P1–P10)
Today's policy is `docs/store/privacy-policy.md`, mirrored at `docs/index.html` (effective 10 June 2026).

| # | Change | Owner | Status in repo |
|---|---|---|---|
| P1 | In-app link (Settings and the main-menu footer) plus a **Privacy choices** button driven by UMP when REQUIRED | Claude (P0 step 4) | OPEN: no link in `src/` |
| P2 | Rewrite the SDK table to match §2.7: IP-based approximate location, app set ID, Firebase installation ID, Analytics purchase events, and **AdMob sharing for advertising** | Claude | OPEN: the table has 4 broad rows |
| P3 | Name the **controller** by legal name and country | Owner decides, Claude writes | OPEN (§3.5) |
| P4 | GDPR block: legal bases (consent for ads and analytics; legitimate interest for crash diagnostics), the rights, the supervisory-authority complaint, transfers (SCCs/DPF) | Claude | OPEN |
| P5 | US-state block: ad sharing can count as "sale/sharing"; opting out through the UMP US-states message and Privacy choices | Claude | OPEN |
| P6 | Retention specifics: GA4 retention **14 months** [RT], Crashlytics about 90 days (verify), RevenueCat retention, the ad-ID reset | Claude + Owner confirms console settings | OPEN |
| P7 | Deletion process: email in, then delete the RevenueCat customer and the GA app instance, plus the in-app "Reset analytics data"; target 30 days | Claude | OPEN |
| P8 | Israel Amendment 13: purpose, recipients, and whether providing data is voluntary | Claude | OPEN |
| P9 | Remove "continued use constitutes acceptance" (`privacy-policy.md:126-127`) and say material changes are notified in-app | Claude | OPEN |
| P10 | Children: keep "not directed to under 13"; add COPPA wording and EU age-of-consent handling through UMP | Claude | PARTIAL: the under-13 line exists |
| +1 | Backup wording: `allowBackup` is true, so "uninstalling removes this information" is inaccurate. Say that Android device backup may keep local game data [AUD§I.3 #11]. | Claude | OPEN |

New effective date. Publish at the website's `/privacy/` (§9). Brand and controller names come from BRAND (P11).

## 11. Testing tracks → production
| Stage | Gate in | What happens | Owner | Status |
|---|---|---|---|---|
| **Internal** (M0) | AAB with versionCode **≥ 1000001**, real AdMob/RC IDs (or a deliberate test-ID internal build), consent-first boot | Device smoke: consent with EEA and US debug geography; rewarded and interstitial ads (never at level start or mid-play, D-24); purchase/restore/pending with license testers; Crashlytics test crash; DebugView; Back/pause; 30/60/120 Hz parity | Owner (device) | OPEN |
| **Closed** (M1) | App content (§2) complete and a store listing draft. The working title is acceptable; the name can change later. | **Recruit 18–20 testers** (Google Group or email list) so the count never drops below 12. **≥14 continuous days.** Give testers instructions and a feedback form, and keep a **feedback log**. Builds can be updated during the test. | Owner | OPEN. The clock hasn't started; it is calendar-critical [AUD§K #8]. |
| **Apply for production** | Day 14+ with ≥12 opted in | Dashboard → Apply for production. Questions cover the test, its engagement and feedback, the audience, value and readiness. Answer from the feedback log. Review takes **≤7 days**. | Owner (Claude drafts the answers, P12-T09) | OPEN |
| **Production** (launch) | M2 sign-off; same AAB promoted from closed (D-20) | Staged rollout **20% → 50% → 100%** (§16) | Owner | OPEN |

**Note for the owner (roadmap tension):** EXECUTION-ORDER makes M1 depend on step 14 (brand apply), which depends on the 👤 naming decision. If that decision slips, the 14-day clock slips with it. Play allows the closed track to run under the working title, so this plan recommends starting the closed test without waiting for the name, as long as the rename switch (P11-T14) still lands before production.

Skip pre-registration: it stays locked until production access, and there is no audience yet [LC§5]. Calendar: about 14 days of closed test + up to 7 days of review + about 7 days of rollout ≈ **4 weeks minimum** from the first closed-track tester.

## 12. Pre-launch report
- It runs automatically on closed and open builds (Testing → Pre-launch report). Robo cannot "play" a canvas, so coverage will be shallow.
- **Blockers:** crashes, ANRs, security-vulnerability warnings, and any policy warning.
- **Informational:** WebView accessibility warnings and screenshot-layout notes.
- Re-check the report on every closed-track upload. **Owner:** Owner reads it; Claude fixes. **Status:** OPEN [LC§1 E3].

## 13. Android vitals thresholds
| Metric | Bad-behaviour threshold (overall / per phone model) | Our internal target | Source |
|---|---|---|---|
| User-perceived crash rate | **1.09% / 8%** | < 0.5% (Crashlytics crash-free sessions ≥ 99.5%) | [LC§1 F1] |
| User-perceived ANR rate | **0.47% / 8%** | < 0.2% | [LC§1 F1] |
| Excessive partial wake locks | **5%** | ~0% (`WAKE_LOCK` comes from WorkManager) | [LC§1 F1], [ESA] |
| DEX code optimization (R8) | Enforced from Feb 2027, but games only above 50 MB of DEX | N/A. R8 stays off for 1.0 (D-20). | [LC§0.3] |

Breaching a threshold can reduce visibility or add a listing warning. WebView renderer crashes count as crashes [AUD§I.1]. At low install volume Console shows "not enough data", so use Crashlytics as the early signal.

## 14. In-app review rules (D-16)
| Rule | Value |
|---|---|
| API | The Play In-App Review API through a small Capacitor plugin. D-16 and EXECUTION-ORDER step 21 put it in **P9, after launch**, but first-month ratings matter most. **Recommendation (needs an owner decision):** pull this half-day item into M2. |
| When | Positive moments only: a `world_complete` from World 2 on, or a 7-day Daily streak (or the first 3★ after the W1 boss) |
| Never | After a fail, death or ad. From a "Rate us" button. Behind a pre-question ("Enjoying it?"). With a reward for reviewing. With anything covering or changing the card. |
| Local cap | ≤1 request per 60 days and ≤3 per lifetime [RT-Q6] (stricter than [LC§5]'s 30 days). The Play quota is hidden, and the card may not appear; there is no fallback UI. |
| Ops | Reply to every review during the first month (Owner) |

## 15. iOS later (D-29: after the Android launch is stable)
| Area | Delta |
|---|---|
| Accounts / toolchain | The Apple account exists. Create the App Store Connect record (bundle id `com.truestorylabs.gravityflow`) only when the port starts. Needs macOS + **Xcode 26 / iOS 26 SDK**; Mac access is UNKNOWN. |
| Ads / privacy | **ATT** + `NSUserTrackingUsageDescription`, **SKAdNetworkItems**, `PrivacyInfo.xcprivacy`, App Privacy labels mirroring §2.7 |
| Store / native | The new age-rating questionnaire, support URL (§9), DSA trader status, 1024 icon without alpha, 6.9" screenshots. StoreKit through RevenueCat, with Restore (exists, `CosmeticsScene.ts:127-134`). `@capacitor/haptics`, because WKWebView has no `navigator.vibrate`. |
| Review / effort | Guidelines 4.2 (must not feel like a website) and 3.1.1. **6–10 developer days + 1–2 review cycles** [LC§8]. Detail in P12 §3.8. |

---

## 16. Launch-day runbook (one page)

**Go / no-go (T-2 days). All must be true:**
1. ☐ The M2 AAB is on the closed track ≥72 h. Its SHA-256 is recorded in the release ledger, and it is the **same file** being promoted (D-20).
2. ☐ versionCode > every code in the ledger; versionName is plain semver; tag `v1.0.0` is ready on the exact commit.
3. ☐ Preflight is green: no test ad IDs, `goog_` key present, `BRAND.status = 'final'` (D-19 settled), no unexpected merged permissions (§2.9), `npm audit --omit=dev` = 0 critical.
4. ☐ Every App content form shows ✅. The pre-launch report has no blockers.
5. ☐ The listing is final in en-US with all localizations; screenshots, feature graphic, icon and video are uploaded; Managed publishing is ON.
6. ☐ app-ads.txt shows **Verified** in AdMob, and the privacy URL loads from a mobile network.
7. ☐ License-tester purchase and restore pass on the release build installed **from Play**. Crashlytics shows the build.
8. ☐ Upload key backed up in two places.

**Day 0:**
| Time | Step |
|---|---|
| 09:00 | Closed release → **Promote to Production**. Release notes from `release-notes.md`. Rollout **20%**. Send for review, or Publish if it was already approved under Managed publishing. |
| +live | Install from Play on 2 devices. Smoke: boot, consent, level 1–3, a rewarded ad, the Remove Ads purchase screen (don't buy), Settings privacy link. |
| +1 h, +4 h, +8 h | Crashlytics: crash-free sessions, new issues. AdMob: impressions and policy center. RevenueCat: transactions. |
| EOD | Tag `v1.0.0` and create the GitHub Release (no AAB attached), update `STATUS.md`, reply to reviews |

**Rollout gates:**
| Step | Wait | Advance only if |
|---|---|---|
| 20% → 50% | ≥48–72 h | Crash < 1.09% and ANR < 0.47% (or Crashlytics crash-free ≥ 99.5% when vitals lack data); no P0 issue; purchases succeed; no policy email |
| 50% → 100% | ≥72 h | Same, plus rating ≥ 4.0 and no per-device cluster ≥ 8% |

**Halt criteria (any one):** a vitals breach; a crash cluster on a top device; purchases failing; ads shown mid-play; a policy notice.
- **Action:** Console → **Halt rollout**. A binary can't be rolled back. Ship a fix with a **higher versionCode** (BUILD+1) → internal smoke → production at the halted percentage → resume.
- Use Remote Config kill switches for ads and offers once P6 has shipped.

**T+7:** first weekly metrics review (P12): installs, listing conversion, D1, crash/ANR, ad impressions per DAU, payer conversion, reviews. Log 1–3 actions.

---

## 17. Owner-gated summary
| # | Decision / task | Blocks | Where |
|---|---|---|---|
| 👤1 | Confirm account type, creation date, 12×14 requirement and developer-verification status | The calendar | §1.3–1.4 |
| 👤2 | Name choice + trademark knockout (US/EU/IL) | P11 rename switch, feature graphic, video end card, production | D-19, P11 |
| 👤3 | Public address and controller identity | Payments profile, policy P3 | §3 |
| 👤4 | Website host (studio domain vs user site) | app-ads.txt, assetlinks, Ask Play | §9 |
| 👤5 | AdMob app + units + GDPR/US-states messages; RevenueCat project + products + key | M0 | §5, [ESA] |
| 👤6 | Upload-key backup ×2 | Update safety | §4.2 |
| 👤7 | Recruit 18–20 closed testers | M1 → production access | §11 |
| 👤8 | Store asset sign-off; production-access application; rollout button | Launch | §7, §11, §16 |
