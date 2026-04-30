import { SCHEMA_VERSION } from '../sequencer/sequencerState.js';

export const STORAGE_KEY = 'sheep.testystuff.state.v1';

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable or full; in that case persistence is
    // skipped silently — the in-memory state continues to drive the UI.
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
