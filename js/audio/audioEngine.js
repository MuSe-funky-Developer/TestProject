export function createAudioEngine() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  const context = new Ctx();
  const masterGain = context.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(context.destination);
  return {
    context,
    masterGain,
    resume() {
      return context.resume();
    },
  };
}
