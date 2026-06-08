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

<!-- Completion reviews (product / monetization / retention / revenue / next-roadmap)
     are appended here in M9. -->
