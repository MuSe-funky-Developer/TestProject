export function createBassVoice(engine) {
  const { context, masterGain } = engine;

  function trigger(when, pitchSemitones, gain) {
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    osc.frequency.setValueAtTime(110 * Math.pow(2, (pitchSemitones || 0) / 12), when);
    filter.frequency.setValueAtTime(800, when);
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(masterGain);
    osc.start(when);
    osc.stop(when + 0.3);
  }

  return { trigger, dispose() {} };
}
