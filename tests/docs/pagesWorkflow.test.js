import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW_PATH = path.resolve(
  process.cwd(),
  '.github/workflows/pages.yml',
);

const readWorkflow = () => fs.readFileSync(WORKFLOW_PATH, 'utf8');

describe('.github/workflows/pages.yml — GitHub-Pages-Deployment', () => {
  let content = '';

  beforeAll(() => {
    expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
    content = readWorkflow();
  });

  describe('Workflow-Trigger (push auf main)', () => {
    it('triggert auf Push-Events', () => {
      expect(content).toMatch(/^on:[\s\S]*?push:/m);
    });

    it('beschränkt den Push-Trigger auf den main-Branch', () => {
      expect(content).toMatch(/branches:\s*\[\s*main\s*\]|branches:\s*\n\s*-\s*main/);
    });
  });

  describe('Permissions für GitHub Pages OIDC-Deployment', () => {
    it('gewährt contents: read', () => {
      expect(content).toMatch(/contents:\s*read/);
    });

    it('gewährt pages: write', () => {
      expect(content).toMatch(/pages:\s*write/);
    });

    it('gewährt id-token: write (für OIDC)', () => {
      expect(content).toMatch(/id-token:\s*write/);
    });
  });

  describe('Job — Deploy', () => {
    it('läuft auf ubuntu-latest', () => {
      expect(content).toMatch(/runs-on:\s*ubuntu-latest/);
    });

    it('verwendet die github-pages-Environment', () => {
      expect(content).toMatch(/name:\s*github-pages/);
    });

    it('exposed die deployed Page-URL via Step-Output page_url', () => {
      expect(content).toMatch(/page_url/);
    });
  });

  describe('Schritte des Deployment-Jobs', () => {
    it('checkt das Repository per actions/checkout aus', () => {
      expect(content).toMatch(/uses:\s*actions\/checkout@v\d+/);
    });

    it('nutzt actions/configure-pages für die Pages-Setup', () => {
      expect(content).toMatch(/uses:\s*actions\/configure-pages@v\d+/);
    });

    it('lädt das Repository-Root als Pages-Artefakt hoch (path: .)', () => {
      expect(content).toMatch(/uses:\s*actions\/upload-pages-artifact@v\d+/);
      expect(content).toMatch(
        /upload-pages-artifact@v\d+[\s\S]*?with:\s*\{?\s*path:\s*['"]?\.['"]?/,
      );
    });

    it('führt das Deployment via actions/deploy-pages aus und vergibt eine Step-ID', () => {
      expect(content).toMatch(/uses:\s*actions\/deploy-pages@v\d+/);
      expect(content).toMatch(/id:\s*deployment[\s\S]*?uses:\s*actions\/deploy-pages@v\d+/);
    });
  });
});
