// What counts as a failure signal on a page, and the log that collects them. Pure: unit-tested in signals.test.mjs.
//
// The rule is "zero exclusions": any console.error, any uncaught exception or unhandled rejection (both arrive as a
// Playwright `pageerror`), and any failed or 4xx/5xx SAME-ORIGIN request fails the run. There is no allow-list here.
// Something noisy gets fixed at its source (the favicon 404 was fixed with a <link rel="icon"> in index.html).
// Third-party requests are the one scoping rule: the harness only owns what the app itself serves.
//
// Expected signals (P00-T21) are not an allow-list. A check that provokes an error ON PURPOSE (window.__crashTest throws inside
// update) declares it with ctx.expectSignal(matcher, label) right before the action. From then on, a signal matching that specific
// matcher is claimed instead of failing the job, and the job FAILS if none arrives. A matcher must name the error (compileMatcher
// refuses a catch-all), and it only ever applies to the one job that declared it.

export function isSameOrigin(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

const where = (loc) => (loc && loc.url ? `${loc.url}${loc.lineNumber !== undefined ? `:${loc.lineNumber}` : ''}` : '');

/** @param {{type: string, text: string, location?: {url?: string, lineNumber?: number}}} msg */
export function classifyConsoleMessage(msg) {
  if (msg.type !== 'error') return null;
  return { kind: 'console.error', text: msg.text, where: where(msg.location) };
}

/** An uncaught exception or an unhandled promise rejection (Chromium reports both through Runtime.exceptionThrown). */
export function classifyPageError(err) {
  const isError = err !== null && typeof err === 'object' && 'message' in err;
  const text = isError ? `${err.name ?? 'Error'}: ${err.message}` : String(err);
  const frame = isError && typeof err.stack === 'string' ? (err.stack.split('\n').find((l) => l.trim().startsWith('at ')) ?? '') : '';
  return { kind: 'pageerror', text, where: frame.trim() };
}

/** @param {{url: string, failure: string}} req */
export function classifyRequestFailed(req, origin) {
  if (!isSameOrigin(req.url, origin)) return null;
  return { kind: 'request failed', text: req.failure, where: req.url };
}

/** @param {{url: string, status: number}} res */
export function classifyResponse(res, origin) {
  if (res.status < 400 || !isSameOrigin(res.url, origin)) return null;
  return { kind: `http ${res.status}`, text: `HTTP ${res.status}`, where: res.url };
}

const ASSET_TYPES = new Set(['image', 'script', 'stylesheet', 'font', 'media']);
const DATA_TYPES = new Set(['fetch', 'xhr']);

/**
 * `vite preview` (like most SPA hosts) answers a request for a file that does not exist with index.html and status 200,
 * so a missing asset never shows up as a 404. An asset request that comes back as HTML is exactly that: flag it.
 * @param {{url: string, status: number, resourceType: string, contentType?: string}} res
 */
export function classifySpaFallback(res, origin) {
  if (res.status >= 400 || !isSameOrigin(res.url, origin)) return null;
  if (!res.contentType || !res.contentType.toLowerCase().includes('text/html')) return null;
  const isAsset = ASSET_TYPES.has(res.resourceType);
  let isDataFile = false;
  if (DATA_TYPES.has(res.resourceType)) {
    const ext = /\.([a-z0-9]+)$/i.exec(new URL(res.url).pathname)?.[1]?.toLowerCase();
    isDataFile = ext !== undefined && ext !== 'html' && ext !== 'htm';
  }
  if (!isAsset && !isDataFile) return null;
  return { kind: 'missing file', text: `a ${res.resourceType} request got text/html (the SPA fallback, so the file does not exist)`, where: res.url };
}

/**
 * Compile a ctx.expectSignal matcher: { kind?, text }. `text` is required. A non-empty string matches as a substring of the signal
 * text; a RegExp is searched (String.prototype.search, so a /g flag is harmless). There is no catch-all: a blank string or a RegExp
 * that matches the empty string is refused, so an expectation can only claim the specific error a check provokes on purpose.
 * `kind` (optional) must equal the signal's kind exactly ('console.error', 'pageerror', 'request failed', 'http 404', ...).
 */
export function compileMatcher(matcher) {
  const { kind, text } = matcher !== null && typeof matcher === 'object' ? matcher : {};
  if (kind !== undefined && (typeof kind !== 'string' || kind.trim() === '')) {
    throw new Error('expectSignal: kind, when given, must be a non-empty string such as "console.error" or "pageerror"');
  }
  let test;
  let what;
  if (typeof text === 'string' && text.trim() !== '') {
    test = (s) => s.includes(text);
    what = `containing ${JSON.stringify(text)}`;
  } else if (text instanceof RegExp && ''.search(text) === -1) {
    test = (s) => s.search(text) !== -1;
    what = `matching ${String(text)}`;
  } else {
    throw new Error('expectSignal: text must be a non-empty string or a RegExp that cannot match the empty string (no catch-all)');
  }
  return {
    describe: `a ${kind ? `${kind} ` : ''}signal ${what}`,
    matches: (signal) => (kind === undefined || signal.kind === kind) && test(String(signal.text)),
  };
}

export function createSignalLog() {
  const list = [];
  const claimed = [];
  const expectations = [];
  let closed = false;
  return {
    /** Record a signal. One that an expectation matches is claimed (counted there, never a failure); a closed log records nothing. */
    add(signal) {
      if (!signal || closed) return;
      const owner = expectations.find((e) => e.matcher.matches(signal));
      if (owner) {
        owner.matched.push(signal);
        claimed.push(signal);
        return;
      }
      list.push(signal);
    },
    /** ctx.expectSignal: claim the signals matching `matcher` from now on. Returns { count(), signals() }. */
    expect(matcher, label) {
      const compiled = compileMatcher(matcher);
      const entry = { label: label || compiled.describe, matcher: compiled, matched: [] };
      expectations.push(entry);
      return { count: () => entry.matched.length, signals: () => entry.matched.slice() };
    },
    /** Every expectation with its match count; the runner fails the job for each one still at 0. */
    expectations: () => expectations.map((e) => ({ label: e.label, describe: e.matcher.describe, count: e.matched.length })),
    claimed: () => claimed.slice(),
    mark: () => list.length,
    since: (mark) => list.slice(mark),
    all: () => list.slice(),
    size: () => list.length,
    /** Teardown aborts in-flight requests; those are not the app's fault, so a closed log records nothing. */
    close() {
      closed = true;
    },
  };
}
