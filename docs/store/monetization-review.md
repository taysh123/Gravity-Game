# Gravity Flow — Monetization & Economy Review

Sprint 2.5 (Monetization Expansion). Phase A is the pre-implementation audit; the
five completion reviews are appended at the end (M9).

---

## PHASE A — Audit (current state, before Sprint 2.5)

Sprint 2 delivered the monetization *plumbing* (AdMob, RevenueCat, Firebase, all
behind guarded seams). The *content and loops* are nearly empty.

### Current economy (measured)
- **Cosmetics:** 6 ball-skins only — 1 free + 5 at 40–100 Stardust. Flat
  `{id,name,cost,fill,glow}`, drawn as a dot. No rarity, categories, collections, or
  real preview.
- **Currency:** Stardust only. Earn `5 + 3·stars` per win, `15 + 3·stars` daily, plus
  streak milestones (10/25/50/100 at 3/7/14/30 days). **The only sink is 5 cheap items.**
- **Achievements:** 15 defined — **grant nothing** (pure UI).
- **Rewarded ads:** `Ads.showRewarded()` exists with **zero call sites** — unused.
- **Premium (Remove-Ads):** only suppresses interstitials — no cosmetic value.
- **Win visuals:** trail = ball glow; goal burst = a static green — not customizable.

### Weaknesses → the Sprint 2.5 plan
| Weakness | Fix |
| --- | --- |
| Nothing to chase / spend on | Rarity-tiered **skins**, new **Trails** + **Arrival Effects**, **collections** (~29 items) |
| Single shallow currency | Add **Cosmic Fragments** (premium) → dual loop (grind vs premium) |
| Achievements are dead weight | Achievements **grant** Stardust/Fragments/cosmetics |
| Rewarded ads earn nothing | Opt-in loops: double Stardust, hint, extra daily, free Fragments |
| No premium SKUs | **Bundles** (Starter / Founder's / Premium Collection) — the revenue surface |
| Shop is a flat list | Real store: featured, collections, rarity badges, locked previews, premium |
| Retention ends at L56 | Collection completion + milestone rewards = long-term goals |

### Locked design decisions
- **Two currencies** — Stardust (soft) + **Cosmic Fragments** (premium).
- **Top-tier access = mix** — ~half of legendary/mythic are bundle/IAP-exclusive
  (revenue), ~half Fragment/achievement-earnable (retention). **All cosmetic, no P2W.**
- Rewarded ads always **opt-in, never required**; interstitials capped + premium-suppressed.

### Data model (M1)
`Cosmetic { id, name, category(skin|trail|arrival), rarity(common..mythic), collection,
acquire(free|stardust|fragments|bundle|achievement), cost?, bundleId?, + visual fields }`.
Stores: `CosmeticStore` v2 (multi-category owned/equipped, v1→v2 migration, `grant`),
`FragmentStore` (mirrors `CurrencyStore`). Pure helpers in `cosmeticsLogic` (TDD).

---

## Completion reviews (Sprint 2.5 done — v0.14.0)

Delivered: a generalized cosmetic model (28 items across **skins / trails / arrival
effects**, 5 rarities, 6 collections), a **dual currency** (Stardust + Cosmic
Fragments), a tabbed **premium store** (rarity badges, locked previews, owned/equipped,
dual-currency header, scroll), **bundles + Remove-Ads + Restore**, **rewarded loops**
(2x Stardust, free Fragments), and a **retention layer** (achievement/collection/
milestone rewards + progress). All web-verified; native purchase/ads remain device gates.

### 1. Product review
The game now has the *content* a premium puzzler needs: 16 ball-skins with real visual
identity (void Black Hole, animated Supernova, dualtone Neon), 6 trails (jagged
Lightning, multi-hue Galaxy), 6 win-celebration arrival effects, and a store that reads
like a real mobile game rather than a list. The hold-to-pull core and the campaign
(since expanded to **150 levels**) are unchanged — this is pure depth + presentation. Gap: the store previews are
small static swatches; animated/in-context previews would convert better (future).

### 2. Monetization review
Two revenue surfaces now exist: **IAP** (Remove-Ads $1.99 + 3 cosmetic bundles
$2.99–$7.99, top-tier split ~half bundle-exclusive / ~half earnable) and **rewarded
ads** (2x-Stardust on win, daily free-Fragments) that drive engagement without P2W.
Premium currency (Fragments) gates the aspirational cosmetics, giving both a spend sink
and an ad/achievement faucet. Honest gap: interstitials are wired but conservative
(≥3 min, premium-suppressed) — intentional; tune frequency from live data.

### 3. Retention review
Previously retention ended at L56 with reward-less achievements. Now: 15 achievements
pay Stardust+Fragments, **6 collections** chase completion (one-time Fragment bonuses),
**star-milestones** (30/60/100/150) grant Fragments, and the store shows
"N / 28 unlocked". This creates a long-tail goal ladder (collect-them-all) independent
of level progress — the core retention engine a cosmetic game needs.

### 4. Revenue-opportunity review (ranked)
1. **Animated/in-context cosmetic previews** in the store (try-before-buy) — biggest
   conversion lever.
2. **Limited-time / rotating featured offers** + a real "Featured" surface (the data
   model supports it; the UI is currently tabbed only).
3. **The two deferred rewarded loops** — in-level **Hint** and **extra daily attempt**
   — add ad inventory + reduce frustration churn.
4. **Fragment packs** as a direct IAP (convenience SKU) for non-grinders.
5. **Seasonal cosmetics** + a battle-pass-style track over the daily streak.

### 5. Next-roadmap recommendation
- **Now (you):** the native gates — create Play/AdMob/RevenueCat/Firebase accounts,
  define the real products (`remove_ads`, the 3 bundles, the `premium` entitlement),
  `npm install` → `cap add/sync android` → keystore → AAB → internal testing
  (`docs/release-android.md`). Then a **device playtest** of the Phase-3 hazard fairness
  AND the purchase/ads/restore flows.
- **Next sprint (Sprint 3 — Polish + Store Conversion):** animated cosmetic previews +
  a Featured surface, the Hint + extra-daily rewarded loops, real soundtrack, vector
  lock icons, and the actual app-icon / feature-graphic / screenshots from `aso.md`.
