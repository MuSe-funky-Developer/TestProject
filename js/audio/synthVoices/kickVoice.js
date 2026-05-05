const BASE_FREQUENCY_HZ = 60;
const PITCH_DECAY_DURATION = 0.05;
const ATTACK_DURATION = 0.001;
const DECAY_DURATION = 0.2;
const MIN_GAIN = 0.0001;

export function createKickVoice(engine) {
  const { context, masterGain } = engine;
  let lastGainNode = null;

  function trigger(when, pitchSemitones, gain) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';

    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    const baseFreq = BASE_FREQUENCY_HZ * Math.pow(2, pitchSemitones / 12);
    oscillator.frequency.setValueAtTime(baseFreq, when);
    oscillator.frequency.exponentialRampToValueAtTime(
      baseFreq * 0.5,
      when + PITCH_DECAY_DURATION,
    );

    const stopAt = when + ATTACK_DURATION + DECAY_DURATION;
    gainNode.gain.setValueAtTime(0, when);
    gainNode.gain.linearRampToValueAtTime(gain, when + ATTACK_DURATION);
    gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, stopAt);

    oscillator.start(when);
    oscillator.stop(stopAt);

    lastGainNode = gainNode;
  }

  function dispose() {
    if (lastGainNode) {
      lastGainNode.disconnect();
      lastGainNode = null;
    }
  }

  return { trigger, dispose };
}
