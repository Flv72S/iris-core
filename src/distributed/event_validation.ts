/**
 * 16F.6.A.FORMALIZATION — Validation for distributed event model & global input (fail-fast, ADR-003 suite).
 */
import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';
import type { InvariantCoverageEntry } from '../sdk/invariants';

import { assertCausalReplaySafe } from './causality';
import { runCausalInvariantSuite } from './causal_invariants';
import { computeDescendants, IRIS_MERGE_RESOLVED_EVENT_TYPE } from './causal_graph';
import { deriveConflictSetId } from './conflict_sets';
import { areEventSetsCanonicallyEqual } from './event_equality';
import { DistributedInputValidationError } from './errors';
import { deriveDeterministicEventId } from './event_identity';
import { compareEventsCausally } from './event_ordering';
import { assertLogicalTimeValid, compareLogicalTime, type LogicalTime } from './logical_time';
import { validateEventTraceability } from './event_traceability';
import { runDistributedInvariantSuite } from './invariants';
import { mergeEventSets } from './merge_algebra';
import {
  canonicalizeMergePolicyForIdentity,
  isLegacyMergePolicy,
  isMergePolicyObject,
  recomputeMergePolicyFromResolved,
  type LegacyMergePolicy,
} from './merge_policy';
import { normalizeParentEventIds } from './parent_refs';

import type { DistributedEvent, NormalizedGlobalInput } from './global_input';

const LEGACY_MERGE_POLICIES = new Set<LegacyMergePolicy>(['CAUSAL_PRIORITY', 'LOGICAL_TIME', 'NODE_ID', 'EVENT_ID']);

export { DistributedInputValidationError } from './errors';

export type GlobalInputValidationResult = {
  valid: boolean;
  errors?: string[];
  structuralErrors?: string[];
  invariantCoverage?: InvariantCoverageEntry[];
  causalInvariantCoverage?: InvariantCoverageEntry[];
};

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DistributedInputValidationError(`${label} must be a non-empty string`);
  }
}

function assertIntegerSequence(label: string, value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.floor(value) !== value) {
    throw new DistributedInputValidationError(`${label} must be a finite integer`);
  }
}

export function assertPayloadSerializable(payload: unknown): void {
  try {
    stableStringify(canonicalizeKeysDeep(payload));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new DistributedInputValidationError(`payload is not serializable (${msg})`);
  }
}

export function validateDistributedEvent(event: DistributedEvent): void {
  assertLogicalTimeValid(event.logicalTime);
  assertNonEmptyString('nodeId', event.nodeId);
  if (event.nodeId !== event.logicalTime.nodeId) {
    throw new DistributedInputValidationError(
      `nodeId must equal logicalTime.nodeId (got ${JSON.stringify(event.nodeId)} vs ${JSON.stringify(event.logicalTime.nodeId)})`,
    );
  }
  assertNonEmptyString('type', event.type);
  assertNonEmptyString('eventId', event.eventId);
  assertIntegerSequence('sequence', event.sequence);
  assertPayloadSerializable(event.payload);
  if (event.parentEventId !== undefined) {
    assertNonEmptyString('parentEventId', event.parentEventId);
  }
  try {
    normalizeParentEventIds(event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new DistributedInputValidationError(`parent refs: ${msg}`);
  }

  const rf = event.resolvedFrom;
  if (rf !== undefined && rf.length > 0) {
    const u = new Set(rf);
    if (u.size !== rf.length) {
      throw new DistributedInputValidationError('resolvedFrom must not contain duplicates');
    }
    const sorted = [...u].sort((a, b) => a.localeCompare(b));
    if (sorted.length !== rf.length || sorted.some((v, i) => v !== rf[i])) {
      throw new DistributedInputValidationError('resolvedFrom must be lexicographically sorted and unique');
    }
    for (const r of rf) {
      if (r === event.eventId) {
        throw new DistributedInputValidationError('resolvedFrom must not include self eventId');
      }
    }
    if (event.mergePolicy === undefined) {
      throw new DistributedInputValidationError('mergePolicy is required when resolvedFrom is non-empty');
    }
    if (isLegacyMergePolicy(event.mergePolicy)) {
      if (!LEGACY_MERGE_POLICIES.has(event.mergePolicy)) {
        throw new DistributedInputValidationError(`invalid mergePolicy: ${JSON.stringify(event.mergePolicy)}`);
      }
    } else if (isMergePolicyObject(event.mergePolicy)) {
      const mp = event.mergePolicy;
      const want = [...rf].sort((a, b) => a.localeCompare(b));
      const got = [...mp.participants].sort((a, b) => a.localeCompare(b));
      if (want.length !== got.length || want.some((v, i) => v !== got[i]!)) {
        throw new DistributedInputValidationError('mergePolicy.participants must match resolvedFrom');
      }
      if (!want.includes(mp.winner)) {
        throw new DistributedInputValidationError('mergePolicy.winner must be in participants');
      }
    } else {
      throw new DistributedInputValidationError(`invalid mergePolicy: ${JSON.stringify(event.mergePolicy)}`);
    }
  } else if (event.mergePolicy !== undefined) {
    throw new DistributedInputValidationError('mergePolicy is only allowed when resolvedFrom is non-empty');
  }

  if (event.conflictSetId !== undefined) {
    if (rf === undefined || rf.length === 0) {
      throw new DistributedInputValidationError('conflictSetId requires non-empty resolvedFrom');
    }
    if (event.conflictSetId !== deriveConflictSetId(rf)) {
      throw new DistributedInputValidationError('conflictSetId does not match deriveConflictSetId(resolvedFrom)');
    }
  }

  if (isMergePolicyObject(event.mergePolicy) && rf !== undefined && rf.length > 0) {
    if (event.type !== IRIS_MERGE_RESOLVED_EVENT_TYPE) {
      throw new DistributedInputValidationError('object mergePolicy is only valid for iris.merge.resolved');
    }
    if (event.conflictSetId === undefined) {
      throw new DistributedInputValidationError('conflictSetId is required when mergePolicy is object form');
    }
  }

  if (event.type === IRIS_MERGE_RESOLVED_EVENT_TYPE) {
    if (rf === undefined || rf.length < 2) {
      throw new DistributedInputValidationError('iris.merge.resolved requires at least two resolvedFrom sources');
    }
  }

  const expected = deriveDeterministicEventId(event);
  if (event.eventId !== expected) {
    throw new DistributedInputValidationError(
      `eventId does not match derived identity (expected ${expected})`,
    );
  }
}

function assertEventsTotalOrderSorted(events: readonly DistributedEvent[]): void {
  const desc = computeDescendants(events);
  for (let i = 1; i < events.length; i++) {
    if (compareEventsCausally(events[i - 1]!, events[i]!, desc) > 0) {
      throw new DistributedInputValidationError(
        'events are not sorted by compareEventsCausally (causal linear extension, then total order)',
      );
    }
  }
}

/**
 * Non-decreasing formal {@link LogicalTime} per top-level `nodeId` along the global stream (precondition: sorted).
 */
export function assertLogicalTimeMonotonicPerNode(events: DistributedEvent[]): void {
  const lastByNode = new Map<string, { lt: LogicalTime; eventId: string }>();

  for (const e of events) {
    const prev = lastByNode.get(e.nodeId);
    if (prev !== undefined && compareLogicalTime(prev.lt, e.logicalTime) > 0) {
      throw new DistributedInputValidationError(
        `logicalTime not monotonic for nodeId ${JSON.stringify(e.nodeId)}: ${JSON.stringify(prev.lt)} (eventId ${prev.eventId}) then ${JSON.stringify(e.logicalTime)} (eventId ${e.eventId})`,
        [
          `offending pair: previousLogicalTime=${JSON.stringify(prev.lt)}, currentLogicalTime=${JSON.stringify(e.logicalTime)}`,
          `eventId(s): ${prev.eventId}, ${e.eventId}`,
        ],
      );
    }
    lastByNode.set(e.nodeId, { lt: e.logicalTime, eventId: e.eventId });
  }
}

function validateConflictSetIdUniqueness(events: readonly DistributedEvent[]): void {
  const seen = new Map<string, string>();
  for (const e of events) {
    if (e.conflictSetId === undefined) continue;
    const ex = seen.get(e.conflictSetId);
    if (ex !== undefined && ex !== e.eventId) {
      throw new DistributedInputValidationError(`duplicate conflictSetId ${e.conflictSetId}`);
    }
    seen.set(e.conflictSetId, e.eventId);
  }
}

function validateMergePolicyRecomputeFromSources(events: readonly DistributedEvent[]): void {
  const byId = new Map(events.map((e) => [e.eventId, e] as const));
  for (const e of events) {
    if (e.type !== IRIS_MERGE_RESOLVED_EVENT_TYPE) continue;
    if (!isMergePolicyObject(e.mergePolicy)) continue;
    const rf = e.resolvedFrom;
    if (rf === undefined || rf.length < 2) continue;
    const sources = rf.map((id) => byId.get(id)).filter((x): x is DistributedEvent => x !== undefined);
    if (sources.length !== rf.length) {
      throw new DistributedInputValidationError(`merge audit: missing source for ${e.eventId}`);
    }
    const expected = recomputeMergePolicyFromResolved(sources, rf);
    const a = stableStringify(canonicalizeMergePolicyForIdentity(expected));
    const b = stableStringify(canonicalizeMergePolicyForIdentity(e.mergePolicy));
    if (a !== b) {
      throw new DistributedInputValidationError(`mergePolicy mismatch for ${e.eventId}`);
    }
  }
}

/**
 * Optional audit: `mergeEventSets` is idempotent on an already merge-closed stream.
 */
export function assertMergeAlgebraReplayClosed(events: readonly DistributedEvent[]): void {
  const replay = mergeEventSets([...events]);
  if (!areEventSetsCanonicallyEqual(replay, [...events])) {
    throw new DistributedInputValidationError('merge algebra: stream is not closed under mergeEventSets');
  }
}

/** Unique eventId and strictly increasing sequence per nodeId along the given total order. */
export function assertEventOrderingAndUniqueness(events: readonly DistributedEvent[]): void {
  const seen = new Set<string>();
  const lastSeqByNode = new Map<string, number>();

  for (const e of events) {
    if (seen.has(e.eventId)) {
      throw new DistributedInputValidationError(`duplicate eventId: ${e.eventId}`);
    }
    seen.add(e.eventId);

    const prev = lastSeqByNode.get(e.nodeId);
    if (prev !== undefined && e.sequence <= prev) {
      throw new DistributedInputValidationError(
        `sequence not strictly increasing for nodeId ${JSON.stringify(e.nodeId)}: ${e.sequence} follows ${prev}`,
      );
    }
    lastSeqByNode.set(e.nodeId, e.sequence);
  }
}

/** Structural validation + traceability; invariant suite run separately for layering. */
export function validateNormalizedGlobalInputBody(n: NormalizedGlobalInput): void {
  const nodeIds = new Set<string>();
  for (const c of n.nodeConfigs) {
    assertNonEmptyString('nodeConfigs[].nodeId', c.nodeId);
    assertNonEmptyString('nodeConfigs[].configHash', c.configHash);
    if (nodeIds.has(c.nodeId)) {
      throw new DistributedInputValidationError(`duplicate nodeId in nodeConfigs: ${c.nodeId}`);
    }
    nodeIds.add(c.nodeId);
  }

  for (const a of n.adminInputs) {
    assertLogicalTimeValid(a.logicalTime);
    assertNonEmptyString('adminInputs[].type', a.type);
    assertPayloadSerializable(a.payload);
  }

  for (const e of n.events) {
    validateDistributedEvent(e);
  }
  validateConflictSetIdUniqueness(n.events);
  validateMergePolicyRecomputeFromSources(n.events);
  validateEventTraceability(n.events);
  assertEventsTotalOrderSorted(n.events);
  assertEventOrderingAndUniqueness(n.events);
  assertLogicalTimeMonotonicPerNode([...n.events]);
  assertCausalReplaySafe(n.events);
}

export function validateNormalizedGlobalInput(n: NormalizedGlobalInput): void {
  validateNormalizedGlobalInputBody(n);
  const dist = runDistributedInvariantSuite(n);
  if (!dist.results.every((r) => r.status === 'OK')) {
    const lines = dist.results
      .filter((r) => r.status === 'VIOLATED')
      .map((r) => `${r.id}${r.evidence !== undefined ? `: ${r.evidence}` : ''}`);
    throw new DistributedInputValidationError('distributed invariant suite violation', lines);
  }
  const causal = runCausalInvariantSuite(n);
  if (!causal.results.every((r) => r.status === 'OK')) {
    const lines = causal.results
      .filter((r) => r.status === 'VIOLATED')
      .map((r) => `${r.id}${r.evidence !== undefined ? `: ${r.evidence}` : ''}`);
    throw new DistributedInputValidationError('causal invariant suite violation', lines);
  }
}

export function validateCausalConsistency(n: NormalizedGlobalInput): {
  valid: boolean;
  causalInvariantCoverage: InvariantCoverageEntry[];
  structuralErrors?: string[];
} {
  const structuralErrors: string[] = [];
  for (const e of n.events) {
    try {
      validateDistributedEvent(e);
    } catch (err) {
      structuralErrors.push(err instanceof Error ? err.message : String(err));
    }
  }
  try {
    validateEventTraceability(n.events);
  } catch (e) {
    structuralErrors.push(e instanceof Error ? e.message : String(e));
  }
  try {
    assertCausalReplaySafe(n.events);
  } catch (e) {
    structuralErrors.push(e instanceof Error ? e.message : String(e));
  }
  const causal = runCausalInvariantSuite(n);
  const suiteOk = causal.results.every((r) => r.status === 'OK');
  const ok = structuralErrors.length === 0 && suiteOk;
  return {
    valid: ok,
    causalInvariantCoverage: [...causal.coverage],
    ...(structuralErrors.length > 0 ? { structuralErrors } : {}),
  };
}

export function validateNormalizedGlobalInputWithResult(n: NormalizedGlobalInput): GlobalInputValidationResult {
  const dist = runDistributedInvariantSuite(n);
  const causal = runCausalInvariantSuite(n);
  const invOk = dist.results.every((r) => r.status === 'OK');
  const causOk = causal.results.every((r) => r.status === 'OK');
  try {
    validateNormalizedGlobalInputBody(n);
    const errs: string[] = [];
    if (!invOk) errs.push('distributed invariant suite violation');
    if (!causOk) errs.push('causal invariant suite violation');
    return {
      valid: invOk && causOk,
      errors: invOk && causOk ? [] : errs,
      invariantCoverage: [...dist.coverage],
      causalInvariantCoverage: [...causal.coverage],
    };
  } catch (e) {
    if (e instanceof DistributedInputValidationError) {
      return {
        valid: false,
        errors: [e.message],
        invariantCoverage: [...dist.coverage],
        causalInvariantCoverage: [...causal.coverage],
      };
    }
    throw e;
  }
}

export function assertGlobalInputValid(n: NormalizedGlobalInput): void {
  validateNormalizedGlobalInput(n);
}
