/**
 * 16F.6.B — Causal consistency invariants (ADR-003 coverage shape).
 * 16F.6.B.HARDENING — Multi-parent, concurrency, merge closure (INV-CAUSAL-006 … 009).
 */
import { stableStringify } from '../logging/audit';
import type { InvariantCoverageEntry } from '../sdk/invariants';

import { areConcurrent, classifyEventRelationFromDesc, resolveConcurrentEvents } from './causality';
import { buildConflictSets, deriveConflictSetId } from './conflict_sets';
import { computeDescendants, IRIS_MERGE_RESOLVED_EVENT_TYPE } from './causal_graph';
import { areEventSetsCanonicallyEqual } from './event_equality';
import { compareEventsCausally } from './event_ordering';
import { canonicalizeDistributedEvent } from './event_serialization';
import { validateEventTraceability } from './event_traceability';
import { compareLogicalTime, type LogicalTime } from './logical_time';
import { mergeConcurrentEvents, mergeDeterministicUnion, mergeEventSets } from './merge_algebra';
import { isLegacyMergePolicy, isMergePolicyObject } from './merge_policy';
import { normalizeParentEventIds } from './parent_refs';
import { payloadsOverlap } from './payload_domain';

import type { DistributedEvent, NormalizedGlobalInput } from './global_input';

const LEGACY_MERGE_POLICIES = new Set(['CAUSAL_PRIORITY', 'LOGICAL_TIME', 'NODE_ID', 'EVENT_ID'] as const);

function mergePolicyFieldValid(p: unknown): boolean {
  if (isLegacyMergePolicy(p)) {
    return LEGACY_MERGE_POLICIES.has(p);
  }
  if (isMergePolicyObject(p)) {
    const mp = p;
    const parts = [...mp.participants].sort((a, b) => a.localeCompare(b));
    return parts.length >= 2 && parts.includes(mp.winner);
  }
  return false;
}

function deterministicShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const n = out.length;
  let s = seed >>> 0;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export type CausalInvariantResult = { ok: boolean; evidence?: string };

export type CausalDistributedInvariant = {
  id: string;
  description: string;
  enforcement: 'SN' | 'RT' | 'TS';
  check: (input: NormalizedGlobalInput) => CausalInvariantResult;
};

function checkNoCausalCycles(n: NormalizedGlobalInput): CausalInvariantResult {
  try {
    validateEventTraceability(n.events);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

function checkParentPrecedesChild(n: NormalizedGlobalInput): CausalInvariantResult {
  const index = new Map(n.events.map((e, i) => [e.eventId, i] as const));
  for (const e of n.events) {
    let parents: readonly string[];
    try {
      parents = normalizeParentEventIds(e);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, evidence: msg };
    }
    for (const p of parents) {
      const pi = index.get(p);
      const ci = index.get(e.eventId);
      if (pi === undefined || ci === undefined) return { ok: false, evidence: 'index' };
      if (pi >= ci) {
        return { ok: false, evidence: `child ${e.eventId} before parent ${p}` };
      }
    }
    const rf = e.resolvedFrom;
    if (rf !== undefined) {
      for (const r of rf) {
        const pi = index.get(r);
        const ci = index.get(e.eventId);
        if (pi === undefined || ci === undefined) return { ok: false, evidence: 'index' };
        if (pi >= ci) {
          return { ok: false, evidence: `merge child ${e.eventId} before source ${r}` };
        }
      }
    }
  }
  return { ok: true };
}

function checkHappensBeforeRespectsOrder(n: NormalizedGlobalInput): CausalInvariantResult {
  const desc = computeDescendants(n.events);
  for (let i = 0; i < n.events.length; i++) {
    for (let j = i + 1; j < n.events.length; j++) {
      if (desc.get(n.events[j]!.eventId)?.has(n.events[i]!.eventId)) {
        return {
          ok: false,
          evidence: `HB ${n.events[j]!.eventId}→${n.events[i]!.eventId} but stream order reversed`,
        };
      }
    }
  }
  for (let i = 1; i < n.events.length; i++) {
    const cmp = compareEventsCausally(n.events[i - 1]!, n.events[i]!, desc);
    if (cmp > 0) {
      return { ok: false, evidence: `compareEventsCausally break at ${i}` };
    }
  }
  return { ok: true };
}

function checkLogicalClockMonotonicUnderMerge(n: NormalizedGlobalInput): CausalInvariantResult {
  const lastByNode = new Map<string, LogicalTime>();
  for (const e of n.events) {
    const prev = lastByNode.get(e.nodeId);
    if (prev !== undefined && compareLogicalTime(prev, e.logicalTime) > 0) {
      return { ok: false, evidence: `nodeId=${e.nodeId}` };
    }
    lastByNode.set(e.nodeId, e.logicalTime);
  }
  return { ok: true };
}

function checkMergeDeterminism(n: NormalizedGlobalInput): CausalInvariantResult {
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    if (sorted.length === 0) return { ok: true };
    const mid = Math.floor(sorted.length / 2);
    const left = sorted.slice(0, mid);
    const right = sorted.slice(mid);
    const m1 = mergeDeterministicUnion(left, right);
    const m2 = mergeDeterministicUnion(right, left);
    const s1 = stableStringify(m1.map((e) => canonicalizeDistributedEvent(e)));
    const s2 = stableStringify(m2.map((e) => canonicalizeDistributedEvent(e)));
    if (s1 !== s2) {
      return { ok: false, evidence: 'merge(A,B) canonical string !== merge(B,A)' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-006 — normalized parents exist in stream and raw `parentEventIds` has no dupes. */
function checkMultiParentIntegrity(n: NormalizedGlobalInput): CausalInvariantResult {
  const index = new Map(n.events.map((e) => [e.eventId, true] as const));
  for (const e of n.events) {
    let parents: readonly string[];
    try {
      parents = normalizeParentEventIds(e);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, evidence: msg };
    }
    const seen = new Set<string>();
    for (const p of parents) {
      if (seen.has(p)) return { ok: false, evidence: `duplicate parent ${p} for ${e.eventId}` };
      seen.add(p);
      if (!index.has(p)) return { ok: false, evidence: `missing parent ${p} for ${e.eventId}` };
    }
  }
  return { ok: true };
}

/** INV-CAUSAL-007 — {@link classifyEventRelationFromDesc} is symmetric (BEFORE/AFTER/CONCURRENT/EQUAL). */
function checkConcurrencyClassificationSymmetric(n: NormalizedGlobalInput): CausalInvariantResult {
  const desc = computeDescendants(n.events);
  const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      const r = classifyEventRelationFromDesc(a, b, desc);
      const inv = classifyEventRelationFromDesc(b, a, desc);
      const ok =
        (r === 'EQUAL' && inv === 'EQUAL') ||
        (r === 'BEFORE' && inv === 'AFTER') ||
        (r === 'AFTER' && inv === 'BEFORE') ||
        (r === 'CONCURRENT' && inv === 'CONCURRENT');
      if (!ok) {
        return { ok: false, evidence: `asymmetry ${a.eventId} vs ${b.eventId}: ${r}/${inv}` };
      }
    }
  }
  return { ok: true };
}

/** INV-CAUSAL-008 — {@link resolveConcurrentEvents} is pure / stable for identical inputs. */
function checkResolveConcurrentDeterministic(n: NormalizedGlobalInput): CausalInvariantResult {
  const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      const w1 = resolveConcurrentEvents(a, b, n.events);
      const w2 = resolveConcurrentEvents(a, b, n.events);
      if (stableStringify(canonicalizeDistributedEvent(w1)) !== stableStringify(canonicalizeDistributedEvent(w2))) {
        return { ok: false, evidence: `resolve unstable ${a.eventId} ${b.eventId}` };
      }
    }
  }
  return { ok: true };
}

/** INV-CAUSAL-009 — merge union is idempotent on the merged result (closure). */
function checkMergeClosure(n: NormalizedGlobalInput): CausalInvariantResult {
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    const m = mergeDeterministicUnion(sorted, []);
    const m2 = mergeDeterministicUnion(m, []);
    const s1 = stableStringify(m.map((e) => canonicalizeDistributedEvent(e)));
    const s2 = stableStringify(m2.map((e) => canonicalizeDistributedEvent(e)));
    if (s1 !== s2) {
      return { ok: false, evidence: 'merge(merge(S),[]) !== merge(S)' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-010 — Every reference in `resolvedFrom` resolves to an event row (no dangling lineage). */
function checkResolvedFromReferencesExist(n: NormalizedGlobalInput): CausalInvariantResult {
  const index = new Map(n.events.map((e) => [e.eventId, true] as const));
  for (const e of n.events) {
    const rf = e.resolvedFrom;
    if (rf === undefined) continue;
    for (const r of rf) {
      if (!index.has(r)) return { ok: false, evidence: `missing lineage source ${r} for ${e.eventId}` };
    }
  }
  return { ok: true };
}

/** INV-CAUSAL-011 — {@link mergeConcurrentEvents} is deterministic for identical inputs. */
function checkMergeConcurrentEventsDeterminism(n: NormalizedGlobalInput): CausalInvariantResult {
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        if (!areConcurrent(a, b, n.events) || !payloadsOverlap(a.payload, b.payload)) continue;
        const m1 = mergeConcurrentEvents(a, b, n.events);
        const m2 = mergeConcurrentEvents(a, b, n.events);
        const u1 = stableStringify(canonicalizeDistributedEvent(m1));
        const u2 = stableStringify(canonicalizeDistributedEvent(m2));
        if (u1 !== u2) {
          return { ok: false, evidence: `mergeConcurrentEvents unstable ${a.eventId} ${b.eventId}` };
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-012 — Lineage shape: sorted unique `resolvedFrom`, no self, valid `mergePolicy`. */
function checkLineageFieldShape(n: NormalizedGlobalInput): CausalInvariantResult {
  for (const e of n.events) {
    const rf = e.resolvedFrom;
    if (rf === undefined || rf.length === 0) {
      if (e.mergePolicy !== undefined) {
        return { ok: false, evidence: `mergePolicy without resolvedFrom on ${e.eventId}` };
      }
      continue;
    }
    const u = new Set(rf);
    if (u.size !== rf.length) {
      return { ok: false, evidence: `duplicate resolvedFrom on ${e.eventId}` };
    }
    const sorted = [...u].sort((a, b) => a.localeCompare(b));
    if (sorted.length !== rf.length || sorted.some((v, i) => v !== rf[i]!)) {
      return { ok: false, evidence: `resolvedFrom not sorted on ${e.eventId}` };
    }
    if (rf.some((r) => r === e.eventId)) {
      return { ok: false, evidence: `resolvedFrom self on ${e.eventId}` };
    }
    if (e.mergePolicy === undefined || !mergePolicyFieldValid(e.mergePolicy)) {
      return { ok: false, evidence: `invalid or missing mergePolicy on ${e.eventId}` };
    }
    if (e.type === IRIS_MERGE_RESOLVED_EVENT_TYPE && rf.length < 2) {
      return { ok: false, evidence: `merge row ${e.eventId} must list ≥2 sources` };
    }
  }
  return { ok: true };
}

/** INV-CAUSAL-013 — `mergeDeterministicUnion` is associative on bounded inputs (same canonical multiset). */
function checkMergeAlgebraAssociativity(n: NormalizedGlobalInput): CausalInvariantResult {
  if (n.events.length > 12) return { ok: true };
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    const k = sorted.length;
    if (k < 3) return { ok: true };
    const a = Math.max(1, Math.floor(k / 3));
    const b = Math.max(1, Math.floor((2 * k) / 3) - a);
    const left = sorted.slice(0, a);
    const mid = sorted.slice(a, a + b);
    const right = sorted.slice(a + b);
    if (left.length === 0 || mid.length === 0 || right.length === 0) return { ok: true };
    const u1 = mergeDeterministicUnion(mergeDeterministicUnion(left, mid), right);
    const u2 = mergeDeterministicUnion(left, mergeDeterministicUnion(mid, right));
    const s1 = stableStringify(u1.map((e) => canonicalizeDistributedEvent(e)));
    const s2 = stableStringify(u2.map((e) => canonicalizeDistributedEvent(e)));
    if (s1 !== s2) {
      return { ok: false, evidence: 'mergeDeterministicUnion not associative for this multiset' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-014 — Commutativity: merge(A,B) canonical === merge(B,A). */
function checkMergeAlgebraCommutativity(n: NormalizedGlobalInput): CausalInvariantResult {
  return checkMergeDeterminism(n);
}

/** INV-CAUSAL-015 — Idempotency: merge(merge(S),[]) === merge(S). */
function checkMergeAlgebraIdempotency(n: NormalizedGlobalInput): CausalInvariantResult {
  return checkMergeClosure(n);
}

function isPrimitiveForConflict(e: DistributedEvent): boolean {
  return e.type !== IRIS_MERGE_RESOLVED_EVENT_TYPE;
}

/** INV-CAUSAL-016 — `buildConflictSets` stable under random permutations (≥100, bounded n). */
function checkConflictSetsCanonicalUnderPermutation(n: NormalizedGlobalInput): CausalInvariantResult {
  if (n.events.length > 14) return { ok: true };
  try {
    const prim0 = n.events.filter(isPrimitiveForConflict);
    const desc = computeDescendants(n.events);
    const ref = stableStringify(buildConflictSets(prim0, desc));
    for (let i = 0; i < 100; i++) {
      const shuffled = deterministicShuffle(n.events, i + 17);
      const prim = shuffled.filter(isPrimitiveForConflict);
      const d2 = computeDescendants(shuffled);
      const b = stableStringify(buildConflictSets(prim, d2));
      if (b !== ref) {
        return { ok: false, evidence: 'buildConflictSets differs under permutation' };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-017 — Formal associativity: merge(A ∪ B ∪ C) === merge(merge(A ∪ B) ∪ C). */
function checkFormalMergeAssociativity017(n: NormalizedGlobalInput): CausalInvariantResult {
  if (n.events.length > 12) return { ok: true };
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    const k = sorted.length;
    if (k < 3) return { ok: true };
    const a = Math.max(1, Math.floor(k / 3));
    const b = Math.max(1, Math.floor((2 * k) / 3) - a);
    const left = sorted.slice(0, a);
    const mid = sorted.slice(a, a + b);
    const right = sorted.slice(a + b);
    if (left.length === 0 || mid.length === 0 || right.length === 0) return { ok: true };
    const u1 = mergeEventSets([...left, ...mid, ...right]);
    const u2 = mergeEventSets([...mergeEventSets([...left, ...mid]), ...right]);
    if (!areEventSetsCanonicallyEqual(u1, u2)) {
      return { ok: false, evidence: 'INV-CAUSAL-017 formal associativity failed' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-018 — Formal commutativity: merge(A ∪ B) === merge(B ∪ A). */
function checkFormalMergeCommutativity018(n: NormalizedGlobalInput): CausalInvariantResult {
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    if (sorted.length === 0) return { ok: true };
    const mid = Math.floor(sorted.length / 2) || 1;
    const left = sorted.slice(0, mid);
    const right = sorted.slice(mid);
    const u1 = mergeEventSets([...left, ...right]);
    const u2 = mergeEventSets([...right, ...left]);
    if (!areEventSetsCanonicallyEqual(u1, u2)) {
      return { ok: false, evidence: 'INV-CAUSAL-018 formal commutativity failed' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-019 — Formal idempotency: merge(A ∪ A) === merge(A). */
function checkFormalMergeIdempotency019(n: NormalizedGlobalInput): CausalInvariantResult {
  try {
    const sorted = [...n.events].sort((a, b) => a.eventId.localeCompare(b.eventId));
    const u1 = mergeEventSets(sorted);
    const u2 = mergeEventSets([...sorted, ...sorted]);
    if (!areEventSetsCanonicallyEqual(u1, u2)) {
      return { ok: false, evidence: 'INV-CAUSAL-019 formal idempotency failed' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, evidence: msg };
  }
  return { ok: true };
}

/** INV-CAUSAL-020 — ConflictSet traceability for certified merge rows. */
function checkConflictSetTraceability020(n: NormalizedGlobalInput): CausalInvariantResult {
  const byConflict = new Map<string, DistributedEvent[]>();
  for (const e of n.events) {
    if (e.type !== IRIS_MERGE_RESOLVED_EVENT_TYPE) continue;
    if (!isMergePolicyObject(e.mergePolicy)) continue;
    const rf = e.resolvedFrom;
    if (rf === undefined || rf.length < 2) {
      return { ok: false, evidence: `INV-CAUSAL-020: insufficient resolvedFrom on ${e.eventId}` };
    }
    if (e.conflictSetId === undefined) {
      return { ok: false, evidence: `INV-CAUSAL-020: missing conflictSetId on ${e.eventId}` };
    }
    if (e.conflictSetId !== deriveConflictSetId(rf)) {
      return { ok: false, evidence: `INV-CAUSAL-020: conflictSetId mismatch on ${e.eventId}` };
    }
    const lst = byConflict.get(e.conflictSetId) ?? [];
    lst.push(e);
    byConflict.set(e.conflictSetId, lst);
  }
  for (const [, rows] of byConflict) {
    if (rows.length !== 1) {
      return { ok: false, evidence: 'INV-CAUSAL-020: duplicate derived rows for same conflictSetId' };
    }
  }
  return { ok: true };
}

/** INV-CAUSAL-021 — MergePolicy completeness (object form). */
function checkMergePolicyCompleteness021(n: NormalizedGlobalInput): CausalInvariantResult {
  for (const e of n.events) {
    if (!isMergePolicyObject(e.mergePolicy)) continue;
    const rf = e.resolvedFrom;
    if (rf === undefined || rf.length < 2) continue;
    const mp = e.mergePolicy;
    const want = [...rf].sort((a, b) => a.localeCompare(b));
    const got = [...mp.participants].sort((a, b) => a.localeCompare(b));
    if (want.length !== got.length || want.some((v, i) => v !== got[i]!)) {
      return { ok: false, evidence: `INV-CAUSAL-021: participants mismatch on ${e.eventId}` };
    }
    if (!want.includes(mp.winner)) {
      return { ok: false, evidence: `INV-CAUSAL-021: winner not in participants on ${e.eventId}` };
    }
  }
  return { ok: true };
}

export const CAUSAL_INVARIANT_DECLARATIONS: readonly CausalDistributedInvariant[] = [
  {
    id: 'INV-CAUSAL-001',
    description: 'no_causal_cycles',
    enforcement: 'RT',
    check: checkNoCausalCycles,
  },
  {
    id: 'INV-CAUSAL-002',
    description: 'parent_precedes_child',
    enforcement: 'RT',
    check: checkParentPrecedesChild,
  },
  {
    id: 'INV-CAUSAL-003',
    description: 'happens_before_respects_stream_order',
    enforcement: 'RT',
    check: checkHappensBeforeRespectsOrder,
  },
  {
    id: 'INV-CAUSAL-004',
    description: 'logical_clock_monotonic_under_merge',
    enforcement: 'RT',
    check: checkLogicalClockMonotonicUnderMerge,
  },
  {
    id: 'INV-CAUSAL-005',
    description: 'merge_determinism',
    enforcement: 'TS',
    check: checkMergeDeterminism,
  },
  {
    id: 'INV-CAUSAL-006',
    description: 'multi_parent_integrity',
    enforcement: 'RT',
    check: checkMultiParentIntegrity,
  },
  {
    id: 'INV-CAUSAL-007',
    description: 'concurrency_classification_symmetric',
    enforcement: 'TS',
    check: checkConcurrencyClassificationSymmetric,
  },
  {
    id: 'INV-CAUSAL-008',
    description: 'resolve_concurrent_events_deterministic',
    enforcement: 'TS',
    check: checkResolveConcurrentDeterministic,
  },
  {
    id: 'INV-CAUSAL-009',
    description: 'merge_closure_idempotent',
    enforcement: 'TS',
    check: checkMergeClosure,
  },
  {
    id: 'INV-CAUSAL-010',
    description: 'resolved_from_references_exist',
    enforcement: 'RT',
    check: checkResolvedFromReferencesExist,
  },
  {
    id: 'INV-CAUSAL-011',
    description: 'merge_concurrent_events_deterministic',
    enforcement: 'TS',
    check: checkMergeConcurrentEventsDeterminism,
  },
  {
    id: 'INV-CAUSAL-012',
    description: 'lineage_field_shape',
    enforcement: 'RT',
    check: checkLineageFieldShape,
  },
  {
    id: 'INV-CAUSAL-013',
    description: 'merge_algebra_associativity',
    enforcement: 'TS',
    check: checkMergeAlgebraAssociativity,
  },
  {
    id: 'INV-CAUSAL-014',
    description: 'merge_algebra_commutativity',
    enforcement: 'TS',
    check: checkMergeAlgebraCommutativity,
  },
  {
    id: 'INV-CAUSAL-015',
    description: 'merge_algebra_idempotency',
    enforcement: 'TS',
    check: checkMergeAlgebraIdempotency,
  },
  {
    id: 'INV-CAUSAL-016',
    description: 'conflict_sets_canonical_under_permutation',
    enforcement: 'TS',
    check: checkConflictSetsCanonicalUnderPermutation,
  },
  {
    id: 'INV-CAUSAL-017',
    description: 'formal_merge_associativity_mergeEventSets',
    enforcement: 'TS',
    check: checkFormalMergeAssociativity017,
  },
  {
    id: 'INV-CAUSAL-018',
    description: 'formal_merge_commutativity_mergeEventSets',
    enforcement: 'TS',
    check: checkFormalMergeCommutativity018,
  },
  {
    id: 'INV-CAUSAL-019',
    description: 'formal_merge_idempotency_mergeEventSets',
    enforcement: 'TS',
    check: checkFormalMergeIdempotency019,
  },
  {
    id: 'INV-CAUSAL-020',
    description: 'conflict_set_traceability',
    enforcement: 'RT',
    check: checkConflictSetTraceability020,
  },
  {
    id: 'INV-CAUSAL-021',
    description: 'merge_policy_completeness',
    enforcement: 'RT',
    check: checkMergePolicyCompleteness021,
  },
];

export type CausalInvariantSuiteRun = {
  results: ReadonlyArray<{ id: string; status: 'OK' | 'VIOLATED'; evidence?: string }>;
  coverage: InvariantCoverageEntry[];
};

export function runCausalInvariantSuite(input: NormalizedGlobalInput): CausalInvariantSuiteRun {
  const results: Array<{ id: string; status: 'OK' | 'VIOLATED'; evidence?: string }> = [];
  const coverage: InvariantCoverageEntry[] = [];

  for (const inv of CAUSAL_INVARIANT_DECLARATIONS) {
    const r = inv.check(input);
    const status: 'OK' | 'VIOLATED' = r.ok ? 'OK' : 'VIOLATED';
    results.push({ id: inv.id, status, evidence: r.evidence });
    coverage.push({
      id: inv.id,
      enforced: r.ok,
      evidence: inv.enforcement,
      enforcementLocation: `runCausalInvariantSuite / ${inv.id}`,
    });
  }

  return { results: Object.freeze(results), coverage: Object.freeze(coverage) };
}
