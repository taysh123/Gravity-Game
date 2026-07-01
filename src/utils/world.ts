// Pure mapping from a level number to its world (no Phaser), so it's testable.
import { WORLDS, type World } from '../config/worlds';

// The world a given level belongs to (1-based level number). Falls back to the
// first world for out-of-range levels (e.g. daily levels passed level 0/1).
export function worldOf(level: number): World {
  return WORLDS.find((w) => level >= w.from && level <= w.to) ?? WORLDS[0];
}

// 1-based index of the world (its id), for theme lookup.
export function worldIndexOf(level: number): number {
  return worldOf(level).id;
}

// True when this level is the first of its world (used to show a world title card).
export function isWorldStart(level: number): boolean {
  return WORLDS.some((w) => w.from === level);
}

// True when this level is the last of its world (used to fire world-complete telemetry).
export function isWorldEnd(level: number): boolean {
  return WORLDS.some((w) => w.to === level);
}
