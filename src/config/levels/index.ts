import type { LevelConfig } from '../../types';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level7 } from './level7';
import { level8 } from './level8';
import { level9 } from './level9';
import { level10 } from './level10';
import { level11 } from './level11';
import { level12 } from './level12';
import { level13 } from './level13';
import { level14 } from './level14';
import { level15 } from './level15';
import { level16 } from './level16';
import { level17 } from './level17';
import { level18 } from './level18';
import { level19 } from './level19';
import { level20 } from './level20';
import { level21 } from './level21';
import { level23 } from './level23';
import { level24 } from './level24';
import { level25 } from './level25';
import { level26 } from './level26';
import { level27 } from './level27';
import { level28 } from './level28';
import { level29 } from './level29';
import { level30 } from './level30';
import { level32 } from './level32';
import { level33 } from './level33';
import { level34 } from './level34';
import { level36 } from './level36';
import { level38 } from './level38';
import { level41 } from './level41';
import { level42 } from './level42';
import { level43 } from './level43';
import { level44 } from './level44';
import { level46 } from './level46';
import { level47 } from './level47';
import { level49 } from './level49';
import { level50 } from './level50';
import { level51 } from './level51';
import { level52 } from './level52';
import { level53 } from './level53';
import { level54 } from './level54';
import { level57 } from './level57';
import { level58 } from './level58';
import { level59 } from './level59';
import { level60 } from './level60';
import { level61 } from './level61';
import { level62 } from './level62';
import { level65 } from './level65';
import { level66 } from './level66';
import { level67 } from './level67';
import { level68 } from './level68';
import { level69 } from './level69';
import { level70 } from './level70';
import { level71 } from './level71';
import { level72 } from './level72';
import { level73 } from './level73';
import { level74 } from './level74';
import { level75 } from './level75';
import { level76 } from './level76';
import { level77 } from './level77';
import { level78 } from './level78';
import { level79 } from './level79';
import { level80 } from './level80';
import { level81 } from './level81';
import { level82 } from './level82';
import { level83 } from './level83';
import { level84 } from './level84';
import { level85 } from './level85';
import { level86 } from './level86';
import { level87 } from './level87';
import { level88 } from './level88';
import { level89 } from './level89';
import { level90 } from './level90';
import { level91 } from './level91';
import { level92 } from './level92';
import { level93 } from './level93';
import { level94 } from './level94';
import { level95 } from './level95';
import { level96 } from './level96';
import { level97 } from './level97';
import { level98 } from './level98';
import { level99 } from './level99';
import { level100 } from './level100';
import { level101 } from './level101';
import { level102 } from './level102';
import { level103 } from './level103';
import { level104 } from './level104';
import { level105 } from './level105';
import { level106 } from './level106';
import { level107 } from './level107';
import { level108 } from './level108';
import { level109 } from './level109';
import { level110 } from './level110';
import { level111 } from './level111';
import { level112 } from './level112';
import { level113 } from './level113';
import { level114 } from './level114';
import { level115 } from './level115';
import { level116 } from './level116';
import { level117 } from './level117';
import { level118 } from './level118';
import { level119 } from './level119';
import { level120 } from './level120';
import { level121 } from './level121';
import { level122 } from './level122';
import { level123 } from './level123';
import { level124 } from './level124';
import { level125 } from './level125';
import { level126 } from './level126';
import { level127 } from './level127';
import { level128 } from './level128';
import { level129 } from './level129';
import { level130 } from './level130';
import { level131 } from './level131';
import { level132 } from './level132';
import { level133 } from './level133';
import { level134 } from './level134';
import { level135 } from './level135';
import { level136 } from './level136';
import { level137 } from './level137';
import { level138 } from './level138';
import { level139 } from './level139';
import { level140 } from './level140';
import { level141 } from './level141';
import { level142 } from './level142';
import { level143 } from './level143';

// Single source of truth for level order and count (used by GameScene + EndScene).
// 150-LEVEL EXPANSION (M2): the 8 mechanic worlds grown 7->10 each by PROMOTING the
// retired pre-trim levels into their world's arc (develop/combine slots), keeping the
// signature + boss last. One new currents level (level93) fills W2 where the retired
// pool was off-theme. Total now 80 (8x10). Worlds 9-15 are appended in later milestones.
// (Filenames are arbitrary module names; this array order defines the level number.)
export const LEVELS: LevelConfig[] = [
  // W1 Foundations (1-10): toys (First-Pull/Comet/Constellation) → two-gap decision,
  // channel-vs-sides, puzzle-box, descent-shape → SIGNATURE THE GAUNTLET, decoy,
  // BOSS THE COLLAPSE.
  level1, level4, level91, level2, level3, level5, level28, level65, level29, level66,
  // W2 Currents (11-20): updraft-surf, drifthome, crosswind, prediction, relay-curve,
  // ride-then-break (new) → SPECTACLE Whirlpool, relay-aha, SIGNATURE THE EYE,
  // BOSS THE MAELSTROM.
  level7, level11, level9, level30, level10, level93, level8, level32, level67, level68,
  // W3 Clockwork (21-30): gearslip, timing-decision, sweeping-bar, sequencing, two-bar
  // rhythm, orrery, lift+gate → patience, SIGNATURE THE GEARWORKS, BOSS THE MACHINE.
  level12, level14, level13, level15, level16, level92, level34, level33, level69, level70,
  // W4 Peril (31-40): hazard-weave, saw-timing, gap+hazard, timed, crosswind+hazard,
  // patience-aha, updraft+saw+spike → decoy-aha, SIGNATURE THE FORGE, BOSS THE INFERNO.
  level17, level21, level18, level19, level20, level71, level36, level72, level73, level74,
  // W5 Wells (41-50): swing-the-well, repel-twist, slingshot, dual-repel slalom,
  // updraft+well, slingshot-aha, repel+attract master → repel-propulsion-aha,
  // SIGNATURE THE BINARY STAR, BOSS THE SINGULARITY.
  level23, level25, level24, level38, level26, level75, level27, level76, level77, level78,
  // W6 Rifts (51-60): appear-across, far-mouth lateral, sealed-chamber, velocity-carry-aha,
  // lift-feeds-rift, think-backwards-aha, rift+well → two-rift decision,
  // SIGNATURE HALL OF MIRRORS, BOSS THE BREACH.
  level41, level43, level42, level79, level44, level80, level46, level47, level81, level82,
  // W7 Gates (61-70): one-way door, down-gate descent, teach up-gate, only-door-on-top-aha,
  // lift+gate, plan-gem-aha, gate+rift → two-gate sequence, SIGNATURE THE LOCKWORKS,
  // BOSS THE VAULT.
  level50, level51, level49, level83, level52, level84, level53, level54, level85, level86,
  // W8 Convergence (71-80): repel+rift branch, lift->rift->well relay, currents+gates,
  // fuse-aha, platforms+hazards+gate, 4-mechanic synthesis, gates+portal+hazard →
  // improvise-aha, SIGNATURE THE CONFLUENCE, BOSS/FINALE HOMECOMING.
  level58, level60, level57, level87, level59, level62, level61, level88, level89, level90,
  // ── 150-LEVEL EXPANSION: combination / tension / mastery worlds (no new mechanic) ──
  // W9 Gauntlet (81-90): precision routing — platforms + hazards + zones. teach×2,
  // develop×2, descent twist, combine×3, SIGNATURE THE GAUNTLET, BOSS THE CRUCIBLE.
  level94, level95, level96, level97, level98, level99, level100, level101, level102, level103,
  // W10 Binary (91-100): dual magnets / orbital mastery. teach×2, develop×2, dual-well
  // twist, combine×3, SIGNATURE THE BINARY STAR, BOSS THE PULSAR (repel core + arm).
  level104, level105, level106, level107, level108, level109, level110, level111, level112, level113,
  // W11 Labyrinth (101-110): portals + gates spatial puzzles. teach×2, develop×2,
  // two-rift twist, combine×3, SIGNATURE HALL OF ECHOES, BOSS THE WARDEN.
  level114, level115, level116, level117, level118, level119, level120, level121, level122, level123,
  // W12 Tempest (111-120): tension — timed levels + moving hazards (saws, laser beams,
  // rotating arms). teach×2, develop×2, twin-saw twist, combine×3, SIGNATURE THE TEMPEST,
  // BOSS THE EYE OF THE STORM (timed multi-hazard).
  level124, level125, level126, level127, level128, level129, level130, level131, level132, level133,
  // W13 Ascension (121-130): long multi-stage journeys, all mechanics. opener, stage×4,
  // descent twist, combine×3, SIGNATURE THE ASCENT, BOSS THE SUMMIT (the long climb).
  level134, level135, level136, level137, level138, level139, level140, level141, level142, level143,
];
