import type { GossipPayloadType } from './gossip_types.js';

export interface GossipMessagePolicy {
  allowCrossDomain: boolean;
  minTrustScore: number;
  maxTTL: number;
}

export const DEFAULT_GOSSIP_MESSAGE_POLICY: Record<GossipPayloadType, GossipMessagePolicy> = {
  TRUST_EVENT: { minTrustScore: 70, allowCrossDomain: true, maxTTL: 5 },
  AUDIT_ROOT: { minTrustScore: 60, allowCrossDomain: true, maxTTL: 5 },
  SYNC_REQUEST: { minTrustScore: 40, allowCrossDomain: false, maxTTL: 3 },
  SYNC_RESPONSE: { minTrustScore: 40, allowCrossDomain: false, maxTTL: 3 },
  CUSTOM: { minTrustScore: 30, allowCrossDomain: false, maxTTL: 5 },
};

