import { describe, expect, it } from 'vitest';
import {
  FactsError,
  checkBlock,
  extractBlock,
  hasBlock,
  lineDiff,
  replaceBlock,
} from './factsLib.mjs';

const DOC = [
  '# Title',
  '',
  'intro',
  '<!-- facts:start -->',
  'old line 1',
  'old line 2',
  '<!-- facts:end -->',
  '',
  'outro',
  '',
].join('\n');

describe('extractBlock', () => {
  it('returns the text between the markers without the surrounding newlines', () => {
    expect(extractBlock(DOC, 'facts')).toBe('old line 1\nold line 2');
  });

  it('normalizes CRLF so Windows checkouts compare equal to generated LF text', () => {
    expect(extractBlock(DOC.replace(/\n/g, '\r\n'), 'facts')).toBe('old line 1\nold line 2');
  });

  it('keeps blocks with different ids independent', () => {
    const text = [
      '<!-- facts:start -->',
      'status',
      '<!-- facts:end -->',
      '<!-- facts:readme:start -->',
      'readme',
      '<!-- facts:readme:end -->',
    ].join('\n');
    expect(extractBlock(text, 'facts')).toBe('status');
    expect(extractBlock(text, 'facts:readme')).toBe('readme');
  });

  it('throws a FactsError naming the marker when the start marker is missing', () => {
    expect(() => extractBlock('no markers here\n<!-- facts:end -->', 'facts')).toThrow(FactsError);
    expect(() => extractBlock('no markers here\n<!-- facts:end -->', 'facts')).toThrow(
      /<!-- facts:start -->/,
    );
  });

  it('throws when the end marker is missing', () => {
    expect(() => extractBlock('<!-- facts:start -->\nx', 'facts')).toThrow(/<!-- facts:end -->/);
  });

  it('throws when a marker appears more than once', () => {
    const dup = DOC + '<!-- facts:start -->\n<!-- facts:end -->\n';
    expect(() => extractBlock(dup, 'facts')).toThrow(/more than once/);
  });

  it('throws when the end marker comes before the start marker', () => {
    const swapped = '<!-- facts:end -->\nx\n<!-- facts:start -->\n';
    expect(() => extractBlock(swapped, 'facts')).toThrow(/before/);
  });
});

describe('hasBlock', () => {
  it('is true when either marker is present and false when neither is', () => {
    expect(hasBlock(DOC, 'facts')).toBe(true);
    expect(hasBlock('<!-- facts:start -->', 'facts')).toBe(true);
    expect(hasBlock('plain text', 'facts')).toBe(false);
    expect(hasBlock(DOC, 'facts:readme')).toBe(false);
  });
});

describe('replaceBlock', () => {
  it('replaces only the block content and leaves everything else byte-identical', () => {
    const next = replaceBlock(DOC, 'facts', 'new A\nnew B\nnew C');
    expect(next).toBe(
      [
        '# Title',
        '',
        'intro',
        '<!-- facts:start -->',
        'new A',
        'new B',
        'new C',
        '<!-- facts:end -->',
        '',
        'outro',
        '',
      ].join('\n'),
    );
  });

  it('is idempotent', () => {
    const once = replaceBlock(DOC, 'facts', 'x\ny');
    expect(replaceBlock(once, 'facts', 'x\ny')).toBe(once);
  });

  it('preserves CRLF line endings of the host file', () => {
    const crlf = DOC.replace(/\n/g, '\r\n');
    const next = replaceBlock(crlf, 'facts', 'a\nb');
    expect(next).toBe(
      ['# Title', '', 'intro', '<!-- facts:start -->', 'a', 'b', '<!-- facts:end -->', '', 'outro', '']
        .join('\r\n'),
    );
    expect(next.includes('\r\r')).toBe(false);
    expect(next.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });

  it('round-trips through extractBlock', () => {
    const content = '| a | b |\n|---|---|\n| 1 | 2 |';
    expect(extractBlock(replaceBlock(DOC, 'facts', content), 'facts')).toBe(content);
  });

  it('throws when the markers are missing instead of appending silently', () => {
    expect(() => replaceBlock('# nothing', 'facts', 'x')).toThrow(FactsError);
  });
});

describe('checkBlock', () => {
  it('reports ok when the block matches the expected content', () => {
    expect(checkBlock(DOC, 'facts', 'old line 1\nold line 2')).toEqual({ ok: true, diff: '' });
  });

  it('reports ok for a CRLF host file', () => {
    const crlf = DOC.replace(/\n/g, '\r\n');
    expect(checkBlock(crlf, 'facts', 'old line 1\nold line 2').ok).toBe(true);
  });

  it('reports a diff naming the changed line when a number is tampered with', () => {
    const generated = '| Levels | 150 |\n| Worlds | 15 |';
    const tampered = replaceBlock(DOC, 'facts', '| Levels | 151 |\n| Worlds | 15 |');
    const result = checkBlock(tampered, 'facts', generated);
    expect(result.ok).toBe(false);
    expect(result.diff).toContain('- | Levels | 150 |');
    expect(result.diff).toContain('+ | Levels | 151 |');
    expect(result.diff).not.toContain('Worlds');
  });
});

describe('lineDiff', () => {
  it('is empty for identical text', () => {
    expect(lineDiff('a\nb', 'a\nb')).toBe('');
  });

  it('marks missing and extra trailing lines', () => {
    const diff = lineDiff('a\nb', 'a');
    expect(diff).toContain('- b');
    const extra = lineDiff('a', 'a\nc');
    expect(extra).toContain('+ c');
  });
});
