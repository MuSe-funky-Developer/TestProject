import { createAudioEngine } from './audio/audioEngine.js';
import { createSequencerEngine } from './sequencer/sequencerEngine.js';
import { createDefaultState } from './sequencer/sequencerState.js';
import { saveState, loadState } from './storage/localStoragePersistence.js';
import { renderGrid } from './ui/gridRenderer.js';
import { renderPlayControls } from './ui/playControls.js';

export async function bootstrap(doc, win) {
  const window_ = win || (typeof window !== 'undefined' ? window : undefined);
  const engine = createAudioEngine();
  const initialState = loadState() || createDefaultState();
  const sequencer = createSequencerEngine({ engine, initialState });

  const trackList = doc.querySelector('#track-list');
  const transport = doc.querySelector('.transport');

  const stepCallbacks = {
    onStepClick: (trackId, stepIndex) => {
      sequencer.dispatch({ type: 'TOGGLE_STEP', trackId, stepIndex });
    },
    onPitchChange: (trackId, stepIndex, semitones) => {
      sequencer.dispatch({ type: 'SET_STEP_PITCH', trackId, stepIndex, semitones });
    },
  };

  if (trackList) renderGrid(trackList, sequencer.getState(), stepCallbacks);

  if (transport) {
    renderPlayControls(transport, {
      onPlay: () => {
        engine.resume();
        sequencer.play();
      },
      onStop: () => {
        sequencer.stop();
      },
      onClear: () => {
        sequencer.stop();
      },
    });
  }

  if (window_ && typeof window_.addEventListener === 'function') {
    window_.addEventListener('beforeunload', () => {
      saveState(sequencer.getState());
    });
  }

  const health = doc.querySelector('#health');
  if (health) health.textContent = 'ok';

  return { engine, sequencer };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => bootstrap(document, window));
}
