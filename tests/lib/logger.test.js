import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installGlobalErrorHandler, logger } from '../../js/lib/logger.js';

describe('logger', () => {
  let infoSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.info schreibt eine JSON-Zeile auf console.info mit level=info und msg', () => {
    logger.info('hallo');

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const arg = infoSpy.mock.calls[0][0];
    expect(typeof arg).toBe('string');

    const parsed = JSON.parse(arg);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('hallo');
  });

  it('logger.warn schreibt JSON auf console.warn mit level=warn und msg', () => {
    logger.warn('warning-msg');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('warn');
    expect(parsed.msg).toBe('warning-msg');
  });

  it('logger.error schreibt JSON auf console.error mit level=error und msg', () => {
    logger.error('boom');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('error');
    expect(parsed.msg).toBe('boom');
  });

  it('mergt ctx-Felder in das Top-Level JSON-Objekt (Spread, nicht verschachtelt)', () => {
    logger.info('msg', { trackId: 'kick-1', stepIndex: 7 });

    const parsed = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(parsed.trackId).toBe('kick-1');
    expect(parsed.stepIndex).toBe(7);
    // Sicherstellen, dass ctx NICHT als verschachteltes Objekt unter "ctx" landet
    expect(parsed.ctx).toBeUndefined();
  });

  it('schreibt ts als ISO-8601 String, der wieder zu einer Date geparst werden kann', () => {
    const before = Date.now();
    logger.info('msg');
    const after = Date.now();

    const parsed = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(typeof parsed.ts).toBe('string');
    // ISO-8601 Zulu-Format: 2025-01-01T12:34:56.789Z
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);

    const parsedTime = Date.parse(parsed.ts);
    expect(Number.isFinite(parsedTime)).toBe(true);
    // Der Zeitstempel liegt im Aufrufzeitfenster (Toleranz 1s)
    expect(parsedTime).toBeGreaterThanOrEqual(before - 1000);
    expect(parsedTime).toBeLessThanOrEqual(after + 1000);
  });

  it('funktioniert ohne ctx-Argument', () => {
    expect(() => logger.info('no-ctx')).not.toThrow();

    const parsed = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('no-ctx');
    expect(typeof parsed.ts).toBe('string');
  });
});

describe('installGlobalErrorHandler', () => {
  let errorSpy;
  let registered;
  let addEventListenerSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registered = {};
    // addEventListener-Spy kapselt die registrierten Listener nach Event-Typ,
    // damit Tests sie ohne dispatchEvent direkt aufrufen können.
    addEventListenerSpy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((type, fn) => {
        registered[type] = fn;
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registriert einen "error"-Listener auf dem übergebenen Fenster', () => {
    installGlobalErrorHandler(window);

    const types = addEventListenerSpy.mock.calls.map((call) => call[0]);
    expect(types).toContain('error');
    expect(typeof registered.error).toBe('function');
  });

  it('registriert einen "unhandledrejection"-Listener auf dem übergebenen Fenster', () => {
    installGlobalErrorHandler(window);

    const types = addEventListenerSpy.mock.calls.map((call) => call[0]);
    expect(types).toContain('unhandledrejection');
    expect(typeof registered.unhandledrejection).toBe('function');
  });

  it('protokolliert ein "error"-Event als JSON-Zeile mit level=error auf console.error', () => {
    installGlobalErrorHandler(window);
    expect(typeof registered.error).toBe('function');

    registered.error({ message: 'oops', filename: 'main.js', lineno: 42 });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('error');
    expect(typeof parsed.msg).toBe('string');
    expect(parsed.msg.length).toBeGreaterThan(0);
    expect(typeof parsed.ts).toBe('string');
  });

  it('protokolliert ein "unhandledrejection"-Event als JSON-Zeile mit level=error auf console.error', () => {
    installGlobalErrorHandler(window);
    expect(typeof registered.unhandledrejection).toBe('function');

    registered.unhandledrejection({ reason: new Error('promise-fail') });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('error');
    expect(typeof parsed.msg).toBe('string');
    expect(parsed.msg.length).toBeGreaterThan(0);
    expect(typeof parsed.ts).toBe('string');
  });
});
