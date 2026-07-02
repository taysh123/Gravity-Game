import { describe, it, expect } from 'vitest';
import { fitScale, truncateToWidth } from './textFit';

describe('fitScale', () => {
  it('returns 1 when the text already fits within maxWidth', () => {
    expect(fitScale(100, 200, 0.5)).toBe(1);
  });

  it('returns 1 when the text exactly fits maxWidth', () => {
    expect(fitScale(150, 150, 0.5)).toBe(1);
  });

  it('shrinks proportionally when the text is wider than maxWidth', () => {
    // measuredWidth is 2x maxWidth -> half scale.
    expect(fitScale(200, 100, 0.3)).toBeCloseTo(0.5);
  });

  it('floors at minScale when maxWidth is too small to fit even at the floor', () => {
    // measuredWidth 1000, maxWidth 10 -> raw scale 0.01, way below the 0.5 floor.
    expect(fitScale(1000, 10, 0.5)).toBe(0.5);
  });

  it('guards against divide-by-zero and returns 1 when measuredWidth is 0', () => {
    expect(fitScale(0, 100, 0.5)).toBe(1);
  });

  it('never upscales past 1 even when maxWidth is very generous', () => {
    expect(fitScale(50, 5000, 0.5)).toBe(1);
  });
});

describe('truncateToWidth', () => {
  const charWidth = 10;
  const measure = (s: string): number => s.length * charWidth;

  it('returns the text unchanged when it already fits', () => {
    expect(truncateToWidth('SHORT', 200, measure, '…')).toBe('SHORT');
  });

  it('truncates and appends the ellipsis when the text is too wide', () => {
    const result = truncateToWidth('THE LONG WAY HOME', 80, measure, '…');
    expect(result.endsWith('…')).toBe(true);
    expect(measure(result)).toBeLessThanOrEqual(80);
    expect(result.length).toBeLessThan('THE LONG WAY HOME'.length);
  });

  it('respects a custom ellipsis character', () => {
    const result = truncateToWidth('THE LONG WAY HOME', 80, measure, '...');
    expect(result.endsWith('...')).toBe(true);
    expect(measure(result)).toBeLessThanOrEqual(80);
  });

  it('falls back to the bare ellipsis when even one character will not fit', () => {
    expect(truncateToWidth('THE SINGULARITY', 5, measure, '…')).toBe('…');
  });
});
