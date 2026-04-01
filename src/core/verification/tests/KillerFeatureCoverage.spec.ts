/**
 * Killer Feature Cognitive Coverage — Conformance.
 * Report deterministico, nessun import vietato, tutte le feature nel report, nessuna executed/activated.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  generateKillerFeatureCoverageReport,
  KILLER_FEATURE_IDS,
} from '../killer-feature-coverage';

const NOW = 1704110400000;

describe('Killer Feature Coverage — Conformance', () => {
  describe('1. Report deterministico', () => {
    it('stesso now produce stesso report (deep equal)', () => {
      const a = generateKillerFeatureCoverageReport(NOW);
      const b = generateKillerFeatureCoverageReport(NOW);
      expect(a.generatedAt).toBe(NOW);
      expect(b.generatedAt).toBe(NOW);
      expect(a.signalCoverage).toEqual(b.signalCoverage);
      expect(a.stateCoverage).toEqual(b.stateCoverage);
      expect(a.safetyGuarantees).toEqual(b.safetyGuarantees);
    });
  });

  describe('2. Nessun import vietato', () => {
    it('verification non importa da execution, ux, ui, demo', () => {
      const root = join(process.cwd(), 'src', 'core', 'verification');
      const forbidden = ['execution', 'ux-contract', 'orchestration', 'demo', 'product/'];
      const scan = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory() && e.name !== 'tests') files.push(...scan(full));
          else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts'))
            files.push(full);
        }
        return files;
      };
      const files = scan(root);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        for (const line of lines) {
          for (const path of forbidden) {
            expect(
              line,
              `File ${file} must not import ${path}`
            ).not.toMatch(new RegExp(path.replace(/\//g, '\\/'), 'i'));
          }
        }
      }
    });
  });

  describe('3. Tutte le killer feature presenti nel report', () => {
    it('signalCoverage, stateCoverage, safetyGuarantees contengono tutte le feature', () => {
      const report = generateKillerFeatureCoverageReport(NOW);
      const signalFeatures = new Set(report.signalCoverage.map((s) => s.feature));
      const stateFeatures = new Set(report.stateCoverage.map((s) => s.feature));
      const safetyFeatures = new Set(report.safetyGuarantees.map((s) => s.feature));
      for (const id of KILLER_FEATURE_IDS) {
        expect(signalFeatures.has(id)).toBe(true);
        expect(stateFeatures.has(id)).toBe(true);
        expect(safetyFeatures.has(id)).toBe(true);
      }
    });
  });

  describe('4. Nessuna feature executed o activated', () => {
    it('tutte le safetyGuarantees hanno executionFree e decisionFree true', () => {
      const report = generateKillerFeatureCoverageReport(NOW);
      for (const g of report.safetyGuarantees) {
        expect(g.executionFree).toBe(true);
        expect(g.decisionFree).toBe(true);
        expect(g.uxFree).toBe(true);
      }
    });
  });
});
