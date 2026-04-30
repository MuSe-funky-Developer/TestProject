export function renderPlayControls(rootEl, callbacks = {}) {
  const { onPlay, onStop, onClear } = callbacks;
  rootEl.innerHTML = '';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'play';
  playBtn.dataset.action = 'play';
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', () => {
    if (typeof onPlay === 'function') onPlay();
  });

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.className = 'stop';
  stopBtn.dataset.action = 'stop';
  stopBtn.textContent = 'Stop';
  stopBtn.addEventListener('click', () => {
    if (typeof onStop === 'function') onStop();
  });

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'clear';
  clearBtn.dataset.action = 'clear';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => {
    if (typeof onClear === 'function') onClear();
  });

  rootEl.appendChild(playBtn);
  rootEl.appendChild(stopBtn);
  rootEl.appendChild(clearBtn);

  return {
    setPlaying(isPlaying) {
      playBtn.disabled = !!isPlaying;
    },
  };
}
