import { describe, expect, it } from 'vitest';
import { PLATFORM } from '../config/platform.config';
import { ANONYMOUS_FUNCTION, parseStack } from './stackParse';

const BUNDLE = 'https://localhost/assets/index-DuH7r3JV.js';

describe('parseStack: V8 frames (the Android System WebView is Chromium) -> Crashlytics StackFrame', () => {
  it('a frame with a function name', () => {
    expect(parseStack(`Error: boom\n    at GameScene.update (${BUNDLE}:1:2345)`)).toEqual([
      { functionName: 'GameScene.update', fileName: 'assets/index-DuH7r3JV.js:1:2345', lineNumber: 1 },
    ]);
  });

  it('keeps the column in the fileName (the plugin has no column field; a minified chunk has 2-4 lines, so the line alone is useless)', () => {
    const [frame] = parseStack(`Error: boom\n    at a (${BUNDLE}:2:48113)`);
    expect(frame.lineNumber).toBe(2);
    expect(frame.fileName).toBe('assets/index-DuH7r3JV.js:2:48113');
  });

  it('a frame without a function name', () => {
    expect(parseStack(`Error: boom\n    at ${BUNDLE}:3:99`)).toEqual([
      { functionName: ANONYMOUS_FUNCTION, fileName: 'assets/index-DuH7r3JV.js:3:99', lineNumber: 3 },
    ]);
  });

  it('constructor, async and Object.<anonymous> frames keep their V8 name', () => {
    const stack = [
      'TypeError: x is undefined',
      `    at new Ball (${BUNDLE}:1:10)`,
      '    at async Promise.all (index 0)',
      `    at async load (${BUNDLE}:1:20)`,
      `    at Object.<anonymous> (${BUNDLE}:1:30)`,
    ].join('\n');
    expect(parseStack(stack).map((f) => f.functionName)).toEqual(['new Ball', 'load', 'Object.<anonymous>']);
  });

  it('keeps V8 order (the throwing frame first) and skips lines without a position', () => {
    const stack = ['Error: boom', `    at a (${BUNDLE}:1:1)`, '    at Array.forEach (<anonymous>)', '    at native', `    at b (${BUNDLE}:2:2)`].join('\n');
    expect(parseStack(stack).map((f) => `${f.functionName}:${f.lineNumber}`)).toEqual(['a:1', 'b:2']);
  });

  it('reduces a URL to its path: no origin, no dev-server ?t= stamp', () => {
    const stack = [
      'Error: boom',
      '    at create (http://127.0.0.1:5173/src/scenes/GameScene.ts?t=1760400000000:212:9)',
      '    at http://localhost/assets/index-abc.js:1:5',
      '    at capacitor://localhost/assets/index-abc.js:1:6',
    ].join('\n');
    expect(parseStack(stack)).toEqual([
      { functionName: 'create', fileName: 'src/scenes/GameScene.ts:212:9', lineNumber: 212 },
      { functionName: ANONYMOUS_FUNCTION, fileName: 'assets/index-abc.js:1:5', lineNumber: 1 },
      { functionName: ANONYMOUS_FUNCTION, fileName: 'assets/index-abc.js:1:6', lineNumber: 1 },
    ]);
  });

  it('keeps a location that is not a URL as it is (an eval frame)', () => {
    expect(parseStack(`Error: boom\n    at eval (eval at run (${BUNDLE}:1:5), <anonymous>:4:7)`)).toEqual([
      { functionName: 'eval', fileName: `eval at run (${BUNDLE}:1:5), <anonymous>:4:7`, lineNumber: 4 },
    ]);
  });

  it('no stack, no frames', () => {
    for (const s of [undefined, null, '', 'Error: no frames here']) expect(parseStack(s)).toEqual([]);
  });

  it('a stack that is not a string (error.stack is writable) is no frames, never a throw', () => {
    for (const s of [123, {}, [], () => 'x', true]) expect(parseStack(s as unknown as string)).toEqual([]);
  });

  it('stops at PLATFORM.CRASH_MAX_STACK_FRAMES frames', () => {
    const lines = ['RangeError: Maximum call stack size exceeded'];
    for (let i = 0; i < PLATFORM.CRASH_MAX_STACK_FRAMES + 10; i++) lines.push(`    at f${i} (${BUNDLE}:1:${i + 1})`);
    const frames = parseStack(lines.join('\n'));
    expect(frames).toHaveLength(PLATFORM.CRASH_MAX_STACK_FRAMES);
    expect(frames[0].functionName).toBe('f0');
  });

  it('copes with Windows line endings', () => {
    expect(parseStack(`Error: x\r\n    at a (${BUNDLE}:1:1)\r\n`).map((f) => f.functionName)).toEqual(['a']);
  });

  it('parses a real V8 stack from this runtime', () => {
    const frames = parseStack(new Error('real').stack);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.some((f) => /stackParse\.test\.ts:\d+:\d+$/.test(f.fileName) && f.lineNumber > 0)).toBe(true);
  });
});
