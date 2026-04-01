import type { TrustEventType } from './trust_events.js';

export interface TrustAuditRecord {
  recordId: string;
  eventId: string;
  nodeId: string;
  timestamp: number;
  eventType: TrustEventType;
  payloadHash: string;
  issuer: string;
  verified: boolean;
  endorsements?: {
    nodeId: string;
    signature: string;
  }[];
  previousRecordHash?: string;
  recordHash: string;
  /** Local auditor identity (non-repudiation); optional for legacy on-disk rows. */
  signerNodeId?: string;
  /** HMAC-SHA256 (base64) over canonical record excluding this field. */
  signature?: string;
  /** Preserves trust-event payload for deep verification (optional, backward compatible). */
  eventPayload?: Record<string, unknown>;
  /** Trust-event issuer signature; used with eventPayload in deep verify. */
  eventSignature?: string;
}
