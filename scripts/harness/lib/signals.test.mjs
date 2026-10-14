import { describe, expect, it } from 'vitest';
import {
  classifyConsoleMessage,
  classifyPageError,
  classifyRequestFailed,
  classifyResponse,
  classifySpaFallback,
  compileMatcher,
  createSignalLog,
  isSameOrigin,
} from './signals.mjs';

const ORIGIN = 'http://127.0.0.1:5173';

describe('classifyConsoleMessage: every console.error fails, with zero exclusions', () => {
  it('flags type "error"', () => {
    const s = classifyConsoleMessage({ type: 'error', text: 'boom', location: { url: `${ORIGIN}/a.js`, lineNumber: 3 } });
    expect(s).toEqual({ kind: 'console.error', text: 'boom', where: `${ORIGIN}/a.js:3` });
  });

  it('flags the "Failed to load resource" line a 404 favicon produces (no favicon allow-list)', () => {
    const s = classifyConsoleMessage({ type: 'error', text: 'Failed to load resource: the server responded with a status of 404 (Not Found)', location: { url: `${ORIGIN}/favicon.ico` } });
    expect(s?.kind).toBe('console.error');
  });

  it('ignores every other level', () => {
    for (const type of ['log', 'info', 'debug', 'warning', 'trace', 'dir']) {
      expect(classifyConsoleMessage({ type, text: 'x' })).toBeNull();
    }
  });

  it('copes with a message without a location', () => {
    expect(classifyConsoleMessage({ type: 'error', text: 'x' })).toEqual({ kind: 'console.error', text: 'x', where: '' });
  });
});

describe('classifyPageError: uncaught exceptions and unhandled rejections', () => {
  it('flags an Error with its name and message', () => {
    const err = new TypeError('bad');
    err.stack = undefined;
    expect(classifyPageError(err)).toEqual({ kind: 'pageerror', text: 'TypeError: bad', where: '' });
  });

  it('keeps the first stack frame when there is one', () => {
    const err = new Error('x');
    err.stack = `Error: x\n    at foo (${ORIGIN}/src/a.ts:1:2)\n    at bar (${ORIGIN}/src/b.ts:3:4)`;
    expect(classifyPageError(err).where).toBe(`at foo (${ORIGIN}/src/a.ts:1:2)`);
  });

  it('copes with a thrown non-Error', () => {
    expect(classifyPageError('plain').text).toBe('plain');
    expect(classifyPageError(undefined).text).toBe('undefined');
  });
});

describe('isSameOrigin', () => {
  it('compares scheme, host and port', () => {
    expect(isSameOrigin(`${ORIGIN}/x`, ORIGIN)).toBe(true);
    expect(isSameOrigin('http://127.0.0.1:5174/x', ORIGIN)).toBe(false);
    expect(isSameOrigin('https://example.com/x', ORIGIN)).toBe(false);
    expect(isSameOrigin('data:text/plain,hi', ORIGIN)).toBe(false);
    expect(isSameOrigin('not a url', ORIGIN)).toBe(false);
  });

  it('counts a blob URL minted by the page as same-origin', () => {
    expect(isSameOrigin(`blob:${ORIGIN}/6f1c`, ORIGIN)).toBe(true);
  });
});

describe('classifyRequestFailed / classifyResponse: same-origin only', () => {
  it('flags a failed same-origin request', () => {
    expect(classifyRequestFailed({ url: `${ORIGIN}/a.png`, failure: 'net::ERR_FAILED' }, ORIGIN)).toEqual({
      kind: 'request failed',
      text: 'net::ERR_FAILED',
      where: `${ORIGIN}/a.png`,
    });
  });

  it('does not flag a failed third-party request', () => {
    expect(classifyRequestFailed({ url: 'https://example.com/a.png', failure: 'net::ERR_FAILED' }, ORIGIN)).toBeNull();
  });

  it('flags a same-origin 4xx/5xx response and nothing below 400', () => {
    expect(classifyResponse({ url: `${ORIGIN}/favicon.ico`, status: 404 }, ORIGIN)).toEqual({ kind: 'http 404', text: 'HTTP 404', where: `${ORIGIN}/favicon.ico` });
    expect(classifyResponse({ url: `${ORIGIN}/x`, status: 500 }, ORIGIN)?.kind).toBe('http 500');
    for (const status of [200, 204, 206, 301, 304]) {
      expect(classifyResponse({ url: `${ORIGIN}/x`, status }, ORIGIN)).toBeNull();
    }
  });

  it('does not flag a third-party error response', () => {
    expect(classifyResponse({ url: 'https://example.com/x', status: 503 }, ORIGIN)).toBeNull();
  });
});

describe('classifySpaFallback: vite preview answers a missing file with index.html and status 200', () => {
  const res = (over) => ({ url: `${ORIGIN}/assets/missing.png`, status: 200, resourceType: 'image', contentType: 'text/html', ...over });

  it('flags an image, script, stylesheet, font or media request that came back as HTML', () => {
    for (const resourceType of ['image', 'script', 'stylesheet', 'font', 'media']) {
      expect(classifySpaFallback(res({ resourceType }), ORIGIN)).toEqual({
        kind: 'missing file',
        text: `a ${resourceType} request got text/html (the SPA fallback, so the file does not exist)`,
        where: `${ORIGIN}/assets/missing.png`,
      });
    }
  });

  it('flags a fetch or xhr for a file with a non-html extension that came back as HTML', () => {
    expect(classifySpaFallback(res({ resourceType: 'fetch', url: `${ORIGIN}/data/levels.json` }), ORIGIN)?.kind).toBe('missing file');
    expect(classifySpaFallback(res({ resourceType: 'xhr', url: `${ORIGIN}/a.bin` }), ORIGIN)?.kind).toBe('missing file');
  });

  it('does not flag the page itself, a fetch without an extension, a real asset or a third party', () => {
    expect(classifySpaFallback(res({ resourceType: 'document', url: `${ORIGIN}/` }), ORIGIN)).toBeNull();
    expect(classifySpaFallback(res({ resourceType: 'fetch', url: `${ORIGIN}/api/thing` }), ORIGIN)).toBeNull();
    expect(classifySpaFallback(res({ contentType: 'image/png' }), ORIGIN)).toBeNull();
    expect(classifySpaFallback(res({ resourceType: 'script', contentType: 'text/javascript; charset=utf-8' }), ORIGIN)).toBeNull();
    expect(classifySpaFallback(res({ url: 'https://example.com/x.png' }), ORIGIN)).toBeNull();
    expect(classifySpaFallback(res({ contentType: undefined }), ORIGIN)).toBeNull();
  });

  it('leaves error statuses to classifyResponse', () => {
    expect(classifySpaFallback(res({ status: 404 }), ORIGIN)).toBeNull();
  });
});

describe('createSignalLog', () => {
  it('records signals and hands back what arrived after a mark', () => {
    const log = createSignalLog();
    log.add({ kind: 'console.error', text: 'one', where: '' });
    const m = log.mark();
    expect(log.since(m)).toEqual([]);
    log.add({ kind: 'pageerror', text: 'two', where: '' });
    log.add({ kind: 'http 404', text: 'three', where: '' });
    expect(log.since(m).map((s) => s.text)).toEqual(['two', 'three']);
    expect(log.all()).toHaveLength(3);
    expect(log.size()).toBe(3);
  });

  it('stops recording once closed (teardown aborts are not failures)', () => {
    const log = createSignalLog();
    log.close();
    log.add({ kind: 'request failed', text: 'net::ERR_ABORTED', where: '' });
    expect(log.size()).toBe(0);
  });

  it('ignores a null signal so a classifier result can be passed straight in', () => {
    const log = createSignalLog();
    log.add(null);
    expect(log.size()).toBe(0);
  });
});

describe('compileMatcher: what ctx.expectSignal accepts (P00-T21)', () => {
  it('a non-empty string matches as a substring of the signal text', () => {
    const m = compileMatcher({ text: 'injected frame error' });
    expect(m.matches({ kind: 'console.error', text: '[frameGuard] Error: injected frame error', where: '' })).toBe(true);
    expect(m.matches({ kind: 'console.error', text: 'something else', where: '' })).toBe(false);
  });

  it('a RegExp is searched, and a /g flag does not make it stateful', () => {
    const m = compileMatcher({ text: /frame error/g });
    const s = { kind: 'pageerror', text: 'Error: frame error', where: '' };
    expect(m.matches(s)).toBe(true);
    expect(m.matches(s)).toBe(true);
  });

  it('kind, when given, must equal the signal kind', () => {
    const m = compileMatcher({ kind: 'console.error', text: 'boom' });
    expect(m.matches({ kind: 'console.error', text: 'boom', where: '' })).toBe(true);
    expect(m.matches({ kind: 'pageerror', text: 'Error: boom', where: '' })).toBe(false);
  });

  it('refuses a catch-all: no text, a blank string, a RegExp that matches the empty string, a bad kind', () => {
    const bad = [undefined, null, {}, { text: '' }, { text: '   ' }, { text: /.*/ }, { text: /x?/ }, { text: new RegExp('') }, { text: 42 }, { kind: '', text: 'x' }, { kind: 3, text: 'x' }];
    for (const matcher of bad) expect(() => compileMatcher(matcher)).toThrow(/^expectSignal:/);
  });

  it('describes itself for the failure message', () => {
    expect(compileMatcher({ kind: 'console.error', text: 'boom' }).describe).toBe('a console.error signal containing "boom"');
    expect(compileMatcher({ text: /bo+m/ }).describe).toBe('a signal matching /bo+m/');
  });
});

describe('createSignalLog: expected signals (ctx.expectSignal, P00-T21)', () => {
  const sig = (kind, text) => ({ kind, text, where: '' });

  it('a signal that matches an expectation is claimed: it is counted there and is not a failure', () => {
    const log = createSignalLog();
    const e = log.expect({ kind: 'console.error', text: 'injected' }, 'the injected error');
    log.add(sig('console.error', 'injected error 1'));
    log.add(sig('console.error', 'injected error 2'));
    expect(e.count()).toBe(2);
    expect(e.signals().map((s) => s.text)).toEqual(['injected error 1', 'injected error 2']);
    expect(log.all()).toEqual([]);
    expect(log.size()).toBe(0);
    expect(log.claimed()).toHaveLength(2);
  });

  it('a signal that matches no expectation still fails the job', () => {
    const log = createSignalLog();
    log.expect({ text: 'injected' }, 'x');
    log.add(sig('pageerror', 'TypeError: something real'));
    expect(log.all().map((s) => s.text)).toEqual(['TypeError: something real']);
  });

  it('only signals that arrive after the expectation is declared are claimed', () => {
    const log = createSignalLog();
    log.add(sig('console.error', 'injected too early'));
    const e = log.expect({ text: 'injected' }, 'x');
    log.add(sig('console.error', 'injected on time'));
    expect(e.count()).toBe(1);
    expect(log.all().map((s) => s.text)).toEqual(['injected too early']);
  });

  it('ctx.step marks see only unclaimed signals', () => {
    const log = createSignalLog();
    log.expect({ text: 'injected' }, 'x');
    const m = log.mark();
    log.add(sig('console.error', 'injected'));
    expect(log.since(m)).toEqual([]);
    log.add(sig('console.error', 'real'));
    expect(log.since(m).map((s) => s.text)).toEqual(['real']);
  });

  it('the first matching expectation claims a signal', () => {
    const log = createSignalLog();
    const a = log.expect({ text: 'frame' }, 'a');
    const b = log.expect({ text: 'frame error' }, 'b');
    log.add(sig('console.error', 'frame error'));
    expect([a.count(), b.count()]).toEqual([1, 0]);
  });

  it('expectations() reports each one with its count, so the runner can fail one that never matched', () => {
    const log = createSignalLog();
    log.expect({ text: 'never' }, 'never arrives');
    log.expect({ kind: 'console.error', text: 'arrives' }, 'arrives');
    log.add(sig('console.error', 'it arrives'));
    expect(log.expectations()).toEqual([
      { label: 'never arrives', describe: 'a signal containing "never"', count: 0 },
      { label: 'arrives', describe: 'a console.error signal containing "arrives"', count: 1 },
    ]);
  });

  it('a closed log claims nothing either', () => {
    const log = createSignalLog();
    const e = log.expect({ text: 'injected' }, 'x');
    log.close();
    log.add(sig('console.error', 'injected'));
    expect(e.count()).toBe(0);
    expect(log.size()).toBe(0);
  });

  it('expect() without a label uses the matcher description', () => {
    const log = createSignalLog();
    log.expect({ text: 'boom' });
    expect(log.expectations()[0].label).toBe('a signal containing "boom"');
  });

  it('refuses a catch-all matcher at declaration', () => {
    expect(() => createSignalLog().expect({ text: '' }, 'x')).toThrow(/^expectSignal:/);
  });
});
