import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';

const STORAGE_KEY = 'sheep.testystuff.state.v1';
const SCHEMA_VERSION = '1.0.0';

const APP_HTML = `
  <main id="app">
    <header class="transport"></header>
    <section id="track-list"></section>
    <div id="health"></div>
  </main>
`;

function createFakeWin() {
  const listeners = {};
  return {
    listeners,
    addEventListener(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
    },
    removeEventListener(event, fn) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((f) => f !== fn);
    },
    triggerBeforeunload() {
      const handlers = listeners['beforeunload'] || [];
      const event = { type: 'beforeunload', preventDefault: () => {}, returnValue: '' };
      handlers.forEach((fn) => fn(event));
    },
  };
}

function makeValidStoredState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    isPlaying: false,
    tracks: [
      {
        id: 'restored-kick',
        name: 'Kick',
        voiceKind: 'kick',
        sampleDataUrl: null,
        volume: 0.42,
        tempoBpm: 99,
        steps: Array.from({ length: 16 }, (_, i) => ({
          active: i === 5,
          pitchSemitones: 0,
        })),
      },
    ],
  };
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('bootstrap — basic shape (existing contract preserved)', () => {
  it('index.html lädt main.js als ES-Modul', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    expect(html).toMatch(/<script type="module" src="js\/main\.js"><\/script>/);
  });

  it('index.html enthält ein #health-Element', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    expect(html).toMatch(/id=["']health["']/);
  });

  it('main.js exportiert eine bootstrap()-Funktion', async () => {
    const mod = await import('../../js/main.js');
    expect(typeof mod.bootstrap).toBe('function');
  });

  it('bootstrap(doc, win) gibt einen Handle mit AudioEngine zurück', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    expect(handle.engine).toBeDefined();
    expect(handle.engine.context).toBeInstanceOf(globalThis.AudioContext);
  });

  it('bootstrap-Handle exponiert die Sequencer-Engine mit getState/dispatch', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    expect(handle.sequencer).toBeDefined();
    expect(typeof handle.sequencer.getState).toBe('function');
    expect(typeof handle.sequencer.dispatch).toBe('function');
  });

  it('bestehender Bootstrap-Test bleibt grün: bootstrap(document) (single-arg) funktioniert weiterhin', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document);
    expect(handle.engine).toBeDefined();
    expect(handle.engine.context).toBeInstanceOf(globalThis.AudioContext);
  });
});

describe('bootstrap — initial state via loadState ?? createDefaultState', () => {
  it('verwendet createDefaultState, wenn localStorage leer ist', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    const state = handle.sequencer.getState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.tracks).toHaveLength(4);
    expect(state.tracks.map((t) => t.name)).toEqual(['Kick', 'Snare', 'HiHat', 'Bass']);
  });

  it('stellt gespeicherten State aus localStorage wieder her, wenn schemaVersion stimmt', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeValidStoredState()));
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    const state = handle.sequencer.getState();
    expect(state.tracks).toHaveLength(1);
    expect(state.tracks[0].id).toBe('restored-kick');
    expect(state.tracks[0].name).toBe('Kick');
    expect(state.tracks[0].volume).toBeCloseTo(0.42);
    expect(state.tracks[0].tempoBpm).toBe(99);
    expect(state.tracks[0].steps[5].active).toBe(true);
  });

  it('fällt auf Default-State zurück, wenn schemaVersion nicht passt', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: '0.0.1', tracks: [], isPlaying: false }),
    );
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    const state = handle.sequencer.getState();
    expect(state.tracks).toHaveLength(4);
    expect(state.tracks.map((t) => t.name)).toEqual(['Kick', 'Snare', 'HiHat', 'Bass']);
  });

  it('fällt auf Default-State zurück bei defektem JSON in localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not-valid-json');
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    const state = handle.sequencer.getState();
    expect(state.tracks).toHaveLength(4);
    expect(state.tracks.map((t) => t.name)).toEqual(['Kick', 'Snare', 'HiHat', 'Bass']);
  });
});

describe('bootstrap — UI-Wiring & renderAll bei state:changed', () => {
  it('rendert das Step-Grid (4 Tracks × 16 Steps) aus dem Initial-State', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    await mod.bootstrap(document, createFakeWin());
    const stepButtons = document.querySelectorAll('.step');
    expect(stepButtons.length).toBe(4 * 16);
  });

  it('rendert mindestens 3 Transport-Buttons (Play/Stop/Clear)', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    await mod.bootstrap(document, createFakeWin());
    const transport = document.querySelector('.transport');
    expect(transport).toBeTruthy();
    const buttons = transport.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('rendert pro Track die Volume- und Tempo-Controls', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    await mod.bootstrap(document, createFakeWin());
    const volumes = document.querySelectorAll('input.volume');
    const tempos = document.querySelectorAll('input.tempo');
    expect(volumes.length).toBeGreaterThanOrEqual(4);
    expect(tempos.length).toBeGreaterThanOrEqual(4);
  });

  it('aktualisiert das Grid, wenn State sich ändert (state:changed → renderAll)', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, createFakeWin());
    const trackId = handle.sequencer.getState().tracks[0].id;
    const selector = `.step[data-track-id="${trackId}"][data-step-index="0"]`;

    const before = document.querySelector(selector);
    expect(before).toBeTruthy();
    expect(before.classList.contains('is-active')).toBe(false);

    handle.sequencer.dispatch({
      type: 'TOGGLE_STEP',
      trackId,
      stepIndex: 0,
    });

    const after = document.querySelector(selector);
    expect(after).toBeTruthy();
    expect(after.classList.contains('is-active')).toBe(true);
  });
});

describe('bootstrap — Auto-Save via beforeunload', () => {
  it('registriert einen beforeunload-Listener auf dem übergebenen window', async () => {
    document.body.innerHTML = APP_HTML;
    const win = createFakeWin();
    const mod = await import('../../js/main.js');
    await mod.bootstrap(document, win);
    expect(win.listeners['beforeunload']).toBeDefined();
    expect(win.listeners['beforeunload'].length).toBeGreaterThanOrEqual(1);
  });

  it('schreibt den aktuellen State unter STORAGE_KEY, wenn beforeunload feuert', async () => {
    document.body.innerHTML = APP_HTML;
    const win = createFakeWin();
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, win);

    const trackId = handle.sequencer.getState().tracks[0].id;
    handle.sequencer.dispatch({
      type: 'TOGGLE_STEP',
      trackId,
      stepIndex: 3,
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    win.triggerBeforeunload();

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    const persistedTrack = parsed.tracks.find((t) => t.id === trackId);
    expect(persistedTrack).toBeDefined();
    expect(persistedTrack.steps[3].active).toBe(true);
  });

  it('schreibt nicht voreilig: ohne beforeunload bleibt localStorage unter STORAGE_KEY leer', async () => {
    document.body.innerHTML = APP_HTML;
    const win = createFakeWin();
    const mod = await import('../../js/main.js');
    const handle = await mod.bootstrap(document, win);
    handle.sequencer.dispatch({
      type: 'TOGGLE_STEP',
      trackId: handle.sequencer.getState().tracks[0].id,
      stepIndex: 1,
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('bootstrap — Health-Status', () => {
  it('setzt #health auf "ok" nach erfolgreichem Bootstrap', async () => {
    document.body.innerHTML = APP_HTML;
    const mod = await import('../../js/main.js');
    await mod.bootstrap(document, createFakeWin());
    const health = document.querySelector('#health');
    expect(health).toBeTruthy();
    expect(health.textContent.trim()).toBe('ok');
  });
});
