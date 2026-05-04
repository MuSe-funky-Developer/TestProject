/**
 * Per-track lookahead scheduler (Chris-Wilson pattern).
 *
 * setInterval fires every 25 ms; on each tick, every track schedules all
 * 16th-note step events whose `when` falls inside a 100 ms lookahead window,
 * advancing its own `nextNoteTime` cursor. Step interval per track is
 * `60 / tempoBpm / 4` so tracks with different `tempoBpm` run independently.
 *
 * @typedef {Object} Track
 * @property {string} id
 * @property {number} tempoBpm
 * @property {Array}  steps
 *
 * @typedef {Object} SchedulerDeps
 * @property {{ context: { currentTime: number } }} engine
 * @property {() => { tracks: Track[] }} getState
 * @property {(track: Track, stepIndex: number, when: number) => void} onStepFire
 */

const TICK_INTERVAL_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;
const STEPS_PER_BEAT = 4;
const STEPS_PER_PATTERN = 16;

/**
 * @param {SchedulerDeps} deps
 * @returns {{ start: () => void, stop: () => void }}
 */
export function createScheduler({ engine, getState, onStepFire }) {
  let intervalHandle = null;
  let cursors = new Map();

  function tick() {
    const horizon = engine.context.currentTime + LOOKAHEAD_SECONDS;
    const { tracks } = getState();
    for (const track of tracks) {
      let cursor = cursors.get(track.id);
      if (!cursor) {
        cursor = { nextNoteTime: engine.context.currentTime, stepIndex: 0 };
        cursors.set(track.id, cursor);
      }
      const stepInterval = 60 / track.tempoBpm / STEPS_PER_BEAT;
      while (cursor.nextNoteTime < horizon) {
        onStepFire(track, cursor.stepIndex, cursor.nextNoteTime);
        cursor.stepIndex = (cursor.stepIndex + 1) % STEPS_PER_PATTERN;
        cursor.nextNoteTime += stepInterval;
      }
    }
  }

  function start() {
    if (intervalHandle !== null) {
      clearInterval(intervalHandle);
    }
    cursors = new Map();
    intervalHandle = setInterval(tick, TICK_INTERVAL_MS);
  }

  function stop() {
    if (intervalHandle !== null) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
    cursors = new Map();
  }

  return { start, stop };
}
