export function renderGrid(rootEl, state, { onStepClick, onPitchChange }) {
  rootEl.innerHTML = '';

  for (const track of state.tracks) {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.dataset.trackId = track.id;

    for (let i = 0; i < track.steps.length; i++) {
      const step = track.steps[i];

      const button = document.createElement('button');
      button.type = 'button';
      button.className = step.active ? 'step is-active' : 'step';
      button.dataset.trackId = track.id;
      button.dataset.stepIndex = String(i);
      button.addEventListener('click', () => onStepClick(track.id, i));

      const pitch = document.createElement('input');
      pitch.type = 'number';
      pitch.className = 'pitch';
      pitch.dataset.trackId = track.id;
      pitch.dataset.stepIndex = String(i);
      pitch.value = String(step.pitchSemitones);
      pitch.addEventListener('change', (e) => {
        onPitchChange(track.id, i, Number(e.target.value));
      });

      row.appendChild(button);
      row.appendChild(pitch);
    }

    rootEl.appendChild(row);
  }
}
