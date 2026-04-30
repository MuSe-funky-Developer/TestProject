/**
 * @typedef {'kick'|'snare'|'hihat'|'bass'|'sample'} VoiceKind
 *
 * @typedef {Object} Step
 * @property {boolean} active
 * @property {number}  pitchSemitones
 *
 * @typedef {Object} Track
 * @property {string}    id
 * @property {string}    name
 * @property {VoiceKind} voiceKind
 * @property {?string}   sampleDataUrl
 * @property {number}    volume
 * @property {number}    tempoBpm
 * @property {Step[]}    steps
 *
 * @typedef {Object} SequencerState
 * @property {string}  schemaVersion
 * @property {Track[]} tracks
 * @property {boolean} isPlaying
 */

export const SCHEMA_VERSION = '1.0.0';

const STEPS_PER_TRACK = 16;
const DEFAULT_VOLUME = 0.8;
const DEFAULT_TEMPO_BPM = 120;

const PITCH_MIN = -24;
const PITCH_MAX = 24;
const VOLUME_MIN = 0;
const VOLUME_MAX = 1;
const TEMPO_MIN = 30;
const TEMPO_MAX = 300;

const DEFAULT_TRACK_DEFS = [
  { name: 'Kick', voiceKind: 'kick' },
  { name: 'Snare', voiceKind: 'snare' },
  { name: 'HiHat', voiceKind: 'hihat' },
  { name: 'Bass', voiceKind: 'bass' },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const generateId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `track-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const createSteps = () =>
  Array.from({ length: STEPS_PER_TRACK }, () => ({ active: false, pitchSemitones: 0 }));

/** @returns {SequencerState} */
export function createDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    isPlaying: false,
    tracks: DEFAULT_TRACK_DEFS.map(({ name, voiceKind }) => ({
      id: generateId(),
      name,
      voiceKind,
      sampleDataUrl: null,
      volume: DEFAULT_VOLUME,
      tempoBpm: DEFAULT_TEMPO_BPM,
      steps: createSteps(),
    })),
  };
}

const updateTrack = (state, trackId, updater) => {
  const next = structuredClone(state);
  const track = next.tracks.find(t => t.id === trackId);
  if (track) updater(track);
  return next;
};

/** @returns {SequencerState} */
export function toggleStep(state, trackId, stepIndex) {
  return updateTrack(state, trackId, track => {
    const step = track.steps[stepIndex];
    step.active = !step.active;
  });
}

/** @returns {SequencerState} */
export function setStepPitch(state, trackId, stepIndex, semitones) {
  return updateTrack(state, trackId, track => {
    track.steps[stepIndex].pitchSemitones = clamp(semitones, PITCH_MIN, PITCH_MAX);
  });
}

/** @returns {SequencerState} */
export function setTrackVolume(state, trackId, volume) {
  return updateTrack(state, trackId, track => {
    track.volume = clamp(volume, VOLUME_MIN, VOLUME_MAX);
  });
}

/** @returns {SequencerState} */
export function setTrackTempo(state, trackId, bpm) {
  return updateTrack(state, trackId, track => {
    track.tempoBpm = clamp(bpm, TEMPO_MIN, TEMPO_MAX);
  });
}

/** @returns {SequencerState} */
export function setTrackSample(state, trackId, dataUrl) {
  return updateTrack(state, trackId, track => {
    track.sampleDataUrl = dataUrl;
    track.voiceKind = 'sample';
  });
}

/** @returns {SequencerState} */
export function clearTrackSample(state, trackId) {
  return updateTrack(state, trackId, track => {
    track.sampleDataUrl = null;
    track.voiceKind = track.name.toLowerCase();
  });
}
