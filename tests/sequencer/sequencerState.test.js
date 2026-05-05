import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  createDefaultState,
  toggleStep,
  setStepPitch,
  setTrackVolume,
  setTrackTempo,
  setTrackSample,
  clearTrackSample,
} from '../../js/sequencer/sequencerState.js';

describe('SCHEMA_VERSION', () => {
  it('ist die Konstante "1.0.0"', () => {
    expect(SCHEMA_VERSION).toBe('1.0.0');
  });
});

describe('createDefaultState', () => {
  it('liefert ein Objekt mit schemaVersion "1.0.0"', () => {
    const state = createDefaultState();
    expect(state.schemaVersion).toBe('1.0.0');
  });

  it('startet mit isPlaying === false', () => {
    const state = createDefaultState();
    expect(state.isPlaying).toBe(false);
  });

  it('liefert genau 4 Tracks', () => {
    const state = createDefaultState();
    expect(Array.isArray(state.tracks)).toBe(true);
    expect(state.tracks).toHaveLength(4);
  });

  it('liefert Tracks in der Reihenfolge Kick, Snare, HiHat, Bass mit passendem voiceKind', () => {
    const state = createDefaultState();
    expect(state.tracks.map(t => t.name)).toEqual(['Kick', 'Snare', 'HiHat', 'Bass']);
    expect(state.tracks.map(t => t.voiceKind)).toEqual(['kick', 'snare', 'hihat', 'bass']);
  });

  it('jeder Track hat genau 16 Steps', () => {
    const state = createDefaultState();
    for (const track of state.tracks) {
      expect(track.steps).toHaveLength(16);
    }
  });

  it('jeder Track hat volume === 0.8 und tempoBpm === 120 als Default', () => {
    const state = createDefaultState();
    for (const track of state.tracks) {
      expect(track.volume).toBe(0.8);
      expect(track.tempoBpm).toBe(120);
    }
  });

  it('jeder Track hat sampleDataUrl === null als Default', () => {
    const state = createDefaultState();
    for (const track of state.tracks) {
      expect(track.sampleDataUrl).toBeNull();
    }
  });

  it('jeder Step ist initial inaktiv mit pitchSemitones === 0', () => {
    const state = createDefaultState();
    for (const track of state.tracks) {
      for (const step of track.steps) {
        expect(step.active).toBe(false);
        expect(step.pitchSemitones).toBe(0);
      }
    }
  });

  it('jeder Track hat eine nicht-leere id und alle ids sind unique', () => {
    const state = createDefaultState();
    const ids = state.tracks.map(t => t.id);
    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zwei Aufrufe liefern unabhängige Objekte (keine geteilten Referenzen)', () => {
    const a = createDefaultState();
    const b = createDefaultState();
    expect(a).not.toBe(b);
    expect(a.tracks).not.toBe(b.tracks);
    expect(a.tracks[0]).not.toBe(b.tracks[0]);
    expect(a.tracks[0].steps).not.toBe(b.tracks[0].steps);
    a.tracks[0].steps[0].active = true;
    expect(b.tracks[0].steps[0].active).toBe(false);
  });
});

describe('toggleStep', () => {
  it('returnt eine neue State-Referenz (immutable)', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = toggleStep(state, trackId, 0);
    expect(next).not.toBe(state);
  });

  it('invertiert active des Ziel-Steps von false auf true', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = toggleStep(state, trackId, 0);
    expect(next.tracks[0].steps[0].active).toBe(true);
  });

  it('invertiert active des Ziel-Steps von true zurück auf false', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const once = toggleStep(state, trackId, 3);
    const twice = toggleStep(once, trackId, 3);
    expect(twice.tracks[0].steps[3].active).toBe(false);
  });

  it('mutiert den ursprünglichen State nicht', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    toggleStep(state, trackId, 5);
    expect(state.tracks[0].steps[5].active).toBe(false);
  });

  it('lässt andere Steps im selben Track unangetastet', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = toggleStep(state, trackId, 7);
    for (let i = 0; i < 16; i++) {
      if (i === 7) continue;
      expect(next.tracks[0].steps[i].active).toBe(false);
    }
  });

  it('lässt andere Tracks unangetastet', () => {
    const state = createDefaultState();
    const trackId = state.tracks[1].id;
    const next = toggleStep(state, trackId, 0);
    expect(next.tracks[0].steps[0].active).toBe(false);
    expect(next.tracks[2].steps[0].active).toBe(false);
    expect(next.tracks[3].steps[0].active).toBe(false);
  });
});

describe('setStepPitch', () => {
  it('setzt einen Wert innerhalb des Bereichs [-24, 24]', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setStepPitch(state, trackId, 4, 7);
    expect(next.tracks[0].steps[4].pitchSemitones).toBe(7);
  });

  it('akzeptiert die Untergrenze -24', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setStepPitch(state, trackId, 0, -24);
    expect(next.tracks[0].steps[0].pitchSemitones).toBe(-24);
  });

  it('akzeptiert die Obergrenze 24', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setStepPitch(state, trackId, 0, 24);
    expect(next.tracks[0].steps[0].pitchSemitones).toBe(24);
  });

  it('clamped Werte > 24 auf 24', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setStepPitch(state, trackId, 0, 999);
    expect(next.tracks[0].steps[0].pitchSemitones).toBe(24);
  });

  it('clamped Werte < -24 auf -24', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setStepPitch(state, trackId, 0, -999);
    expect(next.tracks[0].steps[0].pitchSemitones).toBe(-24);
  });

  it('returnt eine neue State-Referenz (immutable)', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setStepPitch(state, trackId, 0, 5);
    expect(next).not.toBe(state);
  });

  it('mutiert den ursprünglichen State nicht', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    setStepPitch(state, trackId, 0, 5);
    expect(state.tracks[0].steps[0].pitchSemitones).toBe(0);
  });

  it('lässt andere Steps und Tracks unangetastet', () => {
    const state = createDefaultState();
    const trackId = state.tracks[1].id;
    const next = setStepPitch(state, trackId, 4, -3);
    expect(next.tracks[1].steps[4].pitchSemitones).toBe(-3);
    expect(next.tracks[1].steps[0].pitchSemitones).toBe(0);
    expect(next.tracks[0].steps[4].pitchSemitones).toBe(0);
  });
});

describe('setTrackVolume', () => {
  it('setzt einen Wert innerhalb des Bereichs [0, 1]', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackVolume(state, trackId, 0.42);
    expect(next.tracks[0].volume).toBe(0.42);
  });

  it('akzeptiert die Untergrenze 0', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackVolume(state, trackId, 0);
    expect(next.tracks[0].volume).toBe(0);
  });

  it('akzeptiert die Obergrenze 1', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackVolume(state, trackId, 1);
    expect(next.tracks[0].volume).toBe(1);
  });

  it('clamped Werte > 1 auf 1', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackVolume(state, trackId, 5);
    expect(next.tracks[0].volume).toBe(1);
  });

  it('clamped Werte < 0 auf 0', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackVolume(state, trackId, -0.5);
    expect(next.tracks[0].volume).toBe(0);
  });

  it('returnt eine neue State-Referenz und mutiert das Original nicht', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackVolume(state, trackId, 0.3);
    expect(next).not.toBe(state);
    expect(state.tracks[0].volume).toBe(0.8);
  });

  it('lässt andere Tracks unangetastet', () => {
    const state = createDefaultState();
    const trackId = state.tracks[2].id;
    const next = setTrackVolume(state, trackId, 0.1);
    expect(next.tracks[2].volume).toBe(0.1);
    expect(next.tracks[0].volume).toBe(0.8);
    expect(next.tracks[1].volume).toBe(0.8);
    expect(next.tracks[3].volume).toBe(0.8);
  });
});

describe('setTrackTempo', () => {
  it('setzt einen Wert innerhalb des Bereichs [30, 300]', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackTempo(state, trackId, 140);
    expect(next.tracks[0].tempoBpm).toBe(140);
  });

  it('akzeptiert die Untergrenze 30', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackTempo(state, trackId, 30);
    expect(next.tracks[0].tempoBpm).toBe(30);
  });

  it('akzeptiert die Obergrenze 300', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackTempo(state, trackId, 300);
    expect(next.tracks[0].tempoBpm).toBe(300);
  });

  it('clamped Werte > 300 auf 300', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackTempo(state, trackId, 9999);
    expect(next.tracks[0].tempoBpm).toBe(300);
  });

  it('clamped Werte < 30 auf 30', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackTempo(state, trackId, 0);
    expect(next.tracks[0].tempoBpm).toBe(30);
  });

  it('returnt eine neue State-Referenz und mutiert das Original nicht', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackTempo(state, trackId, 200);
    expect(next).not.toBe(state);
    expect(state.tracks[0].tempoBpm).toBe(120);
  });

  it('lässt andere Tracks unangetastet', () => {
    const state = createDefaultState();
    const trackId = state.tracks[1].id;
    const next = setTrackTempo(state, trackId, 90);
    expect(next.tracks[1].tempoBpm).toBe(90);
    expect(next.tracks[0].tempoBpm).toBe(120);
    expect(next.tracks[2].tempoBpm).toBe(120);
    expect(next.tracks[3].tempoBpm).toBe(120);
  });
});

describe('setTrackSample', () => {
  it('setzt sampleDataUrl auf den übergebenen Wert', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const dataUrl = 'data:audio/wav;base64,AAAA';
    const next = setTrackSample(state, trackId, dataUrl);
    expect(next.tracks[0].sampleDataUrl).toBe(dataUrl);
  });

  it('ändert den voiceKind des Tracks zu "sample"', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
    expect(next.tracks[0].voiceKind).toBe('sample');
  });

  it('returnt eine neue State-Referenz und mutiert das Original nicht', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const next = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
    expect(next).not.toBe(state);
    expect(state.tracks[0].sampleDataUrl).toBeNull();
    expect(state.tracks[0].voiceKind).toBe('kick');
  });

  it('lässt andere Tracks unangetastet', () => {
    const state = createDefaultState();
    const trackId = state.tracks[2].id;
    const next = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
    expect(next.tracks[2].voiceKind).toBe('sample');
    expect(next.tracks[0].voiceKind).toBe('kick');
    expect(next.tracks[1].voiceKind).toBe('snare');
    expect(next.tracks[3].voiceKind).toBe('bass');
    expect(next.tracks[0].sampleDataUrl).toBeNull();
  });
});

describe('clearTrackSample', () => {
  it('setzt sampleDataUrl wieder auf null', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const withSample = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
    const cleared = clearTrackSample(withSample, trackId);
    expect(cleared.tracks[0].sampleDataUrl).toBeNull();
  });

  it('stellt den ursprünglichen voiceKind wieder her (Kick → "kick")', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const withSample = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
    const cleared = clearTrackSample(withSample, trackId);
    expect(cleared.tracks[0].voiceKind).toBe('kick');
  });

  it('stellt den ursprünglichen voiceKind für Snare/HiHat/Bass wieder her', () => {
    const state = createDefaultState();
    const expectedKinds = ['kick', 'snare', 'hihat', 'bass'];
    for (let i = 0; i < state.tracks.length; i++) {
      const trackId = state.tracks[i].id;
      const withSample = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
      const cleared = clearTrackSample(withSample, trackId);
      expect(cleared.tracks[i].voiceKind).toBe(expectedKinds[i]);
      expect(cleared.tracks[i].sampleDataUrl).toBeNull();
    }
  });

  it('returnt eine neue State-Referenz und mutiert das Original nicht', () => {
    const state = createDefaultState();
    const trackId = state.tracks[0].id;
    const withSample = setTrackSample(state, trackId, 'data:audio/wav;base64,AAAA');
    const cleared = clearTrackSample(withSample, trackId);
    expect(cleared).not.toBe(withSample);
    expect(withSample.tracks[0].sampleDataUrl).toBe('data:audio/wav;base64,AAAA');
    expect(withSample.tracks[0].voiceKind).toBe('sample');
  });

  it('lässt andere Tracks unangetastet', () => {
    const state = createDefaultState();
    const targetId = state.tracks[1].id;
    const otherId = state.tracks[2].id;
    const both = setTrackSample(
      setTrackSample(state, targetId, 'data:audio/wav;base64,AAAA'),
      otherId,
      'data:audio/wav;base64,BBBB'
    );
    const cleared = clearTrackSample(both, targetId);
    expect(cleared.tracks[1].sampleDataUrl).toBeNull();
    expect(cleared.tracks[1].voiceKind).toBe('snare');
    expect(cleared.tracks[2].sampleDataUrl).toBe('data:audio/wav;base64,BBBB');
    expect(cleared.tracks[2].voiceKind).toBe('sample');
  });
});
