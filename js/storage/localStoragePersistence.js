import { logger } from '../lib/logger.js';

export const STORAGE_KEY = 'sheep.testystuff.state.v1';
const SCHEMA_VERSION = '1.0.0';

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    logger.error('storage:save-failed', {
      key: STORAGE_KEY,
      error: String(err),
    });
  }
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.warn('storage:load-malformed-json', {
      key: STORAGE_KEY,
      error: String(err),
    });
    return null;
  }

  if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
    logger.warn('storage:schema-mismatch', {
      key: STORAGE_KEY,
      expected: SCHEMA_VERSION,
      found: parsed && parsed.schemaVersion,
    });
    return null;
  }

  return parsed;
}
