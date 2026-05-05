import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createScheduler } from '../../js/sequencer/scheduler.js';
import { createVoice } from '../../js/audio/voiceFactory.js';
import * as stateMod from '../../js/sequencer/sequencerState.js';

vi.mock('../../js/sequencer/scheduler.js', () => ({
  createScheduler: vi.fn(),
}));

vi.mock('../../js/audio/voiceFactory.js', () => ({
  createVoice: vi.fn(),
}));

vi.mock('../../js/sequencer/sequencerState.js', () => ({
  SCHEMA_VERSION: '1.0.0',
  createDefaultState: vi.fn(),
  toggleStep: vi.fn(),
  setStepPitch: vi.fn(),
  setTrackVolume: vi.fn(),
  setTrackTempo: vi.fn(),
  setTrackSample: vi.fn(),
  clearTrackSample: vi.fn(),
}));

import { createSequencerEngine } from '../../js/sequencer/sequencerEngine.js';

const makeSteps = (activeAt = []) =>
  Array.from({ length: 16 }, (_, i) => ({
    active: activeAt.includes(i),
    pitchSemitones: 0,
  }));

const makeTrack = (id, name, voiceKind, overrides = {}) => ({
  id,
  name,
  voiceKind,
  sampleDataUrl: null,
  volume: 0.8,
  tempoBpm: 120,
  steps: makeSteps(),
  ...overrides,
});

const makeInitialState = (overrides = {}) => ({
  schemaVersion: '1.0.0',
  isPlaying: false,
  tracks: [
    makeTrack('kick', 'Kick', 'kick'),
    makeTrack('snare', 'Snare', 'snare'),
    makeTrack('hihat', 'HiHat', 'hihat'),
    makeTrack('bass', 'Bass', 'bass'),
  ],
  ...overrides,
});

const makeBus = () => {
  const handlers = new Map();
  return {
    on: vi.fn((event, fn) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
    }),
    off: vi.fn((event, fn) => handlers.get(event)?.delete(fn)),
    emit: vi.fn((event, payload) =>
      handlers.get(event)?.forEach((fn) => fn(payload)),
    ),
  };
};

const makeAudioEngine = () => ({
  context: { currentTime: 0 },
  masterGain: {},
  resume: vi.fn().mockResolvedValue(undefined),
});

const makeVoiceStub = () => ({
  trigger: vi.fn(),
  dispose: vi.fn(),
});

let schedulerConfig;
let schedulerStart;
let schedulerStop;
let createdVoices;

beforeEach(() => {
  schedulerConfig = null;
  schedulerStart = vi.fn();
  schedulerStop = vi.fn();
  createdVoices = [];

  vi.mocked(createScheduler).mockImplementation((cfg) => {
    schedulerConfig = cfg;
    return { start: schedulerStart, stop: schedulerStop };
  });

  vi.mocked(createVoice).mockImplementation((_engine, track) => {
    const v = makeVoiceStub();
    v._track = track;
    createdVoices.push(v);
    return v;
  });

  vi.mocked(stateMod.toggleStep).mockImplementation(
    (state, trackId, stepIndex) => ({
      ...state,
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              steps: t.steps.map((s, i) =>
                i === stepIndex ? { ...s, active: !s.active } : s,
              ),
            }
          : t,
      ),
    }),
  );
  vi.mocked(stateMod.setStepPitch).mockImplementation(
    (state, trackId, stepIndex, semis) => ({
      ...state,
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              steps: t.steps.map((s, i) =>
                i === stepIndex ? { ...s, pitchSemitones: semis } : s,
              ),
            }
          : t,
      ),
    }),
  );
  vi.mocked(stateMod.setTrackVolume).mockImplementation(
    (state, trackId, volume) => ({
      ...state,
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, volume } : t,
      ),
    }),
  );
  vi.mocked(stateMod.setTrackTempo).mockImplementation(
    (state, trackId, tempoBpm) => ({
      ...state,
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, tempoBpm } : t,
      ),
    }),
  );
  vi.mocked(stateMod.setTrackSample).mockImplementation(
    (state, trackId, dataUrl) => ({
      ...state,
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? { ...t, sampleDataUrl: dataUrl, voiceKind: 'sample' }
          : t,
      ),
    }),
  );
  vi.mocked(stateMod.clearTrackSample).mockImplementation(
    (state, trackId) => ({
      ...state,
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, sampleDataUrl: null } : t,
      ),
    }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createSequencerEngine', () => {
  describe('API surface', () => {
    it('returns an object exposing play, stop, getState, and dispatch', () => {
      const engine = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      expect(typeof engine.play).toBe('function');
      expect(typeof engine.stop).toBe('function');
      expect(typeof engine.getState).toBe('function');
      expect(typeof engine.dispatch).toBe('function');
    });

    it('getState returns the injected initialState before any mutation', () => {
      const initialState = makeInitialState();
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState,
        bus: makeBus(),
      });
      expect(eng.getState()).toEqual(initialState);
    });
  });

  describe('play()', () => {
    it('creates one voice per track via voiceFactory.createVoice', () => {
      const audio = makeAudioEngine();
      const eng = createSequencerEngine({
        engine: audio,
        initialState: makeInitialState(),
        bus: makeBus(),
      });

      eng.play();

      expect(createVoice).toHaveBeenCalledTimes(4);
      const calledTrackIds = vi
        .mocked(createVoice)
        .mock.calls.map((c) => c[1].id);
      expect(calledTrackIds).toEqual(
        expect.arrayContaining(['kick', 'snare', 'hihat', 'bass']),
      );
    });

    it('starts the scheduler', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      eng.play();
      expect(schedulerStart).toHaveBeenCalledTimes(1);
    });

    it('sets isPlaying=true in state', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      eng.play();
      expect(eng.getState().isPlaying).toBe(true);
    });

    it("emits 'state:changed' on the bus when starting playback", () => {
      const bus = makeBus();
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus,
      });

      eng.play();

      expect(bus.emit).toHaveBeenCalledWith(
        'state:changed',
        expect.objectContaining({ isPlaying: true }),
      );
    });
  });

  describe('onStepFire callback (passed to scheduler)', () => {
    it('triggers the voice for an ACTIVE step', () => {
      const initial = makeInitialState({
        tracks: [makeTrack('kick', 'Kick', 'kick', { steps: makeSteps([3]) })],
      });
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: initial,
        bus: makeBus(),
      });
      eng.play();
      const kickVoice = createdVoices.find((v) => v._track.id === 'kick');
      const kickTrack = eng.getState().tracks[0];

      schedulerConfig.onStepFire(kickTrack, 3, 1.234);

      expect(kickVoice.trigger).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger the voice for an INACTIVE step', () => {
      const initial = makeInitialState({
        tracks: [makeTrack('kick', 'Kick', 'kick', { steps: makeSteps([]) })],
      });
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: initial,
        bus: makeBus(),
      });
      eng.play();
      const kickVoice = createdVoices.find((v) => v._track.id === 'kick');
      const kickTrack = eng.getState().tracks[0];

      schedulerConfig.onStepFire(kickTrack, 0, 1.234);

      expect(kickVoice.trigger).not.toHaveBeenCalled();
    });

    it('passes (when, pitchSemitones, volume) to voice.trigger', () => {
      const customSteps = makeSteps([5]);
      customSteps[5].pitchSemitones = 7;
      const initial = makeInitialState({
        tracks: [
          makeTrack('kick', 'Kick', 'kick', {
            steps: customSteps,
            volume: 0.42,
          }),
        ],
      });
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: initial,
        bus: makeBus(),
      });
      eng.play();
      const kickVoice = createdVoices.find((v) => v._track.id === 'kick');
      const kickTrack = eng.getState().tracks[0];

      schedulerConfig.onStepFire(kickTrack, 5, 2.5);

      expect(kickVoice.trigger).toHaveBeenCalledWith(2.5, 7, 0.42);
    });
  });

  describe("dispatch({ type: 'TOGGLE_STEP' })", () => {
    it('calls the toggleStep pure function with current state, trackId, stepIndex', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });

      eng.dispatch({ type: 'TOGGLE_STEP', trackId: 'kick', stepIndex: 0 });

      expect(stateMod.toggleStep).toHaveBeenCalledWith(
        expect.objectContaining({ schemaVersion: '1.0.0' }),
        'kick',
        0,
      );
    });

    it('replaces the internal state with the result of the pure function', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      const before = eng.getState();

      eng.dispatch({ type: 'TOGGLE_STEP', trackId: 'kick', stepIndex: 0 });
      const after = eng.getState();

      expect(after).not.toBe(before);
      expect(after.tracks.find((t) => t.id === 'kick').steps[0].active).toBe(
        true,
      );
    });

    it("emits 'state:changed' with the updated state", () => {
      const bus = makeBus();
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus,
      });
      bus.emit.mockClear();

      eng.dispatch({ type: 'TOGGLE_STEP', trackId: 'kick', stepIndex: 0 });

      expect(bus.emit).toHaveBeenCalledWith(
        'state:changed',
        expect.objectContaining({ schemaVersion: '1.0.0' }),
      );
    });
  });

  describe("dispatch({ type: 'SET_TRACK_SAMPLE' })", () => {
    it('calls the setTrackSample pure function with the dataUrl', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });

      eng.dispatch({
        type: 'SET_TRACK_SAMPLE',
        trackId: 'kick',
        dataUrl: 'data:audio/wav;base64,AAA',
      });

      expect(stateMod.setTrackSample).toHaveBeenCalledWith(
        expect.anything(),
        'kick',
        'data:audio/wav;base64,AAA',
      );
    });

    it('swaps the live voice while playing: disposes old voice and creates a new one with sampleDataUrl set', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      eng.play();
      const oldKickVoice = createdVoices.find((v) => v._track.id === 'kick');
      const callsBefore = vi.mocked(createVoice).mock.calls.length;

      eng.dispatch({
        type: 'SET_TRACK_SAMPLE',
        trackId: 'kick',
        dataUrl: 'data:audio/wav;base64,XYZ',
      });

      expect(oldKickVoice.dispose).toHaveBeenCalled();
      expect(vi.mocked(createVoice).mock.calls.length).toBe(callsBefore + 1);
      const lastCall =
        vi.mocked(createVoice).mock.calls[
          vi.mocked(createVoice).mock.calls.length - 1
        ];
      expect(lastCall[1].id).toBe('kick');
      expect(lastCall[1].sampleDataUrl).toBe('data:audio/wav;base64,XYZ');
    });

    it('after the swap, onStepFire triggers the new voice and not the old one', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState({
          tracks: [
            makeTrack('kick', 'Kick', 'kick', { steps: makeSteps([0]) }),
          ],
        }),
        bus: makeBus(),
      });
      eng.play();
      const oldKickVoice = createdVoices[0];

      eng.dispatch({
        type: 'SET_TRACK_SAMPLE',
        trackId: 'kick',
        dataUrl: 'data:audio/wav;base64,XYZ',
      });
      const newKickVoice = createdVoices[createdVoices.length - 1];
      const kickTrack = eng.getState().tracks[0];

      schedulerConfig.onStepFire(kickTrack, 0, 0.5);

      expect(oldKickVoice.trigger).not.toHaveBeenCalled();
      expect(newKickVoice.trigger).toHaveBeenCalledWith(0.5, 0, 0.8);
    });
  });

  describe('stop()', () => {
    it('stops the scheduler', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      eng.play();

      eng.stop();

      expect(schedulerStop).toHaveBeenCalledTimes(1);
    });

    it('disposes every voice that was created on play', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      eng.play();
      const voicesAtPlay = createdVoices.slice();

      eng.stop();

      voicesAtPlay.forEach((v) => expect(v.dispose).toHaveBeenCalled());
    });

    it('sets isPlaying=false in state', () => {
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus: makeBus(),
      });
      eng.play();

      eng.stop();

      expect(eng.getState().isPlaying).toBe(false);
    });

    it("emits 'state:changed' after stopping", () => {
      const bus = makeBus();
      const eng = createSequencerEngine({
        engine: makeAudioEngine(),
        initialState: makeInitialState(),
        bus,
      });
      eng.play();
      bus.emit.mockClear();

      eng.stop();

      expect(bus.emit).toHaveBeenCalledWith(
        'state:changed',
        expect.objectContaining({ isPlaying: false }),
      );
    });
  });
});
