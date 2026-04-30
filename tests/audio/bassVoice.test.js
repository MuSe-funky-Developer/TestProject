import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBassVoice } from '../../js/audio/synthVoices/bassVoice.js';

/**
 * Tests for the BassVoice (Sägezahn + Lowpass) synthesized voice.
 *
 * Voice contract (shared across all synth voices):
 *   trigger(when: number, pitchSemitones: number, gain: number) => void
 *   dispose() => void
 *
 * BassVoice specifics (per Task 11 of the implementation plan):
 *   - Sawtooth oscillator
 *   - Base frequency 110 Hz (A2), pitched via 110 * 2^(semitones/12)
 *   - Lowpass biquad filter at 800 Hz
 *   - Amp envelope ~250 ms
 *   - Pitch must be applied via frequency.setValueAtTime(...)
 */

function createEngineMock() {
  const context = new globalThis.AudioContext();
  const masterGain = context.createGain();
  return { context, masterGain, resume: () => context.resume() };
}

describe('createBassVoice', () => {
  let engine;

  beforeEach(() => {
    engine = createEngineMock();
  });

  it('returns an object exposing trigger and dispose functions', () => {
    const voice = createBassVoice(engine);
    expect(typeof voice.trigger).toBe('function');
    expect(typeof voice.dispose).toBe('function');
  });

  describe('trigger()', () => {
    it('creates an oscillator on the engine context', () => {
      const voice = createBassVoice(engine);
      voice.trigger(0, 0, 1);
      expect(engine.context.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('sets oscillator type to "sawtooth"', () => {
      let createdOsc;
      engine.context.createOscillator.mockImplementationOnce(() => {
        createdOsc = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        return createdOsc;
      });

      const voice = createBassVoice(engine);
      voice.trigger(0, 0, 1);

      expect(createdOsc.type).toBe('sawtooth');
    });

    it('creates a biquad filter and sets it to lowpass at 800 Hz', () => {
      let createdFilter;
      engine.context.createBiquadFilter.mockImplementationOnce(() => {
        createdFilter = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
          gain: { setValueAtTime: vi.fn(), value: 0 },
        };
        return createdFilter;
      });

      const voice = createBassVoice(engine);
      voice.trigger(0, 0, 1);

      expect(engine.context.createBiquadFilter).toHaveBeenCalledTimes(1);
      expect(createdFilter.type).toBe('lowpass');
      // Filter must be configured at ~800 Hz. Either via the AudioParam API or via the .value setter.
      const setAtTimeCalls = createdFilter.frequency.setValueAtTime.mock.calls;
      const usedSetAtTime = setAtTimeCalls.some((args) => args[0] === 800);
      const usedValue = createdFilter.frequency.value === 800;
      expect(usedSetAtTime || usedValue).toBe(true);
    });

    it('sets oscillator frequency to 110 Hz at the scheduled time when pitch is 0', () => {
      let createdOsc;
      engine.context.createOscillator.mockImplementationOnce(() => {
        createdOsc = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        return createdOsc;
      });

      const voice = createBassVoice(engine);
      voice.trigger(0.5, 0, 1);

      expect(createdOsc.frequency.setValueAtTime).toHaveBeenCalled();
      const calls = createdOsc.frequency.setValueAtTime.mock.calls;
      const matched = calls.find((args) => Math.abs(args[0] - 110) < 1e-6 && args[1] === 0.5);
      expect(matched).toBeDefined();
    });

    it('sets oscillator frequency to 220 Hz when pitch is +12 semitones', () => {
      let createdOsc;
      engine.context.createOscillator.mockImplementationOnce(() => {
        createdOsc = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        return createdOsc;
      });

      const voice = createBassVoice(engine);
      voice.trigger(1.0, 12, 1);

      const calls = createdOsc.frequency.setValueAtTime.mock.calls;
      const matched = calls.find((args) => Math.abs(args[0] - 220) < 1e-6 && args[1] === 1.0);
      expect(matched).toBeDefined();
    });

    it('sets oscillator frequency to 55 Hz when pitch is -12 semitones', () => {
      let createdOsc;
      engine.context.createOscillator.mockImplementationOnce(() => {
        createdOsc = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        return createdOsc;
      });

      const voice = createBassVoice(engine);
      voice.trigger(2.0, -12, 1);

      const calls = createdOsc.frequency.setValueAtTime.mock.calls;
      const matched = calls.find((args) => Math.abs(args[0] - 55) < 1e-6 && args[1] === 2.0);
      expect(matched).toBeDefined();
    });

    it('starts the oscillator at the scheduled `when`', () => {
      let createdOsc;
      engine.context.createOscillator.mockImplementationOnce(() => {
        createdOsc = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        return createdOsc;
      });

      const voice = createBassVoice(engine);
      voice.trigger(0.42, 0, 1);

      expect(createdOsc.start).toHaveBeenCalledWith(0.42);
    });

    it('stops the oscillator after a 250 ms envelope (within ~50 ms tolerance)', () => {
      let createdOsc;
      engine.context.createOscillator.mockImplementationOnce(() => {
        createdOsc = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        return createdOsc;
      });

      const voice = createBassVoice(engine);
      voice.trigger(1.0, 0, 1);

      expect(createdOsc.stop).toHaveBeenCalled();
      const stopAt = createdOsc.stop.mock.calls[0][0];
      // Envelope target is ~250 ms after `when`; allow generous tolerance for tail/release.
      expect(stopAt).toBeGreaterThanOrEqual(1.0 + 0.2);
      expect(stopAt).toBeLessThanOrEqual(1.0 + 0.6);
    });

    it('connects the signal chain through a gain node into engine.masterGain', () => {
      // Capture nodes in creation order.
      const createdOscNodes = [];
      const createdFilterNodes = [];
      const createdGainNodes = [];

      engine.context.createOscillator.mockImplementation(() => {
        const node = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        createdOscNodes.push(node);
        return node;
      });
      engine.context.createBiquadFilter.mockImplementation(() => {
        const node = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), value: 0 },
          gain: { setValueAtTime: vi.fn(), value: 0 },
        };
        createdFilterNodes.push(node);
        return node;
      });
      engine.context.createGain.mockImplementation(() => {
        const node = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        createdGainNodes.push(node);
        return node;
      });

      // Re-create engine so the mocks above are picked up at construction.
      engine = { context: engine.context, masterGain: engine.context.createGain(), resume: () => engine.context.resume() };
      const masterGain = engine.masterGain;

      const voice = createBassVoice(engine);
      voice.trigger(0, 0, 1);

      // After construction, voice creation should have produced: 1 oscillator,
      // 1 biquad filter, and at least 1 internal gain node (the amp envelope).
      expect(createdOscNodes.length).toBe(1);
      expect(createdFilterNodes.length).toBe(1);
      expect(createdGainNodes.length).toBeGreaterThanOrEqual(2); // master + amp env

      const osc = createdOscNodes[0];
      const filter = createdFilterNodes[0];
      // The amp envelope gain is the last gain node created (master was created first).
      const ampGain = createdGainNodes[createdGainNodes.length - 1];

      // osc -> filter
      expect(osc.connect).toHaveBeenCalledWith(filter);
      // filter -> ampGain
      expect(filter.connect).toHaveBeenCalledWith(ampGain);
      // ampGain -> masterGain
      expect(ampGain.connect).toHaveBeenCalledWith(masterGain);
    });

    it('drives the amp envelope using the requested gain value', () => {
      const createdGainNodes = [];
      engine.context.createGain.mockImplementation(() => {
        const node = {
          connect: vi.fn(),
          disconnect: vi.fn(),
          gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        };
        createdGainNodes.push(node);
        return node;
      });

      // Re-create engine so the gain mock is in effect for the masterGain too.
      engine = { context: engine.context, masterGain: engine.context.createGain(), resume: () => engine.context.resume() };

      const voice = createBassVoice(engine);
      voice.trigger(0.0, 0, 0.42);

      // The amp envelope (last gain node created) must reference the requested gain
      // somewhere in its envelope program.
      const ampGain = createdGainNodes[createdGainNodes.length - 1];
      const allCalls = [
        ...ampGain.gain.setValueAtTime.mock.calls,
        ...ampGain.gain.linearRampToValueAtTime.mock.calls,
        ...ampGain.gain.exponentialRampToValueAtTime.mock.calls,
      ];
      const sawRequestedGain = allCalls.some((args) => Math.abs(args[0] - 0.42) < 1e-6);
      expect(sawRequestedGain).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('disconnects owned nodes when called after a trigger', () => {
      const created = [];
      const wrap = (factory) => () => {
        const real = factory();
        created.push(real);
        return real;
      };
      engine.context.createOscillator.mockImplementation(
        wrap(() => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        })),
      );
      engine.context.createBiquadFilter.mockImplementation(
        wrap(() => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
          frequency: { setValueAtTime: vi.fn(), value: 0 },
          gain: { setValueAtTime: vi.fn(), value: 0 },
        })),
      );
      engine.context.createGain.mockImplementation(
        wrap(() => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
          gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
        })),
      );

      // Re-create engine using the new mocks.
      engine = { context: engine.context, masterGain: engine.context.createGain(), resume: () => engine.context.resume() };

      const voice = createBassVoice(engine);
      voice.trigger(0, 0, 1);

      const beforeDispose = created.length;
      voice.dispose();

      // At least one node owned by the voice must have been disconnected.
      const totalDisconnects = created.reduce((acc, n) => acc + n.disconnect.mock.calls.length, 0);
      expect(totalDisconnects).toBeGreaterThan(0);
      expect(beforeDispose).toBeGreaterThan(0);
    });

    it('does not throw when called without a prior trigger', () => {
      const voice = createBassVoice(engine);
      expect(() => voice.dispose()).not.toThrow();
    });
  });
});
