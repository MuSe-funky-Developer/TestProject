export function renderGrid(rootEl, state, callbacks = {}) {
  const { onStepClick, onPitchChange } = callbacks;
  rootEl.innerHTML = '';

  for (const track of state.tracks) {
    const row = document.createElement('div');
    row.className = 'track';
    row.dataset.trackId = track.id;

    const label = document.createElement('div');
    label.className = 'track-label';
    label.textContent = track.name;
    row.appendChild(label);

    const stepsEl = document.createElement('div');
    stepsEl.className = 'track-steps';

    track.steps.forEach((step, stepIndex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = step.active ? 'step is-active' : 'step';
      btn.dataset.trackId = track.id;
      btn.dataset.stepIndex = String(stepIndex);
      btn.textContent = String(stepIndex + 1);
      btn.addEventListener('click', () => {
        if (typeof onStepClick === 'function') onStepClick(track.id, stepIndex);
      });

      const pitch = document.createElement('input');
      pitch.type = 'number';
      pitch.className = 'pitch';
      pitch.min = '-24';
      pitch.max = '24';
      pitch.value = String(step.pitchSemitones || 0);
      pitch.addEventListener('change', (ev) => {
        if (typeof onPitchChange === 'function') {
          onPitchChange(track.id, stepIndex, Number(ev.target.value));
        }
      });

      stepsEl.appendChild(btn);
      stepsEl.appendChild(pitch);
    });

    row.appendChild(stepsEl);
    rootEl.appendChild(row);
  }
}
