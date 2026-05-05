import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHihatVoice } from '../../js/audio/synthVoices/hihatVoice.js';

// --- Local mock builders -----------------------------------------------------
// We don't depend on the global AudioContext mock from tests/setup.js because
// the BiquadFilter Bandpass test needs a `Q` AudioParam which the generic
// AudioNodeMock does not expose. Building the engine inline keeps this test
// self-contained and unambiguous about which collaborator received which call.

function makeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function makeBufferSource() {
  return {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeBiquadFilter() {
  return {
    type: '',
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: makeParam(),
    Q: makeParam(),
  };
}

function makeGain() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: makeParam(),
  };
}

function createTestEngine({ captureChannelData } = {}) {
  const masterGain = makeGain();
  const context = {
    currentTime: 0,
    sampleRate: 44100,
    destination: { connect: vi.fn(), disconnect: vi.fn() },
    createBufferSource: vi.fn(() => makeBufferSource()),
    createBiquadFilter: vi.fn(() => makeBiquadFilter()),
    createGain: vi.fn(() => makeGain()),
    createBuffer: vi.fn((channels, length /*, sampleRate */) => {
      const data = new Float32Array(length);
      if (captureChannelData) captureChannelData(data);
      return {
        numberOfChannels: channels,
        length,
        sampleRate: 44100,
        duration: length / 44100,
        getChannelData: vi.fn(() => data),
      };
    }),
  };
  return { context, masterGain, resume: vi.fn() };
}

// --- Tests -------------------------------------------------------------------

describe('createHihatVoice', () => {
  let engine;

  beforeEach(() => {
    engine = createTestEngine();
  });

  it('returns an object with trigger and dispose functions', () => {
    const voice = createHihatVoice(engine);
    expect(typeof voice.trigger).toBe('function');
    expect(typeof voice.dispose).toBe('function');
  });

  // --- AC1: Noise ------------------------------------------------------------

  it('trigger creates a BufferSource for the noise', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0, 0, 1);
    expect(engine.context.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('trigger allocates a mono noise buffer via createBuffer', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0, 0, 1);
    expect(engine.context.createBuffer).toHaveBeenCalledTimes(1);
    const [channels, length, sampleRate] =
      engine.context.createBuffer.mock.calls[0];
    expect(channels).toBe(1);
    expect(length).toBeGreaterThan(0);
    expect(sampleRate).toBeGreaterThan(0);
  });

  it('trigger fills the noise buffer with non-zero random samples', () => {
    let captured = null;
    const localEngine = createTestEngine({
      captureChannelData: (data) => {
        captured = data;
      },
    });
    const voice = createHihatVoice(localEngine);
    voice.trigger(0, 0, 1);
    expect(captured).not.toBeNull();
    const nonZeroCount = captured.reduce(
      (acc, v) => acc + (v !== 0 ? 1 : 0),
      0,
    );
    expect(nonZeroCount).toBeGreaterThan(0);
  });

  it('assigns the generated noise buffer onto the source.buffer', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0, 0, 1);
    const source = engine.context.createBufferSource.mock.results[0].value;
    const buffer = engine.context.createBuffer.mock.results[0].value;
    expect(source.buffer).toBe(buffer);
  });

  // --- AC2: Bandpass with Q=10 ----------------------------------------------

  it('trigger creates a BiquadFilter and configures it as bandpass', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0, 0, 1);
    expect(engine.context.createBiquadFilter).toHaveBeenCalledTimes(1);
    const filter = engine.context.createBiquadFilter.mock.results[0].value;
    expect(filter.type).toBe('bandpass');
  });

  it('sets the bandpass Q to 10 at the trigger time', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 0, 1);
    const filter = engine.context.createBiquadFilter.mock.results[0].value;
    expect(filter.Q.setValueAtTime).toHaveBeenCalledWith(10, 0.5);
  });

  it('sets the bandpass center frequency to 8000 Hz at pitch 0', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 0, 1);
    const filter = engine.context.createBiquadFilter.mock.results[0].value;
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(8000, 0.5);
  });

  // --- AC3: Short decay ------------------------------------------------------

  it('stops the source approximately 50 ms after the trigger time', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 0, 1);
    const source = engine.context.createBufferSource.mock.results[0].value;
    expect(source.stop).toHaveBeenCalledTimes(1);
    const stopTime = source.stop.mock.calls[0][0];
    expect(stopTime).toBeCloseTo(0.55, 2);
  });

  it('schedules a gain decay via exponentialRampToValueAtTime to ~0 around when+50ms', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 0, 0.8);
    const gain = engine.context.createGain.mock.results[0].value;
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(1);
    const [target, time] =
      gain.gain.exponentialRampToValueAtTime.mock.calls[0];
    expect(time).toBeCloseTo(0.55, 2);
    // exponentialRampToValueAtTime cannot legally target 0; the value must be
    // small but strictly positive. 0.05 is a comfortable upper bound for
    // "essentially silent" against a unity peak.
    expect(target).toBeGreaterThan(0);
    expect(target).toBeLessThan(0.05);
  });

  it('starts the source at the given when time', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 0, 1);
    const source = engine.context.createBufferSource.mock.results[0].value;
    expect(source.start).toHaveBeenCalledWith(0.5);
  });

  // --- AC4: Pitch scaling ----------------------------------------------------

  it('pitch +12 semitones doubles the bandpass center to 16000 Hz', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 12, 1);
    const filter = engine.context.createBiquadFilter.mock.results[0].value;
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(16000, 0.5);
  });

  it('pitch -12 semitones halves the bandpass center to 4000 Hz', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, -12, 1);
    const filter = engine.context.createBiquadFilter.mock.results[0].value;
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(4000, 0.5);
  });

  // --- Wiring & lifecycle ----------------------------------------------------

  it('connects nodes in the chain source -> filter -> gain -> masterGain', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0, 0, 1);
    const source = engine.context.createBufferSource.mock.results[0].value;
    const filter = engine.context.createBiquadFilter.mock.results[0].value;
    const gain = engine.context.createGain.mock.results[0].value;
    expect(source.connect).toHaveBeenCalledWith(filter);
    expect(filter.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(engine.masterGain);
  });

  it('sets peak gain to the provided gain argument at the trigger time', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0.5, 0, 0.7);
    const gain = engine.context.createGain.mock.results[0].value;
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.7, 0.5);
  });

  it('dispose() does not throw', () => {
    const voice = createHihatVoice(engine);
    voice.trigger(0, 0, 1);
    expect(() => voice.dispose()).not.toThrow();
  });
});
