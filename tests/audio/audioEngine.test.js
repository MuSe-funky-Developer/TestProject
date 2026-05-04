import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAudioEngine } from '../../js/audio/audioEngine.js';

describe('createAudioEngine', () => {
  let engine;

  beforeEach(() => {
    engine = createAudioEngine();
  });

  it('returnt ein Objekt mit context, masterGain und resume', () => {
    expect(engine).toBeDefined();
    expect(engine).toHaveProperty('context');
    expect(engine).toHaveProperty('masterGain');
    expect(engine).toHaveProperty('resume');
    expect(typeof engine.resume).toBe('function');
  });

  it('context ist eine AudioContext-Instanz', () => {
    expect(engine.context).toBeInstanceOf(globalThis.AudioContext);
  });

  it('erstellt den masterGain via context.createGain()', () => {
    expect(engine.context.createGain).toHaveBeenCalled();
    expect(engine.context.createGain).toHaveBeenCalledTimes(1);
  });

  it('verbindet masterGain mit context.destination', () => {
    expect(engine.masterGain.connect).toHaveBeenCalledWith(engine.context.destination);
  });

  it('verbindet masterGain ausschließlich mit destination (nicht mit anderen Nodes)', () => {
    const calls = engine.masterGain.connect.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(engine.context.destination);
  });

  it('setzt masterGain.gain.value auf 1.0 (Unity-Gain)', () => {
    expect(engine.masterGain.gain.value).toBe(1.0);
  });

  it('engine.resume() ruft context.resume() auf', async () => {
    await engine.resume();
    expect(engine.context.resume).toHaveBeenCalled();
  });

  it('engine.resume() returnt ein Promise, das resolved', async () => {
    const result = engine.resume();
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it('engine.context.currentTime ist als Number lesbar', () => {
    expect(typeof engine.context.currentTime).toBe('number');
  });

  it('mehrfacher Aufruf erzeugt unabhängige Engine-Instanzen', () => {
    const otherEngine = createAudioEngine();
    expect(otherEngine).not.toBe(engine);
    expect(otherEngine.context).not.toBe(engine.context);
    expect(otherEngine.masterGain).not.toBe(engine.masterGain);
  });
});
