import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSampleVoice } from '../../js/audio/sampleVoice.js';

const DATA_URL =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

function createParam(initial = 0) {
  return {
    value: initial,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function createNode(extra = {}) {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    gain: createParam(1),
    frequency: createParam(440),
    ...extra,
  };
}

function createMockEngine() {
  const decodedBuffer = { duration: 1, sampleRate: 44100, _id: 'decoded-buffer' };
  const masterGain = createNode();
  const createdBufferSources = [];
  const createdGains = [];
  const context = {
    currentTime: 0,
    destination: createNode(),
    state: 'running',
    decodeAudioData: vi.fn(() => Promise.resolve(decodedBuffer)),
    createGain: vi.fn(() => {
      const node = createNode();
      createdGains.push(node);
      return node;
    }),
    createBufferSource: vi.fn(() => {
      const node = createNode({
        playbackRate: createParam(1),
        buffer: null,
      });
      createdBufferSources.push(node);
      return node;
    }),
  };
  return {
    engine: { context, masterGain, resume: vi.fn() },
    decodedBuffer,
    masterGain,
    createdBufferSources,
    createdGains,
  };
}

function rateForSemitones(semitones) {
  return Math.pow(2, semitones / 12);
}

function effectivePlaybackRate(source) {
  const setCalls = source.playbackRate.setValueAtTime.mock.calls;
  if (setCalls.length > 0) {
    return setCalls[setCalls.length - 1][0];
  }
  return source.playbackRate.value;
}

function effectiveGainValue(gainNode) {
  const setCalls = gainNode.gain.setValueAtTime.mock.calls;
  if (setCalls.length > 0) {
    return setCalls[setCalls.length - 1][0];
  }
  return gainNode.gain.value;
}

describe('createSampleVoice', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('asynchroner Lade- und Decode-Pfad', () => {
    it('returnt ein Promise (ist asynchron)', () => {
      const { engine } = createMockEngine();
      const result = createSampleVoice(engine, DATA_URL);
      expect(result).toBeInstanceOf(Promise);
      return result;
    });

    it('ruft fetch mit der gegebenen Data-URL', async () => {
      const { engine } = createMockEngine();
      await createSampleVoice(engine, DATA_URL);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(DATA_URL);
    });

    it('liest den Response als arrayBuffer', async () => {
      const arrayBufferSpy = vi.fn(() => Promise.resolve(new ArrayBuffer(16)));
      globalThis.fetch = vi.fn(() => Promise.resolve({ arrayBuffer: arrayBufferSpy }));
      const { engine } = createMockEngine();
      await createSampleVoice(engine, DATA_URL);
      expect(arrayBufferSpy).toHaveBeenCalledTimes(1);
    });

    it('decoded den ArrayBuffer via context.decodeAudioData', async () => {
      const myBuffer = new ArrayBuffer(32);
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({ arrayBuffer: () => Promise.resolve(myBuffer) }),
      );
      const { engine } = createMockEngine();
      await createSampleVoice(engine, DATA_URL);
      expect(engine.context.decodeAudioData).toHaveBeenCalledTimes(1);
      expect(engine.context.decodeAudioData).toHaveBeenCalledWith(myBuffer);
    });

    it('resolved zu einem Voice-Handle mit trigger und dispose', async () => {
      const { engine } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      expect(voice).toBeDefined();
      expect(typeof voice.trigger).toBe('function');
      expect(typeof voice.dispose).toBe('function');
    });
  });

  describe('trigger(when, pitchSemitones, gain) — BufferSource & playbackRate', () => {
    it('erzeugt pro trigger einen neuen BufferSource', async () => {
      const { engine } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 1);
      voice.trigger(0.25, 0, 1);
      expect(engine.context.createBufferSource).toHaveBeenCalledTimes(2);
    });

    it('weist den dekodierten AudioBuffer der BufferSource zu', async () => {
      const { engine, decodedBuffer, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 1);
      expect(createdBufferSources[0].buffer).toBe(decodedBuffer);
    });

    it('setzt playbackRate=1 bei pitchSemitones=0', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 1);
      expect(effectivePlaybackRate(createdBufferSources[0])).toBeCloseTo(1, 10);
    });

    it('setzt playbackRate=2 bei pitchSemitones=+12 (eine Oktave höher)', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 12, 1);
      expect(effectivePlaybackRate(createdBufferSources[0])).toBeCloseTo(2, 10);
    });

    it('setzt playbackRate=0.5 bei pitchSemitones=-12 (eine Oktave tiefer)', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, -12, 1);
      expect(effectivePlaybackRate(createdBufferSources[0])).toBeCloseTo(0.5, 10);
    });

    it('setzt playbackRate=2^(7/12) bei pitchSemitones=+7 (Quinte)', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 7, 1);
      expect(effectivePlaybackRate(createdBufferSources[0])).toBeCloseTo(
        rateForSemitones(7),
        10,
      );
    });

    it('setzt playbackRate=2^(-5/12) bei pitchSemitones=-5', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, -5, 1);
      expect(effectivePlaybackRate(createdBufferSources[0])).toBeCloseTo(
        rateForSemitones(-5),
        10,
      );
    });

    it('startet den BufferSource zur angegebenen when-Zeit', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(1.25, 0, 1);
      expect(createdBufferSources[0].start).toHaveBeenCalledTimes(1);
      expect(createdBufferSources[0].start).toHaveBeenCalledWith(1.25);
    });

    it('startet den BufferSource auch bei when=0', async () => {
      const { engine, createdBufferSources } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 1);
      expect(createdBufferSources[0].start).toHaveBeenCalledWith(0);
    });
  });

  describe('trigger — Gain-Routing zum masterGain', () => {
    it('erzeugt einen Gain-Node und setzt dessen Gain auf den gain-Parameter', async () => {
      const { engine, createdGains } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 0.42);
      expect(engine.context.createGain).toHaveBeenCalled();
      expect(createdGains.length).toBeGreaterThan(0);
      const gainNode = createdGains[createdGains.length - 1];
      expect(effectiveGainValue(gainNode)).toBeCloseTo(0.42, 10);
    });

    it('respektiert gain=0 (stille Trigger)', async () => {
      const { engine, createdGains } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 0);
      const gainNode = createdGains[createdGains.length - 1];
      expect(effectiveGainValue(gainNode)).toBeCloseTo(0, 10);
    });

    it('verbindet BufferSource → Gain → masterGain', async () => {
      const { engine, masterGain, createdBufferSources, createdGains } =
        createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 1);
      const source = createdBufferSources[0];
      const gainNode = createdGains[createdGains.length - 1];

      const sourceConnectedToGain = source.connect.mock.calls.some(
        (call) => call[0] === gainNode,
      );
      expect(sourceConnectedToGain).toBe(true);

      const gainConnectedToMaster = gainNode.connect.mock.calls.some(
        (call) => call[0] === masterGain,
      );
      expect(gainConnectedToMaster).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('ruft disconnect auf zwischengespeicherten Nodes', async () => {
      const { engine, createdBufferSources, createdGains } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      voice.trigger(0, 0, 1);

      const totalDisconnectsBefore =
        createdBufferSources.reduce((acc, n) => acc + n.disconnect.mock.calls.length, 0) +
        createdGains.reduce((acc, n) => acc + n.disconnect.mock.calls.length, 0);

      voice.dispose();

      const totalDisconnectsAfter =
        createdBufferSources.reduce((acc, n) => acc + n.disconnect.mock.calls.length, 0) +
        createdGains.reduce((acc, n) => acc + n.disconnect.mock.calls.length, 0);

      expect(totalDisconnectsAfter).toBeGreaterThan(totalDisconnectsBefore);
    });

    it('wirft nicht, wenn vor dem ersten trigger aufgerufen', async () => {
      const { engine } = createMockEngine();
      const voice = await createSampleVoice(engine, DATA_URL);
      expect(() => voice.dispose()).not.toThrow();
    });
  });
});
