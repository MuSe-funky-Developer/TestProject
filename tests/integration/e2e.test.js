import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const STORAGE_KEY = 'sheep.testystuff.state.v1';

// Hoisted spies so vi.mock factory (which is also hoisted) can reference them.
const mocks = vi.hoisted(() => ({
  kickTrigger: vi.fn(),
  kickDispose: vi.fn(),
  kickFactory: vi.fn(),
}));

// Replace KickVoice with a spy-able fake so we can verify the scheduler
// triggers it through the full play -> scheduler -> voiceFactory chain.
vi.mock('../../js/audio/synthVoices/kickVoice.js', () => {
  mocks.kickFactory.mockImplementation(() => ({
    trigger: mocks.kickTrigger,
    dispose: mocks.kickDispose,
  }));
  return { createKickVoice: mocks.kickFactory };
});

// Minimal markup mirroring index.html's body so bootstrap can mount UI.
const APP_HTML = `
  <main id="app">
    <header class="transport"></header>
    <section id="track-list"></section>
    <div id="health"></div>
  </main>
`;

function findTransportButton(label) {
  const transport = document.querySelector('.transport');
  if (!transport) return null;
  const byClass = transport.querySelector(`button.${label}`);
  if (byClass) return byClass;
  const byData = transport.querySelector(`button[data-action="${label}"]`);
  if (byData) return byData;
  return [...transport.querySelectorAll('button')].find(
    (b) => new RegExp(`^\\s*${label}\\s*$`, 'i').test(b.textContent || ''),
  ) || null;
}

describe('end-to-end happy path (Task 21)', () => {
  beforeEach(() => {
    document.body.innerHTML = APP_HTML;
    localStorage.clear();
    mocks.kickTrigger.mockClear();
    mocks.kickDispose.mockClear();
    mocks.kickFactory.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 4 tracks × 16 steps; toggle, play, trigger, stop, beforeunload-save', async () => {
    const { bootstrap } = await import('../../js/main.js');

    // ---- Bootstrap ---------------------------------------------------------
    const handle = await bootstrap(document, window);
    expect(handle).toBeDefined();
    expect(handle.engine).toBeDefined();
    expect(handle.engine.context).toBeInstanceOf(globalThis.AudioContext);
    expect(handle.sequencer).toBeDefined();
    expect(typeof handle.sequencer.getState).toBe('function');

    // ---- AC: 4 track rows, each with 16 step-buttons (64 total) -----------
    const trackRows = document.querySelectorAll('#track-list .track');
    expect(trackRows.length).toBe(4);
    const allStepButtons = document.querySelectorAll('button.step');
    expect(allStepButtons.length).toBe(64);

    // ---- AC: track names match the 4-default contract ---------------------
    const initialState = handle.sequencer.getState();
    expect(initialState.tracks.map((t) => t.name)).toEqual([
      'Kick',
      'Snare',
      'HiHat',
      'Bass',
    ]);
    const kickTrack = initialState.tracks[0];
    expect(kickTrack.steps.length).toBe(16);
    expect(kickTrack.steps[0].active).toBe(false);

    // ---- AC: click Step 0 of Kick -> state's Kick step 0 becomes active ---
    const kickStep0 = document.querySelector(
      `button.step[data-track-id="${kickTrack.id}"][data-step-index="0"]`,
    );
    expect(kickStep0).not.toBeNull();
    kickStep0.click();
    const afterClick = handle.sequencer.getState();
    expect(afterClick.tracks[0].steps[0].active).toBe(true);

    // Switch to fake timers AFTER bootstrap+toggle to avoid stalling
    // any microtasks bootstrap relies on.
    vi.useFakeTimers();

    // ---- AC: click Play -> engine.context.resume() invoked ----------------
    const playBtn = findTransportButton('play');
    expect(playBtn).not.toBeNull();
    playBtn.click();
    // Flush any microtask the play handler may have queued (resume() is async).
    await Promise.resolve();
    await Promise.resolve();
    expect(handle.engine.context.resume).toHaveBeenCalled();

    // ---- AC: advanceTimersByTime triggers KickVoice at least once --------
    // The scheduler runs on a 25 ms setInterval; with the AudioContextMock's
    // currentTime fixed at 0, Kick step 0 (active) should fire immediately
    // on the first lookahead tick, calling our mocked KickVoice.trigger.
    vi.advanceTimersByTime(200);
    expect(mocks.kickTrigger).toHaveBeenCalled();
    // Verify the trigger contract: trigger(when, pitchSemitones, gain).
    const firstCall = mocks.kickTrigger.mock.calls[0];
    expect(firstCall.length).toBeGreaterThanOrEqual(3);
    expect(typeof firstCall[0]).toBe('number'); // when
    expect(typeof firstCall[1]).toBe('number'); // pitchSemitones
    expect(typeof firstCall[2]).toBe('number'); // gain

    // ---- AC: click Stop -> no further triggers ---------------------------
    const stopBtn = findTransportButton('stop');
    expect(stopBtn).not.toBeNull();
    stopBtn.click();
    mocks.kickTrigger.mockClear();
    vi.advanceTimersByTime(500);
    expect(mocks.kickTrigger).not.toHaveBeenCalled();

    // ---- AC: beforeunload -> localStorage.setItem(STORAGE_KEY, ...) -------
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    window.dispatchEvent(new Event('beforeunload'));
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored);
    expect(parsed).toMatchObject({
      schemaVersion: '1.0.0',
      tracks: expect.any(Array),
    });
    expect(parsed.tracks).toHaveLength(4);
    // The Kick step 0 toggle must round-trip through persistence.
    expect(parsed.tracks[0].name).toBe('Kick');
    expect(parsed.tracks[0].steps[0].active).toBe(true);
  });
});
