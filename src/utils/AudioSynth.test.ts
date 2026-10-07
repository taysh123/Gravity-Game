import { describe, it, expect, vi } from 'vitest';
import { AudioSynth } from './AudioSynth';

// P00-T11: AudioSynth.suspend() backs the "hidden = silent" half of the lifecycle contract. A minimal fake
// AudioContext is enough: the synth only builds an oscillator -> gain -> destination chain and flips ctx state.
function param(): { value: number; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; cancelScheduledValues: ReturnType<typeof vi.fn> } {
  return { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() };
}

function fakeCtx(initial: AudioContextState = 'running') {
  const oscs: Array<{ stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }> = [];
  const gains: Array<{ gain: ReturnType<typeof param> }> = [];
  let settleSuspend: (() => void) | null = null;
  const ctx = {
    state: initial as AudioContextState,
    currentTime: 5,
    destination: {},
    // Like the real thing, suspend() resolves later: the state does not flip until the promise settles.
    suspend: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settleSuspend = () => {
            ctx.state = 'suspended';
            resolve();
          };
        }),
    ),
    resume: vi.fn(async () => {
      ctx.state = 'running';
    }),
    createOscillator: vi.fn(() => {
      const o = {
        type: 'sine',
        frequency: param(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscs.push(o);
      return o;
    }),
    createGain: vi.fn(() => {
      const g = { gain: param(), connect: vi.fn() };
      gains.push(g);
      return g;
    }),
  };
  return {
    ctx,
    oscs,
    gains,
    settle: () => settleSuspend?.(),
    asContext: ctx as unknown as AudioContext,
  };
}

// Let every queued promise callback (suspend().catch().finally() is a three-step chain) run.
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('AudioSynth.suspend', () => {
  it('suspends the AudioContext', () => {
    const f = fakeCtx();
    new AudioSynth(f.asContext).suspend();
    expect(f.ctx.suspend).toHaveBeenCalledTimes(1);
  });

  it('cuts a held hum immediately (no fade tail that would sound when the context resumes)', () => {
    const f = fakeCtx();
    const synth = new AudioSynth(f.asContext);
    synth.startHum();
    expect(f.oscs).toHaveLength(1);
    synth.suspend();
    const g = f.gains[0].gain;
    expect(g.cancelScheduledValues).toHaveBeenCalledWith(5);
    expect(g.setValueAtTime).toHaveBeenLastCalledWith(0.0001, 5);
    expect(f.oscs[0].stop).toHaveBeenCalledWith(5);
    // the hum slot is free again: a later press starts a fresh hum
    synth.startHum();
    expect(f.oscs).toHaveLength(2);
  });

  it('is safe with no hum and when called repeatedly', () => {
    const f = fakeCtx();
    const synth = new AudioSynth(f.asContext);
    expect(() => {
      synth.suspend();
      synth.suspend();
    }).not.toThrow();
  });

  it('does not touch a closed context and never throws', () => {
    const f = fakeCtx('closed');
    expect(() => new AudioSynth(f.asContext).suspend()).not.toThrow();
    expect(f.ctx.suspend).not.toHaveBeenCalled();
  });

  it('swallows a rejected suspend() (no unhandled rejection)', async () => {
    const f = fakeCtx();
    f.ctx.suspend.mockImplementation(() => Promise.reject(new Error('InvalidStateError')));
    const synth = new AudioSynth(f.asContext);
    synth.suspend();
    await flush();
    // reaching here without an unhandledRejection (vitest fails the run on one) is the assertion
    expect(f.ctx.suspend).toHaveBeenCalledTimes(1);
  });
});

describe('AudioSynth.resume after suspend', () => {
  it('resumes a suspended context', () => {
    const f = fakeCtx('suspended');
    new AudioSynth(f.asContext).resume();
    expect(f.ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a context that is running and was not suspended (existing behaviour)', () => {
    const f = fakeCtx('running');
    new AudioSynth(f.asContext).resume();
    expect(f.ctx.resume).not.toHaveBeenCalled();
  });

  it('a resume right after suspend (hidden then visible within one task) still wins, even before ctx.state flips', () => {
    const f = fakeCtx('running');
    const synth = new AudioSynth(f.asContext);
    synth.suspend(); // ctx.state is still 'running' here: suspend() has not settled
    expect(f.ctx.state).toBe('running');
    synth.resume();
    expect(f.ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('after the suspend settles and a resume ran, a plain resume is a no-op again', async () => {
    const f = fakeCtx('running');
    const synth = new AudioSynth(f.asContext);
    synth.suspend();
    f.settle();
    await flush();
    expect(f.ctx.state).toBe('suspended');
    synth.resume(); // state is 'suspended' now: normal resume
    expect(f.ctx.resume).toHaveBeenCalledTimes(1);
    await flush();
    synth.resume(); // running again, nothing pending
    expect(f.ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected resume()', async () => {
    const f = fakeCtx('suspended');
    f.ctx.resume.mockImplementation(() => Promise.reject(new Error('closed')));
    new AudioSynth(f.asContext).resume();
    await flush();
    expect(f.ctx.resume).toHaveBeenCalledTimes(1);
  });
});
