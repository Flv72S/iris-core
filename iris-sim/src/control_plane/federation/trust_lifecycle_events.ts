import { createUnsignedTrustEvent, type TrustEvent, type TrustEventType } from '../trust_events.js';
import { signTrustEvent, verifyTrustEvent } from '../../security/trust_event_crypto.js';
import { stableStringify } from '../../security/stable_json.js';
import { sha256 } from '../crypto/hash.js';

export type TrustLifecycleEventType = 'DOMAIN_ADDED' | 'DOMAIN_REVOKED' | 'DOMAIN_RENEWED' | 'DOMAIN_ROTATED';

export type TrustLifecycleEvent = TrustEvent & { type: TrustLifecycleEventType };

export type SignedTrustLifecycleEventInput = {
  type: TrustLifecycleEventType;
  domainId: string;
  issuerNodeId: string;
  signingSecret: string;
  timestamp?: number;
  eventId?: string;
  payload?: Record<string, unknown>;
};

export function buildDeterministicLifecycleEventId(input: Omit<SignedTrustLifecycleEventInput, 'eventId' | 'signingSecret'>): string {
  // Deterministic across nodes for the same (issuer, type, domain, timestamp, payload).
  return sha256(
    stableStringify({
      type: input.type,
      issuerNodeId: input.issuerNodeId,
      nodeId: input.domainId,
      timestamp: input.timestamp ?? 0,
      payload: input.payload ?? {},
    }),
  );
}

export function createSignedTrustLifecycleEvent(input: SignedTrustLifecycleEventInput): TrustLifecycleEvent {
  const timestamp = input.timestamp ?? Date.now();
  const basePayload = input.payload ?? {};

  const eventId =
    input.eventId ??
    buildDeterministicLifecycleEventId({
      type: input.type,
      domainId: input.domainId,
      issuerNodeId: input.issuerNodeId,
      timestamp,
      payload: basePayload,
    });

  const base = createUnsignedTrustEvent({
    eventId,
    issuerNodeId: input.issuerNodeId,
    nodeId: input.domainId,
    payload: basePayload,
    timestamp,
    type: input.type as TrustEventType,
  });

  const signature = signTrustEvent(base, input.signingSecret);
  return { ...base, signature, endorsements: base.endorsements } as TrustLifecycleEvent;
}

export function verifyTrustLifecycleEvent(event: TrustLifecycleEvent, issuerPublicSecret: string): boolean {
  return verifyTrustEvent(event, issuerPublicSecret);
}

