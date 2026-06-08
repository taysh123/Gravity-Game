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
import { level19 } from './level19';
import { level21 } from './level21';
import { level23 } from './level23';
import { level25 } from './level25';
import { level29 } from './level29';
import { level30 } from './level30';
import { level33 } from './level33';
import { level38 } from './level38';
import { level41 } from './level41';
import { level43 } from './level43';
import { level47 } from './level47';
import { level50 } from './level50';
import { level51 } from './level51';
import { level54 } from './level54';
import { level58 } from './level58';
import { level60 } from './level60';
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
// PHASE 1 (early-game redesign): Worlds 1-3 trimmed 10->7 and rebuilt for WOW.
// PHASE 2 (back-half redesign): Worlds 4-8 trimmed 10->7 each — cut filler
// combine-stacks, added toy openers, and ROTATED the boss archetypes so no two
// bosses feel alike (W4 INFERNO=endurance · W5 SINGULARITY=orbit · W6 BREACH=
// puzzle-boss · W7 VAULT=lock-and-key · W8 HOMECOMING=finale). Total now 56 (8x7).
//   1-7 Foundations · 8-14 Currents · 15-21 Clockwork · 22-28 Peril · 29-35 Wells ·
//   36-42 Rifts · 43-49 Gates · 50-56 Convergence.
// Retired levels stay on disk (un-imported) as future "Expert" pack content.
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
  // W4 Peril (reaction/nerve): TOY hazard-weave, saw-timing, timed, patience-aha,
  // decoy-aha, SIGNATURE THE FORGE (descent), BOSS THE INFERNO (endurance, no clock).
  level17, level21, level19, level71, level72, level73, level74,
  // W5 Wells (trajectory/orbital): TOY swing-the-well, repel-twist, dual-repel slalom,
  // slingshot-around-aha, repel-propulsion-aha, SIGNATURE THE BINARY STAR, BOSS THE SINGULARITY (orbit).
  level23, level25, level38, level75, level76, level77, level78,
  // W6 Rifts (spatial/non-linear): TOY appear-across, far-mouth lateral, velocity-carry-aha,
  // think-backwards-aha, two-rift decision, SIGNATURE HALL OF MIRRORS, BOSS THE BREACH (puzzle-boss).
  level41, level43, level79, level80, level47, level81, level82,
  // W7 Gates (planning/commitment): TOY one-way door, down-gate descent, only-door-on-top-aha,
  // plan-gem-aha, two-gate sequence, SIGNATURE THE LOCKWORKS, BOSS THE VAULT (lock-and-key, no clock).
  level50, level51, level83, level84, level54, level85, level86,
  // W8 Convergence (synthesis/improvisation): repel+rift branch, lift->rift->well relay,
  // fuse-aha, 4-mechanic synthesis, improvise-aha, SIGNATURE THE CONFLUENCE, BOSS/FINALE HOMECOMING.
  level58, level60, level87, level62, level88, level89, level90,
];
