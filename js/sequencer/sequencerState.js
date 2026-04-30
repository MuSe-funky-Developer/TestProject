export const SCHEMA_VERSION = '1.0.0';

const DEFAULT_TRACKS = [
  { id: 'track-kick', name: 'Kick', voiceKind: 'kick' },
  { id: 'track-snare', name: 'Snare', voiceKind: 'snare' },
  { id: 'track-hihat', name: 'HiHat', voiceKind: 'hihat' },
  { id: 'track-bass', name: 'Bass', voiceKind: 'bass' },
];

function defaultSteps() {
  return Array.from({ length: 16 }, () => ({ active: false, pitchSemitones: 0 }));
}

export function createDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    isPlaying: false,
    tracks: DEFAULT_TRACKS.map((t) => ({
      id: t.id,
      name: t.name,
      voiceKind: t.voiceKind,
      sampleDataUrl: null,
      volume: 0.8,
      tempoBpm: 120,
      steps: defaultSteps(),
    })),
  };
}

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function mutateTrack(state, trackId, fn) {
  const next = clone(state);
  const track = next.tracks.find((t) => t.id === trackId);
  if (track) fn(track);
  return next;
}

export function toggleStep(state, trackId, stepIndex) {
  return mutateTrack(state, trackId, (track) => {
    const step = track.steps[stepIndex];
    if (step) step.active = !step.active;
  });
}

export function setStepPitch(state, trackId, stepIndex, semitones) {
  return mutateTrack(state, trackId, (track) => {
    const step = track.steps[stepIndex];
    if (step) step.pitchSemitones = clamp(Number(semitones) || 0, -24, 24);
  });
}

export function setTrackVolume(state, trackId, volume) {
  return mutateTrack(state, trackId, (track) => {
    track.volume = clamp(Number(volume), 0, 1);
  });
}

export function setTrackTempo(state, trackId, bpm) {
  return mutateTrack(state, trackId, (track) => {
    track.tempoBpm = clamp(Number(bpm), 30, 300);
  });
}

export function setTrackSample(state, trackId, dataUrl) {
  return mutateTrack(state, trackId, (track) => {
    track.sampleDataUrl = dataUrl;
  });
}

export function clearTrackSample(state, trackId) {
  return mutateTrack(state, trackId, (track) => {
    track.sampleDataUrl = null;
  });
}
