import type { TrustEvent } from './trust_events.js';
import type { TrustReputationEngine } from './trust_reputation.js';
import { verifySignature } from '../security/hmac.js';
import { stableStringify } from '../security/stable_json.js';

export type QuorumPolicy = {
  minSignatures: number;
  minReputationScore: number;
};

type QuorumValidatorOpts = {
  policy: QuorumPolicy;
  resolveNodeSecret: (nodeId: string) => string | undefined;
  reputation: TrustReputationEngine;
};

export class QuorumValidator {
  private readonly policy: QuorumPolicy;
  private readonly resolveNodeSecret: (nodeId: string) => string | undefined;
  private readonly reputation: TrustReputationEngine;

  constructor(opts: QuorumValidatorOpts) {
    this.policy = opts.policy;
    this.resolveNodeSecret = opts.resolveNodeSecret;
    this.reputation = opts.reputation;
  }

  validate(event: TrustEvent, endorsements: string[]): boolean {
    const uniq = [...new Set(endorsements)];
    if (uniq.length < this.policy.minSignatures) return false;

    let total = 0;
    let count = 0;
    const payload = stableStringify({
      eventId: event.eventId,
      issuerNodeId: event.issuerNodeId,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      type: event.type,
    });

    for (const nodeId of uniq) {
      const endorsement = event.endorsements.find((e) => e.nodeId === nodeId);
      if (!endorsement) return false;
      const sec = this.resolveNodeSecret(nodeId);
      if (!sec) return false;
      if (!verifySignature(sec, payload, endorsement.signature)) return false;
      total += this.reputation.getReputation(nodeId).score;
      count += 1;
    }
    if (count === 0) return false;
    return total / count >= this.policy.minReputationScore;
  }
}
