import { randomUUID } from 'node:crypto';

import { stableStringify } from '../security/stable_json.js';

export type TrustEventType =
  | 'NODE_ACTIVATED'
  | 'NODE_REVOKED'
  | 'DOMAIN_ADDED'
  | 'DOMAIN_REVOKED'
  | 'DOMAIN_RENEWED'
  | 'DOMAIN_ROTATED'
  | 'ROTATION_STARTED'
  | 'ROTATION_COMPLETED';

export type TrustEvent = {
  eventId: string;
  nodeId: string;
  type: TrustEventType;
  timestamp: number;
  payload: Record<string, unknown>;
  issuerNodeId: string;
  signature: string;
  endorsements: Array<{
    nodeId: string;
    signature: string;
  }>;
};

export type UnsignedTrustEvent = Omit<TrustEvent, 'eventId' | 'signature' | 'endorsements'> & {
  eventId?: string;
  endorsements?: Array<{
    nodeId: string;
    signature: string;
  }>;
};

export function buildTrustEventSigningPayload(event: Omit<TrustEvent, 'signature'>): string {
  return stableStringify({
    eventId: event.eventId,
    issuerNodeId: event.issuerNodeId,
    nodeId: event.nodeId,
    payload: event.payload,
    timestamp: event.timestamp,
    type: event.type,
    endorsements: event.endorsements
      .map((e) => ({ nodeId: e.nodeId, signature: e.signature }))
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
  });
}

export function createUnsignedTrustEvent(input: UnsignedTrustEvent): Omit<TrustEvent, 'signature'> {
  return {
    eventId: input.eventId ?? randomUUID(),
    issuerNodeId: input.issuerNodeId,
    nodeId: input.nodeId,
    payload: input.payload ?? {},
    timestamp: input.timestamp,
    type: input.type,
    endorsements: [],
  };
}
