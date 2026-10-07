# Gravity Flow: Google Play launch compliance + ASO research (2026-10-07)

**Scope:** `com.truestorylabs.gravityflow` is a free Capacitor 8 game with AdMob + UMP, RevenueCat on Play Billing 8.3.0, Firebase Analytics + Crashlytics, and targetSdk 36. **This is not legal advice.**

**Labels:** **DOCUMENTED** = from an official Google, Apple or SDK page or registry record (source given as [S#]). **INDUSTRY** = common practice or a secondary source. **OPINION** = my judgement.

## 0. Changes since this morning's research pass (read these first)

1. **Trademark correction (DOCUMENTED, from the USPTO API).** Rocketgenius's 2018 US registrations for GRAVITYFLOW and GRAVITY FLOW (Reg. 5560409 and 5579783) were **cancelled on 2025-03-21**. They had not filed the required Section 8 declaration. However, Rocketgenius **re-filed on 2025-10-20 and is REGISTERED again as Reg. 8281133** (serial 99451755). That registration covers classes 9 and 42, for business-process-automation plugin software. The bigger risk in our own niche is **Big Duck Games' FLOW / FLOW FREE family** (class 9, mobile puzzle games), covered in §6.
2. **Texas SB 2420 is in force.** The Fifth Circuit stayed the injunction on 2026-06-04. Play Age Signals has returned signals for new Texas accounts since 2026-05-28 [S9]. California AB 1043 takes effect **2027-01-01**. Details in §3.
3. **There is a new Android vitals metric for code optimization (R8),** enforced from **Feb 2027**. For a *game* it only applies above **50 MB of DEX code**, so it almost certainly does not apply to us [S12, S13]. Separately, **AGP 9 drops `proguard-android.txt`**, which our `build.gradle` references [S14].
4. **app-ads.txt will not verify with today's website URL.** AdMob ignores the path in the developer-website URL. With the site at `taysh123.github.io/Gravity-Game/`, it will look for `https://taysh123.github.io/app-ads.txt` [S20]. That requires a GitHub *user* site repo or a custom domain.
5. **The developer's physical address becomes public.** Any account that monetizes (in-app purchases) must show its payments-profile address on Google Play [S21].
6. **The draft Data safety answers in `listing.md` are incomplete.** They are missing approximate location (IP-derived), app set ID, the Firebase installation ID, and the purchase history that Analytics logs from purchase events. The full matrix is in §2.

---

## 1. Ordered launch checklist (Oct 2026)

**Owner key:** **U** = the user, in Play Console or another console. **D** = the developer or Claude, in the repo.

| # | Step | Owner | Notes / source | Label |
|---|---|---|---|---|
| **A. Account** ||||
| A1 | Check the account type and creation date (Play Console → Developer account → Account details). A *personal* account created after 2023-11-13 must pass the 12-tester / 14-day closed test, and Production and Pre-registration stay locked until then [S1]. | U | An organization account avoids this, but needs a legal entity plus a D-U-N-S number. | DOC |
| A2 | Identity verification and Android developer verification. Check the Play Console Home page for the app's registration status. Apps not registered by 2026-09-30 face global removal from Play [S2]. A new app created in Console is expected to register itself (OPINION; confirm on Home). | U | | DOC |
| A3 | Payments profile / merchant account (needed for in-app purchases). **The address is shown publicly** [S21]. Use a business or virtual address if you have one. Declare EU DSA **trader** status: a monetized app is almost certainly "trader". | U | | DOC / INDUSTRY |
| A4 | Developer website plus **app-ads.txt at the domain root**. Either buy a domain (e.g. truestorylabs.*, and host the policy and app-ads.txt there) or create a `taysh123.github.io` user-site repo [S20]. | U+D | Crawling and verification can take up to 24 hours. | DOC |
| **B. Create the app and complete App content** ||||
| B1 | Create the app: name, default language **en-US**, **Game**, **Free**. Free is effectively permanent: a free app cannot later become paid (INDUSTRY). | U | | |
| B2 | **Privacy policy URL.** It must be public, not geofenced, not a PDF, and **also linked inside the app** [S3]. | U+D | | DOC |
| B3 | **App access:** "All functionality is available without special access." | U | | DOC [S4] |
| B4 | **Ads:** Yes. | U | | DOC |
| B5 | **Content rating (IARC):** Violence No (abstract orb, no characters; OPINION), Fear / Sex / Language / Drugs / Crude humour No, Gambling No. **Digital purchases Yes.** Loot boxes / random paid items: **No, provided no real-money purchase gives a random reward** (D must verify that chests use only earned currency). User interaction No, location sharing No, unrestricted internet No. Expected result: ESRB E / PEGI 3 / IARC 3+ with "In-App Purchases" [S22]. | U (D verifies) | | DOC / OPINION |
| B6 | **Target audience:** 13–15, 16–17, 18+. Detail in §3. | U | | DOC [S5] |
| B7 | **News app:** No. **Government app:** No. **Financial features:** "None". **Health:** "No health features". All four declarations are required even when the answer is "no" (INDUSTRY). | U | | |
| B8 | **Data safety:** use §2. | U | | DOC |
| B9 | **Advertising ID:** Yes. Purposes: Advertising/marketing, Analytics, Fraud prevention. `play-services-ads` merges the `AD_ID` permission automatically [S6]. | U | | DOC |
| B10 | **Merged-manifest audit.** Run `bundletool dump manifest` on the AAB and check for `FOREGROUND_SERVICE*`, `RECEIVE_BOOT_COMPLETED` or alarm permissions that plugins or WorkManager may add. Answer any extra declaration Console asks for. Photo/video, SMS and location declarations are N/A. | D | | OPINION |
| **C. Store presence** ||||
| C1 | **Store settings:** Games › **Puzzle**; tags (pick from Play's list, max 5), e.g. Puzzle · Physics · Casual · Brain / Logic · Offline (INDUSTRY). Contact email is required. Add the website (needed for app-ads.txt and for Ask Play, §5). Phone is optional. | U | | |
| C2 | Main listing: paste the copy **after fixing the §5 deltas** (e.g. the leaderboard claim), then upload the icon, feature graphic and 8 screenshots. | U (D fixes copy) | | DOC |
| **D. Build, signing and products** ||||
| D1 | Real AdMob app and unit IDs. **UMP messages: GDPR + US states.** **Privacy-options button** in Settings whenever `privacyOptionsRequirementStatus == REQUIRED`. Set `maxAdContentRating` (§3). Add the in-app privacy-policy link. Link Firebase consent mode to UMP. | D+U | | DOC (known) / INDUSTRY |
| D2 | Choose the versionCode scheme (§7). Build the AAB. Re-verify target 36, PBL 8 and 16 KB pages. | D | | DOC |
| D3 | **Play App Signing** (the default for AABs): accept the Google-generated app-signing key. **Back up the upload keystore and its passwords** in a password manager plus one offline copy. A lost *upload* key can be reset through Console support; a lost app-signing key cannot, which is the point of letting Google hold it. | U | | INDUSTRY |
| D4 | Upload the first AAB to Internal testing. Then create the in-app products (`remove_ads` + 3 bundles; the product UI unlocks once an AAB with the BILLING permission is uploaded). Set up the **RevenueCat ↔ Play service-account credentials** (needed for receipt validation), plus RTDN through Pub/Sub (recommended). Add **license testers**. | U | | INDUSTRY |
| **E. Testing** ||||
| E1 | **Internal test** smoke checks: consent (use EEA and US debug geography), rewarded and interstitial ads (cap respected; never at level start or mid-play), purchase, restore, Remove Ads, Crashlytics test crash, Analytics DebugView. | U device | | |
| E2 | **Closed test:** recruit **18–20** people so the count never drops below 12. Keep it running **≥14 continuous days**. Give testers instructions and a feedback channel, and keep a feedback log; the production-access form asks about these [S1]. | U | | DOC |
| E3 | **Pre-launch report** (Testing → Pre-launch report) runs Robo on closed/open builds. Expect shallow coverage, because Robo cannot "play" a canvas. Treat crashes and security warnings as blockers; WebView accessibility warnings are informational. | U | | INDUSTRY |
| E4 | **Apply for production.** Questions cover the test, the audience, value and readiness. Review takes "seven days or less" [S1]. | U | | DOC |
| **F. Production** ||||
| F1 | Staged rollout, e.g. 20% → 50% → 100% over about a week. Watch Android vitals against the bad-behaviour thresholds: crash **1.09%** overall / **8%** per phone model, ANR **0.47%** / **8%**, excessive partial wake locks **5%**. Breaching them can reduce visibility or add a listing warning [S12]. | U | | DOC |
| F2 | **In-app review API** after a positive moment. Never use a "Rate us" button, never ask a pre-question, and don't alter the card. A quota applies (roughly monthly) [S15]. | D | | DOC |

---

## 2. Data safety answer matrix

**Basis.** "Collected" means data leaves the device. Transfers to a **service provider** acting on your instructions are **not "shared"**. On-device-only data is not declared [S7]. Firebase and RevenueCat act as service providers. GMA "automatically collects **and shares**" its data [S8].

| Play data type | SDK source | Collected | Shared | Purposes | Required / optional | Label |
|---|---|---|---|---|---|---|
| Location › **Approximate** | GMA (IP address) [S8]; GA4F (coarse location from masked IP) [S10] | Yes | **Yes** (GMA) | Advertising, Analytics, Fraud prevention | Required | DOC |
| App activity › **App interactions** | GMA (launches, taps, video views) [S8]; GA4F (screens, sessions, events) [S10] | Yes | **Yes** (GMA) | Advertising, Analytics, Fraud prevention | Required | DOC |
| App info & performance › **Crash logs** | Crashlytics stack traces [S11] | Yes | No | App functionality (+ Analytics, OPINION) | Required | DOC |
| App info & performance › **Diagnostics** | Crashlytics app state and device metadata [S11]; GMA (launch time, hang rate, energy) [S8] | Yes | **Yes** (GMA) | App functionality, Analytics | Required | DOC |
| **Device or other IDs** | GMA: ad ID, app set ID, account identifiers [S8]. GA4F: app-instance ID, ad ID [S10]. Firebase installations: FID [S11]. RevenueCat anonymous app-user ID (OPINION) | Yes | **Yes** (GMA) | Advertising, Analytics, Fraud prevention, App functionality | Required | DOC / OPINION |
| Financial info › **Purchase history** | RevenueCat [S16]; GA4F in-app purchase events (product ID, name, price) [S10] | Yes | No | App functionality, Analytics | Required (RevenueCat: "mandatory") | DOC |
| Personal info, precise location, messages, photos/video, audio, files, calendar, contacts, health, web history | — | **No** | — | — | — | DOC |
| *Local only (not declared):* progress, stars, ghosts, Stardust, cosmetics, settings in localStorage | on device [S7] | No | — | — | — | DOC |

The remaining Data safety questions:

- **Encrypted in transit:** Yes. GMA and GA4F use TLS, Crashlytics uses HTTPS, and RevenueCat confirms it [S8, S10, S11, S16].
- **Account creation:** "My app does not allow users to create an account." The account-deletion URL rule only applies to apps that offer account creation [S17].
- **Deletion requests:** answer **Yes (via email)**. Actually deliver on it:
  - delete the RevenueCat customer (dashboard or REST) [S16];
  - use the GA User Deletion API by `APP_INSTANCE_ID` (removed from reports within 72 hours, purged within about 2 months) [S18];
  - offer an in-app "Reset analytics data" (`resetAnalyticsData`);
  - point users to the ad-ID reset in Android settings [S8].
- **Independent security review:** No.
- **Recommendation:** re-check the SDK disclosure pages before every SDK bump. Firebase updated its page 2026-10-06 and AdMob 2026-10-02.
- **Risk:** under-declaring is the most common Data safety rejection (INDUSTRY).

---

## 3. Target audience decision

**Recommendation (OPINION): 13+ only** (13–15, 16–17, 18+), with content rating "Everyone". The rating and the target audience are separate things.

- **Why not include under-13s?** Doing so pulls the app into the **Families policy**:
  - every ad SDK must be Families Self-Certified;
  - every SDK must be approved for child-directed services [S3, S5];
  - a mixed audience requires a **neutral age screen** [S5];
  - AdMob must get `tagForChildDirectedTreatment` for children, which means no personalized ads and lower eCPM;
  - GA4F's ad-ID collection would have to be turned off for children;
  - Google reviews the app more closely.

  In return you could be considered for Teacher Approved, which a physics arcade game does not need.
- **"Appeal to children" check.** Google reviews marketing even for 13+ apps. Avoid "youthful animation or young characters" [S5]. Our abstract cosmic art is low risk. Do not add a cute star mascot or a "for kids" tone to the icon or captions.
- **AdMob settings:** set `maxAdContentRating = PG`. Fall back to `T` only if fill turns out poor (INDUSTRY/OPINION). Do not set the under-age tags globally; let UMP and TCF handle EEA consent.
- **Age laws (DOCUMENTED / INDUSTRY):**
  - The Play Age Signals API (beta) returns signals in Brazil (from 2026-03-17) and for new Texas accounts (from 2026-05-28). Its data may be used **only for age-appropriate compliance, never for ads or analytics** [S9].
  - Texas SB 2420 has been in force since 2026-06-04 after the Fifth Circuit stay; the Supreme Court declined to vacate the stay (INDUSTRY).
  - Utah: Age Signals support from 2026-05-06, developer duties delayed to 2027 (INDUSTRY).
  - Louisiana: 2026-07-01 (INDUSTRY).
  - California AB 1043: OS-level age brackets from **2027-01-01** (INDUSTRY).
- **What to do (OPINION):** there are no accounts, no UGC, no chat and no age-gated content, so the practical exposure is low. **Do not block launch on this.** Plan a small native Capacitor plugin for Age Signals (about 1 day) before **Jan 2027**. It could serve non-personalized ads to users the store reports as minors. Review the Texas developer duties with counsel.
- **Risk:** medium-low, and changing fast. Re-check every quarter.

---

## 4. Privacy policy delta list

Required by Play [S3]: the developer or app is named; there is a contact point; access, collection, use and sharing are covered; the parties data goes to are listed; secure handling is described; retention and deletion are stated; the page is clearly labelled "Privacy Policy"; and it is **linked inside the app**.

| # | Change | Why | Label |
|---|---|---|---|
| P1 | Link the policy **inside the app** (Settings + main menu footer) **and** add a **Privacy options** button driven by UMP. | Play requires the in-app link [S3]; UMP needs the entry point when REQUIRED. D must verify both; I could not read `src/`. | DOC |
| P2 | Rewrite the SDK table to match §2: IP-derived approximate location, app set ID, Firebase installation ID, Analytics purchase events, and **AdMob sharing for advertising**. | It must match the Data safety form. | DOC |
| P3 | Identify the **controller** by legal name and country. True Story Labs: is it a registered entity, or the developer personally? | Play requires the entity named in the listing to appear in the policy [S3]. | DOC |
| P4 | Add a **GDPR block**: legal bases (consent for personalized ads and analytics; legitimate interest for crash diagnostics), rights (access, erasure, objection, portability, withdrawing consent), the right to complain to a supervisory authority, and the international-transfer mechanism (SCCs / DPF via Google and RevenueCat). | Standard GDPR notice content. | INDUSTRY |
| P5 | Add a **US-state block**: ad-related sharing can count as "sale/sharing" or "targeted advertising". Explain the opt-out through the UMP US-states message and the Privacy options button. | CPRA and similar state laws. | INDUSTRY |
| P6 | Give **retention specifics**: the GA4 data-retention setting you choose (2 or 14 months), Crashlytics' typical about 90 days (verify in the Firebase console), RevenueCat's retention, and the ad-ID reset. | Play asks for a retention/deletion policy [S3]. | INDUSTRY |
| P7 | Write out the **deletion process**: email in; reply with steps; delete the RevenueCat customer and GA app instance; in-app "Reset analytics data"; target 30 days. | Backs the "Yes" in Data safety. | DOC [S16, S18] |
| P8 | **Israel Amendment 13** (effective 2025-08-14): state the purpose, the recipients, and whether providing the data is voluntary / the consequences of not providing it. The policy's governing law is Israel. | Local law for the developer. | INDUSTRY |
| P9 | Remove "continued use = acceptance" and give a "material changes notified in-app" line instead. | GDPR consent cannot be implied. | OPINION |
| P10 | Children: keep "not directed to under 13". Add COPPA wording and note that EU age-of-consent thresholds (13–16) are respected via UMP. | | INDUSTRY |

---

## 5. Metadata rules and ASO

**Hard rules (DOCUMENTED [S19, S23]):**

- **Title:** ≤30 characters. No emoji or repeated special characters. **No ALL CAPS unless it is the brand.** No ranking, price or "free"/"new"/"#1" terms.
- **Descriptions:** no repeated or unrelated keywords, no unattributed testimonials, no misleading claims.
- **Icon:** 512×512, 32-bit PNG, ≤1024 KB.
- **Feature graphic:** 1024×500, JPEG or **24-bit PNG with no alpha**. Keep the focal point central and avoid "Free/Sale/#1" or time-sensitive text.
- **Screenshots:** 2–8, JPEG or 24-bit PNG, each side 320–3840 px, long side ≤ 2× short side. To be eligible for **game features**, provide ≥3 portrait shots at 1080×1920 or larger. **Captions ≤20% of the image.** No device frames, no "Download now".
- **Video:** a public or unlisted YouTube URL with ads turned off. The first 30 s **autoplay muted**. Show gameplay within 10 s.

**Deltas to apply:**

| Item | Finding | Recommendation | Label |
|---|---|---|---|
| Full description and §1 bullet: "everyone races the same seeded course **for the leaderboard**" | The leaderboard is local-only, so the claim is misleading metadata. | Change to "Weekly Challenge: the same seeded course for every player; beat your own best." Restore the wording only when Play Games leaderboards ship. | DOC risk / OPINION fix |
| Title `GRAVITY FLOW — Physics Puzzle` (29 chars) | ALL CAPS is allowed only as the brand. | Use `Gravity Flow: Physics Puzzle`, or whatever name §6 settles on. | OPINION |
| Feature graphic and screenshots | Must have no alpha channel. | D: check the PNG mode, and flatten to RGB if needed. | DOC |
| "Play offline" | Ads and IAP need a network connection. | Change to "Play offline — no Wi-Fi needed to play." | OPINION |
| Ask Play / AI summaries | Ask Play (rolling out in 2026) builds answers from **the listing plus the developer website**. Guided Search now pushes organic results lower [S24; INDUSTRY]. | Make the website a short game page that matches the listing facts (150 levels, 15 worlds, no pay-to-win, ads removable). Put concrete facts first in the description. | DOC / INDUSTRY |
| Custom store listings and experiments | Up to 50 CSLs, targeted by country, keyword or campaign. Experiments allow up to 3 variants and need ≥7 days [S25]. I/O 2026 added keyword recommendations that auto-create CSLs [S24]. No minimum-install rule is documented, but tests need traffic. | Start experiments after about 1,000 visitors per week. Test icons first, then screenshot 1. | DOC / INDUSTRY |

**ASO recommendations (INDUSTRY/OPINION):**

- **Keywords without paid tools:** use Play search autocomplete (type "gravity puzzle", "physics puzzle", "one touch"), the top-10 competitor listings (Flow Free, Gravity games, Cut the Rope-likes), and Google Trends. After launch, use Console → Store performance → search terms and the Grow-page keyword recommendations [S24]. Weave each term in 2–3 times, never as stuffing.
- **Localization order:** en-US → es-419, pt-BR → de, fr → ja, ko → id, tr, ru, hi. Use Console's Gemini pre-fill from a CSV [S24]. Have a person review the title and short description only.
- **Screenshots:** the first 2–3 frames do most of the converting. Lead with the **gameplay pull** (the verb) and move the star map to frame 2–3. Stay portrait, since the game is portrait. Captions of 3–6 words, high contrast.
- **Video:** a 20–30 s portrait-friendly cut with gameplay in the first 3 s and readable muted. Play Shorts is portrait and only rolling out to select developers [S24].
- **Reviews:** launch the in-app review after the World 1 boss clear or a first 3-star win, never after a fail. Cap it at once per 30 days locally. Reply to every review in the first month.
- **Pre-registration:** locked until production access [S1]. With no audience yet it is of little value, so skip it and use the closed-test cohort as the first reviewers (OPINION).

---

## 6. Trademark findings: "Gravity Flow" (not legal advice)

**USPTO (DOCUMENTED; live query of the tmsearch API on 2026-10-07):**

| Mark | Owner | Classes | Status | Relevance |
|---|---|---|---|---|
| GRAVITY FLOW, Reg. **8281133** (SN 99451755, filed 2025-10-20) | Rocketgenius, Inc. | 9, 42 (business-automation plugin software, SaaS) | **REGISTERED** | Same words; class 9 overlaps "software", but the goods are B2B workflow tools and the market is different. |
| GRAVITYFLOW 5560409 / GRAVITY FLOW 5579783 | Rocketgenius | 9, 42 | **Cancelled §8, 2025-03-21** | Replaced by the 2025 filing above. |
| **FLOW**, **FLOW FREE**, FLOW FREE: BRIDGES/HEXES/WARPS/SHAPES, FLOW FIT | **Big Duck Games** | 9 (mobile puzzle game software) | Registered / renewed | **Most relevant:** exactly the same niche (mobile puzzle). |
| FLOW (flOw) | Sony Interactive | 9 | Registered | Console games. |
| SAND FLOW (Crazy Labs, 2026), BEAT FLOW (Tactile), PIXEL FLOW, ANTS FLOW, X-FLOW, FLOWPLAY | various | 9 | Live or pending | "FLOW" is a **crowded** term in games, which weakens any single owner's claim. Two applications (SAND FLOW, BEAT FLOW) have received non-final office actions; the reasons were not checked. |
| GRAVITY WELL, REVERSE GRAVITY, GRAVITY MATTERS, G GRAVITY (Gravity Co.) | various | 9 / 41 | Live | "GRAVITY" is also crowded and descriptive for physics games. |
| GRAVITY MAZE / GRAVITYMAZE (Ravensburger) | Ravensburger | 28 (puzzles) | Live | Physical puzzles in class 28. |

- **Other jurisdictions:** I could not reach EUIPO (TMview API) or the WIPO Global Brand Database from this environment, so **the user should search them manually**: TMview (tmdn.org/tmview), WIPO branddb.wipo.int, and the Israel ILPO. Gravityflow.io says "Gravity Flow is a trademark of Rocketgenius Inc." Its earlier owner was Steven Henty S.L. (Spain), which raises the chance of an EU mark.
- **Store collisions:** I found no "Gravity Flow" game on Google Play or the App Store. There is an itch.io hobby game called "Gravity Flow" and an iOS app "Oilfield: Gravity & Flow Calc". These are minor.
- **Implication (OPINION):**
  - Against Rocketgenius: low-to-moderate confusion risk (different goods and buyers), but brand searches will be confused.
  - Against Big Duck's FLOW family: moderate. "Gravity" is descriptive, so "FLOW" carries the mark, in the same channel and category.
  - The crowding of "FLOW" lowers the risk; the fact that we can't register the name ourselves raises it.
- **Variant options:**
  1. **Keep "Gravity Flow"** and accept the risk. It is cheap now and costly to rebrand after traction.
  2. **Qualified name**, e.g. "Gravity Flow: Lost Star". This barely changes the legal analysis because the dominant phrase is unchanged.
  3. **Coined name.** Exact-phrase USPTO checks found **no live marks** for **STARPULL, PULLSTAR, STAR PULL, GRAVITY PULL, ORBIT FLOW**. (STARFLOW is taken in class 9/42 by Starflow AS; THE LOST STAR is taken in 9/41.)
- **Recommendation (OPINION):** decide before the first public listing. If you want a registrable brand, change to a coined name now and keep "physics puzzle" as the descriptor. Otherwise get a ~1-hour knockout opinion from a trademark attorney covering US, EU and IL.
- **Risk:** a C&D after launch would force a rename that loses the listing's reviews and ASO.

---

## 7. Release engineering

| Topic | Recommendation | Label |
|---|---|---|
| **versionCode** | Must only ever increase; max 2,100,000,000. Use `MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD` (1.0.0 build 1 → 1000001), or the CI run number. Never reuse a code, even for a rejected upload. | INDUSTRY |
| **versionName / rc** | Keep `versionName "1.0.0"` (users see it) and put the rc label in the **git tag** and release notes (`v1.0.0-rc.1`). Then **promote the same AAB** Internal → Closed → Production so the tested binary is the one that ships. | OPINION |
| **R8 / minify** | The code-optimization vital applies to games only above 50 MB of DEX [S12, S13]; measure it with `unzip -l app.aab \| grep .dex`. **Not needed for launch.** Even so, change to `proguard-android-optimize.txt` now, because AGP 9 rejects `proguard-android.txt` [S14]. If you enable R8 later: release builds only, a full smoke test on Internal, Crashlytics uploads the mapping automatically, and add keep rules for Capacitor plugin classes and annotations if anything breaks. Capacitor reaches plugins through reflection, so test thoroughly. | DOC / OPINION |
| **Play Integrity** | **Not needed (OPINION).** Purchases are validated server-side by RevenueCat with Google, there is no server-authoritative economy or real online leaderboard, and Play already blocks billing fraud automatically [S24]. Revisit if global leaderboards or a server-side economy ship. | OPINION |
| **Backups** | Keep `allowBackup=true`: Auto Backup preserves local progress, and backup to the user's own Drive is generally not treated as developer "collection" (OPINION, not verified against Play's FAQ). Optionally add `dataExtractionRules`. | OPINION |
| **GitHub Releases** | Tag every uploaded build and attach the changelog. **Do not attach** the AAB, mapping files or keystores publicly. Keep `keystore.properties` gitignored (already done). | INDUSTRY |
| **Native symbols** | If Console warns about native debug symbols (from plugin `.so` files), set `ndk.debugSymbolLevel 'SYMBOL_TABLE'`. | INDUSTRY |

---

## 8. iOS later: minimal delta

| Requirement | Note | Label |
|---|---|---|
| Apple Developer Program ($99/yr), **Xcode 26 / iOS 26 SDK** | Required for all uploads since 2026-04-28 [S26]. | DOC/INDUSTRY |
| **ATT** | Needed if ads use the IDFA. Add `NSUserTrackingUsageDescription`, and UMP can show the IDFA explainer. Without ATT consent, ads are non-personalized. | DOC (Apple) |
| **SKAdNetworkItems** | Paste Google's SKAdNetwork ID list into Info.plist. | INDUSTRY |
| **Privacy manifests** | GMA ≥11.2 and Firebase ship `PrivacyInfo.xcprivacy` [S27]. The app needs its own manifest for any required-reason APIs it calls (UserDefaults and similar). Capacitor's own manifest needs checking. | INDUSTRY |
| **App Privacy labels** | Mirror §2. "Data used to track you" covers the identifiers and usage data if ATT is granted. | INDUSTRY |
| **New age-rating questionnaire** (4+/9+/13+/16+/18+) | Mandatory since 2026-01-31 [S28]. | INDUSTRY |
| **Review risks** | **4.2 Minimum functionality**: a WebView wrapper gets rejected if it feels like a website. Our full offline game with haptics, IAP and Game-Center-ready features should pass (OPINION). **3.1.1**: purchases through StoreKit plus a visible **Restore Purchases** button. EU DSA trader status. | INDUSTRY |
| **Effort** | About **6–10 developer days** (platform, plugins, ATT/UMP, StoreKit and RevenueCat, assets, TestFlight) plus 1–2 review cycles. | OPINION |

---

## Sources (accessed 2026-10-07; page dates where shown)

- S1: Play testing requirements for new personal accounts. support.google.com/googleplay/android-developer/answer/14151465
- S2: Android developer verification (2026-06-18). android-developers.googleblog.com/2026/06/android-developer-verification.html
- S3: User Data policy. support.google.com/googleplay/android-developer/answer/10144311
- S4: App content page. support.google.com/googleplay/android-developer/answer/9859455
- S5: Target audience and content. support.google.com/googleplay/android-developer/answer/9867159
- S6: Advertising ID. support.google.com/googleplay/android-developer/answer/6048248
- S7: Data safety definitions. support.google.com/googleplay/android-developer/answer/10787469
- S8: AdMob Play data disclosure (updated 2026-10-02). developers.google.com/admob/android/privacy/play-data-disclosure
- S9: Play Age Signals overview (updated 2026-08-06). developer.android.com/google/play/age-signals/v3/overview
- S10: GA for Firebase data disclosure. support.google.com/analytics/answer/11582702
- S11: Firebase Play data disclosure (updated 2026-10-06). firebase.google.com/docs/android/play-data-disclosure
- S12: Android vitals (updated 2026-10-06). developer.android.com/topic/performance/vitals
- S13: DEX code optimization (2026-09-21). developer.android.com/topic/performance/vitals/code-optimization
- S14: AGP 9 / proguard-android.txt. capawesome.io/blog/how-to-fix-capacitor-plugin-build-errors-with-agp-9 (INDUSTRY)
- S15: In-app review API. developer.android.com/guide/playcore/in-app-review
- S16: RevenueCat Google Play Data Safety. revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety
- S17: Account deletion requirement. support.google.com/googleplay/android-developer/answer/13327111
- S18: GA User Deletion API. developers.google.com/analytics/devguides/config/userdeletion/v3
- S19: Metadata policy. support.google.com/googleplay/android-developer/answer/9898842
- S20: AdMob app-ads.txt. support.google.com/admob/answer/9363762
- S21: Developer address display for monetized accounts. support.google.com/googleplay/android-developer/answer/13634081
- S22: IARC / content ratings. support.google.com/googleplay/android-developer/answer/9898843 and globalratings.com
- S23: Preview assets. support.google.com/googleplay/android-developer/answer/9866151
- S24: I/O 2026: what's new in Google Play (2026-05-19). developer.android.com/blog/posts/i-o-2026-what-s-new-in-google-play
- S25: Store listing experiments / CSL. play.google.com/console/about/customstorelistings
- S26: Xcode 26 requirement. capgo.app/blog/xcode-26-requirement-for-capacitor-apps (INDUSTRY)
- S27: AdMob iOS data disclosure. developers.google.com/admob/ios/privacy/data-disclosure
- S28: Apple age ratings (2025-07). Press coverage (INDUSTRY)
- Trademark: USPTO tmsearch API (live, 2026-10-07); tsdr.uspto.gov SN 87781934 and 86559276; gravityflow.io/trademark
- Texas SB 2420 status: ccianet.org/litigation/ccia-v-paxton and press (INDUSTRY)
