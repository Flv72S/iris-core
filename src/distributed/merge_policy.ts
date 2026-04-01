/**
 * 16F.6.B.CLOSURE — Explicit merge policy contract (audit-traceable).
 * 16F.6.B.CERTIFICATION — Global set-based policy + legacy string union.
 */
import { canonicalizeKeysDeep } from '../logging/audit';

import { DistributedInputValidationError } from './errors';
import type { DistributedEvent } from './global_input';
import { compareDistributedEvents } from './event_ordering';

/** @deprecated Legacy audit dimension label (pairwise era). */
export type LegacyMergePolicy = 'CAUSAL_PRIORITY' | 'LOGICAL_TIME' | 'NODE_ID' | 'EVENT_ID';

/**
 * Global merge decision for a full conflict set: deterministic total order on members,
 * winner = maximal under {@link compareDistributedEvents}.
 */
export type MergePolicy = {
  type: 'last_writer_wins' | 'deterministic_order';
  winner: string;
  participants: readonly string[];
};

export type DistributedMergePolicy = MergePolicy | LegacyMergePolicy;

export function isLegacyMergePolicy(p: unknown): p is LegacyMergePolicy {
  return (
    p === 'CAUSAL_PRIORITY' ||
    p === 'LOGICAL_TIME' ||
    p === 'NODE_ID' ||
    p === 'EVENT_ID'
  );
}

export function isMergePolicyObject(p: unknown): p is MergePolicy {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as MergePolicy;
  return (
    (o.type === 'last_writer_wins' || o.type === 'deterministic_order') &&
    typeof o.winner === 'string' &&
    Array.isArray(o.participants)
  );
}

/** Canonical form for identity / hashing (sorted participants). */
export function canonicalizeMergePolicyForIdentity(p: DistributedMergePolicy): DistributedMergePolicy {
  if (isLegacyMergePolicy(p)) return p;
  const mp = p as MergePolicy;
  const o: MergePolicy = {
    type: mp.type,
    winner: mp.winner,
    participants: Object.freeze([...mp.participants].sort((a, b) => a.localeCompare(b))),
  };
  return canonicalizeKeysDeep(o) as MergePolicy;
}

/**
 * Classify merge policy for the **entire** conflict set (not pairwise).
 * Members are sorted by `compareDistributedEvents`; winner is the last element; participants are all ids sorted.
 */
export function classifyMergePolicyForSet(members: DistributedEvent[]): MergePolicy {
  if (members.length < 2) {
    throw new DistributedInputValidationError('classifyMergePolicyForSet requires at least two events');
  }
  const sorted = [...members].sort(compareDistributedEvents);
  const winner = sorted[sorted.length - 1]!.eventId;
  const participants = sorted.map((e) => e.eventId).sort((a, b) => a.localeCompare(b));
  return {
    type: 'deterministic_order',
    winner,
    participants: Object.freeze([...participants]),
  };
}

/**
 * Recompute policy from `resolvedFrom` sources and compare to stored policy (new object form).
 */
export function recomputeMergePolicyFromResolved(
  sources: readonly DistributedEvent[],
  resolvedFrom: readonly string[],
): MergePolicy {
  const byId = new Map(sources.map((e) => [e.eventId, e] as const));
  const members = resolvedFrom.map((id) => byId.get(id)).filter((x): x is DistributedEvent => x !== undefined);
  if (members.length !== resolvedFrom.length) {
    throw new DistributedInputValidationError('recomputeMergePolicyFromResolved: missing source event');
  }
  return classifyMergePolicyForSet(members);
}
