export function createKickVoice(engine) {
  const { context, masterGain } = engine;

  function trigger(when, pitchSemitones, gain) {
    const osc = context.createOscillator();
    const amp = context.createGain();
    const baseFreq = 60 * Math.pow(2, (pitchSemitones || 0) / 12);
    osc.frequency.setValueAtTime(baseFreq, when);
    osc.frequency.exponentialRampToValueAtTime(baseFreq / 2, when + 0.05);
    amp.gain.setValueAtTime(gain, when + 0.001);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    osc.connect(amp);
    amp.connect(masterGain);
    osc.start(when);
    osc.stop(when + 0.25);
  }

  return { trigger, dispose() {} };
}
