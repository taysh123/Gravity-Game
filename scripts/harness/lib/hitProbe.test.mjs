import { describe, expect, it } from 'vitest';
import { MIN_TAP_GAME_PX, probeToAssertions } from './hitProbe.mjs';

const item = (over = {}) => ({
  scene: 'MainMenuScene',
  kind: 'Container',
  label: 'Container "PLAY" @195,420',
  verdict: 'PASS',
  cornerMiss: [],
  leaks: [],
  small: false,
  smallCss: false,
  hit: { w: 220, h: 56 },
  ...over,
});

const base = (items, extra = {}) => ({ k: 1, GW: 390, GH: 844, items, overlaps: [], scans: [], ...extra });

describe('probeToAssertions: turns one in-page probe result into named pass/fail assertions', () => {
  it('passes a state whose tested objects all pass, none are small, there are no overlaps', () => {
    const a = probeToAssertions('MainMenu', base([item(), item({ label: 'Container "DAILY" @195,500' })]));
    expect(a.map((x) => x.ok)).toEqual([true, true]);
    expect(a[0].label).toBe('MainMenu: 2 tappable objects hit at their corners and centre, no leak, none under 44 game px');
    expect(a[1].label).toBe('MainMenu: no overlapping hit zones');
  });

  it('fails a state with a corner that another object steals, and names the object and the corner', () => {
    const a = probeToAssertions('Settings', base([item({ verdict: 'FAIL', cornerMiss: ['BR->Text "Sound"'], label: 'Container "Close" @340,60' })]));
    expect(a[0].ok).toBe(false);
    expect(a[0].detail).toContain('Container "Close" @340,60');
    expect(a[0].detail).toContain('MISS BR->Text "Sound"');
  });

  it('fails a leak outside the visible edge', () => {
    const a = probeToAssertions('Shop', base([item({ verdict: 'FAIL', leaks: ['R', 'B'] })]));
    expect(a[0].ok).toBe(false);
    expect(a[0].detail).toContain('LEAK R,B');
  });

  it('fails a hit zone under 44x44 game px even when its corners pass', () => {
    const a = probeToAssertions('Pause', base([item({ small: true, hit: { w: 40, h: 56 } })]));
    expect(a[0].ok).toBe(false);
    expect(a[0].detail).toContain(`under ${MIN_TAP_GAME_PX}x${MIN_TAP_GAME_PX}`);
    expect(a[0].detail).toContain('40x56');
  });

  it('does not fail a zone that is under 44 CSS px only because the FIT scale is below 1 (smallCss)', () => {
    const a = probeToAssertions('Pause', base([item({ smallCss: true })], { k: 0.92 }));
    expect(a[0].ok).toBe(true);
  });

  it('skipped objects (scrims, scrolled out) are not assertions but are counted in the label', () => {
    const a = probeToAssertions('Win', base([item(), { scene: 'GameScene', label: 'Rectangle', verdict: 'SKIP', note: 'full-screen scrim' }]));
    expect(a[0].label).toContain('1 tappable object ');
    expect(a[0].label).toContain('(1 skipped)');
  });

  it('a state with nothing testable fails: a probe that saw no objects proves nothing', () => {
    const a = probeToAssertions('Blank', base([{ label: 'Rectangle', verdict: 'SKIP', note: 'full-screen scrim' }]));
    expect(a[0].ok).toBe(false);
    expect(a[0].detail).toMatch(/no tappable object/);
  });

  it('fails every overlap between two hit zones and names both objects', () => {
    const a = probeToAssertions('Cosmetics', base([item()], { overlaps: [{ a: 'Container "Skins"', b: 'Container "Trails"', w: 6, h: 30 }] }));
    const overlap = a.find((x) => x.label.includes('overlapping'));
    expect(overlap.ok).toBe(false);
    expect(overlap.detail).toContain('Container "Skins"');
    expect(overlap.detail).toContain('Container "Trails"');
  });

  it('adds one assertion per scrolling list: nothing outside its viewport may reach a list row', () => {
    const scans = [
      { scene: 'CosmeticsScene', band: { top: 150, bottom: 760 }, points: 3000, rows: 12, leaks: [], leakCount: 0 },
      { scene: 'WorldMapScene', band: { top: 90, bottom: 800 }, points: 2800, rows: 15, leaks: ['(3,2)->Container "x"'], leakCount: 4 },
    ];
    const a = probeToAssertions('Lists', base([item()], { scans }));
    const s = a.filter((x) => x.label.includes('viewport'));
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ ok: true });
    expect(s[0].label).toContain('CosmeticsScene');
    expect(s[1].ok).toBe(false);
    expect(s[1].detail).toContain('4 probes reach a list row');
    expect(s[1].detail).toContain('(3,2)->Container "x"');
  });
});
