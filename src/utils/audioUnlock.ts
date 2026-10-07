// Pure rule for the persistent DOM-gesture audio re-unlock (D-11, P00-T11 review). main.ts installs one capture-phase
// pointerdown / touchend listener that calls AudioSynth.resumeFromGesture() on EVERY gesture; that method asks this
// function whether ctx.resume() is warranted right now. The Android WebView only restarts a suspended AudioContext when
// resume() runs inside a real DOM gesture (a Phaser input callback is dispatched during the game step, not in the
// gesture call stack), so after a background return the next tap has to be able to do it.
//
// Resume only a context that is suspended AND whose audio is wanted. `audioWanted` is false while the app is
// backgrounded, under the pause overlay, or with Sound and Music both off, so a tap on the overlay never un-silences it.
export function shouldResumeOnGesture(state: AudioContextState, audioWanted: boolean): boolean {
  return state === 'suspended' && audioWanted;
}
