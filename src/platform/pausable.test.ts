import { describe, it, expect } from 'vitest';
import { isPausable, isDismissable } from './pausable';

// P00-T10: the wiring talks to scenes through two duck-typed contracts, so a scene that drops a member degrades to
// "Back does nothing" instead of throwing inside the native back-button handler.

describe('isPausable', () => {
  it('accepts a gameplay scene shape', () => {
    expect(isPausable({ gameplayEnded: false, requestPause: () => undefined })).toBe(true);
    expect(isPausable({ gameplayEnded: true, requestPause: () => undefined })).toBe(true);
  });

  it.each([null, undefined, 0, 'GameScene', {}, { requestPause: () => undefined }, { gameplayEnded: false }])(
    'rejects %j',
    (v) => {
      expect(isPausable(v)).toBe(false);
    },
  );

  it('rejects a non-boolean gameplayEnded or a non-function requestPause', () => {
    expect(isPausable({ gameplayEnded: 'no', requestPause: () => undefined })).toBe(false);
    expect(isPausable({ gameplayEnded: false, requestPause: 1 })).toBe(false);
  });
});

describe('isDismissable', () => {
  it('accepts an overlay with close()', () => {
    expect(isDismissable({ close: () => undefined })).toBe(true);
  });

  it.each([null, undefined, 1, {}, { close: 'x' }])('rejects %j', (v) => {
    expect(isDismissable(v)).toBe(false);
  });
});
