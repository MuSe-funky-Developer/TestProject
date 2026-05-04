import { createAudioEngine } from './audio/audioEngine.js';
import { EventBus } from './lib/eventBus.js';
import { createSequencerEngine } from './sequencer/sequencerEngine.js';
import { createDefaultState } from './sequencer/sequencerState.js';
import { loadState, saveState } from './storage/localStoragePersistence.js';
import { renderGrid } from './ui/gridRenderer.js';
import { renderPlayControls } from './ui/playControls.js';
import { renderTrackControls } from './ui/trackControls.js';

export async function bootstrap(doc, win = globalThis.window) {
  const engine = createAudioEngine();
  const bus = new EventBus();
  const initialState = loadState() ?? createDefaultState();
  const sequencer = createSequencerEngine({ engine, initialState, bus });

  const transportEl = doc.querySelector('.transport');
  const trackListEl = doc.querySelector('#track-list');
  const healthEl = doc.querySelector('#health');

  let trackControlsEl = null;
  let gridEl = null;
  if (trackListEl) {
    trackControlsEl = doc.createElement('div');
    trackControlsEl.id = 'track-controls';
    gridEl = doc.createElement('div');
    gridEl.id = 'step-grid';
    trackListEl.replaceChildren(trackControlsEl, gridEl);
  }

  let playControls = null;
  if (transportEl) {
    playControls = renderPlayControls(transportEl, {
      onPlay: () => {
        engine.resume();
        sequencer.play();
      },
      onStop: () => sequencer.stop(),
      onClear: () => sequencer.stop(),
    });
  }

  const renderAll = (state) => {
    if (gridEl) {
      renderGrid(gridEl, state, {
        onStepClick: (trackId, stepIndex) =>
          sequencer.dispatch({ type: 'TOGGLE_STEP', trackId, stepIndex }),
        onPitchChange: (trackId, stepIndex, semitones) =>
          sequencer.dispatch({ type: 'SET_STEP_PITCH', trackId, stepIndex, semitones }),
      });
    }
    if (trackControlsEl) {
      renderTrackControls(trackControlsEl, state, {
        onVolumeChange: (trackId, volume) =>
          sequencer.dispatch({ type: 'SET_TRACK_VOLUME', trackId, volume }),
        onTempoChange: (trackId, tempoBpm) =>
          sequencer.dispatch({ type: 'SET_TRACK_TEMPO', trackId, tempoBpm }),
        onSampleLoaded: (trackId, dataUrl) =>
          sequencer.dispatch({ type: 'SET_TRACK_SAMPLE', trackId, dataUrl }),
        onSampleCleared: (trackId) =>
          sequencer.dispatch({ type: 'CLEAR_TRACK_SAMPLE', trackId }),
      });
    }
    if (playControls) playControls.setPlaying(state.isPlaying);
  };

  bus.on('state:changed', renderAll);
  renderAll(sequencer.getState());

  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('beforeunload', () => {
      saveState(sequencer.getState());
    });
  }

  if (healthEl) healthEl.textContent = 'ok';

  return { engine, sequencer };
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => bootstrap(document, window));
}
