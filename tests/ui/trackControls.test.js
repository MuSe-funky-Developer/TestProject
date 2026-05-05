import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderTrackControls } from '../../js/ui/trackControls.js';

/**
 * Minimal SequencerState fixture for the trackControls UI module.
 * trackControls only consumes track id/name/volume/tempoBpm, so steps
 * are intentionally omitted to keep the test focused on this module.
 */
function buildState() {
  return {
    schemaVersion: '1.0.0',
    isPlaying: false,
    tracks: [
      { id: 'kick-id',  name: 'Kick',  voiceKind: 'kick',  sampleDataUrl: null, volume: 0.8, tempoBpm: 120, steps: [] },
      { id: 'snare-id', name: 'Snare', voiceKind: 'snare', sampleDataUrl: null, volume: 0.5, tempoBpm: 100, steps: [] },
    ],
  };
}

function buildCallbacks() {
  return {
    onVolumeChange: vi.fn(),
    onTempoChange: vi.fn(),
    onSampleLoaded: vi.fn(),
    onSampleCleared: vi.fn(),
  };
}

/**
 * Find the DOM container for a given track by trackId. The exact element
 * (row vs. anything else) is up to the implementation, but every control
 * inside it must be addressable by its trackId. We resolve via the
 * `data-track-id` attribute carried by individual controls.
 */
function controlsForTrack(root, trackId) {
  return {
    volume: root.querySelector(`input.volume[data-track-id="${trackId}"]`),
    tempo: root.querySelector(`input.tempo[data-track-id="${trackId}"]`),
    sample: root.querySelector(`input.sample[data-track-id="${trackId}"]`),
    clear: root.querySelector(`button.clear-sample[data-track-id="${trackId}"]`),
  };
}

describe('renderTrackControls', () => {
  let root;
  let state;
  let callbacks;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = document.getElementById('root');
    state = buildState();
    callbacks = buildCallbacks();
  });

  // ── AC: "Pro Track werden alle Controls gerendert" ─────────────────────

  describe('rendering per track', () => {
    it('renders one volume range input per track', () => {
      renderTrackControls(root, state, callbacks);

      expect(root.querySelectorAll('input.volume').length).toBe(state.tracks.length);
    });

    it('renders one tempo number input per track', () => {
      renderTrackControls(root, state, callbacks);

      expect(root.querySelectorAll('input.tempo').length).toBe(state.tracks.length);
    });

    it('renders one sample file input per track', () => {
      renderTrackControls(root, state, callbacks);

      expect(root.querySelectorAll('input.sample').length).toBe(state.tracks.length);
    });

    it('renders one clear-sample button per track', () => {
      renderTrackControls(root, state, callbacks);

      expect(root.querySelectorAll('button.clear-sample').length).toBe(state.tracks.length);
    });

    it('volume input is type="range" with min="0", max="1", step="0.01"', () => {
      renderTrackControls(root, state, callbacks);

      const { volume } = controlsForTrack(root, 'kick-id');
      expect(volume).not.toBeNull();
      expect(volume.type).toBe('range');
      expect(volume.min).toBe('0');
      expect(volume.max).toBe('1');
      expect(volume.step).toBe('0.01');
    });

    it('tempo input is type="number" with min="30" and max="300"', () => {
      renderTrackControls(root, state, callbacks);

      const { tempo } = controlsForTrack(root, 'kick-id');
      expect(tempo).not.toBeNull();
      expect(tempo.type).toBe('number');
      expect(tempo.min).toBe('30');
      expect(tempo.max).toBe('300');
    });

    it('sample input is type="file" with accept="audio/*"', () => {
      renderTrackControls(root, state, callbacks);

      const { sample } = controlsForTrack(root, 'kick-id');
      expect(sample).not.toBeNull();
      expect(sample.type).toBe('file');
      expect(sample.accept).toBe('audio/*');
    });

    it('volume input value reflects track.volume', () => {
      renderTrackControls(root, state, callbacks);

      // 0.8 from the Kick track in the fixture.
      const { volume } = controlsForTrack(root, 'kick-id');
      expect(Number(volume.value)).toBeCloseTo(0.8, 5);
    });

    it('tempo input value reflects track.tempoBpm', () => {
      renderTrackControls(root, state, callbacks);

      // 100 BPM from the Snare track in the fixture.
      const { tempo } = controlsForTrack(root, 'snare-id');
      expect(Number(tempo.value)).toBe(100);
    });

    it('every control carries its track\'s id via data-track-id', () => {
      renderTrackControls(root, state, callbacks);

      for (const t of state.tracks) {
        const { volume, tempo, sample, clear } = controlsForTrack(root, t.id);
        expect(volume, `volume for ${t.id}`).not.toBeNull();
        expect(tempo, `tempo for ${t.id}`).not.toBeNull();
        expect(sample, `sample for ${t.id}`).not.toBeNull();
        expect(clear, `clear for ${t.id}`).not.toBeNull();
      }
    });

    it('re-rendering into the same root is idempotent (does not duplicate controls)', () => {
      renderTrackControls(root, state, callbacks);
      renderTrackControls(root, state, callbacks);

      expect(root.querySelectorAll('input.volume').length).toBe(state.tracks.length);
      expect(root.querySelectorAll('input.tempo').length).toBe(state.tracks.length);
      expect(root.querySelectorAll('input.sample').length).toBe(state.tracks.length);
      expect(root.querySelectorAll('button.clear-sample').length).toBe(state.tracks.length);
    });
  });

  // ── AC: "change-Events rufen passende Callbacks" ───────────────────────

  describe('volume change wiring', () => {
    it('dispatches onVolumeChange(trackId, numericValue) on change', () => {
      renderTrackControls(root, state, callbacks);

      const { volume } = controlsForTrack(root, 'kick-id');
      volume.value = '0.42';
      volume.dispatchEvent(new Event('change'));

      expect(callbacks.onVolumeChange).toHaveBeenCalledTimes(1);
      expect(callbacks.onVolumeChange).toHaveBeenCalledWith('kick-id', 0.42);
    });

    it('passes the correct trackId for each row independently', () => {
      renderTrackControls(root, state, callbacks);

      const kick = controlsForTrack(root, 'kick-id').volume;
      const snare = controlsForTrack(root, 'snare-id').volume;

      kick.value = '0.10';
      kick.dispatchEvent(new Event('change'));
      snare.value = '0.90';
      snare.dispatchEvent(new Event('change'));

      expect(callbacks.onVolumeChange).toHaveBeenNthCalledWith(1, 'kick-id', 0.10);
      expect(callbacks.onVolumeChange).toHaveBeenNthCalledWith(2, 'snare-id', 0.90);
    });

    it('does not invoke the other callbacks on a volume change', () => {
      renderTrackControls(root, state, callbacks);

      const { volume } = controlsForTrack(root, 'kick-id');
      volume.value = '0.5';
      volume.dispatchEvent(new Event('change'));

      expect(callbacks.onTempoChange).not.toHaveBeenCalled();
      expect(callbacks.onSampleLoaded).not.toHaveBeenCalled();
      expect(callbacks.onSampleCleared).not.toHaveBeenCalled();
    });
  });

  describe('tempo change wiring', () => {
    it('dispatches onTempoChange(trackId, numericValue) on change', () => {
      renderTrackControls(root, state, callbacks);

      const { tempo } = controlsForTrack(root, 'snare-id');
      tempo.value = '140';
      tempo.dispatchEvent(new Event('change'));

      expect(callbacks.onTempoChange).toHaveBeenCalledTimes(1);
      expect(callbacks.onTempoChange).toHaveBeenCalledWith('snare-id', 140);
    });

    it('does not invoke the other callbacks on a tempo change', () => {
      renderTrackControls(root, state, callbacks);

      const { tempo } = controlsForTrack(root, 'kick-id');
      tempo.value = '90';
      tempo.dispatchEvent(new Event('change'));

      expect(callbacks.onVolumeChange).not.toHaveBeenCalled();
      expect(callbacks.onSampleLoaded).not.toHaveBeenCalled();
      expect(callbacks.onSampleCleared).not.toHaveBeenCalled();
    });
  });

  describe('clear-sample wiring', () => {
    it('dispatches onSampleCleared(trackId) on click', () => {
      renderTrackControls(root, state, callbacks);

      const { clear } = controlsForTrack(root, 'kick-id');
      clear.click();

      expect(callbacks.onSampleCleared).toHaveBeenCalledTimes(1);
      expect(callbacks.onSampleCleared).toHaveBeenCalledWith('kick-id');
    });

    it('passes the correct trackId for each row independently', () => {
      renderTrackControls(root, state, callbacks);

      controlsForTrack(root, 'kick-id').clear.click();
      controlsForTrack(root, 'snare-id').clear.click();

      expect(callbacks.onSampleCleared).toHaveBeenNthCalledWith(1, 'kick-id');
      expect(callbacks.onSampleCleared).toHaveBeenNthCalledWith(2, 'snare-id');
    });

    it('does not invoke the other callbacks on a clear click', () => {
      renderTrackControls(root, state, callbacks);

      controlsForTrack(root, 'kick-id').clear.click();

      expect(callbacks.onVolumeChange).not.toHaveBeenCalled();
      expect(callbacks.onTempoChange).not.toHaveBeenCalled();
      expect(callbacks.onSampleLoaded).not.toHaveBeenCalled();
    });
  });

  // ── AC: "FileReader liefert dataUrl an onSampleLoaded" ─────────────────

  describe('sample upload wiring (FileReader)', () => {
    let originalFileReader;
    let createdReaders;

    /**
     * Replace the global FileReader with a spy so we can:
     *   1. assert readAsDataURL was invoked with the selected file, and
     *   2. deterministically simulate a successful load and observe
     *      that onSampleLoaded is called with that data URL.
     */
    beforeEach(() => {
      originalFileReader = globalThis.FileReader;
      createdReaders = [];

      class MockFileReader {
        constructor() {
          this.result = null;
          this.onload = null;
          this.onerror = null;
          createdReaders.push(this);
        }
        readAsDataURL = vi.fn((file) => {
          this.lastFile = file;
        });
        // Test helper used to fire onload synchronously.
        _completeWith(dataUrl) {
          this.result = dataUrl;
          if (this.onload) this.onload({ target: this });
        }
      }
      globalThis.FileReader = MockFileReader;
    });

    afterEach(() => {
      globalThis.FileReader = originalFileReader;
    });

    it('invokes FileReader.readAsDataURL with the selected file on change', () => {
      renderTrackControls(root, state, callbacks);

      const { sample } = controlsForTrack(root, 'kick-id');
      const file = new File(['xx'], 'kick.wav', { type: 'audio/wav' });
      Object.defineProperty(sample, 'files', { configurable: true, value: [file] });

      sample.dispatchEvent(new Event('change'));

      expect(createdReaders.length).toBe(1);
      expect(createdReaders[0].readAsDataURL).toHaveBeenCalledTimes(1);
      expect(createdReaders[0].readAsDataURL).toHaveBeenCalledWith(file);
    });

    it('calls onSampleLoaded(trackId, dataUrl) once the FileReader completes', () => {
      renderTrackControls(root, state, callbacks);

      const { sample } = controlsForTrack(root, 'snare-id');
      const file = new File(['yy'], 'snare.wav', { type: 'audio/wav' });
      Object.defineProperty(sample, 'files', { configurable: true, value: [file] });

      sample.dispatchEvent(new Event('change'));

      // Simulate the asynchronous reader completing successfully.
      const dataUrl = 'data:audio/wav;base64,QUJD';
      createdReaders[0]._completeWith(dataUrl);

      expect(callbacks.onSampleLoaded).toHaveBeenCalledTimes(1);
      expect(callbacks.onSampleLoaded).toHaveBeenCalledWith('snare-id', dataUrl);
    });

    it('does not call onSampleLoaded before the reader has fired its load event', () => {
      renderTrackControls(root, state, callbacks);

      const { sample } = controlsForTrack(root, 'kick-id');
      const file = new File(['zz'], 'kick.wav', { type: 'audio/wav' });
      Object.defineProperty(sample, 'files', { configurable: true, value: [file] });

      sample.dispatchEvent(new Event('change'));

      // Reader has been created and asked to read, but onload has NOT fired yet.
      expect(callbacks.onSampleLoaded).not.toHaveBeenCalled();
    });

    it('does nothing when the change event fires with no file selected', () => {
      renderTrackControls(root, state, callbacks);

      const { sample } = controlsForTrack(root, 'kick-id');
      Object.defineProperty(sample, 'files', { configurable: true, value: [] });

      sample.dispatchEvent(new Event('change'));

      expect(createdReaders.length).toBe(0);
      expect(callbacks.onSampleLoaded).not.toHaveBeenCalled();
    });
  });
});
