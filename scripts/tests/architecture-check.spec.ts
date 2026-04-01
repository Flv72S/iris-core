/**
 * Architecture Check Script — unit test
 * Microstep 5.5.2
 *
 * Nessuna dipendenza dal filesystem reale. Grafi e file mockati.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildImportGraph,
  runArchitectureCheck,
  printReport,
} from '../architecture-check';
import type { ImportGraph } from '../../src/architecture/rules/types';

// Script pulls in TypeScript compiler; transform/collect can take 20s+
describe('architecture-check', { timeout: 60000 }, () => {
  describe('buildImportGraph (mock filesystem)', () => {
    it('costruisce grafo vuoto se nessun file', () => {
      const graph = buildImportGraph({
        rootDir: '/fake',
        srcDir: 'src',
        listFiles: () => [],
        readFile: () => '',
      });
      expect(graph.edges).toHaveLength(0);
    });

    it('costruisce archi da import statici relativi', () => {
      const graph = buildImportGraph({
        rootDir: '/fake',
        srcDir: 'src',
        listFiles: () => [
          'src/core/read-events/a.ts',
          'src/core/read-events/b.ts',
        ],
        readFile: (filePath: string) => {
          if (filePath.includes('a.ts')) return "import { x } from './b';";
          if (filePath.includes('b.ts')) return 'export const x = 1;';
          return '';
        },
      });
      expect(graph.edges.length).toBeGreaterThanOrEqual(1);
      const edge = graph.edges.find(
        (e) => e.from.includes('a.ts') && e.to.includes('b.ts')
      );
      expect(edge).toBeDefined();
    });

    it('ignora import da pacchetti esterni (non relativi)', () => {
      const graph = buildImportGraph({
        rootDir: '/fake',
        srcDir: 'src',
        listFiles: () => ['src/core/read-events/a.ts'],
        readFile: () => "import * as ts from 'typescript';",
      });
      expect(graph.edges).toHaveLength(0);
    });
  });

  describe('runArchitectureCheck', () => {
    it('progetto valido (grafo senza violazioni) → exitCode 0', () => {
      const graph: ImportGraph = {
        edges: [
          {
            from: 'src/core/projections/ThreadReadProjection.ts',
            to: 'src/core/read-events/ThreadReadEvent.ts',
          },
        ],
      };
      const result = runArchitectureCheck(graph);
      expect(result.violations).toHaveLength(0);
      expect(result.exitCode).toBe(0);
    });

    it('progetto con violazione CQRS (read → write) → exitCode 1', () => {
      const graph: ImportGraph = {
        edges: [
          {
            from: 'src/core/read-events/ThreadReadEvent.ts',
            to: 'src/core/threads/Thread.ts',
          },
        ],
      };
      const result = runArchitectureCheck(graph);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
      expect(result.violations.some((v) => v.ruleId === 'CQRS-001')).toBe(true);
      expect(result.exitCode).toBe(1);
    });

    it('progetto con violazione layering (Domain → Application) → exitCode 1', () => {
      const graph: ImportGraph = {
        edges: [
          {
            from: 'src/core/domain/Thread.ts',
            to: 'src/core/threads/CreateThread.ts',
          },
        ],
      };
      const result = runArchitectureCheck(graph);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
      expect(result.violations.some((v) => v.ruleId === 'LAYER-001')).toBe(true);
      expect(result.exitCode).toBe(1);
    });

    it('violazioni ordinate per ruleId, from, to', () => {
      const graph: ImportGraph = {
        edges: [
          { from: 'src/core/domain/a.ts', to: 'src/core/threads/b.ts' },
          { from: 'src/core/read-events/c.ts', to: 'src/core/messages/d.ts' },
        ],
      };
      const result = runArchitectureCheck(graph);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
      const ids = result.violations.map((v) => v.ruleId);
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    });
  });

  describe('printReport', () => {
    it('nessuna violazione → stampa messaggio di successo', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      printReport([]);
      expect(log).toHaveBeenCalledWith('✅ Architecture check passed (0 violations)');
      log.mockRestore();
      errorSpy.mockRestore();
    });

    it('con violazioni → stampa ruleId, message, from, to', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      printReport([
        {
          ruleId: 'CQRS-001',
          message: 'Read Side must not import Write Side',
          from: 'src/read-platform/x.ts',
          to: 'src/core/threads/y.ts',
        },
      ]);
      const calls = errorSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('CQRS-001');
      expect(calls).toContain('Read Side');
      expect(calls).toContain('src/read-platform/x.ts');
      expect(calls).toContain('src/core/threads/y.ts');
      errorSpy.mockRestore();
    });
  });
});
