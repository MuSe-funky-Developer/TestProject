const TICK_MS = 25;
const LOOKAHEAD_S = 0.1;
const STEPS_PER_BEAT = 4;

export function createScheduler({ engine, getState, onStepFire }) {
  let intervalId = null;
  const cursors = new Map();

  function tick() {
    const state = getState();
    if (!state || !state.tracks) return;
    const now = engine.context.currentTime;

    for (const track of state.tracks) {
      let cursor = cursors.get(track.id);
      if (!cursor) {
        cursor = { stepIndex: 0, nextNoteTime: now };
        cursors.set(track.id, cursor);
      }
      const stepDuration = 60 / track.tempoBpm / STEPS_PER_BEAT;
      const horizon = now + LOOKAHEAD_S;

      while (cursor.nextNoteTime < horizon) {
        onStepFire(track, cursor.stepIndex, cursor.nextNoteTime);
        cursor.nextNoteTime += stepDuration;
        cursor.stepIndex = (cursor.stepIndex + 1) % 16;
      }
    }
  }

  function start() {
    if (intervalId !== null) return;
    cursors.clear();
    intervalId = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    cursors.clear();
  }

  return { start, stop };
}
