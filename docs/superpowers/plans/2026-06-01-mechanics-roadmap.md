# Mechanics Roadmap — postponed candidates (ranked)

Context: the Depth sprint shipped **Gravity Zones** + **Moving Platforms** + **Collectibles/Stars**
across 3 worlds (16 levels). These are the next mechanics, ranked by value-per-risk. Each follows the
project expansion rule: **one entity class + one optional `LevelConfig` field**, reusing the
`createFromConfig`/`update` seams and the `RawMatter` bridge. No managers.

| Rank | Mechanic | Decision axis | Value | Cost | Risk | Notes |
|------|----------|---------------|-------|------|------|-------|
| 1 | **Magnets** (static attract/repulse points) | constant forces to use/avoid | Med-High | **Low** | Low | Reuses the attractor force model as an always-on source (`applyForce`, inverse-square). Repulsors add "avoid" routing cheaply. Natural **World 4 — Wells**. |
| 2 | **Portals** (paired teleport, redirect velocity) | spatial / non-linear routing | High | Med | Med | New `Portal` entity (pair) + overlap + `RawMatter.Body.setPosition` (bridge has it) + a re-entry cooldown + velocity carry/redirect. Iconic. **World 5 — Rifts**. |
| 3 | **Timed Hazards / real death** | risk & tension | Med-High | Med | Med | The first true **fail state** (today death is unreachable — see below). Pulsing kill-zones / on-off beams that reset the level on contact. Pairs with the death feedback already built (`triggerDeath`). Needs a deliberate "stakes" call — could make the game tenser or more frustrating. |
| 4 | **One-way Gates** | directional constraint | Med | Med | Med | Pass one way, block the other. Collision filtered by approach side (sensor + manual pass logic). Good routing constraint; fiddly. |
| 5 | **Rotating Obstacles** | timing / precision | Med-High | Med | **High** | Spinning bars. Kinematic carry/strike in Matter for a rotated static body is janky — needs care or a velocity-imparting approach. |
| — | Bounce pads / deflectors | — | Low | Low | Low | ≈ existing walls with restitution. Skip. |

## Cross-cutting follow-ups
- **Fail-state decision (from prior playtest):** the arena is fully walled, so death almost never
  fires — effectively no stakes. Either (a) keep stakes-free (zen) and lean on stars/precision, or
  (b) introduce hazards (#3) / openable bounds. A deliberate product call.
- **Difficulty tuning:** the new Currents/Clockwork levels (7-16) have reasonable geometry but their
  exact solvability/par/gem placement should be **hand-tuned from a device playtest** (precise finger
  input, which automated drag scripts can't reproduce).
- **Magnets first** is the cheapest, highest-synergy next step (World 4).
