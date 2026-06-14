# Gravity Flow — Brutally Honest Excitement Audit

> ⏳ **Historical analysis record (largely addressed).** Written pre-expansion; its asks (per-world visual
> identity, a world-journey, an endless mode, more excitement) were since delivered (Star Map, Gravity Run,
> 150 levels / 15 worlds, per-world themes). Current state: [`docs/project-status.md`](../../project-status.md).

> Question this answers: **"Why isn't Gravity Flow a game people get excited about and tell friends —
> and what would change that?"** Bug fixes shipped alongside (v0.6.1): L9 was unsolvable (fixed),
> L1/early-world 3★ too strict (fixed). This doc is analysis only — nothing here is implemented yet.

## The hard truth

Gravity Flow is a **competent puzzle prototype with a great verb (hold-to-pull) — but it is emotionally
flat and visually anonymous.** It's *pleasant*. Pleasant doesn't get shared. People tell friends about
**feelings, moments, and identity**, and right now the game has almost none of those.

Mechanics/content are no longer the problem (70 levels, 7 mechanics, per-world skills, aha attempts).
The problem is **excitement**: there is no spectacle, no crescendo, no personality, no sound that makes
you stay, and nothing you'd screenshot. On the only metric that drives breakouts — *"would a player tell
a friend?"* — it's roughly **3/10**.

## What's missing (ranked by impact on "tell a friend")

1. **Spectacle (highest).** Everything is small vector shapes on one static dark field. No scale, drama,
   camera life, reveals, or set-pieces. The new "signature" levels are *structurally* distinct but look
   identical to every other level. Monument Valley sells screenshots; Gravity Flow has none.
2. **Emotional highs.** Winning = a small flash + a chord. No build-up/release, no earned celebration, no
   near-miss tension payoff. The juice is *polite*, not thrilling. Bosses escalate obstacle count, not
   *feeling* — they aren't events.
3. **Audio.** A synth pad + blips. Audio is ~half of game feel and it's the weakest part. No music that
   sets mood/energy, no deeply satisfying SFX (a rising pull-hum, a crisp gem "ting", a real win chord,
   boss music).
4. **Visual identity.** "Cosmic glass + Orbitron" is clean but generic — it looks like a hundred other
   minimalist space games. All 8 worlds share ONE background. The hero is a white circle. No motif, no
   face, nothing that says *this is Gravity Flow*.
5. **A hook / personality.** No one-sentence pitch that makes someone curious. "Hold to pull a ball
   through puzzles" is a mechanic, not a hook. No theme, character, vibe, or journey. Breakouts have one
   (Om Nom, the numbers-with-personality of Threes).
6. **Reward excitement.** Stardust + cosmetics exist, but cosmetics are *recolored balls* — not exciting
   to chase. No unlock fanfare, no collection with character, no "ooh, I want that."
7. **Presentation variety.** Every level enters, plays, and exits the same way in the same frame. Nothing
   ever breaks the pattern (a zoom, a reveal, a new visual world).

## Compared to breakout mobile puzzlers

- **Monument Valley** → identity + spectacle: every chapter is a distinct, screenshot-worthy art world.
- **Cut the Rope** → personality + dopamine: Om Nom reacts; each level is a fresh, satisfying contraption.
- **Threes / 2048** → feel + charm: tactile, characterful, a hook you can say in five words.
- **Where's My Water** → theme + reactivity: a character, a goal you care about, juicy physics.
Common thread: **a hook, a face, frequent dopamine, and moments you'd capture.** Gravity Flow has the
*mechanic* of a good game but none of the *packaging* that makes one spread.

## First-30 review (confusion / too-strict / unfair)

- **Confusion (risk of "stuck", not "aha") — verify on device:** L5 puzzle-box (enter-from-the-side —
  fine only if the opening reads clearly), W2 "use the downdraft to drop in" (clever but can feel
  arbitrary), the W3 "patience slider" (waiting can read as *broken* rather than a beat). L9 was outright
  unsolvable → **fixed**.
- **Too-strict 3★ (early):** L1 → **fixed** (now 3★ by default). Watch the decision/aha levels whose gem
  sits on the *hard* line (L3 channel, L9 decoy) — fair mid-W1 but borderline; keep 1★ generous.
- **Unfair-for-first-timers:** any aha whose trick isn't telegraphed (L5, the W2 current-use levels) and
  any tight timing window (L33). Rule: telegraph the trick + keep 1★ forgiving; let par/gem carry mastery.

## Roadmap — "make players keep playing and tell friends"

Ranked by excitement-per-effort. This is essentially an **Excitement Sprint** (a bigger, sharper version
of the planned Sprint 3) and the audit's honest recommendation is that **it is higher-leverage than
monetization** — you can't profitably monetize a game people don't love.

1. **Game feel & spectacle** (biggest bang): a real win celebration (screen-filling burst, star-by-star
   with sound, "PERFECT!"/combo callouts), **boss build-up → climax → reward** (intro beat, distinct
   arena tint, a payoff), camera life (subtle dramatic zoom/parallax/shake), near-miss slow-mo on hazards,
   richer light/particles.
2. **Audio overhaul:** adaptive per-world music (mood + energy), a rising pull-hum, crisp gem/win SFX,
   boss music. Single highest lift to "feel".
3. **Visual identity:** per-world art identity (palette/motif/background variation so worlds feel like
   *places*), a signature comet/ball with character + a great trail, a memorable logo/intro moment.
4. **A hook/theme:** a light vibe/narrative ("guide a lost star home through the cosmos"), giving the
   journey and worlds meaning + a one-line pitch. Cheap, high identity payoff.
5. **Reward flair:** cosmetics that are actually cool (trails, particle FX, comet "characters"), unlock
   fanfare, a collection screen with personality. Makes Stardust worth chasing (and worth buying).
6. **Shareable moments:** daily score/gif share, visible leaderboards (already scaffolded), "perfect run"
   celebrations — the literal "tell a friend" surfaces.

## Recommended sequencing (honest, but your call)

The current plan is Sprint 2 (monetization) next. The audit recommends **reordering**:
1. **Excitement Sprint** (feel + audio + identity + a hook) — make it a game people love.
2. **Sprint 2 — Native + Monetization** — monetize something worth monetizing.
3. **Store assets + RC** — by then you'll *have* spectacle to screenshot and a hook to pitch.

At minimum, **fold the feel/audio/identity work in before store launch** — shipping monetization on a
forgettable game wastes the launch. Decision is yours; this audit just argues the priority.
