# Gravity Flow — Monetization Research & Decision Log

Researched 2026-10-07 · Scope: RevenueCat (Capacitor), Play Billing 8, AdMob/UMP (@capacitor-community/admob), ad policy, economy, rewarded/hint design.
Evidence labels: **DOCUMENTED** (official vendor/Google/legal docs) · **VERIFIED-IN-SOURCE** (read in this repo / node_modules / Gradle cache) · **INDUSTRY** (reputable industry data; correlational unless stated) · **OPINION** (my recommendation/heuristic).

## 0. Ground truth from source (VERIFIED-IN-SOURCE)

| Fact | Where |
|---|---|
| Installed: `@revenuecat/purchases-capacitor` 13.1.5 → `purchases-hybrid-common` 18.10.0 → resolved `com.revenuecat.purchases:purchases` **10.8.0**, `com.android.billingclient:billing` **8.3.0**. So we meet Play's Billing Library 8 requirement (PBL 7 deadline was Aug 31 2026, extensions to Nov 1 2026). Latest Capacitor plugin is 13.4.0 (hybrid 18.29.0). | package.json, android plugin build.gradle, `~/.gradle/caches` |
| Native RC plugin is `@CapacitorPlugin(name = "Purchases")`. The official JS entry is just `registerPlugin('Purchases', { web: lazy })`, so a dynamic `import('@revenuecat/purchases-capacitor')` inside the native guard is safe and gives you the typed enums (`PURCHASES_ERROR_CODE`, `PRODUCT_CATEGORY`, `LOG_LEVEL`). | PurchasesPlugin.kt:80, dist/esm/index.js |
| Native `purchasePackage` rejects unless the package object includes `presentedOfferingContext`. You must pass the exact object returned by `getOfferings()`; don't build a slimmed-down `Pkg`. | PurchasesPlugin.kt:276-293 |
| `getProducts` defaults to `type: "SUBSCRIPTION"` on Android. One-time products need `PRODUCT_CATEGORY.NON_SUBSCRIPTION`. | PurchasesPlugin.kt:226-229 |
| Errors reject as `(message, code-string, info)`. Codes: `"1"` cancelled, `"6"` already purchased, `"10"` network, `"20"` **payment pending**, `"35"` offline, `"42"` Test Store simulated failure. | PurchasesPlugin.kt:800; errors.d.ts |
| `addCustomerInfoUpdateListener` does **not** emit the current info on Android when you register: `lastSeenCustomerInfo` is a `val … = null` that's never assigned. Call `getCustomerInfo()` yourself after you configure. | PurchasesPlugin.kt:83,190-195 |
| AdMob `showRewardVideoAd()` resolves only inside `onUserEarnedReward`. Dismiss and FailedToShow only notify listeners and never settle the call, so the current `Ads.showRewarded` hangs forever when a user closes the ad early. | RewardedAdCallbackAndListeners.kt, FullscreenPluginCallback.kt |
| `showInterstitial()` resolves right after `ad.show()`, **not** on dismissal. Neither executor clears the static ad after showing (they're one-shot objects), so a second show without a fresh prepare fails through FailedToShow. | AdInterstitialExecutor.java, AdRewardExecutor.java |
| `AdMob.initialize()` resolves without waiting for `onInitializationComplete`. It applies `testingDevices` only when `initializeForTesting: true`. `showConsentForm()` wraps `loadAndShowConsentFormIfRequired`, so it's safe to call every time. `requestConsentInfo` returns `canRequestAds` and `privacyOptionsRequirementStatus`. Plugin deps: GMA 24.9.x, UMP 4.0.0. | AdMob.java, AdConsentExecutor.java, build.gradle |
| The plugin README calls `initialize()` **before** consent. That order is wrong; use Google's order (§3). | README.md:107-136 |
| `MainActivity` uses `android:launchMode="singleTask"`. RevenueCat warns that any mode other than `standard` or `singleTop` can cancel a purchase when the app is backgrounded (3DS/bank-app hops). | AndroidManifest.xml:26 |
| The manifest has no Firebase consent-mode defaults. `@capacitor-firebase/analytics` exposes `setConsent`. | AndroidManifest.xml, plugin definitions |
| **New bug:** after a user watches the campaign 2× rewarded ad, `advanceAfterWin()` immediately calls `maybeInterstitial()`, which can stack an interstitial on top of the rewarded view. | GameScene.ts:1399-1404 → 1163 |
| **New issue:** 4 of 6 collections (cosmic, mythic, trails, arrivals) contain bundle-only items. `collectionComplete` counts every item, so 80 of the 120 collection-reward Fragments sit behind a purchase. | cosmeticsLogic.ts, cosmetics.ts |
| **New issue:** both `starter` and `founders` grant Remove Ads (`premium: true`). A Starter buyer who later buys Founder's pays for Remove Ads twice. | monetization.config.ts |

---

## Q1. RevenueCat on Capacitor: init, offerings, purchase, restore, entitlements

**Sources:**
- Capacitor install: https://www.revenuecat.com/docs/getting-started/installation/capacitor
- Making purchases: https://www.revenuecat.com/docs/getting-started/making-purchases
- Restoring purchases: https://www.revenuecat.com/docs/getting-started/restoring-purchases
- CustomerInfo: https://www.revenuecat.com/docs/customers/customer-info
- Entitlements: https://www.revenuecat.com/docs/getting-started/entitlements
- Non-subscriptions: https://www.revenuecat.com/docs/platform-resources/non-subscriptions
- Android products: https://www.revenuecat.com/docs/getting-started/entitlements/android-products
- Google Play edge cases (2026-02-02): https://www.revenuecat.com/blog/engineering/google-play-edge-cases
- Refunds: https://www.revenuecat.com/docs/subscription-guidance/refunds
- Test Store: https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
- Play service credentials: https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials

**Key findings (all DOCUMENTED):**
- Configure once, after the platform is ready.
- If you omit `appUserID`, RevenueCat generates an anonymous ID.
- Offerings are prefetched at launch, and `getCustomerInfo()` is "safe to call frequently". The cache refreshes when it's older than 5 minutes. When RevenueCat's servers are down, the SDK grants entitlements from a local store check.
- One entitlement can be unlocked by many products, and one product can unlock many entitlements. A non-consumable unlocks its entitlement "forever".
- **On Play, you must mark each one-time product as Non-consumable in the RevenueCat dashboard.** Otherwise "we will automatically consume the purchase", and the user can buy it again.
- Billing Library 8 removed the ability to query consumed one-time purchases. A consumed lifetime unlock therefore can't be restored for anonymous users. This makes the dashboard flag critical.
- RevenueCat acknowledges or consumes transactions automatically, so Google's 3-day acknowledgement rule is handled.
- Pending purchases throw `PAYMENT_PENDING_ERROR` and grant nothing. When the payment completes, RevenueCat processes it from RTDN and pushes the change through the CustomerInfo listener or the next fetch.
- Call `restorePurchases` only from a user action. Use `syncPurchases` for programmatic syncs.
- Back up RevenueCat's SharedPreferences (Auto Backup is on; `allowBackup="true"` is already set) so the anonymous ID survives a reinstall.
- A Play refund can take up to 24h to reach RevenueCat. The entitlement is then revoked, and an app that listens to CustomerInfo sees it.
- `purchaseStoreProduct` + `getProducts` are for non-offering flows. Offerings/packages are the primary path.

**Implication for Gravity Flow:** Every listed IAP bug has the same root cause: cosmetics are treated as local grants instead of being **derived from entitlements**. Fixing that one model fixes restore, refunds, pending purchases, the `|| true` hack, and cross-device ownership together.

**Recommended implementation (OPINION, built on the documented APIs):**

*Entitlement and product map.* The game is unlaunched, so rename `premium` to `no_ads` now. Every product is a Play one-time product with one "Buy" option marked backwards-compatible, flagged **Non-consumable** in RevenueCat, attached to the entitlements below, and placed in offering `default` (current) under a custom package id.

| Play product id | Package id | Entitlements unlocked | Cosmetics derived from entitlement |
|---|---|---|---|
| `remove_ads` | `remove_ads` | `no_ads` | — |
| `starter_pack` | `starter` | `no_ads`, `pack_starter` | trail_galaxy |
| `premium_collection_pack` | `premium_collection` | `pack_premium_collection` | cosmic_blackhole, arrival_bolt |
| `founders_pack` | `founders` | `no_ads`, `pack_founders` | mythic_phoenix, mythic_dragon |
| (new, optional) `supporter_pack` | `supporter` | `no_ads`, `pack_supporter` | supporter set |
| (optional) `tip_small` / `tip_large` | — | none (mark **Consumable**) | thank-you only, nothing to restore |

Why one entitlement per bundle, rather than reading `allPurchasedProductIdentifiers`: RevenueCat recommends entitlements (they decouple you from product ids), and entitlements are what refunds revoke. `nonSubscriptionTransactions` is fine for an audit or debug screen only.

*Init order* (`IAP.initNative`, started early in `main.ts` and non-blocking):
1. `const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor')`, behind `isNativePlatform()`. Never return the proxy from an async function (it's thenable).
2. In dev builds only, `setLogLevel({ level: LOG_LEVEL.DEBUG })`.
3. `configure({ apiKey })` with no `appUserID` (anonymous). The key comes from `import.meta.env`: the `goog_…` key in release builds, the Test Store key in debug builds only. RevenueCat: never ship the Test Store key.
4. `addCustomerInfoUpdateListener(apply)`.
5. `apply((await getCustomerInfo()))`. This step is mandatory because the listener doesn't replay the current info (§0).
6. `getOfferings()` → cache `{packageId → PurchasesPackage, priceString}`.

`apply(info)` writes `{activeEntitlements[], at}` to localStorage, which keeps `isPremium()` synchronous. It then recomputes owned bundle cosmetics, and if the equipped cosmetic is no longer owned (refund, or a different Google account), it falls back to the default.

*Price display:* show `pkg.product.priceString` only. If offerings haven't loaded, show a neutral "…" and disable the button. Delete `priceLabel` and `REMOVE_ADS_PRICE_LABEL`.

*Package lookup:* `offerings.current?.availablePackages.find(p => p.identifier === pkgId) ?? find(p => p.product.identifier === productId)`. If neither matches, mark the card "Unavailable" and track `no_package`. **Never fall back to `[0]`.**

*Purchase:* `purchasePackage({ aPackage: pkg })` (the full object) → `apply(customerInfo)` → success **only if** the target entitlement is active. Error handling:

| `e.code` | Outcome | UX |
|---|---|---|
| `1` cancelled | `cancelled` | No error toast |
| `20` pending | `pending` | Persist a pending marker. Show "Payment pending — unlocks automatically when it completes". The listener resolves it later. |
| `6` already purchased | Call `restorePurchases()` (user-initiated, so allowed) → `apply` | — |
| `10` / `35` | `network` | "Check connection" |
| anything else | `error` | — |

Analytics: add `purchase_pending`. Fire `purchase_completed` only when the entitlement is active.

*Restore* (Settings + shop button): `restorePurchases()` → `apply` → toast that lists the restored items, or "No purchases found for this Google account". It covers **all** entitlements.

*Android:* change `launchMode` to `singleTop` and regression-test the App/deep-link behaviour.

*Production checklist:*
1. Play: merchant account. Products created and **Active**, each with one backwards-compatible Buy option and per-country prices.
2. Upload a signed build to internal/closed testing. License testers list. Testers open the opt-in URL.
3. Google Cloud: enable the Play Android Developer API and Reporting API. Create a service account with the four Play Console permissions. Upload the JSON to RevenueCat and allow ≤36h. Set up the RTDN Pub/Sub topic.
4. RevenueCat: products flagged Non-consumable, entitlements, offering `default` set as current. Keep the default transfer behavior.
5. Release builds use the `goog_` key and a release-key SHA-matching package id.

**Risks/tradeoffs:**
- With anonymous IDs, recovery depends on Google-account restore plus backup. That's acceptable without accounts.
- Refund revocation lags by ≤24h.
- RevenueCat **does not support Play one-time discount offers** (staff, 2026-09-02: https://community.revenuecat.com/sdks-51/re-progress-on-one-time-product-discounts-on-the-play-store-7811). Any "sale" needs a separate product id.

**Validation:** see the device test matrix at the end (rows P1–P15).

## Q2. Play Billing 8 one-time products, pending purchases, refunds

**Sources:**
- https://developer.android.com/google/play/billing/one-time-products
- https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers
- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/billing/deprecation-faq
- https://developer.android.com/google/play/billing/test
- RevenueCat BL8 post (2025-07-24): https://www.revenuecat.com/blog/engineering/google-play-billing-v8

**Key findings (DOCUMENTED):**
- One-time products now have **purchase options** (Buy, Rent) and **offers** (discount, pre-order). "At least one buy purchase option should be marked as legacy compatible", and the first Buy option is backwards-compatible by default.
- Apps "must enable and support pending transactions for one-time products", and must grant only on `PURCHASED`.
- Purchases must be acknowledged within 3 days or they're auto-refunded. For license testers the window is 3 minutes.
- Refunded, cancelled and charged-back purchases stop counting as owned.
- Deadline table: PBL 7 → Aug 31 2026 (extension to Nov 1 2026). PBL 8 → Aug 31 2027.

**Implication:** RevenueCat 10.8.0 / BL 8.3.0 covers enabling pending purchases, acknowledgement and RTDN (VERIFIED-IN-SOURCE + DOCUMENTED). The app-side duties are: a pending-state UI, grants derived from entitlements, and the Non-consumable flag.

**Recommended:**
- Keep exactly one Buy option per product. Don't use Rent or Play-side discounts (RevenueCat doesn't support them).
- A "launch price" means a second product id plus an offering swap, and must follow the EU reference-price rule (Q5).
- Use the license-tester **3-minute auto-refund** as the acknowledgement smoke test: if a tester purchase gets refunded after 3 minutes, the Non-consumable/ack configuration is broken.

## Q3. AdMob via @capacitor-community/admob 8.0.0

**Sources:**
- Plugin definitions and Android source (VERIFIED-IN-SOURCE)
- UMP/privacy: https://developers.google.com/admob/android/privacy
- Rewarded: https://developers.google.com/admob/android/rewarded
- AdMob frequency capping: https://support.google.com/admob/answer/6244508

**API surface (VERIFIED-IN-SOURCE):**
- Rewarded events: `onRewardedVideoAdLoaded`, `onRewardedVideoAdFailedToLoad`, `onRewardedVideoAdShowed`, `onRewardedVideoAdFailedToShow`, `onRewardedVideoAdDismissed`, `onRewardedVideoAdReward` (enum `RewardAdPluginEvents`).
- Interstitial events: `interstitialAdLoaded`, `interstitialAdFailedToLoad`, `interstitialAdShowed`, `interstitialAdFailedToShow`, `interstitialAdDismissed`.
- Loading and showing: `prepareInterstitial` / `prepareRewardVideoAd({ adId, immersiveMode?, npa?, isTesting?, ssv? })` resolve on load. `showInterstitial` resolves immediately. `showRewardVideoAd` resolves on reward only.
- UMP: `requestConsentInfo({ debugGeography, testDeviceIdentifiers, tagForUnderAgeOfConsent })` → `{ status, isConsentFormAvailable, canRequestAds, privacyOptionsRequirementStatus }`. Plus `showConsentForm()`, `showPrivacyOptionsForm()`, `resetConsentInfo()`.
- `initialize({ testingDevices, initializeForTesting, tagForChildDirectedTreatment, tagForUnderAgeOfConsent, maxAdContentRating: General | ParentalGuidance | Teen | MatureAudience })`. Also `setApplicationMuted` / `setApplicationVolume`.

**Google guidance (DOCUMENTED):**
- Call `requestConsentInfoUpdate` on **every launch**, then load/show the form if required, then check `canRequestAds()` **before initializing the SDK or requesting ads**.
- Show a privacy-options entry point when `getPrivacyOptionsRequirementStatus() == REQUIRED`.
- Don't cache consent yourself, and guard against double initialization.
- Preload ads; they expire after 1 hour. Each ad is one-time use: null it on dismiss and reload. Grant the reward only in `onUserEarnedReward`.

**Recommended implementation (OPINION):**
- **Boot (CompanySplash, non-blocking):** `requestConsentInfo()` (debug geography and test IDs in DEV only) → `showConsentForm()` (no-op when not required) → keep `privacyRequired`. If `canRequestAds`, call `initialize({ maxAdContentRating: ParentalGuidance, initializeForTesting: DEV, testingDevices: DEV_IDS })` once, guarded by an `initPromise`. Then preload the rewarded ad, and the interstitial unless `no_ads`. Bridge consent to Firebase (Q4).
- **Settings:** add a "Privacy choices" row, visible when `privacyRequired`, that calls `showPrivacyOptionsForm()` and then re-runs `requestConsentInfo()`.
- **Cache state:**
  - Track `{ready, loadedAt}` per format from Loaded/FailedToLoad events. Reload after Dismissed/FailedToShow.
  - Retry FailedToLoad with backoff (30s → 60s → 120s → max 5 min).
  - Reload if `now - loadedAt > 55 min`.
  - `isRewardedReady()` must return the real state, and the UI hides or disables every rewarded offer that isn't ready.
- **Rewarded call:** register `Rewarded`, `Dismissed` and `FailedToShow` listeners first. Then fire `showRewardVideoAd()` **without awaiting it**, and add `.catch(→unavailable)`. Resolve `'earned' | 'dismissed' | 'unavailable'` **on Dismissed** (wait about 300 ms for a late Reward event), or on FailedToShow. Remove the listeners and trigger a reload. Add a watchdog: if Showed hasn't arrived within 5s, resolve `'unavailable'`. Mute game audio while the ad shows.
- **Interstitial call:** `await showInterstitialAndWait()` resolves on Dismissed or FailedToShow (the same 5s Showed watchdog). If no ad is ready at the break, **skip it; never wait on a load**.
- **Belt and braces:** set an AdMob server-side frequency cap on the interstitial unit, e.g. 1 per 3 min and 10 per day.

## Q4. Google policy: interstitials, rewarded, app-ads.txt, consent ordering

**Sources (DOCUMENTED):**
- Disallowed interstitials: https://support.google.com/admob/answer/6201362
- Interstitial guidance: https://support.google.com/admob/answer/6066980
- Rewarded policy: https://support.google.com/admob/answer/7313578
- Play Better Ads / disruptive ads: https://support.google.com/googleplay/android-developer/answer/9857753
- app-ads.txt: https://support.google.com/admob/answer/9363762 and https://support.google.com/admob/answer/15948559
- Certified CMP requirement: https://support.google.com/admob/answer/13554020
- Consent mode for apps: https://developers.google.com/tag-platform/security/guides/app-consent?platform=android

**Key findings:**
- **Interstitials:**
  - Interstitials belong "at logical breaks … (pages, stages, or levels)".
  - Disallowed: on app load or exit; "no more than one interstitial ad after every two user actions"; never directly after another full-screen ad; never "suddenly … when a user is focused on a task (e.g. playing a game)".
  - Play explicitly bans "ads that appear during game play at the beginning of a level". Full-screen ads must be closable within 15s unless they're opt-in or shown at a non-interruptive break such as a post-game score screen.
  - **The current bug (interstitial over the freshly restarted next level) violates the "beginning of a level" rule directly.**
- **Rewarded:** must be affirmatively opted into, with "clear, accurate and conspicuous disclosure" of the reward before each view. The reward must be delivered. The ad must be skippable without impeding the app. No "watch to support us" persuasion. No monetary rewards.
- **app-ads.txt:** apps added after January 2025 without verification get "limited ad serving". Host `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0` at the root of the developer website listed on Play. Crawling takes ≤24h. The repo doesn't have this file yet (VERIFIED-IN-SOURCE).
- **Consent:** a Google-certified, TCF-integrated CMP (UMP qualifies) is required for EEA, UK and Switzerland traffic.
- **Firebase consent mode:** default consent is set through manifest keys `google_analytics_default_allow_{analytics_storage, ad_storage, ad_user_data, ad_personalization_signals}`. The last two accept `eu_consent_policy`. Update with `setConsent`.

**Recommended:**
- Add the manifest defaults: `analytics_storage=true`, `ad_storage=true`, `ad_user_data=eu_consent_policy`, `ad_personalization_signals=eu_consent_policy`.
- After UMP resolves, call `FirebaseAnalytics.setConsent` with granted/denied matching `canRequestAds` and the consent status (OPINION).
- Verify whether GA4F reads UMP's TCF string automatically: I found no Google doc that confirms it for UMP (unverified).
- Fill the Data safety form for AdMob, Firebase and the AD_ID permission.
- Make an explicit Play target-audience decision (13+ recommended). If the game is judged to appeal to children, the Families ads policy applies.

## Q5. Economy design: currencies, sinks, shop, pricing, offers

**Sources:**
- Unity game economy guide (accessed 2026-10-07): https://unity.com/resources/game-economy-design-guide (INDUSTRY)
- GameRefinery via Mobidictum (2023-06-09), Brawl Stars catalog shop: https://mobidictum.com/gamerefinery-mobile-game-market-review-may-2023/ (INDUSTRY)
- EU CPC virtual-currency principles (2024-03) and CPC enforcement vs King/Supercell et al. (PocketGamer, 2026-09-30): http://www.pocketgamer.biz/europes-cpc-targets-king-supercell-mojang-and-others-over-virtual-currencies/ (DOCUMENTED/regulatory)
- Omnibus Directive Art. 6a, 30-day prior-price rule: https://eur-lex.europa.eu/eli/dir/1998/6/2022-05-28/eng (DOCUMENTED)
- Play pricing; templates removed 2025-10-27: https://support.google.com/googleplay/android-developer/answer/6334373 (DOCUMENTED)
- Play price experiments: https://support.google.com/googleplay/android-developer/answer/13343030 (DOCUMENTED)
- Meta monetization best practices: https://developers.facebook.com/documentation/games/monetize/best-practices (INDUSTRY)
- Starter-pack practice (2016, aggressive): https://www.pocketgamer.biz/best-practices-starter-bundles/ (INDUSTRY)

**Key findings:**
- Dual currency exists so that "free players always have something to earn while paying players have something worth buying". In other words, it separates **paid** value from **earned** value.
- "Sinks are what keep currency meaningful". Audit every faucet against a sink. Cap ad faucets. Add rotating or seasonal sinks.
- Brawl Stars replaced a small daily-rotating skin selection with an always-available catalog.
- EU regulators (CPC 2024 principles, active enforcement from Sept 2026, and the Digital Fairness Act planned for Q3 2026) target layered and confusing currencies, prices hidden behind currencies, and pressure selling.
- "Was €X" claims must use the lowest price of the prior 30 days.
- Play auto-converts prices at FX rates, with no purchasing-power adjustment. Price experiments are available for one-time products.

**Implication:** Fragments are a "premium" currency that nobody can buy. That keeps the cost of dual currency (cognitive load, a second balance to tune, the "premium" label implying money) without its only benefit (separating paid from earned value). Calling Fragments "premium" is an anti-pattern here (OPINION). Selling them would be worse: Gravity Flow would then fall inside the CPC regime. **Recommendation: one earned currency (Stardust). Real money buys items directly, never currency.**

**Recommended economy:**
1. **Merge Fragments into Stardust at ×10, applied to sources and sinks alike**, so the change is value-neutral by construction.
   - Fragment prices ×10: Nova Core 300 · Pulsar Star 350 · Glitch 350 · Quantum 450 · Supernova 650 · Titan Eye 900 · Fire/Ice/Star Burst/Portal 250 each · Lightning/Nova Explosion 500 each · Void Trail/Cosmic Bloom 1,000 each = **7,000**.
   - Existing Stardust items stay at 440.
   - **Earnable catalog = 7,440 SD**, versus about 3,000 earned over the campaign.
   - Migrate existing balances: `SD += FR × 10`.
2. **Source/sink table** (proposed; "today" = current code):

| Source | Today | Proposed | Sink | Today | Proposed |
|---|---|---|---|---|---|
| Level win | 5 + 3/★ | First clear 5 + 3/★. Replays award only newly earned ★ (×3) | Earnable catalog | 440 SD + 700 FR | 7,440 SD |
| Rewarded 2× (campaign) | Every win | ≤1 per 3 wins, ≤4/day | Seasonal drop | — | +1,000–1,500 SD per content update |
| Free Fragments ad | 5 FR/day | "Daily Star Chest" 50 SD/day (rewarded) | Procedural recolor variants | — | 150 SD each. Near-zero marginal cost because cosmetics are runtime Graphics |
| Achievements | sd + fr | sd + fr×10 (e.g. stars_all 150 + 200) | Weekly Spotlight | — | One item 20% off **in Stardust only**. Honest schedule, no countdown |
| ★ milestones | 10/15/25/40 FR | 100/150/250/400 SD | Mastery unlocks | — | Achievement-gated cosmetics (no currency), e.g. 150★ → "Celestial" skin. This takes over Fragments' prestige role |
| Collection complete | 20 FR | 200 SD; count **earnable items only** | — | — | Move bundle exclusives into a "Supporter" collection |
| Login ladder | 10–40 SD (+fr) | Unchanged (+fr×10) | | | |

   **Health targets (OPINION):** first affordable item by level ~5. An affordable unowned item every ~8–12 levels. A campaign finisher owns ~40–50% of earnables. Track "days of currency on hand" and "% of DAU with an affordable unowned item".
3. **Paid catalog:**
   - Remove Ads $2.99 (from $1.99). Weak INDUSTRY range: $1.99–$4.99.
   - Starter $3.99 (Remove Ads + Galaxy Trail), **hidden once `no_ads` is owned**.
   - Premium Collection $4.99 (cosmetic-only).
   - Founder's $7.99. If `no_ads` is already owned, label it "Remove Ads ✓ already yours".
   - New Supporter Pack $9.99 (exclusive set + `no_ads`).
   - Seasonal packs $2.99 each.
   - Optional consumable tips $0.99 / $4.99.
   - That raises the max spend from about $16 to about $30 at launch, growing with seasons.
   - "Remove Ads" removes interstitials only; rewarded ads stay opt-in, matching Meta's guidance. An optional "No-Ads+" perk on Supporter/Founder's could grant rewarded rewards without the ad, under the **same caps**.
4. **Offers ethics:**
   - Allowed: a starter-deal spotlight after the first win, shown to non-payers for their first 7 days as a highlighted card. No modal and no countdown.
   - Banned: countdowns, fake "was" prices, gacha/loot boxes. The 2016 "90% off, LIMITED TIME!!!" playbook is explicitly rejected.
   - Any real discount uses a separate product and the 30-day prior-price rule.
5. **Regional pricing:**
   - Set a USD base, then hand-tune PPP prices for IN, BR, ID, MX, TR, PH and EG. Pricing templates are gone, so this is per-product.
   - Run a Play price experiment only once there are a few hundred purchases a month.

**Risks:**
- Migration bugs in balances. Write a TDD'd pure migration with an idempotent version key.
- A bigger catalog means more QA of the procedural visuals.

## Q6. Rewarded placement and interstitial benchmarks

**Sources (INDUSTRY):**
- Unity Mobile Growth & Monetization Report 2024, via PocketGamer (2024-09-17): http://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/
- Unity, top 5 puzzle placements (2023-04-30): https://unity.com/blog/top-5-rewarded-video-placements-to-boost-puzzle-game-revenue
- Unity, rewarded impact on IAP and retention (2022-08-24): https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement
- Meta best practices (above)
- Morning Words dev case (2026-10-01): https://hackernoon.com/how-i-monetize-morning-words-without-interrupting-players-after-every-level

**Key findings:**
- Rewarded engagement reaches about 36% of DAU in casual games and 38.4% in word games.
- **Context placements ("ran out of resources") get 38.1% engagement versus 23.8% between levels.**
- Top puzzle placements: reward multiplier, extra currency (1–2 per day), revive, booster, daily or mystery chest.
- Rewarded watchers are 4.5× more likely to purchase and retain better. This is **correlational / self-selected**, from 8 apps.
- Interstitial spacing ranges from 60–90 s (Meta, aggressive) to 120–240 s in puzzle (blog consensus, weak).
- One indie puzzle dev uses no interstitials for levels 1–19, one every 3 levels with a 3-minute cooldown, and **resets the timer after a rewarded view**.

**Implication:** today a between-levels 2× offer shows on every win. That's the lowest-engagement context used at the highest frequency. Move value into "stuck" contexts (Q7) and cap the 2×.

**Proposed cap table (OPINION):**

| Placement | Format | When | Caps / guards |
|---|---|---|---|
| Win → next level (campaign) | Interstitial | After the win overlay, **awaited before** `scene.restart` (overlay held, input off, audio muted) | None before lifetime level 12 or in the first 3 completions of a session. ≥180 s **and** ≥3 completions since the last full-screen ad (rewarded included). ≤4 per session, ≤10 per day. Skip after boss, 3★ or streak (existing). Only if preloaded. Never after a death, on launch or on resume. |
| Campaign 2× Stardust | Rewarded | Win overlay, when ready | ≤1 per 3 wins, ≤4 per day |
| Stuck hint (new) | Rewarded / earned token | After 3 deaths, or 90 s without a win on the same level | 1 per attempt, 60 s cooldown, ≤5 per day |
| Daily Star Chest | Rewarded | Menu / shop | 1 per day |
| Endless revive / 2× | Rewarded | Run death / run end | 1 per run each. Revived runs stay off the leaderboard (existing) |

Any rewarded view resets the interstitial clock.

## Q7. Hint / "show solution" monetization

**Sources (INDUSTRY):**
- CrazyGames puzzle monetization: https://docs.crazygames.com/resources/monetizing-puzzle/ — rewarded hints, "1-minute cooldown … to prevent … watching ads back-to-back to solve the whole puzzle", no stars for skipped levels
- Unity booster and context placements (above)
- AdMob rewarded policy (above)

**Key finding:** Rewarded hints in "stuck" moments are standard practice and match the highest-engagement placement context. The integrity safeguards are cooldowns and not awarding mastery for assisted or skipped clears.

**Recommended (OPINION):**
- **Tier 0, free:** after 3 deaths, show the level's `hint` text plus an arrow to the first waypoint.
- **Tier 1, "Route Ghost":** reuse the existing ghost-trail renderer (`ghost.ts`/GhostStore) to play a dev-recorded solution path of the ball. The player still has to execute it, which preserves the skill fantasy. Unlock it with a rewarded ad or an **earned Hint Token** (+1 per world mastered, +1 per 10 three-star clears, cap 5). **Never sell hints for money**, which keeps the no-P2W pledge.
- **Integrity:** an assisted clear gets ★ and ★gem but no par/efficiency ★, and is marked "assisted" until replayed unassisted. Excluded from daily, weekly and leaderboard modes.
- **Never** offer a hint during the first-touch tutorial levels (1–3).
- **Measure** `hint_offered` / `hint_used` per level to find difficulty spikes. That's level-design telemetry, not just revenue.

---

## Device validation matrix (license tester + test ads, release-signed internal track)

| # | Scenario | Expected |
|---|---|---|
| C1 | Fresh install, UMP `debugGeography: EEA` | Consent form at launch, before any ad request. "Privacy choices" visible in Settings. |
| C2 | Consent "Manage → reject all" | Game fully playable. Rewarded offers hidden or unavailable when not filled. No crash or hang. |
| C3 | Non-EEA geography | No form. Privacy row hidden (unless the US-states message applies). |
| A1 | Win at level ≥12, cap elapsed | Interstitial shows over the frozen win overlay. The next level starts only after dismissal and its timer starts fresh. |
| A2 | Watch 2× rewarded, then advance | **No** interstitial follows. |
| A3 | Rewarded: close early / airplane mode / double-tap | No reward and no hang / button hidden / single show. |
| A4 | Rewarded watched fully | Reward granted exactly once, after dismissal. Ad reloads. |
| A5 | Buy Remove Ads mid-session | No further interstitials. Rewarded still offered. |
| P1 | Test card "always approves" (each product) | Entitlement active. Bundle cosmetics owned. Localized `priceString` shown. |
| P2 | "Always declines" / user cancels sheet | Error toast / **no** toast. No grant. |
| P3 | "Slow test card, approves after a few minutes" | Pending UI. Unlocks via the listener, or on next foreground, without reinstall. |
| P4 | "Slow test card, declines" | Pending clears. No grant. |
| P5 | Wait >3 min after a tester purchase | **Not** auto-refunded (proves non-consumable + acknowledgement). |
| P6 | Attempt to rebuy a non-consumable | Play blocks it as already owned. On `code 6`, the app syncs and unlocks. |
| P7 | "Approves then charges back", and Console "Refund + revoke" | Within ~24h the entitlement is gone, cosmetics are removed, and the equipped item falls back to default. |
| P8 | Uninstall/reinstall, same account | Note whether entitlements return automatically. After tapping Restore, **all 4** entitlements (including bundles) are back. |
| P9 | Second device, same account | Restore → everything owned. |
| P10 | Second Google account on the same device | Cached entitlements are reconciled away on launch. |
| P11 | Offline launch after purchase | Still ad-free and cosmetics owned (cache). An offline purchase gives a network message. |
| P12 | Play Billing Lab country → IN / DE | Local currency prices. No "$". |
| P13 | Background the app during purchase (bank/3DS hop) with `singleTop` | Purchase completes, not cancelled. |
| P14 | Debug build with the Test Store key | Simulated success, failure and cancel paths (error 42) all handled. |
| P15 | Release APK | Contains the `goog_` key, not the Test Store key. Real ad unit IDs. `app-ads.txt` verified in AdMob. |
