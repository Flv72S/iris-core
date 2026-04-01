/**
 * 16F.6.A.FORMALIZATION + HARDENING — Deterministic event identity (includes sorted `parentEventIds`).
 */
import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import { canonicalizeMergePolicyForIdentity } from './merge_policy';
import type { DistributedEvent } from './global_input';
import { normalizeParentEventIds } from './parent_refs';

/** Same logical fields ⇒ same id; excludes `eventId`. */
export function deriveDeterministicEventId(event: Omit<DistributedEvent, 'eventId'>): string {
  const parents = normalizeParentEventIds(event);
  const body: Record<string, unknown> = {
    logicalTime: canonicalizeKeysDeep({
      counter: event.logicalTime.counter,
      nodeId: event.logicalTime.nodeId,
    }),
    nodeId: event.nodeId,
    payload: canonicalizeKeysDeep(event.payload),
    sequence: event.sequence,
    type: event.type,
  };
  if (parents.length > 0) {
    body.parentEventIds = [...parents];
  }
  const rf = event.resolvedFrom;
  if (rf !== undefined && rf.length > 0) {
    body.resolvedFrom = [...rf].sort((a, b) => a.localeCompare(b));
  }
  if (event.mergePolicy !== undefined) {
    body.mergePolicy = canonicalizeMergePolicyForIdentity(event.mergePolicy);
  }
  if (event.conflictSetId !== undefined) {
    body.conflictSetId = event.conflictSetId;
  }
  const digest = crypto.createHash('sha256').update(stableStringify(body), 'utf8').digest('hex');
  return `sha256-${digest}`;
}
