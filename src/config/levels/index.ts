import type { LevelConfig } from '../../types';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
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
import { level21 } from './level21';
import { level23 } from './level23';
import { level24 } from './level24';
import { level25 } from './level25';
import { level28 } from './level28';
import { level29 } from './level29';
import { level30 } from './level30';
import { level31 } from './level31';
import { level32 } from './level32';
import { level33 } from './level33';
import { level34 } from './level34';
import { level35 } from './level35';
import { level36 } from './level36';
import { level37 } from './level37';
import { level38 } from './level38';
import { level39 } from './level39';
import { level40 } from './level40';
import { level41 } from './level41';
import { level42 } from './level42';
import { level43 } from './level43';
import { level44 } from './level44';
import { level45 } from './level45';
import { level46 } from './level46';
import { level47 } from './level47';
import { level48 } from './level48';
import { level49 } from './level49';
import { level50 } from './level50';
import { level51 } from './level51';
import { level52 } from './level52';
import { level53 } from './level53';
import { level54 } from './level54';
import { level55 } from './level55';
import { level56 } from './level56';
import { level57 } from './level57';
import { level58 } from './level58';
import { level59 } from './level59';
import { level60 } from './level60';
import { level61 } from './level61';
import { level62 } from './level62';
import { level63 } from './level63';
import { level64 } from './level64';
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

// Single source of truth for level order and count (used by GameScene + EndScene).
// Worlds overhauled to 10 levels each, themed to a distinct mental skill, each with
// >=3 aha puzzles + a signature + a boss (W1 navigation · W2 prediction/flow ·
// W3 timing/sequencing · W4 reaction/nerve under pressure); later worlds still 8.
//   1-10 Foundations · 11-20 Currents · 21-30 Clockwork · 31-40 Peril · 41-50 Wells ·
//   51-58 Rifts · 59-66 Gates · 67-74 Convergence.
// (Filenames are arbitrary module names; this array order defines the level number.)
export const LEVELS: LevelConfig[] = [
  // W1 Foundations (navigation): teach, fork, decision, traverse, puzzle-box, stakes,
  // signature THE GAUNTLET, descent, decoy-aha, boss THE COLLAPSE.
  level1, level2, level3, level4, level5, level6, level65, level28, level29, level66,
  // W2 Currents (prediction/flow): teach, flow, predict-decision, read-aha, downdraft,
  // use-current-aha, combine, signature THE EYE, relay-aha, boss THE MAELSTROM.
  level7, level9, level30, level10, level8, level11, level31, level67, level32, level68,
  // W3 Clockwork (timing/sequencing): teach, rhythm, timing-decision, stage-aha,
  // alt-rhythm, patience-aha, combine, signature THE GEARWORKS, sequence-aha, boss THE MACHINE.
  level12, level13, level14, level15, level16, level33, level34, level69, level35, level70,
  // W4 Peril (reaction/nerve): teach, develop, timed-twist, safe-window-aha,
  // saw-develop, decoy-aha, combine, signature THE FORGE, timed-combine, boss THE INFERNO.
  level17, level18, level19, level71, level21, level72, level36, level73, level37, level74,
  // W5 Wells (trajectory/orbital): teach, slingshot-develop, repel-twist, slingshot-around-aha,
  // slalom, repel-place-aha, lift+well+spike combine, signature THE BINARY STAR, gauntlet, boss THE SINGULARITY.
  level23, level24, level25, level75, level38, level76, level39, level77, level40, level78,
  level41, level42, level43, level44, level45, level46, level47, level48,
  level49, level50, level51, level52, level53, level54, level55, level56,
  level57, level58, level59, level60, level61, level62, level63, level64,
];
