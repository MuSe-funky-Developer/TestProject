const BASE_FREQ_HZ = 110;
const LOWPASS_CUTOFF_HZ = 800;
const ATTACK_S = 0.005;
const DECAY_S = 0.25;
const RELEASE_TAIL_S = 0.05;

export function createBassVoice(engine) {
  const { context, masterGain } = engine;
  const ownedNodes = [];

  function trigger(when, pitchSemitones, gain) {
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    const frequency = BASE_FREQ_HZ * Math.pow(2, pitchSemitones / 12);
    osc.frequency.setValueAtTime(frequency, when);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(LOWPASS_CUTOFF_HZ, when);

    const ampGain = context.createGain();
    ampGain.gain.setValueAtTime(0, when);
    ampGain.gain.linearRampToValueAtTime(gain, when + ATTACK_S);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, when + DECAY_S);

    osc.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(masterGain);

    osc.start(when);
    osc.stop(when + DECAY_S + RELEASE_TAIL_S);

    ownedNodes.push(osc, filter, ampGain);
  }

  function dispose() {
    while (ownedNodes.length > 0) {
      const node = ownedNodes.pop();
      node.disconnect();
    }
  }

  return { trigger, dispose };
}
