import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPlayControls } from '../../js/ui/playControls.js';

describe('renderPlayControls', () => {
  let root;
  let callbacks;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = document.getElementById('root');
    callbacks = {
      onPlay: vi.fn(),
      onStop: vi.fn(),
      onClear: vi.fn(),
    };
  });

  describe('rendering', () => {
    it('renders exactly three buttons (play, stop, clear)', () => {
      renderPlayControls(root, callbacks);

      const buttons = root.querySelectorAll('button');
      expect(buttons.length).toBe(3);
    });

    it('renders a button identifiable as the play button (class "play")', () => {
      renderPlayControls(root, callbacks);

      const playBtn = root.querySelector('button.play');
      expect(playBtn).not.toBeNull();
    });

    it('renders a button identifiable as the stop button (class "stop")', () => {
      renderPlayControls(root, callbacks);

      const stopBtn = root.querySelector('button.stop');
      expect(stopBtn).not.toBeNull();
    });

    it('renders a button identifiable as the clear button (class "clear")', () => {
      renderPlayControls(root, callbacks);

      const clearBtn = root.querySelector('button.clear');
      expect(clearBtn).not.toBeNull();
    });

    it('re-rendering into the same root is idempotent (does not duplicate buttons)', () => {
      renderPlayControls(root, callbacks);
      renderPlayControls(root, callbacks);

      expect(root.querySelectorAll('button').length).toBe(3);
      expect(root.querySelectorAll('button.play').length).toBe(1);
      expect(root.querySelectorAll('button.stop').length).toBe(1);
      expect(root.querySelectorAll('button.clear').length).toBe(1);
    });
  });

  describe('callback wiring', () => {
    it('clicking the play button invokes onPlay exactly once and not the other callbacks', () => {
      renderPlayControls(root, callbacks);

      root.querySelector('button.play').click();

      expect(callbacks.onPlay).toHaveBeenCalledTimes(1);
      expect(callbacks.onStop).not.toHaveBeenCalled();
      expect(callbacks.onClear).not.toHaveBeenCalled();
    });

    it('clicking the stop button invokes onStop exactly once and not the other callbacks', () => {
      renderPlayControls(root, callbacks);

      root.querySelector('button.stop').click();

      expect(callbacks.onStop).toHaveBeenCalledTimes(1);
      expect(callbacks.onPlay).not.toHaveBeenCalled();
      expect(callbacks.onClear).not.toHaveBeenCalled();
    });

    it('clicking the clear button invokes onClear exactly once and not the other callbacks', () => {
      renderPlayControls(root, callbacks);

      root.querySelector('button.clear').click();

      expect(callbacks.onClear).toHaveBeenCalledTimes(1);
      expect(callbacks.onPlay).not.toHaveBeenCalled();
      expect(callbacks.onStop).not.toHaveBeenCalled();
    });

    it('callbacks remain wired after an idempotent re-render', () => {
      renderPlayControls(root, callbacks);
      renderPlayControls(root, callbacks);

      root.querySelector('button.play').click();
      root.querySelector('button.stop').click();
      root.querySelector('button.clear').click();

      expect(callbacks.onPlay).toHaveBeenCalledTimes(1);
      expect(callbacks.onStop).toHaveBeenCalledTimes(1);
      expect(callbacks.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('setPlaying updater', () => {
    it('renderPlayControls returns a handle exposing a setPlaying function', () => {
      const handle = renderPlayControls(root, callbacks);

      expect(handle).toBeDefined();
      expect(typeof handle.setPlaying).toBe('function');
    });

    it('the play button is enabled by default after the initial render', () => {
      renderPlayControls(root, callbacks);

      const playBtn = root.querySelector('button.play');
      expect(playBtn.disabled).toBe(false);
    });

    it('setPlaying(true) disables the play button', () => {
      const { setPlaying } = renderPlayControls(root, callbacks);

      setPlaying(true);

      expect(root.querySelector('button.play').disabled).toBe(true);
    });

    it('setPlaying(false) re-enables a previously disabled play button', () => {
      const { setPlaying } = renderPlayControls(root, callbacks);

      setPlaying(true);
      setPlaying(false);

      expect(root.querySelector('button.play').disabled).toBe(false);
    });

    it('setPlaying(true) does not disable the stop or clear buttons', () => {
      const { setPlaying } = renderPlayControls(root, callbacks);

      setPlaying(true);

      expect(root.querySelector('button.stop').disabled).toBe(false);
      expect(root.querySelector('button.clear').disabled).toBe(false);
    });

    it('a disabled play button does not invoke onPlay when clicked', () => {
      const { setPlaying } = renderPlayControls(root, callbacks);

      setPlaying(true);
      root.querySelector('button.play').click();

      expect(callbacks.onPlay).not.toHaveBeenCalled();
    });
  });
});
