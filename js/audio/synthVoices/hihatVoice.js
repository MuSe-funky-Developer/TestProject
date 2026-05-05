const BASE_FREQ_HZ = 8000;
const Q_VALUE = 10;
const DECAY_S = 0.05;
const SILENCE_TARGET = 0.001;

export function createHihatVoice(engine) {
  const { context, masterGain } = engine;
  const activeNodes = new Set();

  function trigger(when, pitchSemitones, gainValue) {
    const length = Math.max(1, Math.floor(DECAY_S * context.sampleRate));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    const center = BASE_FREQ_HZ * Math.pow(2, pitchSemitones / 12);
    filter.frequency.setValueAtTime(center, when);
    filter.Q.setValueAtTime(Q_VALUE, when);

    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, when);
    gain.gain.exponentialRampToValueAtTime(SILENCE_TARGET, when + DECAY_S);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    source.start(when);
    source.stop(when + DECAY_S);

    activeNodes.add(source);
    activeNodes.add(filter);
    activeNodes.add(gain);
  }

  function dispose() {
    for (const node of activeNodes) {
      node.disconnect();
    }
    activeNodes.clear();
  }

  return { trigger, dispose };
}
