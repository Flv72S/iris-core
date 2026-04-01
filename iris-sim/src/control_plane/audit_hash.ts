import { createHash } from 'node:crypto';

import { stableStringify } from '../security/stable_json.js';
import type { TrustAuditRecord } from './audit_types.js';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function computeAuditRecordHash(record: Omit<TrustAuditRecord, 'recordHash'>): string {
  const { recordId: _recordId, signature: _signature, ...rest } = record;
  return sha256Hex(stableStringify(rest));
}

export function chainAuditRecord(prev: TrustAuditRecord | null, next: TrustAuditRecord): TrustAuditRecord {
  const baseCore = {
    recordId: next.recordId,
    eventId: next.eventId,
    nodeId: next.nodeId,
    timestamp: next.timestamp,
    eventType: next.eventType,
    payloadHash: next.payloadHash,
    issuer: next.issuer,
    verified: next.verified,
    ...(next.endorsements ? { endorsements: next.endorsements } : {}),
    ...(next.signerNodeId ? { signerNodeId: next.signerNodeId } : {}),
    ...(next.eventPayload !== undefined ? { eventPayload: next.eventPayload } : {}),
    ...(next.eventSignature ? { eventSignature: next.eventSignature } : {}),
  };
  const base: Omit<TrustAuditRecord, 'recordHash'> = prev?.recordHash
    ? { ...baseCore, previousRecordHash: prev.recordHash }
    : { ...baseCore };
  const recordHash = computeAuditRecordHash(base);
  return {
    ...base,
    recordHash,
    recordId: recordHash,
  };
}
