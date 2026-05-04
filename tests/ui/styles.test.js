import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CSS_PATH = path.resolve(process.cwd(), 'css/styles.css');

describe('css/styles.css base layout', () => {
  let css;

  beforeAll(() => {
    css = fs.readFileSync(CSS_PATH, 'utf8');
  });

  it('css/styles.css existiert und ist lesbar', () => {
    expect(fs.existsSync(CSS_PATH)).toBe(true);
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
  });

  it('enthält den .transport Selektor', () => {
    expect(css).toMatch(/\.transport\b/);
  });

  it('enthält den #track-list Selektor', () => {
    expect(css).toMatch(/#track-list\b/);
  });

  it('enthält den .step Selektor (als eigene Regel, nicht nur als Teil eines compound Selektors)', () => {
    // Look for `.step` followed by something that ends a selector
    // (whitespace+{, comma, or end-of-selector chars), but NOT immediately
    // followed by another `.` (which would be a compound like `.step.is-active`)
    expect(css).toMatch(/\.step(?!\.|-)[\s,{:]/);
  });

  it('enthält den .step.is-active compound Selektor für den aktiven Zustand', () => {
    expect(css).toMatch(/\.step\.is-active\b/);
  });

  it('enthält den .volume Selektor', () => {
    expect(css).toMatch(/\.volume\b/);
  });

  it('enthält den .tempo Selektor', () => {
    expect(css).toMatch(/\.tempo\b/);
  });

  it('enthält den .sample Selektor', () => {
    // Match `.sample` not followed by another word char so we don't
    // confuse `.sample-something` with `.sample`.
    expect(css).toMatch(/\.sample(?![\w-])/);
  });

  it('enthält den .clear-sample Selektor', () => {
    expect(css).toMatch(/\.clear-sample\b/);
  });
});
