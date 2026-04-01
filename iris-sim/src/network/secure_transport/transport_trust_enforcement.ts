export type TransportTrustLevel = 'FULL' | 'READ_ONLY' | 'PROOF_ONLY' | 'BLOCKED';

export interface TransportTrustEngineLike {
  isNodeTrusted(nodeId: string): boolean;
  isDomainTrusted(domainId: string | undefined): boolean;
  getTrustLevel(nodeId: string): TransportTrustLevel;
  isNodeIsolated?(nodeId: string): boolean;
}

export function enforceConnectionTrust(args: {
  trustEngine: TransportTrustEngineLike;
  peerNodeId: string;
  peerDomainId?: string;
}): TransportTrustLevel {
  if (args.trustEngine.isNodeIsolated?.(args.peerNodeId)) {
    const err = new Error('TRANSPORT_NODE_ISOLATED');
    (err as any).code = 'TRANSPORT_NODE_ISOLATED';
    throw err;
  }
  if (!args.trustEngine.isNodeTrusted(args.peerNodeId)) {
    const err = new Error('UNTRUSTED_NODE');
    (err as any).code = 'UNTRUSTED_NODE';
    throw err;
  }
  if (!args.trustEngine.isDomainTrusted(args.peerDomainId)) {
    const err = new Error('UNTRUSTED_DOMAIN');
    (err as any).code = 'UNTRUSTED_DOMAIN';
    throw err;
  }
  const level = args.trustEngine.getTrustLevel(args.peerNodeId);
  if (level === 'BLOCKED') {
    const err = new Error('TRANSPORT_TRUST_VIOLATION');
    (err as any).code = 'TRANSPORT_TRUST_VIOLATION';
    throw err;
  }
  return level;
}

export function enforceSendPermission(args: { trustLevel: TransportTrustLevel }): void {
  // For this microstep, READ_ONLY connections cannot send.
  if (args.trustLevel === 'BLOCKED') {
    const err = new Error('TRANSPORT_TRUST_VIOLATION');
    (err as any).code = 'TRANSPORT_TRUST_VIOLATION';
    throw err;
  }
  if (args.trustLevel !== 'FULL') {
    const err = new Error('TRANSPORT_WRITE_BLOCKED');
    (err as any).code = 'TRANSPORT_WRITE_BLOCKED';
    throw err;
  }
}

