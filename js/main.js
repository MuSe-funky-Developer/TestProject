export async function bootstrap(doc) {
  const context = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
  const engine = { context };
  return { engine };
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => bootstrap(document));
}
