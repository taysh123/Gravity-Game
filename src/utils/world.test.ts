import { describe, it, expect } from 'vitest';
import { worldOf, worldIndexOf, isWorldStart } from './world';
import { WORLDS } from '../config/worlds';

// Derive expectations from WORLDS so the tests stay valid as worlds grow/renumber
// across the redesign roadmap — only worlds.ts needs editing, never this file.
describe('worldOf', () => {
  it('maps every world boundary to that world', () => {
    for (const w of WORLDS) {
      expect(worldOf(w.from).id).toBe(w.id);
      expect(worldOf(w.to).id).toBe(w.id);
    }
  });
  it('keeps the named anchors stable', () => {
    expect(worldOf(1).name).toBe('FOUNDATIONS');
    expect(worldOf(11).name).toBe('CURRENTS');
    expect(worldOf(21).name).toBe('CLOCKWORK');
    expect(worldOf(25).name).toBe('PERIL');
    expect(worldOf(32).name).toBe('WELLS');
  });
  it('falls back to the first world out of range', () => {
    expect(worldOf(0).id).toBe(1);
    expect(worldOf(9999).id).toBe(1);
  });
});

describe('worldIndexOf', () => {
  it('returns the world id for each world start', () => {
    for (const w of WORLDS) {
      expect(worldIndexOf(w.from)).toBe(w.id);
    }
  });
});

describe('isWorldStart', () => {
  it('is true on every world\'s first level and false just after', () => {
    for (const w of WORLDS) {
      expect(isWorldStart(w.from)).toBe(true);
      if (w.from + 1 <= w.to) expect(isWorldStart(w.from + 1)).toBe(false);
    }
  });
});
