/**
 * Layering Rules — unit test
 * Microstep 5.5.1
 *
 * Grafi mockati. Nessuna dipendenza dal filesystem.
 */

import { describe, it, expect } from 'vitest';
import {
  checkLayeringRules,
  pathToLayer,
  getAllowedDependencies,
  canDependOn,
  type ImportGraph,
  type Layer,
} from '../layering.rules';

function graph(edges: Array<{ from: string; to: string }>): ImportGraph {
  return { edges };
}

describe('Layering Rules', () => {
  describe('pathToLayer', () => {
    it('mappa Domain', () => {
      expect(pathToLayer('src/core/domain/Thread.ts')).toBe('Domain');
    });

    it('mappa Application', () => {
      expect(pathToLayer('src/core/messages/Message.ts')).toBe('Application');
      expect(pathToLayer('src/core/threads/CreateThread.ts')).toBe('Application');
      expect(pathToLayer('src/api/core/threadState.ts')).toBe('Application');
    });

    it('mappa ReadPlatform', () => {
      expect(pathToLayer('src/read-platform/store/ReadStore.ts')).toBe('ReadPlatform');
      expect(pathToLayer('src/core/read-events/ThreadReadEvent.ts')).toBe('ReadPlatform');
      expect(pathToLayer('src/core/projections/ThreadReadProjection.ts')).toBe('ReadPlatform');
    });

    it('mappa SemanticLayer (Phase 8)', () => {
      expect(pathToLayer('src/semantic-layer/contracts/overlay.ts')).toBe('SemanticLayer');
      expect(pathToLayer('src/semantic-layer/index.ts')).toBe('SemanticLayer');
    });

    it('mappa PluginRuntime', () => {
      expect(pathToLayer('src/core/plugins/PluginRuntime.ts')).toBe('PluginRuntime');
      expect(pathToLayer('src/platform/features/FeatureToggleService.ts')).toBe('PluginRuntime');
    });

    it('mappa Infrastructure', () => {
      expect(pathToLayer('src/persistence/threads/PrismaThreadRepository.ts')).toBe('Infrastructure');
      expect(pathToLayer('src/api/http/routes/threads.get.ts')).toBe('Infrastructure');
      expect(pathToLayer('src/runtime/config/schema.ts')).toBe('Infrastructure');
    });

    it('path sconosciuto → Unknown', () => {
      expect(pathToLayer('src/other/foo.ts')).toBe('Unknown');
    });
  });

  describe('getAllowedDependencies / canDependOn', () => {
    it('Domain non può dipendere da altri layer', () => {
      expect(getAllowedDependencies('Domain')).toEqual(['Domain']);
      expect(canDependOn('Domain', 'Application')).toBe(false);
      expect(canDependOn('Domain', 'Domain')).toBe(true);
    });

    it('Application può dipendere solo da Domain', () => {
      expect(getAllowedDependencies('Application')).toContain('Domain');
      expect(getAllowedDependencies('Application')).toContain('Application');
      expect(canDependOn('Application', 'Infrastructure')).toBe(false);
    });

    it('Infrastructure può dipendere da Domain, Application e SemanticLayer', () => {
      expect(canDependOn('Infrastructure', 'Domain')).toBe(true);
      expect(canDependOn('Infrastructure', 'Application')).toBe(true);
      expect(canDependOn('Infrastructure', 'SemanticLayer')).toBe(true);
      expect(canDependOn('Infrastructure', 'ReadPlatform')).toBe(false);
    });

    it('SemanticLayer può dipendere solo da Domain, Application, ReadPlatform (8.1.0 read-only)', () => {
      expect(getAllowedDependencies('SemanticLayer')).toEqual(['Domain', 'Application', 'ReadPlatform', 'SemanticLayer']);
      expect(canDependOn('SemanticLayer', 'ReadPlatform')).toBe(true);
      expect(canDependOn('SemanticLayer', 'Infrastructure')).toBe(false);
      expect(canDependOn('SemanticLayer', 'PluginRuntime')).toBe(false);
    });

    it('ReadPlatform NON può dipendere da SemanticLayer (no Phase 7 → Phase 8)', () => {
      expect(canDependOn('ReadPlatform', 'SemanticLayer')).toBe(false);
    });
  });

  describe('LAYER-001 — Violazioni di layering', () => {
    it('violazione quando Domain importa Application', () => {
      const g = graph([
        { from: 'src/core/domain/Thread.ts', to: 'src/core/threads/CreateThread.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe('LAYER-001');
      expect(violations[0].message).toContain('Domain');
      expect(violations[0].message).toContain('Application');
    });

    it('violazione quando Application importa Infrastructure', () => {
      const g = graph([
        { from: 'src/core/messages/CreateMessage.ts', to: 'src/persistence/messages/PrismaMessageRepository.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('cannot depend');
    });

    it('violazione quando PluginRuntime importa ReadPlatform', () => {
      const g = graph([
        { from: 'src/core/plugins/PluginRuntime.ts', to: 'src/read-platform/store/ReadStore.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('PluginRuntime');
      expect(violations[0].message).toContain('ReadPlatform');
    });

    it('nessuna violazione quando Application importa Domain', () => {
      const g = graph([
        { from: 'src/core/threads/CreateThread.ts', to: 'src/core/domain/Thread.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });

    it('nessuna violazione quando ReadPlatform importa Application', () => {
      const g = graph([
        { from: 'src/core/projections/ThreadReadProjection.ts', to: 'src/core/threads/Thread.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });

    it('nessuna violazione quando Infrastructure importa Application', () => {
      const g = graph([
        { from: 'src/persistence/threads/PrismaThreadRepository.ts', to: 'src/core/threads/ThreadRepository.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });

    it('violazione quando ReadPlatform importa SemanticLayer (8.1.0: no Phase 7 → Phase 8)', () => {
      const g = graph([
        { from: 'src/read-platform/store/ReadStore.ts', to: 'src/semantic-layer/contracts/overlay.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('ReadPlatform');
      expect(violations[0].message).toContain('SemanticLayer');
    });

    it('nessuna violazione quando SemanticLayer importa ReadPlatform', () => {
      const g = graph([
        { from: 'src/semantic-layer/contracts/overlay.ts', to: 'src/core/queries/read-models/ThreadReadModel.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });

    it('nessuna violazione quando Infrastructure importa SemanticLayer', () => {
      const g = graph([
        { from: 'src/api/http/server.ts', to: 'src/semantic-layer/index.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });
  });

  describe('Assenza falsi positivi', () => {
    it('grafo vuoto non produce violazioni', () => {
      expect(checkLayeringRules(graph([]))).toHaveLength(0);
    });

    it('stesso layer può importare sé stesso', () => {
      const g = graph([
        { from: 'src/core/domain/Thread.ts', to: 'src/core/domain/Entity.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });

    it('path Unknown può importare da chiunque (nessuna violazione LAYER)', () => {
      const g = graph([
        { from: 'src/other/foo.ts', to: 'src/core/domain/Thread.ts' },
      ]);
      const violations = checkLayeringRules(g);
      expect(violations).toHaveLength(0);
    });
  });
});
