/**
 * CQRS Rules — unit test
 * Microstep 5.5.1
 *
 * Grafi mockati. Nessuna dipendenza dal filesystem.
 */

import { describe, it, expect } from 'vitest';
import {
  checkCqrsRules,
  isReadSidePath,
  isWriteSidePath,
  type ImportGraph,
} from '../cqrs.rules';

function graph(edges: Array<{ from: string; to: string }>): ImportGraph {
  return { edges };
}

describe('CQRS Rules', () => {
  describe('Path classification', () => {
    it('isReadSidePath riconosce path read-side', () => {
      expect(isReadSidePath('src/core/read-events/ThreadReadEvent.ts')).toBe(true);
      expect(isReadSidePath('src/core/projections/ThreadReadProjection.ts')).toBe(true);
      expect(isReadSidePath('src/read-platform/store/ReadStore.ts')).toBe(true);
      expect(isReadSidePath('src/core/queries/ThreadQueryRepository.ts')).toBe(true);
    });

    it('isReadSidePath nega path write-side', () => {
      expect(isReadSidePath('src/core/messages/Message.ts')).toBe(false);
      expect(isReadSidePath('src/core/threads/CreateThread.ts')).toBe(false);
      expect(isReadSidePath('src/persistence/messages/PrismaMessageRepository.ts')).toBe(false);
    });

    it('isWriteSidePath riconosce path write-side', () => {
      expect(isWriteSidePath('src/core/messages/Message.ts')).toBe(true);
      expect(isWriteSidePath('src/core/threads/Thread.ts')).toBe(true);
      expect(isWriteSidePath('src/core/domain/Thread.ts')).toBe(true);
      expect(isWriteSidePath('src/persistence/threads/PrismaThreadRepository.ts')).toBe(true);
    });

    it('isWriteSidePath nega path read-side', () => {
      expect(isWriteSidePath('src/core/read-events/ThreadReadEvent.ts')).toBe(false);
      expect(isWriteSidePath('src/read-platform/cache/ReadCache.ts')).toBe(false);
    });
  });

  describe('CQRS-001 — Read cannot import Write', () => {
    it('violazione quando read importa write', () => {
      const g = graph([
        { from: 'src/core/read-events/ThreadReadEvent.ts', to: 'src/core/threads/Thread.ts' },
      ]);
      const violations = checkCqrsRules(g);
      const cqrs001 = violations.filter((v) => v.ruleId === 'CQRS-001');
      expect(cqrs001).toHaveLength(1);
      expect(cqrs001[0].message).toContain('Read Side must not import Write Side');
      expect(cqrs001[0].from).toContain('read-events');
      expect(cqrs001[0].to).toContain('threads');
    });

    it('nessuna violazione quando read importa read', () => {
      const g = graph([
        {
          from: 'src/core/projections/ThreadReadProjection.ts',
          to: 'src/core/read-events/ThreadReadEvent.ts',
        },
      ]);
      const violations = checkCqrsRules(g);
      expect(violations.filter((v) => v.ruleId === 'CQRS-001')).toHaveLength(0);
    });
  });

  describe('CQRS-002 — Write cannot import Read', () => {
    it('violazione quando write importa read', () => {
      const g = graph([
        { from: 'src/core/threads/CreateThread.ts', to: 'src/core/projections/ThreadReadProjection.ts' },
      ]);
      const violations = checkCqrsRules(g);
      const cqrs002 = violations.filter((v) => v.ruleId === 'CQRS-002');
      expect(cqrs002).toHaveLength(1);
      expect(cqrs002[0].message).toContain('Write Side must not import Read Side');
    });

    it('nessuna violazione quando write importa write', () => {
      const g = graph([
        { from: 'src/core/messages/CreateMessage.ts', to: 'src/core/threads/Thread.ts' },
      ]);
      const violations = checkCqrsRules(g);
      expect(violations.filter((v) => v.ruleId === 'CQRS-002')).toHaveLength(0);
    });
  });

  describe('CQRS-003 — No cross infrastructure', () => {
    it('violazione quando write importa read infrastructure', () => {
      const g = graph([
        {
          from: 'src/core/threads/Thread.ts',
          to: 'src/read-platform/store/PrismaReadStore.ts',
        },
      ]);
      const violations = checkCqrsRules(g);
      const cqrs003 = violations.filter((v) => v.ruleId === 'CQRS-003');
      expect(cqrs003.length).toBeGreaterThanOrEqual(1);
      expect(cqrs003.some((v) => v.message.includes('Read infrastructure'))).toBe(true);
    });

    it('violazione quando read importa write infrastructure', () => {
      const g = graph([
        {
          from: 'src/core/read-events/ThreadReadEvent.ts',
          to: 'src/persistence/messages/PrismaMessageRepository.ts',
        },
      ]);
      const violations = checkCqrsRules(g);
      const cqrs003 = violations.filter((v) => v.ruleId === 'CQRS-003');
      expect(cqrs003.length).toBeGreaterThanOrEqual(1);
      expect(cqrs003.some((v) => v.message.includes('Write infrastructure'))).toBe(true);
    });
  });

  describe('Assenza falsi positivi', () => {
    it('grafo vuoto non produce violazioni', () => {
      const g = graph([]);
      expect(checkCqrsRules(g)).toHaveLength(0);
    });

    it('path non classificati (unknown) non generano violazioni CQRS read/write', () => {
      const g = graph([
        { from: 'src/other/foo.ts', to: 'src/other/bar.ts' },
      ]);
      const violations = checkCqrsRules(g);
      expect(violations.filter((v) => v.ruleId === 'CQRS-001' || v.ruleId === 'CQRS-002')).toHaveLength(0);
    });
  });
});
