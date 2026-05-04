import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScheduler } from '../../js/sequencer/scheduler.js';

// --- helpers ---------------------------------------------------------------

/**
 * Build a minimal fake audio engine.  The scheduler only needs
 * `engine.context.currentTime`; we keep currentTime mutable so each test can
 * advance the audio clock independently of the (faked) wall clock.
 */
function makeEngine(initialTime = 0) {
  return { context: { currentTime: initialTime } };
}

/**
 * Build a minimal track.  We only set the fields the scheduler is documented
 * to read (`id`, `tempoBpm`, `steps`).  Other fields exist to keep the shape
 * realistic but are not asserted on.
 */
function makeTrack(id, tempoBpm = 120, stepCount = 16) {
  return {
    id,
    name: id,
    voiceKind: 'kick',
    sampleDataUrl: null,
    volume: 0.8,
    tempoBpm,
    steps: Array.from({ length: stepCount }, () => ({
      active: false,
      pitchSemitones: 0,
    })),
  };
}

// --- tests -----------------------------------------------------------------

describe('createScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC-A: API surface and start/stop lifecycle
  // -------------------------------------------------------------------------
  describe('API surface', () => {
    it('returns an object exposing start and stop functions', () => {
      const sched = createScheduler({
        engine: makeEngine(),
        getState: () => ({ tracks: [] }),
        onStepFire: vi.fn(),
      });

      expect(typeof sched.start).toBe('function');
      expect(typeof sched.stop).toBe('function');
    });
  });

  describe('start/stop lifecycle', () => {
    it('start() schedules a setInterval tick every 25 ms', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const sched = createScheduler({
        engine: makeEngine(),
        getState: () => ({ tracks: [] }),
        onStepFire: vi.fn(),
      });

      sched.start();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 25);
    });

    it('stop() clears the interval', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const sched = createScheduler({
        engine: makeEngine(),
        getState: () => ({ tracks: [] }),
        onStepFire: vi.fn(),
      });

      sched.start();
      sched.stop();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('after stop() no further onStepFire calls happen even as timers and audio clock advance', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 120);
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25); // allow at least one tick to happen
      const fireCountBeforeStop = onStepFire.mock.calls.length;

      sched.stop();

      // Pretend a lot of time has passed (both wall and audio clock).
      engine.context.currentTime = 5.0;
      vi.advanceTimersByTime(1000);

      expect(onStepFire.mock.calls.length).toBe(fireCountBeforeStop);
    });
  });

  // -------------------------------------------------------------------------
  // AC-B: onStepFire receives correct `when` values inside the lookahead
  // -------------------------------------------------------------------------
  describe('onStepFire and the 100 ms lookahead window', () => {
    it('fires the first step with when = currentTime on the first tick', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 120); // 0.125 s per 16th
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25);

      // bpm=120 → step interval 0.125 s.  Lookahead 0.1 s contains only step 0.
      expect(onStepFire).toHaveBeenCalledTimes(1);
      const [firedTrack, firedStepIndex, firedWhen] = onStepFire.mock.calls[0];
      expect(firedTrack).toBe(track);
      expect(firedStepIndex).toBe(0);
      expect(firedWhen).toBeCloseTo(0, 9);
    });

    it('passes the track object as the first argument to onStepFire', () => {
      const onStepFire = vi.fn();
      const track = makeTrack('hat', 120);
      const sched = createScheduler({
        engine: makeEngine(0),
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25);

      expect(onStepFire.mock.calls[0][0]).toBe(track);
    });

    it('schedules every event with when inside [currentTime, currentTime + 0.1)', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 240); // 0.0625 s per 16th
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25);

      expect(onStepFire.mock.calls.length).toBeGreaterThan(0);
      for (const [, , when] of onStepFire.mock.calls) {
        expect(when).toBeGreaterThanOrEqual(engine.context.currentTime);
        expect(when).toBeLessThan(engine.context.currentTime + 0.1);
      }
    });

    it('fires multiple notes within one tick when several fit in the lookahead window (high tempo)', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 240); // 0.0625 s per step → step 0 (0.0) and step 1 (0.0625) fit in 0.1 s
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25);

      expect(onStepFire).toHaveBeenCalledTimes(2);
      expect(onStepFire.mock.calls[0][1]).toBe(0);
      expect(onStepFire.mock.calls[0][2]).toBeCloseTo(0, 9);
      expect(onStepFire.mock.calls[1][1]).toBe(1);
      expect(onStepFire.mock.calls[1][2]).toBeCloseTo(0.0625, 9);
    });

    it('fires steps in increasing order across consecutive ticks with correct when offsets', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 120); // 0.125 s per step
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();

      // Drive 4 ticks with the audio clock advancing in lockstep with the
      // step interval so each tick adds exactly one fire.
      for (let i = 0; i < 4; i++) {
        engine.context.currentTime = i * 0.125;
        vi.advanceTimersByTime(25);
      }

      const seq = onStepFire.mock.calls.map(([, idx, when]) => ({ idx, when }));
      expect(seq.length).toBeGreaterThanOrEqual(4);
      expect(seq[0].idx).toBe(0);
      expect(seq[0].when).toBeCloseTo(0.0, 9);
      expect(seq[1].idx).toBe(1);
      expect(seq[1].when).toBeCloseTo(0.125, 9);
      expect(seq[2].idx).toBe(2);
      expect(seq[2].when).toBeCloseTo(0.25, 9);
      expect(seq[3].idx).toBe(3);
      expect(seq[3].when).toBeCloseTo(0.375, 9);
    });
  });

  // -------------------------------------------------------------------------
  // AC-C: step index wraps after 16 steps
  // -------------------------------------------------------------------------
  describe('step index wrap-around', () => {
    it('wraps the step index from 15 back to 0 on the 17th fire', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 120); // 0.125 s per step → 16 steps = 2.0 s
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();

      // Drive 18 ticks, advancing the audio clock by exactly one step each
      // tick so the lookahead catches one fire per tick.
      for (let i = 0; i < 18; i++) {
        engine.context.currentTime = i * 0.125;
        vi.advanceTimersByTime(25);
      }

      const indices = onStepFire.mock.calls.map(([, idx]) => idx);
      expect(indices.length).toBeGreaterThanOrEqual(17);
      // First 16 fires walk 0..15, then the 17th wraps back to 0.
      for (let i = 0; i < 17; i++) {
        expect(indices[i]).toBe(i % 16);
      }
    });
  });

  // -------------------------------------------------------------------------
  // AC-D: different per-track tempo → different `when` spacing
  // -------------------------------------------------------------------------
  describe('per-track tempo independence', () => {
    it('two tracks with different tempoBpm fire with independent step intervals', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const slow = makeTrack('slow', 60);  // 0.25 s per step  → only step 0 in lookahead
      const fast = makeTrack('fast', 240); // 0.0625 s per step → steps 0 and 1 in lookahead
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [slow, fast] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25);

      const slowFires = onStepFire.mock.calls.filter(([t]) => t === slow);
      const fastFires = onStepFire.mock.calls.filter(([t]) => t === fast);

      expect(slowFires).toHaveLength(1);
      expect(slowFires[0][1]).toBe(0);
      expect(slowFires[0][2]).toBeCloseTo(0, 9);

      expect(fastFires).toHaveLength(2);
      expect(fastFires[0][1]).toBe(0);
      expect(fastFires[0][2]).toBeCloseTo(0, 9);
      expect(fastFires[1][1]).toBe(1);
      expect(fastFires[1][2]).toBeCloseTo(0.0625, 9);
    });

    it('uses the formula 60 / bpm / 4 for the 16th-note step interval', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      // bpm = 100 → step interval = 60 / 100 / 4 = 0.15 s
      const track = makeTrack('k', 100);
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();

      // First tick: at t=0, lookahead window is [0, 0.1).  Step 1 at when=0.15
      // is outside, so only step 0 fires.
      vi.advanceTimersByTime(25);
      // Bump audio clock so step 1 (when=0.15) enters the lookahead.
      engine.context.currentTime = 0.06; // 0.06 + 0.1 = 0.16 ≥ 0.15
      vi.advanceTimersByTime(25);

      const fires = onStepFire.mock.calls;
      expect(fires.length).toBeGreaterThanOrEqual(2);

      const whens = fires.map(([, , w]) => w);
      expect(whens[0]).toBeCloseTo(0.0, 9);
      expect(whens[1]).toBeCloseTo(0.15, 9); // 60/100/4
      // Spacing between fires is exactly the formula.
      expect(whens[1] - whens[0]).toBeCloseTo(60 / 100 / 4, 9);
    });

    it('changing one track\'s tempo does not affect the other track\'s when values', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const a = makeTrack('a', 120); // 0.125 s
      const b = makeTrack('b', 60);  // 0.25 s
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [a, b] }),
        onStepFire,
      });

      sched.start();
      // Drive several ticks in lockstep with track A's interval so we see at
      // least 4 fires from A and 2 from B.
      for (let i = 0; i < 4; i++) {
        engine.context.currentTime = i * 0.125;
        vi.advanceTimersByTime(25);
      }

      const aWhens = onStepFire.mock.calls.filter(([t]) => t === a).map(([, , w]) => w);
      const bWhens = onStepFire.mock.calls.filter(([t]) => t === b).map(([, , w]) => w);

      // A: 0.0, 0.125, 0.25, 0.375
      expect(aWhens.length).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < 4; i++) {
        expect(aWhens[i]).toBeCloseTo(i * 0.125, 9);
      }
      // B at 60bpm: 0.0, 0.25
      expect(bWhens.length).toBeGreaterThanOrEqual(2);
      expect(bWhens[0]).toBeCloseTo(0.0, 9);
      expect(bWhens[1]).toBeCloseTo(0.25, 9);
    });
  });

  // -------------------------------------------------------------------------
  // AC-A (continued): stop() resets per-track nextNoteTime cursors
  // -------------------------------------------------------------------------
  describe('restart resets per-track cursors', () => {
    it('after stop() and a fresh start(), scheduling restarts from the new currentTime', () => {
      const onStepFire = vi.fn();
      const engine = makeEngine(0);
      const track = makeTrack('k', 120);
      const sched = createScheduler({
        engine,
        getState: () => ({ tracks: [track] }),
        onStepFire,
      });

      sched.start();
      vi.advanceTimersByTime(25); // fire some events
      expect(onStepFire.mock.calls.length).toBeGreaterThan(0);

      sched.stop();
      onStepFire.mockClear();

      // Jump the audio clock far ahead and start again.
      engine.context.currentTime = 5.0;
      sched.start();
      vi.advanceTimersByTime(25);

      expect(onStepFire).toHaveBeenCalled();
      const [firedTrack, firedStepIndex, firedWhen] = onStepFire.mock.calls[0];
      expect(firedTrack).toBe(track);
      // Step index has been reset to 0; when is anchored at the new
      // currentTime, NOT at the leftover nextNoteTime from before stop().
      expect(firedStepIndex).toBe(0);
      expect(firedWhen).toBeCloseTo(5.0, 9);
    });
  });
});
