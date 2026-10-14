import { describe, expect, it } from 'vitest';
import {
  classifyConsoleMessage,
  classifyPageError,
  classifyRequestFailed,
  classifyResponse,
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
