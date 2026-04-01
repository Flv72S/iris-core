/**
 * Phase 14C — State Diff Engine. Diff validation.
 */

import type { StateDiff } from './state_diff_types.js';
import { StateDiffError, StateDiffErrorCode } from './state_diff_errors.js';

function hasDuplicates(added: Readonly<Record<string, unknown>>, updated: Readonly<Record<string, unknown>>, removed: readonly string[]): boolean {
  const addedSet = new Set(Object.keys(added ?? {}));
  const updatedSet = new Set(Object.keys(updated ?? {}));
  const removedSet = new Set(removed ?? []);
  for (const k of addedSet) if (updatedSet.has(k) || removedSet.has(k)) return true;
  for (const k of updatedSet) if (removedSet.has(k)) return true;
  return false;
}

function validateOperation(op: { added?: unknown; updated?: unknown; removed?: unknown }, domain: string): void {
  if (op.added != null && typeof op.added !== 'object') {
    throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, `${domain}: added must be object`);
  }
  if (op.updated != null && typeof op.updated !== 'object') {
    throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, `${domain}: updated must be object`);
  }
  if (op.removed != null && !Array.isArray(op.removed)) {
    throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, `${domain}: removed must be array`);
  }
}

export class StateDiffValidator {
  /**
   * Validate diff. Throws StateDiffError if invalid.
   */
  static validate(diff: StateDiff): boolean {
    if (diff == null || typeof diff !== 'object') {
      throw new StateDiffError(StateDiffErrorCode.INVALID_DIFF, 'Diff is null or not an object');
    }
    const meta = diff.metadata;
    if (meta == null || typeof meta.base_version !== 'number' || typeof meta.target_version !== 'number') {
      throw new StateDiffError(StateDiffErrorCode.INVALID_DIFF, 'Invalid metadata');
    }
    if (meta.base_version >= meta.target_version) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_VERSION_ORDER, 'base_version must be less than target_version');
    }
    if (typeof meta.author_node !== 'string' || meta.author_node.length === 0) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_DIFF, 'Invalid author_node');
    }

    validateOperation(diff.nodes, 'nodes');
    validateOperation(diff.trust, 'trust');
    validateOperation(diff.governance, 'governance');
    validateOperation(diff.topology, 'topology');
    validateOperation(diff.policies, 'policies');

    if (hasDuplicates(diff.nodes.added, diff.nodes.updated, diff.nodes.removed)) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, 'nodes: duplicate key in added/updated/removed');
    }
    if (hasDuplicates(diff.trust.added, diff.trust.updated, diff.trust.removed)) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, 'trust: duplicate key in added/updated/removed');
    }
    if (hasDuplicates(diff.governance.added, diff.governance.updated, diff.governance.removed)) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, 'governance: duplicate key in added/updated/removed');
    }
    if (hasDuplicates(diff.topology.added, diff.topology.updated, diff.topology.removed)) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, 'topology: duplicate key in added/updated/removed');
    }
    if (hasDuplicates(diff.policies.added, diff.policies.updated, diff.policies.removed)) {
      throw new StateDiffError(StateDiffErrorCode.INVALID_OPERATION, 'policies: duplicate key in added/updated/removed');
    }

    return true;
  }
}
