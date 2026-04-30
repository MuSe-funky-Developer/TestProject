import { createScheduler } from './scheduler.js';
import { createVoice } from '../audio/voiceFactory.js';
import {
  toggleStep,
  setStepPitch,
  setTrackVolume,
  setTrackTempo,
  setTrackSample,
  clearTrackSample,
} from './sequencerState.js';

export function createSequencerEngine({ engine, initialState, bus }) {
  let state = initialState;
  const voices = new Map();

  function emitChange() {
    if (bus && typeof bus.emit === 'function') bus.emit('state:changed', state);
  }

  function disposeVoices() {
    for (const v of voices.values()) {
      if (v && typeof v.dispose === 'function') v.dispose();
    }
    voices.clear();
  }

  function buildVoices() {
    disposeVoices();
    for (const track of state.tracks) {
      voices.set(track.id, createVoice(engine, track));
    }
  }

  const scheduler = createScheduler({
    engine,
    getState: () => state,
    onStepFire(track, stepIndex, when) {
      const step = track.steps[stepIndex];
      if (!step || !step.active) return;
      const voice = voices.get(track.id);
      if (voice && typeof voice.trigger === 'function') {
        voice.trigger(when, step.pitchSemitones, track.volume);
      }
    },
  });

  function play() {
    buildVoices();
    state = { ...state, isPlaying: true };
    scheduler.start();
    emitChange();
  }

  function stop() {
    scheduler.stop();
    disposeVoices();
    state = { ...state, isPlaying: false };
    emitChange();
  }

  function replaceVoiceFor(trackId) {
    const track = state.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const existing = voices.get(trackId);
    if (existing && typeof existing.dispose === 'function') existing.dispose();
    voices.set(trackId, createVoice(engine, track));
  }

  function dispatch(action) {
    switch (action.type) {
      case 'TOGGLE_STEP':
        state = toggleStep(state, action.trackId, action.stepIndex);
        break;
      case 'SET_STEP_PITCH':
        state = setStepPitch(state, action.trackId, action.stepIndex, action.semitones);
        break;
      case 'SET_TRACK_VOLUME':
        state = setTrackVolume(state, action.trackId, action.volume);
        break;
      case 'SET_TRACK_TEMPO':
        state = setTrackTempo(state, action.trackId, action.bpm);
        break;
      case 'SET_TRACK_SAMPLE':
        state = setTrackSample(state, action.trackId, action.dataUrl);
        if (voices.size > 0) replaceVoiceFor(action.trackId);
        break;
      case 'CLEAR_TRACK_SAMPLE':
        state = clearTrackSample(state, action.trackId);
        if (voices.size > 0) replaceVoiceFor(action.trackId);
        break;
      default:
        return;
    }
    emitChange();
  }

  return {
    play,
    stop,
    getState: () => state,
    dispatch,
  };
}
