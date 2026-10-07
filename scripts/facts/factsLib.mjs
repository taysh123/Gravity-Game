// Pure helpers for scripts/facts.mjs. No filesystem, no child processes, no clock:
// everything here is a function of its arguments so it can be unit-tested and so the
// generated facts block is deterministic (the CI drift check depends on that).

export class FactsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FactsError';
  }
}

// ---------------------------------------------------------------------------
// Marker blocks:  <!-- {id}:start --> ... <!-- {id}:end -->  (markers on their own lines)
// ---------------------------------------------------------------------------

export function markers(id) {
  return { start: `<!-- ${id}:start -->`, end: `<!-- ${id}:end -->` };
}

/** True when either marker of the block is present (a half-present block is still an error to extract). */
export function hasBlock(text, id) {
  const { start, end } = markers(id);
  return text.includes(start) || text.includes(end);
}

function locate(text, id) {
  const { start, end } = markers(id);
  const find = (marker) => {
    const first = text.indexOf(marker);
    if (first === -1) throw new FactsError(`marker ${marker} not found`);
    if (text.indexOf(marker, first + marker.length) !== -1) {
      throw new FactsError(`marker ${marker} appears more than once`);
    }
    return first;
  };
  const startIdx = find(start);
  const endIdx = find(end);
  if (endIdx < startIdx) throw new FactsError(`${end} comes before ${start}`);
  return { innerStart: startIdx + start.length, endIdx };
}

const toLf = (s) => s.replace(/\r\n/g, '\n');

/** Block content as LF text, without the single newline after the start / before the end marker. */
export function extractBlock(text, id) {
  const { innerStart, endIdx } = locate(text, id);
  return toLf(text.slice(innerStart, endIdx)).replace(/^\n/, '').replace(/\n$/, '');
}

/** Replace the block content; the rest of the file is untouched and the file's EOL style is kept. */
export function replaceBlock(text, id, content) {
  const { innerStart, endIdx } = locate(text, id);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const body = toLf(content).split('\n').join(eol);
  return text.slice(0, innerStart) + eol + body + eol + text.slice(endIdx);
}

/** Positional line diff: `- ` = generated (expected), `+ ` = found in the file. Empty string when equal. */
export function lineDiff(expected, actual) {
  const a = toLf(expected).split('\n');
  const b = toLf(actual).split('\n');
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined) out.push(`- ${a[i]}`);
    if (b[i] !== undefined) out.push(`+ ${b[i]}`);
  }
  return out.join('\n');
}

/** Compare the block in `text` with freshly generated `expected` content. */
export function checkBlock(text, id, expected) {
  const actual = extractBlock(text, id);
  const want = toLf(expected);
  return actual === want ? { ok: true, diff: '' } : { ok: false, diff: lineDiff(want, actual) };
}
