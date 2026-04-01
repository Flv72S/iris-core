/**
 * Microstep 14T — Advanced Trust & Federation. Replay protection.
 */

import type { SignedRecordEnvelope } from './trust_types.js';

export class ReplayProtection {
  private readonly seenSignature = new Set<string>();
  private readonly seenTuple = new Set<string>();

  isReplay(envelope: SignedRecordEnvelope): boolean {
    if (this.seenSignature.has(envelope.signature)) return true;
    const tuple = `${envelope.node_id}:${envelope.signed_at}:${envelope.record_hash}`;
    return this.seenTuple.has(tuple);
  }

  register(envelope: SignedRecordEnvelope): void {
    this.seenSignature.add(envelope.signature);
    const tuple = `${envelope.node_id}:${envelope.signed_at}:${envelope.record_hash}`;
    this.seenTuple.add(tuple);
  }
}

