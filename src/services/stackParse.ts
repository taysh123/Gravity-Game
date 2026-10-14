// V8 stack traces -> the frames Crashlytics shows and groups non-fatals by (P00-T21). The Android System WebView is Chromium, so V8's
// format is the only one parsed:
//     at functionName (https://localhost/assets/index-abc.js:1:2345)
//     at new ClassName (url:line:col)  ·  at async fn (url:line:col)  ·  at url:line:col  (no function name)
// Lines without a position (the "Error: message" header, `at Array.forEach (<anonymous>)`, native frames) are skipped. A location
// that is a URL is reduced to its path (`assets/index-abc.js`, `src/scenes/GameScene.ts`): the origin and the dev server's ?t= stamp
// carry nothing and would split one crash into many issues. The shape is @capacitor-firebase/crashlytics's StackFrame
// (functionName, fileName, lineNumber). The plugin has no column field, so the column is dropped.
import { PLATFORM } from '../config/platform.config';

export interface StackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
}

export const ANONYMOUS_FUNCTION = '(anonymous)';

const NAMED = /^\s*at\s+(?:async\s+)?(.+?)\s+\((.+):(\d+):(\d+)\)\s*$/;
const UNNAMED = /^\s*at\s+(?:async\s+)?(.+):(\d+):(\d+)\s*$/;
const URL_PROTOCOLS = new Set(['http:', 'https:', 'capacitor:', 'file:']);

function shortFile(location: string): string {
  try {
    const url = new URL(location);
    if (URL_PROTOCOLS.has(url.protocol)) return url.pathname.replace(/^\/+/, '') || location;
  } catch {
    // not a URL (an eval frame, a bare path): keep it as it is
  }
  return location;
}

/** The frames of a V8 `error.stack`, in V8's order (the throwing frame first), at most PLATFORM.CRASH_MAX_STACK_FRAMES. */
export function parseStack(stack: string | null | undefined): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split('\n')) {
    if (frames.length >= PLATFORM.CRASH_MAX_STACK_FRAMES) break;
    const named = NAMED.exec(line);
    if (named) {
      frames.push({ functionName: named[1], fileName: shortFile(named[2]), lineNumber: Number(named[3]) });
      continue;
    }
    const unnamed = UNNAMED.exec(line);
    if (unnamed) frames.push({ functionName: ANONYMOUS_FUNCTION, fileName: shortFile(unnamed[1]), lineNumber: Number(unnamed[2]) });
  }
  return frames;
}
