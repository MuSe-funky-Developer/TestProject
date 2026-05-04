import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks for the voice modules that voiceFactory.js will dispatch to.
// Declared before the SUT import so vi.mock hoisting takes effect.
vi.mock('../../js/audio/synthVoices/kickVoice.js', () => ({
  createKickVoice: vi.fn((engine) => ({
    __kind: 'kick',
    engine,
    trigger: vi.fn(),
    dispose: vi.fn(),
  })),
}));
vi.mock('../../js/audio/synthVoices/snareVoice.js', () => ({
  createSnareVoice: vi.fn((engine) => ({
    __kind: 'snare',
    engine,
    trigger: vi.fn(),
    dispose: vi.fn(),
  })),
}));
vi.mock('../../js/audio/synthVoices/hihatVoice.js', () => ({
  createHihatVoice: vi.fn((engine) => ({
    __kind: 'hihat',
    engine,
    trigger: vi.fn(),
    dispose: vi.fn(),
  })),
}));
vi.mock('../../js/audio/synthVoices/bassVoice.js', () => ({
  createBassVoice: vi.fn((engine) => ({
    __kind: 'bass',
    engine,
    trigger: vi.fn(),
    dispose: vi.fn(),
  })),
}));
vi.mock('../../js/audio/sampleVoice.js', () => ({
  createSampleVoice: vi.fn(async (engine, dataUrl) => ({
    __kind: 'sample',
    engine,
    dataUrl,
    trigger: vi.fn(),
    dispose: vi.fn(),
  })),
}));

import { createVoice } from '../../js/audio/voiceFactory.js';
import { createKickVoice } from '../../js/audio/synthVoices/kickVoice.js';
import { createSnareVoice } from '../../js/audio/synthVoices/snareVoice.js';
import { createHihatVoice } from '../../js/audio/synthVoices/hihatVoice.js';
import { createBassVoice } from '../../js/audio/synthVoices/bassVoice.js';
import { createSampleVoice } from '../../js/audio/sampleVoice.js';

const buildTrack = (overrides = {}) => ({
  id: 't-1',
  name: 'Test Track',
  voiceKind: 'kick',
  sampleDataUrl: null,
  volume: 0.8,
  tempoBpm: 120,
  steps: [],
  ...overrides,
});

const buildEngine = () => ({
  context: { currentTime: 0 },
  masterGain: { connect: vi.fn() },
});

describe('createVoice (voice factory)', () => {
  let engine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = buildEngine();
  });

  describe('Synth-Voices ohne Sample (sampleDataUrl === null)', () => {
    it('erzeugt eine KickVoice für voiceKind="kick"', () => {
      const track = buildTrack({ voiceKind: 'kick', sampleDataUrl: null });

      const voice = createVoice(engine, track);

      expect(createKickVoice).toHaveBeenCalledTimes(1);
      expect(createKickVoice).toHaveBeenCalledWith(engine);
      expect(voice).toEqual(expect.objectContaining({ __kind: 'kick' }));
      expect(createSampleVoice).not.toHaveBeenCalled();
    });

    it('erzeugt eine SnareVoice für voiceKind="snare"', () => {
      const track = buildTrack({ voiceKind: 'snare', sampleDataUrl: null });

      const voice = createVoice(engine, track);

      expect(createSnareVoice).toHaveBeenCalledTimes(1);
      expect(createSnareVoice).toHaveBeenCalledWith(engine);
      expect(voice).toEqual(expect.objectContaining({ __kind: 'snare' }));
      expect(createSampleVoice).not.toHaveBeenCalled();
    });

    it('erzeugt eine HihatVoice für voiceKind="hihat"', () => {
      const track = buildTrack({ voiceKind: 'hihat', sampleDataUrl: null });

      const voice = createVoice(engine, track);

      expect(createHihatVoice).toHaveBeenCalledTimes(1);
      expect(createHihatVoice).toHaveBeenCalledWith(engine);
      expect(voice).toEqual(expect.objectContaining({ __kind: 'hihat' }));
      expect(createSampleVoice).not.toHaveBeenCalled();
    });

    it('erzeugt eine BassVoice für voiceKind="bass"', () => {
      const track = buildTrack({ voiceKind: 'bass', sampleDataUrl: null });

      const voice = createVoice(engine, track);

      expect(createBassVoice).toHaveBeenCalledTimes(1);
      expect(createBassVoice).toHaveBeenCalledWith(engine);
      expect(voice).toEqual(expect.objectContaining({ __kind: 'bass' }));
      expect(createSampleVoice).not.toHaveBeenCalled();
    });
  });

  describe('SampleVoice wenn sampleDataUrl !== null', () => {
    it('erzeugt eine SampleVoice unabhängig vom voiceKind (kick + dataUrl)', () => {
      const dataUrl = 'data:audio/wav;base64,UklGRgAAAAA=';
      const track = buildTrack({ voiceKind: 'kick', sampleDataUrl: dataUrl });

      createVoice(engine, track);

      expect(createSampleVoice).toHaveBeenCalledTimes(1);
      expect(createSampleVoice).toHaveBeenCalledWith(engine, dataUrl);
      expect(createKickVoice).not.toHaveBeenCalled();
      expect(createSnareVoice).not.toHaveBeenCalled();
      expect(createHihatVoice).not.toHaveBeenCalled();
      expect(createBassVoice).not.toHaveBeenCalled();
    });

    it('erzeugt eine SampleVoice unabhängig vom voiceKind (snare + dataUrl)', () => {
      const dataUrl = 'data:audio/mp3;base64,SGVsbG8=';
      const track = buildTrack({ voiceKind: 'snare', sampleDataUrl: dataUrl });

      createVoice(engine, track);

      expect(createSampleVoice).toHaveBeenCalledTimes(1);
      expect(createSampleVoice).toHaveBeenCalledWith(engine, dataUrl);
      expect(createSnareVoice).not.toHaveBeenCalled();
    });
  });

  describe('Unbekannter voiceKind ohne Sample', () => {
    it('wirft einen Error für nicht unterstützten voiceKind', () => {
      const track = buildTrack({ voiceKind: 'theremin', sampleDataUrl: null });

      expect(() => createVoice(engine, track)).toThrow(Error);
    });

    it('Error-Message nennt den unbekannten voiceKind-Wert', () => {
      const track = buildTrack({ voiceKind: 'flarp', sampleDataUrl: null });

      expect(() => createVoice(engine, track)).toThrow(/unknown voiceKind: flarp/i);
    });

    it('ruft keine Voice-Factory auf, wenn voiceKind unbekannt ist', () => {
      const track = buildTrack({ voiceKind: 'wobble', sampleDataUrl: null });

      expect(() => createVoice(engine, track)).toThrow();

      expect(createKickVoice).not.toHaveBeenCalled();
      expect(createSnareVoice).not.toHaveBeenCalled();
      expect(createHihatVoice).not.toHaveBeenCalled();
      expect(createBassVoice).not.toHaveBeenCalled();
      expect(createSampleVoice).not.toHaveBeenCalled();
    });
  });
});
