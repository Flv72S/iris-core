/**
 * 16F.6.A.FORMALIZATION — ADR-003 traceable invariant suite for distributed global input.
 */
import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';
import type { InvariantCoverageEntry } from '../sdk/invariants';

import { computeDescendants } from './causal_graph';
import type { NormalizedGlobalInput } from './global_input';
import { compareEventsCausally } from './event_ordering';
import { deriveDeterministicEventId } from './event_identity';
import { canonicalizeDistributedEvent } from './event_serialization';
import { compareLogicalTime, type LogicalTime } from './logical_time';
import { validateEventTraceability } from './event_traceability';

export type InvariantResult = { ok: boolean; evidence?: string };

export type DistributedInvariant = {
  id: string;
  description: string;
  enforcement: 'SN' | 'RT' | 'TS';
  check: (input: NormalizedGlobalInput) => InvariantResult;
};

function digestNormalizedInline(n: NormalizedGlobalInput): string {
  const body = {
    nodeConfigs: [...n.nodeConfigs].map((c) => canonicalizeKeysDeep(c)),
    events: [...n.events].map((e) => canonicalizeDistributedEvent(e)),
    adminInputs: [...n.adminInputs].map((a) => ({
      type: a.type,
      logicalTime: canonicalizeKeysDeep(a.logicalTime),
      payload: canonicalizeKeysDeep(a.payload),
    })),
  };
  return `sha256-${crypto.createHash('sha256').update(stableStringify(body), 'utf8').digest('hex')}`;
}

function checkEventIdDeterministic(n: NormalizedGlobalInput): InvariantResult {
  for (const e of n.events) {
    const expected = deriveDeterministicEventId(e);
    if (e.eventId !== expected) {
      return { ok: false, evidence: `eventId mismatch for ${e.eventId}` };
    }
  }
  return { ok: true };
}

function checkEventOrderTotal(n: NormalizedGlobalInput): InvariantResult {
  const desc = computeDescendants(n.events);
  for (let i = 1; i < n.events.length; i++) {
    if (compareEventsCausally(n.events[i - 1]!, n.events[i]!, desc) > 0) {
      return { ok: false, evidence: `causal/total order break at index ${i}` };
    }
  }
  return { ok: true };
}

function checkLogicalTimeMonotonicInvariant(n: NormalizedGlobalInput): InvariantResult {
  const lastByNode = new Map<string, { lt: LogicalTime; eventId: string }>();
  for (const e of n.events) {
    const prev = lastByNode.get(e.nodeId);
    if (prev !== undefined && compareLogicalTime(prev.lt, e.logicalTime) > 0) {
      return {
        ok: false,
        evidence: `nodeId=${e.nodeId} ${prev.eventId} then ${e.eventId}`,
      };
    }
    lastByNode.set(e.nodeId, { lt: e.logicalTime, eventId: e.eventId });
  }
  return { ok: true };
}

function checkSequenceMonotonicPerNode(n: NormalizedGlobalInput): InvariantResult {
  const lastSeqByNode = new Map<string, number>();
  for (const e of n.events) {
    const prev = lastSeqByNode.get(e.nodeId);
    if (prev !== undefined && e.sequence <= prev) {
      return { ok: false, evidence: `nodeId=${e.nodeId} sequence ${e.sequence} after ${prev}` };
    }
    lastSeqByNode.set(e.nodeId, e.sequence);
  }
  return { ok: true };
}

function checkNoDuplicateEventIds(n: NormalizedGlobalInput): InvariantResult {
  const seen = new Set<string>();
  for (const e of n.events) {
    if (seen.has(e.eventId)) {
      return { ok: false, evidence: `duplicate ${e.eventId}` };
    }
    seen.add(e.eventId);
  }
  return { ok: true };
}

function checkPayloadSerializable(n: NormalizedGlobalInput): InvariantResult {
  try {
    for (const e of n.events) {
      stableStringify(canonicalizeKeysDeep(e.payload));
    }
    for (const a of n.adminInputs) {
      stableStringify(canonicalizeKeysDeep(a.payload));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

function checkTraceabilityConsistent(n: NormalizedGlobalInput): InvariantResult {
  try {
    validateEventTraceability(n.events);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

function checkGlobalInputHashStable(n: NormalizedGlobalInput): InvariantResult {
  const a = digestNormalizedInline(n);
  const b = digestNormalizedInline(n);
  return { ok: a === b, evidence: a };
}

export const DISTRIBUTED_INVARIANT_DECLARATIONS: readonly DistributedInvariant[] = [
  {
    id: 'INV-DIST-001',
    description: 'event_id_deterministic',
    enforcement: 'RT',
    check: checkEventIdDeterministic,
  },
  {
    id: 'INV-DIST-002',
    description: 'event_order_total',
    enforcement: 'RT',
    check: checkEventOrderTotal,
  },
  {
    id: 'INV-DIST-003',
    description: 'logical_time_monotonic',
    enforcement: 'RT',
    check: checkLogicalTimeMonotonicInvariant,
  },
  {
    id: 'INV-DIST-004',
    description: 'sequence_monotonic_per_node',
    enforcement: 'RT',
    check: checkSequenceMonotonicPerNode,
  },
  {
    id: 'INV-DIST-005',
    description: 'no_duplicate_event_ids',
    enforcement: 'RT',
    check: checkNoDuplicateEventIds,
  },
  {
    id: 'INV-DIST-006',
    description: 'payload_serializable',
    enforcement: 'RT',
    check: checkPayloadSerializable,
  },
  {
    id: 'INV-DIST-007',
    description: 'traceability_consistent',
    enforcement: 'SN',
    check: checkTraceabilityConsistent,
  },
  {
    id: 'INV-DIST-008',
    description: 'global_input_hash_stable',
    enforcement: 'SN',
    check: checkGlobalInputHashStable,
  },
];

export type DistributedInvariantSuiteRun = {
  results: ReadonlyArray<{ id: string; status: 'OK' | 'VIOLATED'; evidence?: string }>;
  coverage: InvariantCoverageEntry[];
};

export function runDistributedInvariantSuite(input: NormalizedGlobalInput): DistributedInvariantSuiteRun {
  const results: Array<{ id: string; status: 'OK' | 'VIOLATED'; evidence?: string }> = [];
  const coverage: InvariantCoverageEntry[] = [];

  for (const inv of DISTRIBUTED_INVARIANT_DECLARATIONS) {
    const r = inv.check(input);
    const status: 'OK' | 'VIOLATED' = r.ok ? 'OK' : 'VIOLATED';
    results.push({ id: inv.id, status, evidence: r.evidence });
    coverage.push({
      id: inv.id,
      enforced: r.ok,
      evidence: inv.enforcement,
      enforcementLocation: `runDistributedInvariantSuite / ${inv.id}`,
    });
  }

  return { results: Object.freeze(results), coverage: Object.freeze(coverage) };
}
