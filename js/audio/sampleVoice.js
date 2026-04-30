export async function createSampleVoice(engine, dataUrl) {
  const response = await fetch(dataUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await engine.context.decodeAudioData(arrayBuffer);

  const activeNodes = new Set();

  return {
    trigger(when, pitchSemitones, gain) {
      const source = engine.context.createBufferSource();
      source.buffer = audioBuffer;
      const rate = Math.pow(2, pitchSemitones / 12);
      source.playbackRate.setValueAtTime(rate, when);

      const gainNode = engine.context.createGain();
      gainNode.gain.setValueAtTime(gain, when);

      source.connect(gainNode);
      gainNode.connect(engine.masterGain);

      source.start(when);

      activeNodes.add(source);
      activeNodes.add(gainNode);
    },
    dispose() {
      for (const node of activeNodes) {
        node.disconnect();
      }
      activeNodes.clear();
    },
  };
}
