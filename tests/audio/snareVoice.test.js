import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSnareVoice } from '../../js/audio/synthVoices/snareVoice.js';

/**
 * SnareVoice contract (Plan, Task 9):
 *   createSnareVoice(engine).trigger(when, pitchSemitones, gain)
 *     - erzeugt eine BufferSource (Noise-Buffer)
 *     - erzeugt einen Highpass-Filter (Default-Cutoff 1000 Hz)
 *     - erzeugt einen Gain-Node fuer die Decay-Envelope
 *     - Pitch verschiebt die Cutoff um 2^(semitones/12)
 *   .dispose() ist no-op-callable
 *
 * Die Tests bauen einen handgefertigten engine-Stub mit AudioContext-Mock aus
 * tests/setup.js und einem separaten masterGain-Stub, damit createGain-Aufrufe
 * eindeutig der Voice (nicht dem Master-Bus) zuzuordnen sind.
 */

function buildEngine() {
  const context = new globalThis.AudioContext();
  // Frische AudioContext-Mock-Aufruflisten (jede Spec startet mit 0 Calls).
  context.createBufferSource.mockClear();
  context.createBiquadFilter.mockClear();
  context.createGain.mockClear();
  context.createBuffer.mockClear();
  const masterGain = { connect: vi.fn(), disconnect: vi.fn() };
  return { context, masterGain };
}

function trigger(engine, when = 0.5, pitchSemitones = 0, gain = 1) {
  const voice = createSnareVoice(engine);
  voice.trigger(when, pitchSemitones, gain);
  return voice;
}

function lastFilter(engine) {
  const results = engine.context.createBiquadFilter.mock.results;
  return results[results.length - 1].value;
}
function lastBufferSource(engine) {
  const results = engine.context.createBufferSource.mock.results;
  return results[results.length - 1].value;
}
function lastGain(engine) {
  const results = engine.context.createGain.mock.results;
  return results[results.length - 1].value;
}

describe('createSnareVoice', () => {
  let engine;
  beforeEach(() => {
    engine = buildEngine();
  });

  it('liefert ein Objekt mit trigger- und dispose-Methode', () => {
    const voice = createSnareVoice(engine);
    expect(typeof voice.trigger).toBe('function');
    expect(typeof voice.dispose).toBe('function');
  });

  it('trigger erzeugt einen BufferSource fuer das Noise-Signal', () => {
    trigger(engine);
    expect(engine.context.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('trigger allokiert einen Noise-Buffer ueber createBuffer', () => {
    trigger(engine);
    // Noise-Buffer wird einmal pro Voice oder pro Trigger erzeugt;
    // mindestens ein createBuffer-Aufruf ist Teil des Contracts.
    expect(engine.context.createBuffer).toHaveBeenCalled();
  });

  it('trigger erzeugt einen Highpass-Filter (BiquadFilter mit type="highpass")', () => {
    trigger(engine);
    expect(engine.context.createBiquadFilter).toHaveBeenCalledTimes(1);
    expect(lastFilter(engine).type).toBe('highpass');
  });

  it('trigger erzeugt einen Gain-Node fuer die Envelope', () => {
    trigger(engine);
    // Pro Trigger genau ein Envelope-Gain. Der masterGain ist NICHT ueber
    // engine.context.createGain entstanden (handgefertigter Stub) -- damit
    // ist der Aufrufzaehler eindeutig der Voice zuzurechnen.
    expect(engine.context.createGain).toHaveBeenCalledTimes(1);
  });

  it('verbindet die Signal-Kette source -> filter -> gain -> masterGain', () => {
    trigger(engine);
    const source = lastBufferSource(engine);
    const filter = lastFilter(engine);
    const gain = lastGain(engine);

    expect(source.connect).toHaveBeenCalledWith(filter);
    expect(filter.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(engine.masterGain);
  });

  it('startet den BufferSource zum geplanten Zeitpunkt (start(when))', () => {
    trigger(engine, 0.75);
    const source = lastBufferSource(engine);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(source.start).toHaveBeenCalledWith(0.75);
  });

  it('stoppt den BufferSource nach dem Decay-Fenster (stop > when)', () => {
    trigger(engine, 0.5);
    const source = lastBufferSource(engine);
    expect(source.stop).toHaveBeenCalledTimes(1);
    const stopArg = source.stop.mock.calls[0][0];
    expect(stopArg).toBeGreaterThan(0.5);
  });

  it('setzt die Default-Cutoff auf 1000 Hz beim Trigger-Zeitpunkt (pitchSemitones=0)', () => {
    trigger(engine, 0.25, 0);
    const filter = lastFilter(engine);
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(1000, 0.25);
  });

  it('verdoppelt die Cutoff bei pitchSemitones=12 (1000 -> 2000 Hz)', () => {
    trigger(engine, 0.1, 12);
    const filter = lastFilter(engine);
    const calls = filter.frequency.setValueAtTime.mock.calls;
    const freqs = calls.map((c) => c[0]);
    expect(freqs).toContain(2000);
  });

  it('halbiert die Cutoff bei pitchSemitones=-12 (1000 -> 500 Hz)', () => {
    trigger(engine, 0.1, -12);
    const filter = lastFilter(engine);
    const calls = filter.frequency.setValueAtTime.mock.calls;
    const freqs = calls.map((c) => c[0]);
    expect(freqs).toContain(500);
  });

  it('skaliert die Cutoff exponentiell mit dem Halbton-Offset (pitchSemitones=7 -> ~1498 Hz)', () => {
    trigger(engine, 0.1, 7);
    const filter = lastFilter(engine);
    const calls = filter.frequency.setValueAtTime.mock.calls;
    const expected = 1000 * Math.pow(2, 7 / 12);
    const matched = calls.some((c) => Math.abs(c[0] - expected) < 0.5);
    expect(matched).toBe(true);
  });

  it('legt eine Gain-Envelope an: setValueAtTime + Decay-Ramp auf gain.gain', () => {
    trigger(engine, 0.2, 0, 0.8);
    const gain = lastGain(engine);
    expect(gain.gain.setValueAtTime).toHaveBeenCalled();
    const rampedDown =
      gain.gain.exponentialRampToValueAtTime.mock.calls.length > 0 ||
      gain.gain.linearRampToValueAtTime.mock.calls.length > 0;
    expect(rampedDown).toBe(true);
  });

  it('reicht den gain-Parameter an die Envelope weiter (Peak entspricht gain)', () => {
    trigger(engine, 0.2, 0, 0.5);
    const gain = lastGain(engine);
    const allValues = [
      ...gain.gain.setValueAtTime.mock.calls,
      ...gain.gain.linearRampToValueAtTime.mock.calls,
      ...gain.gain.exponentialRampToValueAtTime.mock.calls,
    ].map((c) => c[0]);
    expect(allValues).toContain(0.5);
  });

  it('dispose ist ohne Argumente fehlerfrei aufrufbar', () => {
    const voice = createSnareVoice(engine);
    expect(() => voice.dispose()).not.toThrow();
  });
});
