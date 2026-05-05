export function renderPlayControls(root, callbacks) {
  root.innerHTML = '';

  const playBtn = document.createElement('button');
  playBtn.className = 'play';
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', () => callbacks.onPlay());

  const stopBtn = document.createElement('button');
  stopBtn.className = 'stop';
  stopBtn.textContent = 'Stop';
  stopBtn.addEventListener('click', () => callbacks.onStop());

  const clearBtn = document.createElement('button');
  clearBtn.className = 'clear';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => callbacks.onClear());

  root.appendChild(playBtn);
  root.appendChild(stopBtn);
  root.appendChild(clearBtn);

  return {
    setPlaying(isPlaying) {
      playBtn.disabled = Boolean(isPlaying);
    },
  };
}
