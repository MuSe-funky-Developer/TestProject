import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../js/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  installGlobalErrorHandler: vi.fn(),
}));

import {
  saveState,
  loadState,
  STORAGE_KEY,
} from '../../js/storage/localStoragePersistence.js';
import { logger } from '../../js/lib/logger.js';

describe('localStoragePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
  });

  describe('STORAGE_KEY', () => {
    it('is the canonical key sheep.testystuff.state.v1', () => {
      expect(STORAGE_KEY).toBe('sheep.testystuff.state.v1');
    });
  });

  describe('saveState', () => {
    it('writes JSON.stringify(state) under STORAGE_KEY', () => {
      const state = {
        schemaVersion: '1.0.0',
        tracks: [{ id: 'kick-1', name: 'Kick' }],
        isPlaying: false,
      };

      saveState(state);

      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state));
    });

    it('overwrites an existing entry', () => {
      const first = { schemaVersion: '1.0.0', tracks: [{ id: 'a' }], isPlaying: false };
      const second = { schemaVersion: '1.0.0', tracks: [{ id: 'b' }], isPlaying: true };

      saveState(first);
      saveState(second);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(second);
    });

    it('does not call logger.error on a successful save', () => {
      saveState({ schemaVersion: '1.0.0', tracks: [], isPlaying: false });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('catches QuotaExceededError and routes it to logger.error', () => {
      const originalSetItem = Storage.prototype.setItem;
      const quotaError = new DOMException('quota exceeded', 'QuotaExceededError');
      const setItemSpy = vi.fn(() => {
        throw quotaError;
      });
      Storage.prototype.setItem = setItemSpy;

      try {
        expect(() =>
          saveState({ schemaVersion: '1.0.0', tracks: [], isPlaying: false }),
        ).not.toThrow();
        expect(logger.error).toHaveBeenCalledTimes(1);
      } finally {
        Storage.prototype.setItem = originalSetItem;
      }
    });
  });

  describe('loadState — missing key', () => {
    it('returns null when STORAGE_KEY is absent', () => {
      expect(loadState()).toBeNull();
    });

    it('does not call logger.warn when STORAGE_KEY is absent (normal first run)', () => {
      loadState();

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('loadState — happy path', () => {
    it('returns the parsed state when JSON is valid and schemaVersion matches', () => {
      const state = {
        schemaVersion: '1.0.0',
        tracks: [{ id: 't1', name: 'Kick', steps: [] }],
        isPlaying: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      expect(loadState()).toEqual(state);
    });

    it('does not call logger.warn or logger.error on a valid load', () => {
      const state = { schemaVersion: '1.0.0', tracks: [], isPlaying: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      loadState();

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('loadState — malformed JSON', () => {
    it('returns null on broken JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      expect(loadState()).toBeNull();
    });

    it('calls logger.warn when JSON cannot be parsed', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      loadState();

      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadState — schema mismatch', () => {
    it('returns null when schemaVersion does not equal 1.0.0', () => {
      const state = { schemaVersion: '0.9.0', tracks: [], isPlaying: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      expect(loadState()).toBeNull();
    });

    it('calls logger.warn on schemaVersion mismatch', () => {
      const state = { schemaVersion: '2.0.0', tracks: [], isPlaying: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      loadState();

      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('returns null when schemaVersion field is missing', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tracks: [], isPlaying: false }),
      );

      expect(loadState()).toBeNull();
    });

    it('calls logger.warn when schemaVersion field is missing', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tracks: [], isPlaying: false }),
      );

      loadState();

      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('round-trip', () => {
    it('saveState followed by loadState yields an equal state', () => {
      const state = {
        schemaVersion: '1.0.0',
        tracks: [
          {
            id: 'kick-1',
            name: 'Kick',
            voiceKind: 'kick',
            sampleDataUrl: null,
            volume: 0.8,
            tempoBpm: 120,
            steps: [
              { active: true, pitchSemitones: 0 },
              { active: false, pitchSemitones: 7 },
            ],
          },
        ],
        isPlaying: false,
      };

      saveState(state);

      expect(loadState()).toEqual(state);
    });
  });
});
