/**
 * 16F.6.A.FORMALIZATION — Global Deterministic Input (formal logical time, ADR-002/ADR-003 alignment).
 */
import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import { computeDescendants } from './causal_graph';
import { compareEventsCausally } from './event_ordering';
import { canonicalizeDistributedEvent } from './event_serialization';
import { assertGlobalInputValid } from './event_validation';
import { compareLogicalTime, type LogicalTime } from './logical_time';
import type { DistributedMergePolicy } from './merge_policy';

export type { LogicalTime } from './logical_time';
export type { DistributedMergePolicy, LegacyMergePolicy, MergePolicy } from './merge_policy';
export {
  advanceLocalClock,
  assertLogicalTimeValid,
  compareLogicalTime,
  mergeClocks,
  serializeLogicalTime,
} from './logical_time';

export interface NodeConfigInput {
  nodeId: string;
  /** Deterministic hash of node configuration (opaque, caller-defined). */
  configHash: string;
}

export interface AdminInput {
  type: string;
  payload: unknown;
  logicalTime: LogicalTime;
}

export interface DistributedEvent {
  eventId: string;
  /** Execution node; must equal `logicalTime.nodeId` (enforced at validation). */
  nodeId: string;
  /** Formal logical instant: `(counter, nodeId)` total order (16F.6.B may extend semantics). */
  logicalTime: LogicalTime;
  /** Per-node monotonic sequence (strictly increasing along global order). */
  sequence: number;
  type: string;
  payload: unknown;
  /**
   * Legacy single-parent field. Canonical form uses `parentEventIds`; if both are set,
   * `parentEventId` must appear in `parentEventIds`.
   */
  parentEventId?: string;
  /** Multi-parent DAG: lexicographically sorted unique ids at validation/canonicalization. */
  parentEventIds?: string[];
  /**
   * Merge lineage: source `eventId`s that were merged into this derived event (sorted, unique).
   * When set, {@link mergePolicy} should be present for audit.
   */
  resolvedFrom?: string[];
  /**
   * Global merge policy (object) or legacy pairwise label; see `merge_policy.ts`.
   */
  mergePolicy?: DistributedMergePolicy;
  /** Deterministic id of the materialized conflict set (`deriveConflictSetId`); required for new derived merges. */
  conflictSetId?: string;
}

export interface GlobalInput {
  nodeConfigs: Record<string, NodeConfigInput>;
  events: DistributedEvent[];
  adminInputs?: AdminInput[];
}

/** Normalized global input: explicit sort orders, no Record iteration ambiguity. */
export type NormalizedGlobalInput = Readonly<{
  nodeConfigs: readonly NodeConfigInput[];
  events: readonly DistributedEvent[];
  adminInputs: readonly AdminInput[];
}>;

function compareAdminInputs(a: AdminInput, b: AdminInput): number {
  const lt = compareLogicalTime(a.logicalTime, b.logicalTime);
  if (lt !== 0) return lt;
  const u = a.type.localeCompare(b.type);
  if (u !== 0) return u;
  const pa = stableStringify(canonicalizeKeysDeep(a.payload));
  const pb = stableStringify(canonicalizeKeysDeep(b.payload));
  return pa.localeCompare(pb);
}

function sortedNodeConfigs(record: Record<string, NodeConfigInput>): NodeConfigInput[] {
  const rows = Object.values(record).map((row) => ({
    nodeId: row.nodeId,
    configHash: row.configHash,
  }));
  rows.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  return rows;
}

function sortedAdminInputs(admin: AdminInput[] | undefined): AdminInput[] {
  const list = (admin ?? []).map((a) => ({
    type: a.type,
    logicalTime: a.logicalTime,
    payload: a.payload,
  }));
  list.sort(compareAdminInputs);
  return list.map((a) => ({
    type: a.type,
    logicalTime: {
      counter: a.logicalTime.counter,
      nodeId: a.logicalTime.nodeId,
    },
    payload: canonicalizeKeysDeep(a.payload),
  })) as AdminInput[];
}

/**
 * Canonicalize, sort, and validate a global input.
 * Ordering: nodeConfigs by nodeId; events via causal linear extension {@link compareEventsCausally}; adminInputs by logicalTime, type, payload.
 */
export function normalizeGlobalInput(input: GlobalInput): NormalizedGlobalInput {
  const nodeConfigs = sortedNodeConfigs(input.nodeConfigs).map((c) => ({
    nodeId: c.nodeId,
    configHash: c.configHash,
  }));

  const eventsCanon = [...input.events].map((e) => canonicalizeDistributedEvent(e));
  const desc = computeDescendants(eventsCanon);
  const eventsSorted = [...eventsCanon].sort((a, b) => compareEventsCausally(a, b, desc));

  const adminInputs = sortedAdminInputs(input.adminInputs);

  const normalized: NormalizedGlobalInput = Object.freeze({
    nodeConfigs: Object.freeze(nodeConfigs),
    events: Object.freeze(eventsSorted),
    adminInputs: Object.freeze(adminInputs),
  });

  assertGlobalInputValid(normalized);
  return normalized;
}

/** Bitwise-stable digest of the normalized global input (cluster audit / replay proofs). */
export function hashGlobalInput(input: GlobalInput): string {
  const n = normalizeGlobalInput(input);
  return digestGlobalInputNormalized(n);
}

/** Hash an already-normalized input without re-running validation. */
export function digestGlobalInputNormalized(n: NormalizedGlobalInput): string {
  const body = {
    nodeConfigs: [...n.nodeConfigs].map((c) => canonicalizeKeysDeep(c)),
    events: [...n.events].map((e) => canonicalizeDistributedEvent(e)),
    adminInputs: [...n.adminInputs].map((a) => ({
      type: a.type,
      logicalTime: canonicalizeKeysDeep(a.logicalTime),
      payload: canonicalizeKeysDeep(a.payload),
    })),
  };
  const digest = crypto.createHash('sha256').update(stableStringify(body), 'utf8').digest('hex');
  return `sha256-${digest}`;
}
