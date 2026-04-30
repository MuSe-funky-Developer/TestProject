export function createSnareVoice(engine) {
  const { context, masterGain } = engine;

  function trigger(when, pitchSemitones, gain) {
    const src = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    filter.frequency.setValueAtTime(1000 * Math.pow(2, (pitchSemitones || 0) / 12), when);
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(masterGain);
    src.start(when);
    src.stop(when + 0.2);
  }

  return { trigger, dispose() {} };
}
