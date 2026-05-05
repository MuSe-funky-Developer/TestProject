/**
 * @typedef {Object} AudioEngineHandle
 * @property {AudioContext} context
 * @property {GainNode}     masterGain
 * @property {() => Promise<void>} resume
 */

/**
 * @returns {AudioEngineHandle}
 */
export function createAudioEngine() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  const context = new Ctor();
  const masterGain = context.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(context.destination);
  return {
    context,
    masterGain,
    resume: () => context.resume(),
  };
}
