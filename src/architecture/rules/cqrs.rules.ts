/**
 * CQRS — Regole architetturali statiche
 * Microstep 5.5.1
 *
 * Invarianti strutturali CQRS. Nessun impatto runtime, nessuna lettura filesystem.
 */

import type { ImportGraph, Violation, ArchitectureRule } from './types';
import { normalizePath } from './types';

// —— Classificazione path (pattern per side) ——

const READ_SIDE_PREFIXES = [
  'src/core/read-events',
  'src/core/projections',
  'src/core/queries',
  'src/core/read-sla',
  'src/core/observability',
  'src/read-platform',
  'src/api/read-events',
];

const WRITE_SIDE_PREFIXES = [
  'src/core/messages',
  'src/core/threads',
  'src/core/domain',
  'src/api/core',
  'src/persistence',
  'src/api/http/routes',
  'src/runtime',
];

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  const n = normalizePath(path);
  return prefixes.some((prefix) => n.startsWith(prefix));
}

export function isReadSidePath(path: string): boolean {
  return matchesPrefix(path, READ_SIDE_PREFIXES);
}

export function isWriteSidePath(path: string): boolean {
  return matchesPrefix(path, WRITE_SIDE_PREFIXES);
}

// —— Regole CQRS ——

const RULE_READ_CANNOT_IMPORT_WRITE: ArchitectureRule = {
  id: 'CQRS-001',
  description: 'Read Side cannot import from Write Side',
  check(graph: ImportGraph): Violation[] {
    const violations: Violation[] = [];
    for (const edge of graph.edges) {
      const from = normalizePath(edge.from);
      const to = normalizePath(edge.to);
      if (isReadSidePath(from) && isWriteSidePath(to)) {
        violations.push({
          ruleId: RULE_READ_CANNOT_IMPORT_WRITE.id,
          message: `Read Side must not import Write Side: ${from} → ${to}`,
          from,
          to,
        });
      }
    }
    return violations;
  },
};

const RULE_WRITE_CANNOT_IMPORT_READ: ArchitectureRule = {
  id: 'CQRS-002',
  description: 'Write Side cannot import from Read Side',
  check(graph: ImportGraph): Violation[] {
    const violations: Violation[] = [];
    for (const edge of graph.edges) {
      const from = normalizePath(edge.from);
      const to = normalizePath(edge.to);
      if (isWriteSidePath(from) && isReadSidePath(to)) {
        violations.push({
          ruleId: RULE_WRITE_CANNOT_IMPORT_READ.id,
          message: `Write Side must not import Read Side: ${from} → ${to}`,
          from,
          to,
        });
      }
    }
    return violations;
  },
};

const RULE_NO_CROSS_INFRASTRUCTURE: ArchitectureRule = {
  id: 'CQRS-003',
  description: 'No module may import infrastructure of the opposite CQRS side',
  check(graph: ImportGraph): Violation[] {
    const violations: Violation[] = [];
    const readInfra = ['src/read-platform/store', 'src/read-platform/cache', 'src/core/queries'];
    const writeInfra = ['src/persistence', 'src/api/repositories'];
    const isReadInfra = (p: string) => readInfra.some((pre) => normalizePath(p).startsWith(pre));
    const isWriteInfra = (p: string) =>
      writeInfra.some((pre) => normalizePath(p).startsWith(pre));
    for (const edge of graph.edges) {
      const from = normalizePath(edge.from);
      const to = normalizePath(edge.to);
      if (isWriteSidePath(from) && isReadInfra(to)) {
        violations.push({
          ruleId: RULE_NO_CROSS_INFRASTRUCTURE.id,
          message: `Write Side must not import Read infrastructure: ${from} → ${to}`,
          from,
          to,
        });
      }
      if (isReadSidePath(from) && isWriteInfra(to)) {
        violations.push({
          ruleId: RULE_NO_CROSS_INFRASTRUCTURE.id,
          message: `Read Side must not import Write infrastructure: ${from} → ${to}`,
          from,
          to,
        });
      }
    }
    return violations;
  },
};

/** Tutte le regole CQRS. */
export const CQRS_RULES: readonly ArchitectureRule[] = [
  RULE_READ_CANNOT_IMPORT_WRITE,
  RULE_WRITE_CANNOT_IMPORT_READ,
  RULE_NO_CROSS_INFRASTRUCTURE,
];

/** Valuta tutte le regole CQRS sul grafo e restituisce le violazioni. */
export function checkCqrsRules(graph: ImportGraph): Violation[] {
  const result: Violation[] = [];
  for (const rule of CQRS_RULES) {
    result.push(...rule.check(graph));
  }
  return result;
}
