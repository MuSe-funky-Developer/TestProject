/**
 * Renders per-track controls (volume, tempo, sample upload, clear-sample)
 * into the given root element. Re-rendering into the same root replaces
 * any previously rendered controls, so the call is idempotent.
 *
 * @param {HTMLElement} root
 * @param {{ tracks: Array<{ id: string, name: string, volume: number, tempoBpm: number }> }} state
 * @param {{
 *   onVolumeChange:   (trackId: string, value: number) => void,
 *   onTempoChange:    (trackId: string, value: number) => void,
 *   onSampleLoaded:   (trackId: string, dataUrl: string) => void,
 *   onSampleCleared:  (trackId: string) => void,
 * }} callbacks
 */
export function renderTrackControls(root, state, callbacks) {
  root.replaceChildren();

  for (const track of state.tracks) {
    const row = document.createElement('div');
    row.className = 'track-controls';
    row.dataset.trackId = track.id;

    const label = document.createElement('span');
    label.className = 'track-name';
    label.textContent = track.name;
    row.appendChild(label);

    const volume = document.createElement('input');
    volume.type = 'range';
    volume.className = 'volume';
    volume.min = '0';
    volume.max = '1';
    volume.step = '0.01';
    volume.value = String(track.volume);
    volume.dataset.trackId = track.id;
    volume.addEventListener('change', () => {
      callbacks.onVolumeChange(track.id, Number(volume.value));
    });
    row.appendChild(volume);

    const tempo = document.createElement('input');
    tempo.type = 'number';
    tempo.className = 'tempo';
    tempo.min = '30';
    tempo.max = '300';
    tempo.value = String(track.tempoBpm);
    tempo.dataset.trackId = track.id;
    tempo.addEventListener('change', () => {
      callbacks.onTempoChange(track.id, Number(tempo.value));
    });
    row.appendChild(tempo);

    const sample = document.createElement('input');
    sample.type = 'file';
    sample.className = 'sample';
    sample.accept = 'audio/*';
    sample.dataset.trackId = track.id;
    sample.addEventListener('change', () => {
      const file = sample.files && sample.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        callbacks.onSampleLoaded(track.id, event.target.result);
      };
      reader.readAsDataURL(file);
    });
    row.appendChild(sample);

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'clear-sample';
    clear.dataset.trackId = track.id;
    clear.textContent = 'Clear sample';
    clear.addEventListener('click', () => {
      callbacks.onSampleCleared(track.id);
    });
    row.appendChild(clear);

    root.appendChild(row);
  }
}
