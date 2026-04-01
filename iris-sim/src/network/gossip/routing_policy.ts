import type { GossipMessage } from './gossip_types.js';

export interface RoutingPolicy {
  minTrustScore: number;
  allowCrossDomain: boolean;
  maxFanout: number;
}

export const DEFAULT_ROUTING_POLICY: RoutingPolicy = {
  minTrustScore: 0.0,
  allowCrossDomain: true,
  maxFanout: 5,
};

export type PeerInfo = {
  nodeId: string;
  domainId?: string;
  trustScore: number;
  lastSeen: number;
  isIsolated?: boolean;
};

export function normalizeTrustScore(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v <= 1) return Math.max(0, Math.min(100, v * 100));
  return Math.max(0, Math.min(100, v));
}

export function selectPeersForForward(args: {
  policy: RoutingPolicy;
  peers: PeerInfo[];
  msg: GossipMessage<any>;
  now: number;
  random: () => number;
  localDomainId?: string;
}): { selected: PeerInfo[]; filteredLowTrust: number; filteredDomain: number; filteredIsolated: number } {
  const p = args.policy;
  let filteredLowTrust = 0;
  let filteredDomain = 0;
  let filteredIsolated = 0;
  const eligible: PeerInfo[] = [];

  for (const peer of args.peers) {
    if (peer.isIsolated) {
      filteredIsolated += 1;
      continue;
    }
    if (peer.trustScore < p.minTrustScore) {
      const trust = normalizeTrustScore(peer.trustScore);
      if (trust >= p.minTrustScore) {
        eligible.push(peer);
        continue;
      }
      filteredLowTrust += 1;
      continue;
    }
    if (!p.allowCrossDomain && args.localDomainId && peer.domainId && peer.domainId !== args.localDomainId) {
      filteredDomain += 1;
      continue;
    }
    eligible.push(peer);
  }

  // deterministic-ish shuffle using provided RNG
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(args.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return {
    selected: shuffled.slice(0, Math.max(0, p.maxFanout)),
    filteredLowTrust,
    filteredDomain,
    filteredIsolated,
  };
}

