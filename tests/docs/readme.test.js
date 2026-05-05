import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const README_PATH = path.resolve(process.cwd(), 'README.md');

const readReadme = () => fs.readFileSync(README_PATH, 'utf8');

const sectionRegex = (heading) =>
  new RegExp(`^#{1,6}\\s+.*${heading}.*$`, 'mi');

describe('README.md — finales Projekt-README', () => {
  let content = '';

  beforeAll(() => {
    expect(fs.existsSync(README_PATH)).toBe(true);
    content = readReadme();
  });

  describe('Pflichtsektionen (AC: README enthält Sektionen Local serve, Tests, Browser-Anforderungen, State Schema Versions)', () => {
    it('hat eine "Local serve"-Sektion als Markdown-Heading', () => {
      expect(content).toMatch(sectionRegex('Local serve'));
    });

    it('hat eine "Tests"-Sektion als Markdown-Heading', () => {
      expect(content).toMatch(sectionRegex('Tests'));
    });

    it('hat eine "Browser-Anforderungen"-Sektion als Markdown-Heading', () => {
      expect(content).toMatch(sectionRegex('Browser-Anforderungen'));
    });

    it('hat eine "State Schema Versions"-Sektion als Markdown-Heading', () => {
      expect(content).toMatch(sectionRegex('State Schema Versions'));
    });
  });

  describe('Local serve — beschreibt npm run serve', () => {
    it('erwähnt den Befehl "npm run serve"', () => {
      expect(content).toMatch(/npm\s+run\s+serve/);
    });

    it('nennt den lokalen URL-Endpoint http://localhost:8080', () => {
      expect(content).toMatch(/http:\/\/localhost:8080/);
    });
  });

  describe('Tests — beschreibt npm test', () => {
    it('erwähnt den Befehl "npm test"', () => {
      expect(content).toMatch(/\bnpm\s+test\b/);
    });
  });

  describe('Browser-Anforderungen — listet Mindestversionen', () => {
    it('nennt Chrome mit Mindestversion ≥ 90', () => {
      expect(content).toMatch(/Chrome[^\n]*\b90\b/i);
    });

    it('nennt Firefox mit Mindestversion ≥ 88', () => {
      expect(content).toMatch(/Firefox[^\n]*\b88\b/i);
    });

    it('nennt Safari mit Mindestversion ≥ 14', () => {
      expect(content).toMatch(/Safari[^\n]*\b14\b/i);
    });

    it('verweist auf Web Audio API als Kernanforderung', () => {
      expect(content).toMatch(/Web\s*Audio\s*API/i);
    });

    it('verweist auf ES Modules als Kernanforderung', () => {
      expect(content).toMatch(/ES\s*Modules?/i);
    });
  });

  describe('State Schema Versions — Changelog enthält initiale Version', () => {
    it('führt Schema-Version 1.0.0 auf', () => {
      expect(content).toMatch(/\b1\.0\.0\b/);
    });

    it('beschreibt die initiale Version mit "initial"', () => {
      const schemaSectionMatch = content.match(
        /^#{1,6}\s+.*State Schema Versions.*$([\s\S]*?)(?=^#{1,6}\s+|\Z)/im,
      );
      expect(schemaSectionMatch).not.toBeNull();
      const sectionBody = schemaSectionMatch?.[1] ?? '';
      expect(sectionBody).toMatch(/1\.0\.0[^\n]*initial/i);
    });
  });
});
