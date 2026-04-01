import type { GossipMessage } from './gossip_types.js';
import type { PeerInfo } from './routing_policy.js';
import { normalizeTrustScore } from './routing_policy.js';

export interface GossipControlPolicy {
  maxFanout: number;
  minFanout: number;
  maxTTL: number;
  maxHops: number;
  allowCrossDomain: boolean;
  adaptiveFanout: boolean;
  trustWeightFactor: number;
  maxInflightMessagesPerPeer: number;
  maxGlobalInflight: number;
  antiAmplificationFactor: number;
}

export const DEFAULT_GOSSIP_CONTROL_POLICY: GossipControlPolicy = {
  maxFanout: 5,
  minFanout: 1,
  maxTTL: 5,
  maxHops: 16,
  allowCrossDomain: true,
  adaptiveFanout: true,
  trustWeightFactor: 1.2,
  maxInflightMessagesPerPeer: 128,
  maxGlobalInflight: 2048,
  antiAmplificationFactor: 3,
};

export class GossipControlPlane {
  private readonly policy: GossipControlPolicy;
  private incomingCount = 0;
  private outgoingCount = 0;
  private readonly inflightPerPeer = new Map<string, Set<string>>();
  private readonly inflightGlobal = new Set<string>();
  private blockedAmplifications = 0;
  private fanoutSamples = 0;
  private fanoutSum = 0;

  constructor(policy?: Partial<GossipControlPolicy>) {
    this.policy = { ...DEFAULT_GOSSIP_CONTROL_POLICY, ...(policy ?? {}) };
  }

  getPolicy(): GossipControlPolicy {
    return { ...this.policy };
  }

  shouldForward(message: GossipMessage<any>, peer?: PeerInfo): boolean {
    if (message.ttl <= 0 || message.ttl > this.policy.maxTTL) return false;
    if (message.hops < 0 || message.hops > this.policy.maxHops) return false;
    if (peer?.isIsolated) return false;
    if (this.outgoingCount > this.incomingCount * this.policy.antiAmplificationFactor) {
      this.blockedAmplifications += 1;
      return false;
    }
    return true;
  }

  computeFanout(peers: PeerInfo[]): PeerInfo[] {
    if (peers.length === 0) return [];
    const sorted = [...peers].sort((a, b) => b.trustScore - a.trustScore || a.nodeId.localeCompare(b.nodeId));
    const avgTrust = sorted.reduce((s, p) => s + normalizeTrustScore(p.trustScore), 0) / sorted.length;
    const normalized = Math.min(1, Math.max(0, avgTrust / 100));
    const multiplier = this.policy.adaptiveFanout ? Math.pow(normalized || 0.01, this.policy.trustWeightFactor) : 1;
    const desired = Math.round(this.policy.maxFanout * multiplier);
    const fanout = Math.max(this.policy.minFanout, Math.min(this.policy.maxFanout, desired));
    this.fanoutSamples += 1;
    this.fanoutSum += fanout;
    return sorted.slice(0, fanout);
  }

  trackIncoming(): void {
    this.incomingCount += 1;
  }

  trackInflight(messageId: string, peerId: string): boolean {
    if (this.inflightGlobal.size >= this.policy.maxGlobalInflight) return false;
    const peerSet = this.inflightPerPeer.get(peerId) ?? new Set<string>();
    if (peerSet.size >= this.policy.maxInflightMessagesPerPeer) return false;
    peerSet.add(messageId);
    this.inflightPerPeer.set(peerId, peerSet);
    this.inflightGlobal.add(`${peerId}:${messageId}`);
    this.outgoingCount += 1;
    return true;
  }

  releaseInflight(messageId: string, peerId: string): void {
    const peerSet = this.inflightPerPeer.get(peerId);
    if (peerSet) {
      peerSet.delete(messageId);
      if (peerSet.size === 0) this.inflightPerPeer.delete(peerId);
    }
    this.inflightGlobal.delete(`${peerId}:${messageId}`);
  }

  getStats(): { inflight: number; blockedAmplifications: number; fanoutAverage: number } {
    return {
      inflight: this.inflightGlobal.size,
      blockedAmplifications: this.blockedAmplifications,
      fanoutAverage: this.fanoutSamples > 0 ? this.fanoutSum / this.fanoutSamples : 0,
    };
  }
}

