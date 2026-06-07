import type { LevelConfig } from '../../types';
import { level1 } from './level1';
import { level4 } from './level4';
import { level5 } from './level5';
import { level7 } from './level7';
import { level8 } from './level8';
import { level10 } from './level10';
import { level11 } from './level11';
import { level12 } from './level12';
import { level14 } from './level14';
import { level15 } from './level15';
import { level17 } from './level17';
import { level18 } from './level18';
import { level19 } from './level19';
import { level21 } from './level21';
import { level23 } from './level23';
import { level24 } from './level24';
import { level25 } from './level25';
import { level29 } from './level29';
import { level30 } from './level30';
import { level33 } from './level33';
import { level36 } from './level36';
import { level37 } from './level37';
import { level38 } from './level38';
import { level39 } from './level39';
import { level40 } from './level40';
import { level41 } from './level41';
import { level42 } from './level42';
import { level43 } from './level43';
import { level45 } from './level45';
import { level47 } from './level47';
import { level48 } from './level48';
import { level49 } from './level49';
import { level50 } from './level50';
import { level51 } from './level51';
import { level52 } from './level52';
import { level54 } from './level54';
import { level56 } from './level56';
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

// Single source of truth for level order and count (used by GameScene + EndScene).
// PHASE 1 (early-game redesign): Worlds 1-3 trimmed 10->7 and rebuilt for WOW —
// toys before tests, front-loaded wonder, multi-goal "constellation" toys, spectacle
// signatures, and distinct boss archetypes (W1 COLLAPSE = descent set-piece;
// W2 MAELSTROM = chase; W3 MACHINE = mechanic-turned). Worlds 4-8 still 10 each,
// pending their Phase-2 trim. Current total: 71 (target ~56 after Phase 2).
//   1-7 Foundations · 8-14 Currents · 15-21 Clockwork · 22-31 Peril · 32-41 Wells ·
//   42-51 Rifts · 52-61 Gates · 62-71 Convergence.
// (Filenames are arbitrary module names; this array order defines the level number.)
export const LEVELS: LevelConfig[] = [
  // W1 Foundations (navigation/discovery): TOY First-Pull, TOY/CLIP Comet,
  // TOY/SHOT Constellation, puzzle-box, SIGNATURE THE GAUNTLET(+reveal), decoy,
  // BOSS THE COLLAPSE (descent set-piece).
  level1, level4, level91, level5, level65, level29, level66,
  // W2 Currents (prediction/flow): TOY Updraft-surf, REST Drifthome, prediction,
  // relay-curve, SPECTACLE Whirlpool, SIGNATURE THE EYE, BOSS THE MAELSTROM (chase).
  level7, level11, level30, level10, level8, level67, level68,
  // W3 Clockwork (timing/sequencing): TOY Gearslip, timing-decision, sequencing,
  // TOY/SHOT Orrery, patience, SIGNATURE THE GEARWORKS, BOSS THE MACHINE (mechanic-turned).
  level12, level14, level15, level92, level33, level69, level70,
  // W4 Peril (reaction/nerve): teach, develop, timed-twist, safe-window-aha,
  // saw-develop, decoy-aha, combine, signature THE FORGE, timed-combine, boss THE INFERNO.
  level17, level18, level19, level71, level21, level72, level36, level73, level37, level74,
  // W5 Wells (trajectory/orbital): teach, slingshot-develop, repel-twist, slingshot-around-aha,
  // slalom, repel-place-aha, lift+well+spike combine, signature THE BINARY STAR, gauntlet, boss THE SINGULARITY.
  level23, level24, level25, level75, level38, level76, level39, level77, level40, level78,
  // W6 Rifts (spatial/non-linear): teach, develop-sealed, far-mouths-twist, velocity-carry-aha,
  // portal+gate combine, think-backwards-aha, two-rift decision, signature HALL OF MIRRORS, master, boss THE BREACH.
  level41, level42, level43, level79, level45, level80, level47, level81, level48, level82,
  // W7 Gates (planning/commitment/ordering): teach, develop, down-gate twist, lock-and-key-aha,
  // gate+zone combine, plan-gem-aha, two-gates twist, signature THE LOCKWORKS, master, boss THE VAULT.
  level49, level50, level51, level83, level52, level84, level54, level85, level56, level86,
  // W8 Convergence (synthesis/improvisation): 6 distinct combos, fuse-two-mechanics-aha,
  // improvise-aha, signature THE CONFLUENCE, boss/finale HOMECOMING.
  level57, level58, level59, level87, level60, level88, level61, level89, level62, level90,
];
