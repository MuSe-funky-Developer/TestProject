import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');

describe('bootstrap — index.html', () => {
  it('exists at the repo root', () => {
    const exists = fs.existsSync(path.join(repoRoot, 'index.html'));
    expect(exists).toBe(true);
  });

  it('loads js/main.js as an ES module', () => {
    const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
    expect(html).toMatch(/<script\s+type="module"\s+src="js\/main\.js"><\/script>/);
  });
});

describe('bootstrap — js/main.js', () => {
  it('exports a bootstrap function', async () => {
    const mod = await import('../../js/main.js');
    expect(typeof mod.bootstrap).toBe('function');
  });

  it('bootstrap(document) returns a handle whose engine.context is an AudioContext', async () => {
    const mod = await import('../../js/main.js');
    document.body.innerHTML = '<main id="app"></main>';

    const handle = await mod.bootstrap(document);

    expect(handle).toBeDefined();
    expect(handle.engine).toBeDefined();
    expect(handle.engine.context).toBeInstanceOf(globalThis.AudioContext);
  });
});
