import { signPayload, verifySignature } from './hmac.js';
import { buildTrustEventSigningPayload, type TrustEvent } from '../control_plane/trust_events.js';

export function signTrustEvent(event: Omit<TrustEvent, 'signature'>, privateKey: string): string {
  const payload = buildTrustEventSigningPayload(event);
  return signPayload(privateKey, payload);
}

export function verifyTrustEvent(event: TrustEvent, publicKey: string): boolean {
  const payload = buildTrustEventSigningPayload({
    eventId: event.eventId,
    issuerNodeId: event.issuerNodeId,
    nodeId: event.nodeId,
    payload: event.payload,
    timestamp: event.timestamp,
    type: event.type,
    endorsements: event.endorsements,
  });
  return verifySignature(publicKey, payload, event.signature);
}
