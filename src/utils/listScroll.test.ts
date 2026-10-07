import { describe, it, expect } from 'vitest';
import { canScroll, clampScroll, scrollRange } from './listScroll';

// A masked list is a content container placed at `viewTop` (its resting y: first item flush with the top of the viewport). Its
// scroll range, in content.y, runs from that resting y down to the y where the last item is flush with the bottom of the viewport.

describe('scrollRange', () => {
  it('the list rests at the top of its range: content.y = viewTop is the first item flush with the viewport top', () => {
    const r = scrollRange(135, 625, 902);
    expect(r.max).toBe(135);
  });

  it('the bottom of the range puts the last item flush with the viewport bottom', () => {
    const viewTop = 135;
    const viewH = 625;
    const contentH = 902;
    const r = scrollRange(viewTop, viewH, contentH);
    expect(r.min + contentH).toBeCloseTo(viewTop + viewH); // content bottom == viewport bottom
    expect(r.min).toBeCloseTo(135 - (902 - 625)); // scrolls by exactly the overflow
  });

  it('a list that fits does not scroll: the range is the single resting position', () => {
    const r = scrollRange(152, 604, 222);
    expect(r).toEqual({ max: 152, min: 152 });
    expect(canScroll(r)).toBe(false);
    expect(clampScroll(0, r)).toBe(152);
    expect(clampScroll(999, r)).toBe(152);
  });

  it('a list exactly as tall as the viewport does not scroll either', () => {
    expect(canScroll(scrollRange(100, 500, 500))).toBe(false);
  });

  it('a list one pixel too tall scrolls by exactly that pixel', () => {
    const r = scrollRange(100, 500, 501);
    expect(canScroll(r)).toBe(true);
    expect(r.max - r.min).toBe(1);
  });
});

describe('clampScroll', () => {
  const r = scrollRange(135, 625, 902); // [-142, 135]

  it('keeps a position inside the range', () => {
    expect(clampScroll(0, r)).toBe(0);
    expect(clampScroll(-100, r)).toBe(-100);
  });

  it('stops at the first item (pulled down past the top) and at the last item (pulled up past the bottom)', () => {
    expect(clampScroll(400, r)).toBe(135);
    expect(clampScroll(-5000, r)).toBeCloseTo(-142);
  });

  it('the resting position is a fixed point: the first drag cannot make the list jump (the bug this fixes)', () => {
    expect(clampScroll(135, r)).toBe(135);
    expect(clampScroll(135 - 3, r)).toBe(132); // a 3 px drag moves it 3 px
  });
});

// The old formula, kept as documentation of the defect: it clamped to [viewH - contentH, 0] in absolute content.y while the
// content rests at viewTop, so the first move snapped it up by viewTop px and the first items could never be reached again.
describe('the old clamp (the defect, P00-T17b fix pass 3)', () => {
  const viewTop = 135;
  const viewH = 625;
  const contentH = 902;
  const oldMin = Math.min(0, viewH - contentH); // -277
  const oldClamp = (y: number): number => Math.min(0, Math.max(oldMin, y));

  it('snapped the resting list up by viewTop px on the first drag', () => {
    expect(oldClamp(viewTop - 3)).toBe(0); // a 3 px drag moved the list 135 px
  });

  it('could never bring the first viewTop px of content back into view', () => {
    expect(oldClamp(5000)).toBe(0); // top of the old range: content top 135 px ABOVE the viewport top
  });
});
