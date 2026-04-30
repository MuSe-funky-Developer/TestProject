const BASE_CUTOFF_HZ = 1000;
const NOISE_DURATION_S = 0.2;
const DECAY_S = 0.15;
const ENVELOPE_FLOOR = 0.001;

export function createSnareVoice(engine) {
  const { context, masterGain } = engine;

  function trigger(when, pitchSemitones, gain) {
    const sampleRate = context.sampleRate || 44100;
    const frameCount = Math.max(1, Math.floor(sampleRate * NOISE_DURATION_S));
    const noiseBuffer = context.createBuffer(1, frameCount, sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    const cutoff = BASE_CUTOFF_HZ * Math.pow(2, pitchSemitones / 12);
    filter.frequency.setValueAtTime(cutoff, when);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(gain, when);
    envelope.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR, when + DECAY_S);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    source.start(when);
    source.stop(when + NOISE_DURATION_S);
  }

  function dispose() {}

  return { trigger, dispose };
}
