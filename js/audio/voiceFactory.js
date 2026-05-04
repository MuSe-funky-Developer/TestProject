import { createKickVoice } from './synthVoices/kickVoice.js';
import { createSnareVoice } from './synthVoices/snareVoice.js';
import { createHihatVoice } from './synthVoices/hihatVoice.js';
import { createBassVoice } from './synthVoices/bassVoice.js';
import { createSampleVoice } from './sampleVoice.js';

export function createVoice(engine, track) {
  if (track.sampleDataUrl !== null && track.sampleDataUrl !== undefined) {
    return createSampleVoice(engine, track.sampleDataUrl);
  }
  switch (track.voiceKind) {
    case 'kick':
      return createKickVoice(engine);
    case 'snare':
      return createSnareVoice(engine);
    case 'hihat':
      return createHihatVoice(engine);
    case 'bass':
      return createBassVoice(engine);
    default:
      throw new Error(`unknown voiceKind: ${track.voiceKind}`);
  }
}
