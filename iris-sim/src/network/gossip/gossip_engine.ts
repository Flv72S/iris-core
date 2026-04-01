import { securityLog } from '../../security/security_logger.js';
import { signPayload, verifySignature } from '../../security/hmac.js';
import type { TrustEvent } from '../../control_plane/trust_events.js';

import type { PeerManager } from './peer_manager.js';
import type { GossipDedupCache } from './gossip_dedup.js';
import type { GossipRateLimiter } from './gossip_rate_limit.js';
import type { RoutingPolicy } from './routing_policy.js';
import { DEFAULT_ROUTING_POLICY, normalizeTrustScore, selectPeersForForward, type PeerInfo } from './routing_policy.js';
import { GossipControlPlane, type GossipControlPolicy } from './gossip_control_plane.js';
import { GossipLineageGuard, computeLineageHash } from './gossip_lineage.js';
import { GossipConsistencyTracker } from './gossip_consistency.js';
import { DEFAULT_GOSSIP_MESSAGE_POLICY, type GossipMessagePolicy } from './gossip_policy.js';
import {
  DEFAULT_GOSSIP_TTL,
  canonicalGossipSigningPayload,
  computeDeterministicMessageId,
  type GossipMessage,
  type UnsignedGossipMessage,
} from './gossip_types.js';
import {
  incGossipMetric,
  setGossipConsistencyStats,
  setGossipControlStats,
  setGossipDebugSnapshot,
} from './gossip_metrics.js';

export type GossipApplyHooks = {
  onTrustEventReceived?: (ev: TrustEvent, fromPeer: string) => void;
  onAuditRootReceived?: (root: { merkleRoot: string; timestamp: number }, fromPeer: string) => void;
  onCustomReceived?: (payload: any, fromPeer: string) => void;
  onSyncRequest?: (payload: any, fromPeer: string) => void;
  onSyncResponse?: (payload: any, fromPeer: string) => void;
  onInvalidMessage?: (nodeId: string, reason: string) => void;
};

export class GossipEngine {
  private readonly nodeId: string;
  private readonly domainId: string | undefined;
  private readonly now: () => number;
  private readonly timestampSkewMs: number;
  private readonly peerManager: PeerManager;
  private readonly dedup: GossipDedupCache;
  private readonly rate: GossipRateLimiter;
  private readonly routing: RoutingPolicy;
  private readonly random: () => number;
  private readonly hooks: GossipApplyHooks;
  private readonly keyResolver: (nodeId: string) => string | undefined;
  private readonly sendToPeer: (peerNodeId: string, msg: GossipMessage<any>) => void;
  private readonly controlPlane: GossipControlPlane;
  private readonly lineageGuard = new GossipLineageGuard();
  private readonly consistency = new GossipConsistencyTracker();
  private readonly messagePolicy: Record<string, GossipMessagePolicy>;

  constructor(args: {
    nodeId: string;
    domainId?: string;
    peerManager: PeerManager;
    dedup: GossipDedupCache;
    rateLimiter: GossipRateLimiter;
    routingPolicy?: Partial<RoutingPolicy>;
    now?: () => number;
    timestampSkewMs?: number;
    random?: () => number;
    hooks?: GossipApplyHooks;
    controlPolicy?: Partial<GossipControlPolicy>;
    messagePolicy?: Partial<Record<string, Partial<GossipMessagePolicy>>>;
    keyResolver: (nodeId: string) => string | undefined;
    sendToPeer: (peerNodeId: string, msg: GossipMessage<any>) => void;
  }) {
    this.nodeId = args.nodeId;
    this.domainId = args.domainId;
    this.peerManager = args.peerManager;
    this.dedup = args.dedup;
    this.rate = args.rateLimiter;
    this.routing = { ...DEFAULT_ROUTING_POLICY, ...(args.routingPolicy ?? {}) };
    this.now = args.now ?? Date.now;
    this.timestampSkewMs = args.timestampSkewMs ?? 5 * 60_000;
    this.random = args.random ?? Math.random;
    this.hooks = args.hooks ?? {};
    this.keyResolver = args.keyResolver;
    this.sendToPeer = args.sendToPeer;
    this.controlPlane = new GossipControlPlane(args.controlPolicy);
    this.messagePolicy = {
      ...DEFAULT_GOSSIP_MESSAGE_POLICY,
      ...(args.messagePolicy ?? {}),
    } as Record<string, GossipMessagePolicy>;
  }

  broadcast<T>(msg: UnsignedGossipMessage<T>): GossipMessage<T> {
    const now = this.now();
    const full: GossipMessage<T> = {
      messageId:
        msg.messageId ??
        computeDeterministicMessageId({
          sourceNodeId: this.nodeId,
          timestamp: msg.timestamp ?? now,
          payloadType: msg.payloadType,
          payload: msg.payload,
        }),
      sourceNodeId: this.nodeId,
      originNodeId: this.nodeId,
      timestamp: msg.timestamp ?? now,
      createdAt: msg.timestamp ?? now,
      ttl: msg.ttl ?? DEFAULT_GOSSIP_TTL,
      hops: msg.hops ?? 0,
      payloadType: msg.payloadType,
      payload: msg.payload,
      signature: '',
    } as any;
    full.lineageHash = computeLineageHash({
      originNodeId: full.originNodeId ?? full.sourceNodeId,
      messageId: full.messageId,
      ...(full.previousHopNodeId !== undefined ? { previousHopNodeId: full.previousHopNodeId } : {}),
      createdAt: full.createdAt ?? full.timestamp,
    });

    const key = this.keyResolver(this.nodeId);
    if (!key) {
      throw new Error('GOSSIP_NO_SIGNING_KEY');
    }
    // sign with HMAC scheme used across IRIS control-plane (project-wide convention)
    const { signature: _sig, ...unsigned } = full;
    const payload = canonicalGossipSigningPayload(unsigned);
    full.signature = signPayload(key, payload);

    this.dedup.add(full.messageId, now);
    this.consistency.markSeen(full.messageId, this.nodeId, Math.max(1, this.peerManager.count() + 1));
    this.forward(full, undefined);
    return full;
  }

  receive(msg: GossipMessage<any>, fromPeer: string): void {
    const now = this.now();
    incGossipMetric('messagesReceived', 1);
    this.controlPlane.trackIncoming();
    this.peerManager.touch(fromPeer, now);
    setGossipDebugSnapshot({
      peersCount: this.peerManager.count(),
      activePeers: this.peerManager.getPeers().filter((p) => !p.isIsolated).length,
    });

    // 1. verify signature
    const key = this.keyResolver(msg.sourceNodeId);
    if (!key) {
      securityLog('GOSSIP_SIGNATURE_INVALID', { fromPeer, sourceNodeId: msg.sourceNodeId, reason: 'no-key' });
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, 'SIGNATURE_KEY_MISSING');
      return;
    }
    const { signature: _sig, ...unsigned } = msg;
    const signingPayload = canonicalGossipSigningPayload(unsigned);
    if (!verifySignature(key, signingPayload, msg.signature)) {
      securityLog('GOSSIP_SIGNATURE_INVALID', { fromPeer, sourceNodeId: msg.sourceNodeId });
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, 'SIGNATURE_INVALID');
      return;
    }

    // 2. validate timestamp window
    if (Math.abs(now - msg.timestamp) > this.timestampSkewMs) {
      securityLog('BYZANTINE_GOSSIP_DETECTED', { fromPeer, sourceNodeId: msg.sourceNodeId, reason: 'timestamp-window' });
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, 'TIMESTAMP_WINDOW');
      return;
    }

    // 2.5 lineage / replay-proof chain checks
    const lineage = this.lineageGuard.validate(msg, fromPeer);
    if (!lineage.ok) {
      if (lineage.reason === 'CROSS_PEER_REPLAY') {
        incGossipMetric('replayDetected', 1);
        securityLog('GOSSIP_REPLAY_DETECTED', { fromPeer, sourceNodeId: msg.sourceNodeId, reason: lineage.reason });
      } else {
        incGossipMetric('lineageInvalid', 1);
        securityLog('GOSSIP_LINEAGE_INVALID', { fromPeer, sourceNodeId: msg.sourceNodeId, reason: lineage.reason });
      }
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, lineage.reason);
      return;
    }

    // 3. dedup check
    if (this.dedup.has(msg.messageId, now)) {
      incGossipMetric('duplicatesDropped', 1);
      securityLog('GOSSIP_DUPLICATE_DROPPED', { fromPeer, messageId: msg.messageId });
      return;
    }
    this.dedup.add(msg.messageId, now);

    // 4. trust validation (via peer store attributes)
    const peerInfo = this.peerManager.getPeers().find((p) => p.nodeId === msg.sourceNodeId);
    if (peerInfo?.isIsolated) {
      securityLog('BYZANTINE_GOSSIP_DETECTED', { fromPeer, sourceNodeId: msg.sourceNodeId, reason: 'isolated' });
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, 'ISOLATED');
      return;
    }
    if (peerInfo && peerInfo.trustScore < this.routing.minTrustScore) {
      securityLog('ROUTING_PEER_FILTERED_LOW_TRUST', { nodeId: msg.sourceNodeId, trustScore: peerInfo.trustScore });
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, 'LOW_TRUST');
      return;
    }

    // 4.5 fine-grained policy enforcement by message type
    const policy = this.messagePolicy[msg.payloadType] ?? DEFAULT_GOSSIP_MESSAGE_POLICY.CUSTOM;
    if (peerInfo && normalizeTrustScore(peerInfo.trustScore) < policy.minTrustScore) {
      incGossipMetric('policyViolations', 1);
      securityLog('GOSSIP_POLICY_VIOLATION', { type: msg.payloadType, nodeId: msg.sourceNodeId, reason: 'MIN_TRUST' });
      return;
    }
    if (msg.ttl > policy.maxTTL) {
      incGossipMetric('policyViolations', 1);
      securityLog('GOSSIP_POLICY_VIOLATION', { type: msg.payloadType, nodeId: msg.sourceNodeId, reason: 'MAX_TTL' });
      return;
    }
    if (!policy.allowCrossDomain && this.domainId && peerInfo?.domainId && peerInfo.domainId !== this.domainId) {
      incGossipMetric('policyViolations', 1);
      securityLog('GOSSIP_POLICY_VIOLATION', { type: msg.payloadType, nodeId: msg.sourceNodeId, reason: 'DOMAIN' });
      return;
    }

    // 5. TTL/hops validation
    if (msg.ttl <= 0) {
      securityLog('GOSSIP_TTL_EXPIRED', { fromPeer, messageId: msg.messageId });
      return;
    }
    if (msg.hops < 0 || msg.hops > 1000) {
      securityLog('BYZANTINE_GOSSIP_DETECTED', { fromPeer, sourceNodeId: msg.sourceNodeId, reason: 'hops-invalid' });
      this.hooks.onInvalidMessage?.(msg.sourceNodeId, 'HOPS_INVALID');
      return;
    }

    // 6. rate limit (per immediate sender)
    if (!this.rate.allow(fromPeer, now)) {
      incGossipMetric('rateLimited', 1);
      securityLog('GOSSIP_RATE_LIMITED', { fromPeer });
      return;
    }

    // 7. apply payload
    this.applyPayload(msg, fromPeer);
    this.consistency.markSeen(msg.messageId, this.nodeId, Math.max(1, this.peerManager.count() + 1));
    const cs = this.consistency.getSnapshot();
    if (cs.convergenceRate < 0.5 && cs.partialMessages > 0) {
      securityLog('GOSSIP_PARTIAL_PROPAGATION', { messageId: msg.messageId, convergenceRate: cs.convergenceRate });
      if (cs.partialMessages > 5) {
        incGossipMetric('convergenceStalled', 1);
        securityLog('GOSSIP_CONVERGENCE_STALLED', { messageId: msg.messageId, partialMessages: cs.partialMessages });
      }
    }

    // 8. forward (if needed)
    this.forward(msg, fromPeer);
  }

  private applyPayload(msg: GossipMessage<any>, fromPeer: string): void {
    if (msg.payloadType === 'TRUST_EVENT') {
      this.hooks.onTrustEventReceived?.(msg.payload as TrustEvent, fromPeer);
      return;
    }
    if (msg.payloadType === 'AUDIT_ROOT') {
      this.hooks.onAuditRootReceived?.(msg.payload as { merkleRoot: string; timestamp: number }, fromPeer);
      return;
    }
    if (msg.payloadType === 'SYNC_REQUEST') {
      this.hooks.onSyncRequest?.(msg.payload, fromPeer);
      return;
    }
    if (msg.payloadType === 'SYNC_RESPONSE') {
      this.hooks.onSyncResponse?.(msg.payload, fromPeer);
      return;
    }
    if (msg.payloadType === 'CUSTOM') {
      this.hooks.onCustomReceived?.(msg.payload, fromPeer);
      return;
    }
  }

  private forward(msg: GossipMessage<any>, fromPeer: string | undefined): void {
    const now = this.now();
    const candidates = this.peerManager.getPeers().filter((p) => p.nodeId !== fromPeer && p.nodeId !== this.nodeId);
    const { selected, filteredLowTrust, filteredDomain } = selectPeersForForward({
      policy: this.routing,
      peers: candidates as PeerInfo[],
      msg,
      now,
      random: this.random,
      ...(this.domainId !== undefined ? { localDomainId: this.domainId } : {}),
    });
    if (filteredLowTrust > 0) securityLog('ROUTING_PEER_FILTERED_LOW_TRUST', { filteredLowTrust });
    if (filteredDomain > 0) securityLog('ROUTING_DOMAIN_REJECTED', { filteredDomain });

    if (selected.length === 0) return;
    const adaptive = this.controlPlane.computeFanout(selected);
    const fwd: GossipMessage<any> = {
      ...msg,
      previousHopNodeId: this.nodeId,
      ttl: msg.ttl - 1,
      hops: msg.hops + 1,
    };
    fwd.lineageHash = computeLineageHash({
      originNodeId: fwd.originNodeId ?? fwd.sourceNodeId,
      messageId: fwd.messageId,
      ...(fwd.previousHopNodeId !== undefined ? { previousHopNodeId: fwd.previousHopNodeId } : {}),
      createdAt: fwd.createdAt ?? fwd.timestamp,
    });
    if (fwd.ttl <= 0) return;
    for (const p of adaptive) {
      if (!this.controlPlane.shouldForward(fwd, p)) {
        incGossipMetric('blockedAmplifications', 1);
        securityLog('GOSSIP_AMPLIFICATION_BLOCKED', { peerNodeId: p.nodeId, messageId: fwd.messageId });
        continue;
      }
      if (!this.controlPlane.trackInflight(fwd.messageId, p.nodeId)) {
        incGossipMetric('inflightLimitExceeded', 1);
        securityLog('GOSSIP_INFLIGHT_LIMIT_EXCEEDED', { peerNodeId: p.nodeId, messageId: fwd.messageId });
        continue;
      }
      incGossipMetric('messagesForwarded', 1);
      this.sendToPeer(p.nodeId, fwd);
      this.controlPlane.releaseInflight(fwd.messageId, p.nodeId);
    }
    setGossipControlStats(this.controlPlane.getStats());
    setGossipConsistencyStats(this.consistency.getSnapshot());
  }
}

