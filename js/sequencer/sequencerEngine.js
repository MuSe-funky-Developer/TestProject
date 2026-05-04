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

  const onStepFire = (track, stepIndex, when) => {
    const voice = voices.get(track.id);
    if (!voice) return;
    const step = track.steps[stepIndex];
    if (!step || !step.active) return;
    voice.trigger(when, step.pitchSemitones, track.volume);
  };

  const scheduler = createScheduler({
    engine,
    getState: () => state,
    onStepFire,
  });

  const setState = (next) => {
    state = next;
    bus.emit('state:changed', state);
  };

  const swapVoice = (trackId) => {
    const oldVoice = voices.get(trackId);
    if (!oldVoice) return;
    oldVoice.dispose();
    const track = state.tracks.find((t) => t.id === trackId);
    voices.set(trackId, createVoice(engine, track));
  };

  const play = () => {
    for (const track of state.tracks) {
      voices.set(track.id, createVoice(engine, track));
    }
    scheduler.start();
    setState({ ...state, isPlaying: true });
  };

  const stop = () => {
    scheduler.stop();
    for (const voice of voices.values()) voice.dispose();
    voices.clear();
    setState({ ...state, isPlaying: false });
  };

  const dispatch = (action) => {
    switch (action.type) {
      case 'TOGGLE_STEP':
        setState(toggleStep(state, action.trackId, action.stepIndex));
        return;
      case 'SET_STEP_PITCH':
        setState(
          setStepPitch(state, action.trackId, action.stepIndex, action.semitones),
        );
        return;
      case 'SET_TRACK_VOLUME':
        setState(setTrackVolume(state, action.trackId, action.volume));
        return;
      case 'SET_TRACK_TEMPO':
        setState(setTrackTempo(state, action.trackId, action.tempoBpm));
        return;
      case 'SET_TRACK_SAMPLE':
        setState(setTrackSample(state, action.trackId, action.dataUrl));
        swapVoice(action.trackId);
        return;
      case 'CLEAR_TRACK_SAMPLE':
        setState(clearTrackSample(state, action.trackId));
        swapVoice(action.trackId);
        return;
      default:
        return;
    }
  };

  return { play, stop, getState: () => state, dispatch };
}
