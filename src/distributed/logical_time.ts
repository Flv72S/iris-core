/**
 * 16F.6.A.FORMALIZATION — Formal logical time (ADR-002 deterministic ordering; causal extension in 16F.6.B).
 */
import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import { DistributedInputValidationError } from './errors';

export type LogicalTime = {
  counter: number;
  nodeId: string;
};

export function assertLogicalTimeValid(lt: LogicalTime): void {
  if (typeof lt.nodeId !== 'string' || lt.nodeId.length === 0) {
    throw new DistributedInputValidationError('logicalTime.nodeId must be a non-empty string');
  }
  if (typeof lt.counter !== 'number' || !Number.isFinite(lt.counter) || lt.counter < 0 || Math.floor(lt.counter) !== lt.counter) {
    throw new DistributedInputValidationError('logicalTime.counter must be a finite integer >= 0');
  }
}

/** Total order: counter ASC, then nodeId lexicographic (no raw string clock). */
export function compareLogicalTime(a: LogicalTime, b: LogicalTime): number {
  if (a.counter < b.counter) return -1;
  if (a.counter > b.counter) return 1;
  return a.nodeId.localeCompare(b.nodeId);
}

/** Canonical UTF-8-stable encoding for hashing and identity (sorted keys via stableStringify). */
export function serializeLogicalTime(logicalTime: LogicalTime): string {
  const canon = canonicalizeKeysDeep({ counter: logicalTime.counter, nodeId: logicalTime.nodeId }) as LogicalTime;
  return stableStringify(canon);
}

/** Local tick: `counter := prev.counter + 1`, `nodeId` unchanged. */
export function advanceLocalClock(prev: LogicalTime): LogicalTime {
  assertLogicalTimeValid(prev);
  return { nodeId: prev.nodeId, counter: prev.counter + 1 };
}

/**
 * On receive: `counter := max(local.counter, remote.counter) + 1`, `nodeId` stays the **local** identity.
 */
export function mergeClocks(local: LogicalTime, remote: LogicalTime): LogicalTime {
  assertLogicalTimeValid(local);
  assertLogicalTimeValid(remote);
  return { nodeId: local.nodeId, counter: Math.max(local.counter, remote.counter) + 1 };
}
