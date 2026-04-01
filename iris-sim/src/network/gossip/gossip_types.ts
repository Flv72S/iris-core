import { stableStringify } from '../../security/stable_json.js';
import { createHash } from 'node:crypto';

export type GossipPayloadType = 'TRUST_EVENT' | 'AUDIT_ROOT' | 'SYNC_REQUEST' | 'SYNC_RESPONSE' | 'CUSTOM';

export interface GossipMessage<T = any> {
  messageId: string;
  sourceNodeId: string;
  originNodeId?: string;
  previousHopNodeId?: string;
  lineageHash?: string;
  createdAt?: number;
  timestamp: number;
  ttl: number;
  hops: number;
  payloadType: GossipPayloadType;
  payload: T;
  signature: string;
}

export type UnsignedGossipMessage<T = any> = {
  payloadType: GossipPayloadType;
  payload: T;
  timestamp?: number;
  ttl?: number;
  hops?: number;
  messageId?: string;
};

export const DEFAULT_GOSSIP_TTL = 5;

export function canonicalGossipSigningPayload(msg: Omit<GossipMessage<any>, 'signature'>): string {
  return stableStringify({
    messageId: msg.messageId,
    sourceNodeId: msg.sourceNodeId,
    timestamp: msg.timestamp,
    payloadType: msg.payloadType,
    payload: msg.payload,
  });
}

export function computeDeterministicMessageId(input: {
  sourceNodeId: string;
  timestamp: number;
  payloadType: GossipPayloadType;
  payload: unknown;
}): string {
  const canonical = stableStringify({
    sourceNodeId: input.sourceNodeId,
    timestamp: input.timestamp,
    payloadType: input.payloadType,
    payload: input.payload,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

