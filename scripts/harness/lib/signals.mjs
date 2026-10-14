// What counts as a failure signal on a page, and the log that collects them. Pure: unit-tested in signals.test.mjs.
//
// The rule is "zero exclusions": any console.error, any uncaught exception or unhandled rejection (both arrive as a
// Playwright `pageerror`), and any failed or 4xx/5xx SAME-ORIGIN request fails the run. There is no allow-list here.
// Something noisy gets fixed at its source (the favicon 404 was fixed with a <link rel="icon"> in index.html).
// Third-party requests are the one scoping rule: the harness only owns what the app itself serves.

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

export function createSignalLog() {
  const list = [];
  let closed = false;
  return {
    add(signal) {
      if (signal && !closed) list.push(signal);
    },
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
