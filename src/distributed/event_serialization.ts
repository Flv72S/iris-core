/**
 * 16F.6.A.FORMALIZATION + HARDENING — Canonical serialization & hashing (includes `parentEventIds`).
 */
import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import type { DistributedEvent } from './global_input';
import { DistributedInputValidationError } from './errors';
import { canonicalizeMergePolicyForIdentity, isLegacyMergePolicy, isMergePolicyObject } from './merge_policy';
import type { LogicalTime } from './logical_time';
import { assertLogicalTimeValid } from './logical_time';
import { normalizeParentEventIds } from './parent_refs';

/** Event graph with recursively sorted object keys and undefined stripped (via canonicalizeKeysDeep). */
export type CanonicalEvent = DistributedEvent;

function asLogicalTime(value: unknown): LogicalTime {
  if (typeof value !== 'object' || value === null) {
    throw new DistributedInputValidationError('logicalTime must be an object after canonicalize');
  }
  const o = value as Record<string, unknown>;
  const lt = {
    counter: Number(o.counter),
    nodeId: String(o.nodeId),
  };
  assertLogicalTimeValid(lt);
  return lt;
}

export function canonicalizeDistributedEvent(event: DistributedEvent): CanonicalEvent {
  let parents: readonly string[];
  try {
    parents = normalizeParentEventIds(event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new DistributedInputValidationError(`canonicalize: ${msg}`);
  }

  const rfRaw = event.resolvedFrom;
  const c = canonicalizeKeysDeep({
    eventId: event.eventId,
    logicalTime: { counter: event.logicalTime.counter, nodeId: event.logicalTime.nodeId },
    nodeId: event.nodeId,
    ...(parents.length > 0 ? { parentEventIds: [...parents] } : {}),
    ...(rfRaw !== undefined && rfRaw.length > 0 ? { resolvedFrom: [...rfRaw].sort((a, b) => a.localeCompare(b)) } : {}),
    ...(event.mergePolicy !== undefined ? { mergePolicy: event.mergePolicy } : {}),
    ...(event.conflictSetId !== undefined ? { conflictSetId: event.conflictSetId } : {}),
    payload: event.payload,
    sequence: event.sequence,
    type: event.type,
  }) as Record<string, unknown>;

  const logicalTime = asLogicalTime(c.logicalTime);
  const out: CanonicalEvent = {
    eventId: String(c.eventId),
    nodeId: String(c.nodeId),
    logicalTime,
    sequence: Number(c.sequence),
    type: String(c.type),
    payload: c.payload,
  };
  const pid = c.parentEventIds;
  if (pid !== undefined && Array.isArray(pid) && pid.length > 0) {
    out.parentEventIds = [...pid].map(String).sort((a, b) => a.localeCompare(b));
  }
  const rs = c.resolvedFrom;
  if (rs !== undefined && Array.isArray(rs) && rs.length > 0) {
    out.resolvedFrom = [...rs].map(String).sort((a, b) => a.localeCompare(b));
  }
  if (c.mergePolicy !== undefined) {
    const mp = c.mergePolicy;
    if (isLegacyMergePolicy(mp)) {
      out.mergePolicy = mp;
    } else if (isMergePolicyObject(mp)) {
      out.mergePolicy = canonicalizeMergePolicyForIdentity(mp) as DistributedEvent['mergePolicy'];
    } else {
      throw new DistributedInputValidationError('canonicalize: invalid mergePolicy shape');
    }
  }
  if (c.conflictSetId !== undefined) {
    out.conflictSetId = String(c.conflictSetId);
  }
  return out;
}

export function serializeDistributedEvent(event: DistributedEvent): string {
  return stableStringify(canonicalizeDistributedEvent(event));
}

export function hashDistributedEvent(event: DistributedEvent): string {
  const digest = crypto
    .createHash('sha256')
    .update(serializeDistributedEvent(event), 'utf8')
    .digest('hex');
  return `sha256-${digest}`;
}
