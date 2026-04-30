import { vi } from 'vitest';

class AudioParamMock {
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  value = 0;
}
class AudioNodeMock {
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  frequency = new AudioParamMock();
  gain = new AudioParamMock();
}
class AudioContextMock {
  currentTime = 0;
  destination = new AudioNodeMock();
  state = 'running';
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn(() => new AudioNodeMock());
  createGain = vi.fn(() => new AudioNodeMock());
  createBiquadFilter = vi.fn(() => new AudioNodeMock());
  createBufferSource = vi.fn(() => new AudioNodeMock());
  createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(1024) }));
  decodeAudioData = vi.fn((buf) => Promise.resolve({ duration: 1, sampleRate: 44100 }));
}
globalThis.AudioContext = AudioContextMock;
globalThis.webkitAudioContext = AudioContextMock;
