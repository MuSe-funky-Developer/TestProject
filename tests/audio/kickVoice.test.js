import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createKickVoice } from '../../js/audio/synthVoices/kickVoice.js';

function makeAudioParam() {
  return {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    value: 0,
  };
}

function makeAudioNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: makeAudioParam(),
    gain: makeAudioParam(),
    type: '',
  };
}

function makeFakeEngine({ currentTime = 0 } = {}) {
  const oscillators = [];
  const gains = [];
  const context = {
    currentTime,
    createOscillator: vi.fn(() => {
      const node = makeAudioNode();
      oscillators.push(node);
      return node;
    }),
    createGain: vi.fn(() => {
      const node = makeAudioNode();
      gains.push(node);
      return node;
    }),
  };
  const masterGain = makeAudioNode();
  return { engine: { context, masterGain }, oscillators, gains };
}

function collectScheduledValues(audioParam) {
  const calls = [
    ...audioParam.setValueAtTime.mock.calls,
    ...audioParam.linearRampToValueAtTime.mock.calls,
    ...audioParam.exponentialRampToValueAtTime.mock.calls,
  ];
  return calls.map(([value]) => value);
}

describe('createKickVoice', () => {
  let fixture;

  beforeEach(() => {
    fixture = makeFakeEngine();
  });

  describe('factory contract', () => {
    it('returns an object exposing trigger and dispose functions', () => {
      const voice = createKickVoice(fixture.engine);
      expect(typeof voice.trigger).toBe('function');
      expect(typeof voice.dispose).toBe('function');
    });
  });

  describe('trigger node graph', () => {
    it('creates an oscillator on the audio context', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      expect(fixture.engine.context.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('creates a gain node on the audio context', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      expect(fixture.engine.context.createGain).toHaveBeenCalledTimes(1);
    });

    it('uses a sine oscillator', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      const [oscillator] = fixture.oscillators;
      expect(oscillator.type).toBe('sine');
    });

    it('connects the oscillator-gain chain to engine.masterGain', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      const [oscillator] = fixture.oscillators;
      const [gainNode] = fixture.gains;

      // The oscillator should pipe through the gain node, and the gain node
      // should ultimately connect to the engine's master gain.
      expect(oscillator.connect).toHaveBeenCalledWith(gainNode);
      expect(gainNode.connect).toHaveBeenCalledWith(fixture.engine.masterGain);
    });
  });

  describe('start/stop scheduling', () => {
    it('starts the oscillator exactly at the scheduled `when`', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      const [oscillator] = fixture.oscillators;
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.start).toHaveBeenCalledWith(0.5);
    });

    it('stops the oscillator strictly after `when` (leaving a decay tail)', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      const [oscillator] = fixture.oscillators;
      expect(oscillator.stop).toHaveBeenCalledTimes(1);
      const [stopAt] = oscillator.stop.mock.calls[0];
      expect(typeof stopAt).toBe('number');
      expect(stopAt).toBeGreaterThan(0.5);
    });
  });

  describe('pitch handling', () => {
    it('schedules the 60 Hz default base frequency at `when` when pitchSemitones=0', () => {
      const voice = createKickVoice(fixture.engine);
      const when = 0.5;
      voice.trigger(when, 0, 0.8);
      const [oscillator] = fixture.oscillators;
      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(60, when);
    });

    it('doubles the base frequency to 120 Hz when pitchSemitones=12', () => {
      const voice = createKickVoice(fixture.engine);
      const when = 0.5;
      voice.trigger(when, 12, 0.8);
      const [oscillator] = fixture.oscillators;
      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(120, when);
    });

    it('halves the base frequency to 30 Hz when pitchSemitones=-12', () => {
      const voice = createKickVoice(fixture.engine);
      const when = 0.5;
      voice.trigger(when, -12, 0.8);
      const [oscillator] = fixture.oscillators;
      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(30, when);
    });

    it('schedules a downward pitch envelope (target frequency < base frequency)', () => {
      const voice = createKickVoice(fixture.engine);
      const when = 0.5;
      voice.trigger(when, 0, 0.8);
      const [oscillator] = fixture.oscillators;

      // Pitch must drop from 60 Hz toward a lower value via at least one ramp call.
      const rampTargets = [
        ...oscillator.frequency.linearRampToValueAtTime.mock.calls,
        ...oscillator.frequency.exponentialRampToValueAtTime.mock.calls,
      ].map(([target]) => target);

      expect(rampTargets.length).toBeGreaterThan(0);
      expect(rampTargets.some((target) => target < 60)).toBe(true);
    });
  });

  describe('amp envelope', () => {
    it('explicitly schedules gain.gain.setValueAtTime(0, ...) when gain=0', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0);
      const [gainNode] = fixture.gains;

      const setValueCalls = gainNode.gain.setValueAtTime.mock.calls;
      expect(setValueCalls.length).toBeGreaterThan(0);
      expect(setValueCalls.some(([value]) => value === 0)).toBe(true);
    });

    it('schedules the requested gain (0.8) somewhere in the amp envelope', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      const [gainNode] = fixture.gains;

      const scheduled = collectScheduledValues(gainNode.gain);
      expect(scheduled).toContain(0.8);
    });
  });

  describe('dispose', () => {
    it('disconnects the gain node so nothing leaks into masterGain', () => {
      const voice = createKickVoice(fixture.engine);
      voice.trigger(0.5, 0, 0.8);
      const [gainNode] = fixture.gains;

      voice.dispose();

      expect(gainNode.disconnect).toHaveBeenCalled();
    });

    it('is safe to call before any trigger (no throw)', () => {
      const voice = createKickVoice(fixture.engine);
      expect(() => voice.dispose()).not.toThrow();
    });
  });
});
