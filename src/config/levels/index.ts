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
import { level20 } from './level20';
import { level21 } from './level21';
import { level22 } from './level22';
import { level23 } from './level23';
import { level24 } from './level24';
import { level25 } from './level25';
import { level26 } from './level26';
import { level27 } from './level27';
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

// Single source of truth for level order and count (used by GameScene + EndScene).
// Ordered by world so chapter ranges stay contiguous (8 levels per world):
//   1-8 Foundations · 9-16 Currents · 17-24 Clockwork · 25-32 Peril · 33-40 Wells ·
//   41-48 Rifts · 49-56 Gates.
// (Filenames are arbitrary module names; this array order defines the level number.)
export const LEVELS: LevelConfig[] = [
  level1, level2, level3, level4, level5, level6, level28, level29,
  level7, level8, level9, level10, level11, level30, level31, level32,
  level12, level13, level14, level15, level16, level33, level34, level35,
  level17, level18, level19, level20, level21, level22, level36, level37,
  level23, level24, level25, level26, level27, level38, level39, level40,
  level41, level42, level43, level44, level45, level46, level47, level48,
  level49, level50, level51, level52, level53, level54, level55, level56,
];
