# Mechanics Roadmap — candidates (ranked)

> ⏳ **Historical plan record (superseded).** All 7 mechanics are now shipped (attractor, gravity zones,
> magnets, portals, moving platforms, hazards, one-way gates) across 150 levels / 15 worlds (`v1.0.0-rc.1`).
> Current state: [`docs/project-status.md`](../../project-status.md).

Shipped so far: **Gravity Zones**, **Moving Platforms**, **Collectibles/Stars** (Depth sprint);
**Hazards** (fail-on-touch, incl. moving saws) + **hard-countdown timed levels** (Tension sprint) →
4 worlds, 22 levels, with a real fail state. Remaining candidates ranked by value-per-risk. Each
follows the project rule: **one entity class + one optional `LevelConfig` field**, reusing the
`createFromConfig`/`update` seams and the `RawMatter` bridge. No managers.

| Rank | Mechanic | Decision axis | Value | Cost | Risk | Notes |
|------|----------|---------------|-------|------|------|-------|
| ✓ | ~~**Magnets** (static attract/repulse points)~~ | constant forces to use/avoid | — | — | — | **SHIPPED** (World 5 — Wells, L23-27): `Magnet` entity + `magnets?` field; `applyMagnetForces()` reuses the inverse-square model (signed strength → attract/repel). |
| 1 | **Portals** (paired teleport, redirect velocity) | spatial / non-linear routing | High | Med | Med | New `Portal` entity (pair) + overlap + `RawMatter.Body.setPosition` (bridge has it) + a re-entry cooldown + velocity carry/redirect. Iconic. **World 6 — Rifts.** *Next mechanic.* |
| ✓ | ~~Hazards / timed fail states~~ | risk & tension | — | — | — | **SHIPPED** (World 4 Peril): `Hazard` entity (static + moving) → `triggerDeath`; `timeLimitMs` countdown. |
| 3 | **One-way Gates** | directional constraint | Med | Med | Med | Pass one way, block the other. Collision filtered by approach side (sensor + manual pass logic). Good routing constraint; fiddly. |
| 5 | **Rotating Obstacles** | timing / precision | Med-High | Med | **High** | Spinning bars. Kinematic carry/strike in Matter for a rotated static body is janky — needs care or a velocity-imparting approach. |
| — | Bounce pads / deflectors | — | Low | Low | Low | ≈ existing walls with restitution. Skip. |

## Cross-cutting follow-ups
- **Fail state — RESOLVED:** hazards + timed countdowns now provide real stakes (World 4). Out-of-bounds
  death remains rare (walled arena) but is no longer the only fail path.
- **Difficulty tuning:** the new Currents/Clockwork levels (7-16) have reasonable geometry but their
  exact solvability/par/gem placement should be **hand-tuned from a device playtest** (precise finger
  input, which automated drag scripts can't reproduce).
- **Magnets shipped** (World 5 — Wells). **Portals** are the next mechanic (World 6 — Rifts).
