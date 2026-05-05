import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderGrid } from '../../js/ui/gridRenderer.js';

const buildStep = (active = false, pitchSemitones = 0) => ({ active, pitchSemitones });

const buildTrack = (overrides = {}) => ({
  id: overrides.id ?? 't-x',
  name: 'Kick',
  voiceKind: 'kick',
  sampleDataUrl: null,
  volume: 0.8,
  tempoBpm: 120,
  steps: Array.from({ length: 16 }, () => buildStep()),
  ...overrides,
});

const buildState = (tracks) => ({
  schemaVersion: '1.0.0',
  isPlaying: false,
  tracks,
});

const noopCallbacks = () => ({ onStepClick: vi.fn(), onPitchChange: vi.fn() });

describe('renderGrid', () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = '<section id="track-list"></section>';
    root = document.getElementById('track-list');
  });

  describe('AC1: rendert pro Track 16 Step-Buttons mit data-Attributen', () => {
    it('rendert genau 16 Step-Buttons pro Spur', () => {
      const state = buildState([
        buildTrack({ id: 'kick', name: 'Kick' }),
        buildTrack({ id: 'snare', name: 'Snare', voiceKind: 'snare' }),
      ]);

      renderGrid(root, state, noopCallbacks());

      expect(root.querySelectorAll('[data-track-id="kick"].step')).toHaveLength(16);
      expect(root.querySelectorAll('[data-track-id="snare"].step')).toHaveLength(16);
    });

    it('Step-Buttons tragen data-step-index 0..15 in Reihenfolge', () => {
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, noopCallbacks());

      const buttons = root.querySelectorAll('[data-track-id="kick"].step');
      const indices = Array.from(buttons).map((b) => b.dataset.stepIndex);
      expect(indices).toEqual(Array.from({ length: 16 }, (_, i) => String(i)));
    });

    it('Step-Elemente sind <button>-Tags', () => {
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, noopCallbacks());

      const buttons = root.querySelectorAll('[data-track-id="kick"].step');
      expect(buttons.length).toBe(16);
      buttons.forEach((b) => expect(b.tagName).toBe('BUTTON'));
    });

    it('rendert für jeden Track im State eine eigene Zeile', () => {
      const state = buildState([
        buildTrack({ id: 'kick', name: 'Kick' }),
        buildTrack({ id: 'snare', name: 'Snare' }),
        buildTrack({ id: 'hihat', name: 'HiHat' }),
        buildTrack({ id: 'bass', name: 'Bass' }),
      ]);

      renderGrid(root, state, noopCallbacks());

      ['kick', 'snare', 'hihat', 'bass'].forEach((id) => {
        expect(root.querySelectorAll(`[data-track-id="${id}"].step`)).toHaveLength(16);
      });
      expect(root.querySelectorAll('.step')).toHaveLength(64);
    });
  });

  describe('AC2: aktive Steps tragen die Klasse is-active', () => {
    it('Step mit active=true erhält is-active', () => {
      const steps = Array.from({ length: 16 }, (_, i) => buildStep(i === 3));
      const state = buildState([buildTrack({ id: 'kick', steps })]);

      renderGrid(root, state, noopCallbacks());

      const buttons = root.querySelectorAll('[data-track-id="kick"].step');
      expect(buttons[3].classList.contains('is-active')).toBe(true);
      expect(buttons[0].classList.contains('is-active')).toBe(false);
      expect(buttons[15].classList.contains('is-active')).toBe(false);
    });

    it('Re-Render mit geändertem aktiven Status aktualisiert is-active', () => {
      const stepsOff = Array.from({ length: 16 }, () => buildStep(false));
      const state1 = buildState([buildTrack({ id: 'kick', steps: stepsOff })]);
      renderGrid(root, state1, noopCallbacks());
      expect(root.querySelectorAll('[data-track-id="kick"].step.is-active')).toHaveLength(0);

      const stepsOn = stepsOff.map((s, i) => (i === 5 ? buildStep(true) : s));
      const state2 = buildState([buildTrack({ id: 'kick', steps: stepsOn })]);
      renderGrid(root, state2, noopCallbacks());

      const active = root.querySelectorAll('[data-track-id="kick"].step.is-active');
      expect(active).toHaveLength(1);
      expect(active[0].dataset.stepIndex).toBe('5');
    });

    it('Re-Render von active=true → false entfernt is-active', () => {
      const stepsOn = Array.from({ length: 16 }, (_, i) => buildStep(i === 2));
      renderGrid(root, buildState([buildTrack({ id: 'kick', steps: stepsOn })]), noopCallbacks());
      expect(root.querySelectorAll('[data-track-id="kick"].step.is-active')).toHaveLength(1);

      const stepsOff = Array.from({ length: 16 }, () => buildStep(false));
      renderGrid(root, buildState([buildTrack({ id: 'kick', steps: stepsOff })]), noopCallbacks());

      expect(root.querySelectorAll('[data-track-id="kick"].step.is-active')).toHaveLength(0);
    });
  });

  describe('AC3: Click auf Step-Button ruft onStepClick(trackId, stepIndex)', () => {
    it('Click ruft Callback mit korrekter trackId und stepIndex', () => {
      const onStepClick = vi.fn();
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, { onStepClick, onPitchChange: vi.fn() });

      const button = root.querySelector('[data-track-id="kick"][data-step-index="7"]');
      expect(button).toBeTruthy();
      button.click();

      expect(onStepClick).toHaveBeenCalledTimes(1);
      expect(onStepClick).toHaveBeenCalledWith('kick', 7);
    });

    it('Click auf Step der zweiten Spur übergibt deren trackId', () => {
      const onStepClick = vi.fn();
      const state = buildState([
        buildTrack({ id: 'kick' }),
        buildTrack({ id: 'snare', voiceKind: 'snare' }),
      ]);

      renderGrid(root, state, { onStepClick, onPitchChange: vi.fn() });

      const button = root.querySelector('[data-track-id="snare"][data-step-index="2"]');
      button.click();

      expect(onStepClick).toHaveBeenCalledTimes(1);
      expect(onStepClick).toHaveBeenCalledWith('snare', 2);
    });

    it('stepIndex wird als Number übergeben, nicht als String', () => {
      const onStepClick = vi.fn();
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, { onStepClick, onPitchChange: vi.fn() });

      root.querySelector('[data-track-id="kick"][data-step-index="0"]').click();

      const [, stepIndex] = onStepClick.mock.calls[0];
      expect(typeof stepIndex).toBe('number');
      expect(stepIndex).toBe(0);
    });
  });

  describe('AC4: pitch-input ruft onPitchChange(trackId, stepIndex, value)', () => {
    it('pro Step existiert genau ein <input type="number" class="pitch"> mit data-Attributen', () => {
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, noopCallbacks());

      const inputs = root.querySelectorAll('input.pitch[data-track-id="kick"]');
      expect(inputs).toHaveLength(16);
      inputs.forEach((inp) => expect(inp.getAttribute('type')).toBe('number'));
      const indices = Array.from(inputs).map((i) => i.dataset.stepIndex);
      expect(new Set(indices).size).toBe(16);
    });

    it('change-Event auf pitch-input ruft onPitchChange(trackId, stepIndex, value)', () => {
      const onPitchChange = vi.fn();
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, { onStepClick: vi.fn(), onPitchChange });

      const input = root.querySelector(
        'input.pitch[data-track-id="kick"][data-step-index="4"]',
      );
      expect(input).toBeTruthy();
      input.value = '7';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onPitchChange).toHaveBeenCalledTimes(1);
      expect(onPitchChange).toHaveBeenCalledWith('kick', 4, 7);
    });

    it('value wird als Number übergeben (nicht als String)', () => {
      const onPitchChange = vi.fn();
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, { onStepClick: vi.fn(), onPitchChange });

      const input = root.querySelector(
        'input.pitch[data-track-id="kick"][data-step-index="0"]',
      );
      input.value = '-12';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const [, , value] = onPitchChange.mock.calls[0];
      expect(typeof value).toBe('number');
      expect(value).toBe(-12);
    });

    it('change auf Pitch-Input einer zweiten Spur übergibt deren trackId', () => {
      const onPitchChange = vi.fn();
      const state = buildState([
        buildTrack({ id: 'kick' }),
        buildTrack({ id: 'snare', voiceKind: 'snare' }),
      ]);

      renderGrid(root, state, { onStepClick: vi.fn(), onPitchChange });

      const input = root.querySelector(
        'input.pitch[data-track-id="snare"][data-step-index="9"]',
      );
      input.value = '3';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onPitchChange).toHaveBeenCalledWith('snare', 9, 3);
    });
  });

  describe('AC5: renderGrid ist idempotent', () => {
    it('zweimaliger Aufruf mit gleichem State erzeugt keine doppelten Step-Buttons', () => {
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, noopCallbacks());
      renderGrid(root, state, noopCallbacks());

      expect(root.querySelectorAll('[data-track-id="kick"].step')).toHaveLength(16);
      expect(root.querySelectorAll('input.pitch[data-track-id="kick"]')).toHaveLength(16);
    });

    it('Idempotenz auch bei mehreren Tracks', () => {
      const state = buildState([
        buildTrack({ id: 'kick' }),
        buildTrack({ id: 'snare' }),
        buildTrack({ id: 'hihat' }),
        buildTrack({ id: 'bass' }),
      ]);

      renderGrid(root, state, noopCallbacks());
      renderGrid(root, state, noopCallbacks());

      expect(root.querySelectorAll('.step')).toHaveLength(64);
      ['kick', 'snare', 'hihat', 'bass'].forEach((id) => {
        expect(root.querySelectorAll(`[data-track-id="${id}"].step`)).toHaveLength(16);
      });
    });

    it('Re-Render mit weniger Tracks entfernt das Markup entfallender Tracks', () => {
      const state1 = buildState([
        buildTrack({ id: 'kick' }),
        buildTrack({ id: 'snare' }),
      ]);
      renderGrid(root, state1, noopCallbacks());
      expect(root.querySelectorAll('[data-track-id="snare"].step')).toHaveLength(16);

      const state2 = buildState([buildTrack({ id: 'kick' })]);
      renderGrid(root, state2, noopCallbacks());

      expect(root.querySelectorAll('[data-track-id="snare"].step')).toHaveLength(0);
      expect(root.querySelectorAll('[data-track-id="kick"].step')).toHaveLength(16);
    });

    it('Re-Render verdoppelt nicht die Click-Handler-Aufrufe', () => {
      const onStepClick = vi.fn();
      const state = buildState([buildTrack({ id: 'kick' })]);

      renderGrid(root, state, { onStepClick, onPitchChange: vi.fn() });
      renderGrid(root, state, { onStepClick, onPitchChange: vi.fn() });

      root.querySelector('[data-track-id="kick"][data-step-index="0"]').click();

      expect(onStepClick).toHaveBeenCalledTimes(1);
    });
  });
});
