import type { ControlPlaneRegistry } from './control_plane_registry.js';
import { createUnsignedTrustEvent, type TrustEvent, type TrustEventType, type UnsignedTrustEvent } from './trust_events.js';
import { signTrustEvent, verifyTrustEvent } from '../security/trust_event_crypto.js';
import { TrustReputationEngine } from './trust_reputation.js';
import { MisbehaviorDetector } from './misbehavior_detector.js';
import { NodeIsolationManager } from './node_isolation.js';
import { QuorumValidator, type QuorumPolicy } from './quorum_validator.js';
import { signPayload } from '../security/hmac.js';
import { stableStringify } from '../security/stable_json.js';
import { AuditLog } from './audit_log.js';
import { EvidenceStore } from './evidence_store.js';
import type { KeyProvider } from './keys/key_types.js';
import type { TrustAuditRecord } from './audit_types.js';
import { createAuditSnapshot, type AuditSnapshot } from './audit_snapshot.js';
import type { MerkleProof } from './merkle_types.js';
import { createHash } from 'node:crypto';

type TrustSyncEngineOptions = {
  localNodeId: string;
  registry: ControlPlaneRegistry;
  localSecret: string;
  resolveIssuerSecret: (issuerNodeId: string) => string | undefined;
  send: (event: TrustEvent) => void;
  now?: () => number;
  quorumPolicy?: QuorumPolicy;
  auditCwd?: string;
  /** When set with `signSync`, audit records use this provider instead of HMAC with localSecret. */
  auditKeyProvider?: KeyProvider;
};

export class TrustSyncEngine {
  private readonly localNodeId: string;
  private readonly registry: ControlPlaneRegistry;
  private readonly localSecret: string;
  private readonly resolveIssuerSecret: (issuerNodeId: string) => string | undefined;
  private readonly send: (event: TrustEvent) => void;
  private readonly now: () => number;
  private readonly seenEvents = new Set<string>();
  private readonly reputation: TrustReputationEngine;
  private readonly detector: MisbehaviorDetector;
  private readonly isolation: NodeIsolationManager;
  private readonly quorum: QuorumValidator | undefined;
  private readonly auditLog: AuditLog;
  private readonly evidenceStore: EvidenceStore;
  private started = false;

  constructor(opts: TrustSyncEngineOptions) {
    this.localNodeId = opts.localNodeId;
    this.registry = opts.registry;
    this.localSecret = opts.localSecret;
    this.resolveIssuerSecret = opts.resolveIssuerSecret;
    this.send = opts.send;
    this.now = opts.now ?? Date.now;
    this.reputation = new TrustReputationEngine(this.now);
    this.evidenceStore = new EvidenceStore(this.now);
    this.detector = new MisbehaviorDetector({
      onViolation: (nodeId, violation, eventId) => this.evidenceStore.recordViolation(nodeId, violation, eventId),
    });
    this.isolation = new NodeIsolationManager();
    this.auditLog = new AuditLog(
      opts.auditCwd
        ? {
            cwd: opts.auditCwd,
            signingSecret: opts.localSecret,
            signerNodeId: opts.localNodeId,
            ...(opts.auditKeyProvider !== undefined ? { auditKeyProvider: opts.auditKeyProvider } : {}),
          }
        : {
            signingSecret: opts.localSecret,
            signerNodeId: opts.localNodeId,
            ...(opts.auditKeyProvider !== undefined ? { auditKeyProvider: opts.auditKeyProvider } : {}),
          },
    );
    this.quorum = opts.quorumPolicy
      ? new QuorumValidator({
          policy: opts.quorumPolicy,
          resolveNodeSecret: this.resolveIssuerSecret,
          reputation: this.reputation,
        })
      : undefined;
  }

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  start(): void {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
    this.seenEvents.clear();
  }

  broadcast(event: TrustEvent): void {
    if (!this.started) return;
    if (this.seenEvents.has(event.eventId)) return;
    this.seenEvents.add(event.eventId);
    this.send(event);
  }

  emitLocal(input: Omit<UnsignedTrustEvent, 'issuerNodeId' | 'timestamp'> & { timestamp?: number }): TrustEvent {
    const base = createUnsignedTrustEvent({
      ...input,
      issuerNodeId: this.localNodeId,
      timestamp: input.timestamp ?? this.now(),
    });
    const endorsements = this.endorse({
      ...base,
      signature: '',
    });
    const signed: TrustEvent = {
      ...base,
      endorsements,
      signature: signTrustEvent({ ...base, endorsements }, this.localSecret),
    };
    this.receive(signed);
    this.broadcast(signed);
    return signed;
  }

  receive(event: TrustEvent): void {
    if (!this.started) return;
    if (this.seenEvents.has(event.eventId)) return;
    this.auditEvent(event, false);
    if (this.isolation.isIsolated(event.issuerNodeId)) {
      this.auditEvent(event, false);
      return;
    }

    const issuerSecret = this.resolveIssuerSecret(event.issuerNodeId);
    if (!issuerSecret) {
      this.auditEvent(event, false);
      return;
    }
    if (!verifyTrustEvent(event, issuerSecret)) {
      this.reputation.decrease(event.issuerNodeId, 10);
      this.reputation.markViolation(event.issuerNodeId);
      this.isolateIfNeeded(event.issuerNodeId);
      this.auditEvent(event, false);
      return;
    }
    if (!this.isLogicalOrderValid(event)) {
      this.reputation.decrease(event.issuerNodeId, 8);
      this.reputation.markViolation(event.issuerNodeId);
      this.isolateIfNeeded(event.issuerNodeId);
      this.auditEvent(event, false);
      return;
    }

    const analysis = this.detector.analyze(event, this.registry);
    if (!analysis.isValid) {
      this.reputation.decrease(event.issuerNodeId, 7 + analysis.violations.length);
      this.reputation.markViolation(event.issuerNodeId);
      this.isolateIfNeeded(event.issuerNodeId);
      this.auditEvent(event, false);
      return;
    }

    if (this.quorum) {
      const endorsers = event.endorsements.map((e) => e.nodeId);
      const ok = this.quorum.validate(event, endorsers);
      if (!ok) {
        this.reputation.decrease(event.issuerNodeId, 6);
        this.reputation.markViolation(event.issuerNodeId);
        this.isolateIfNeeded(event.issuerNodeId);
        this.auditEvent(event, false);
        return;
      }
    }

    this.seenEvents.add(event.eventId);
    this.registry.applyTrustEvent(event);
    this.reputation.increase(event.issuerNodeId, 1);
    this.auditEvent(event, true);
  }

  getTrustSnapshot(): Record<string, { trustState: string; updatedAt: number; rotatedAt?: number; revokedAt?: number }> {
    return this.registry.getTrustSnapshot();
  }

  getReputation(nodeId: string) {
    return this.reputation.getReputation(nodeId);
  }

  isNodeIsolated(nodeId: string): boolean {
    return this.isolation.isIsolated(nodeId);
  }

  getEvidence(nodeId: string) {
    return this.evidenceStore.getEvidence(nodeId);
  }

  getAuditLog(): AuditLog {
    return this.auditLog;
  }

  getAuditSnapshot(): AuditSnapshot {
    return createAuditSnapshot(this.auditLog);
  }

  getProofForEvent(eventId: string): MerkleProof | null {
    const all = this.auditLog.getAll();
    const idx = all.findIndex((r) => r.eventId === eventId);
    if (idx < 0) return null;
    try {
      return this.auditLog.getProofForRecord(idx);
    } catch {
      return null;
    }
  }

  private isLogicalOrderValid(event: TrustEvent): boolean {
    const auth = this.registry.getNodeAuth(event.nodeId);
    if (event.type === 'ROTATION_COMPLETED') {
      return auth?.trustState === 'ROTATING';
    }
    if (event.type === 'ROTATION_STARTED') {
      return auth?.trustState === 'ACTIVE' || auth?.trustState === 'ROTATING';
    }
    return true;
  }

  private isolateIfNeeded(nodeId: string): void {
    const rep = this.reputation.getReputation(nodeId);
    if (rep.score < TrustReputationEngine.ISOLATION_THRESHOLD) {
      this.isolation.isolate(nodeId);
    }
  }

  private endorse(event: TrustEvent): Array<{ nodeId: string; signature: string }> {
    const payload = stableStringify({
      eventId: event.eventId,
      issuerNodeId: event.issuerNodeId,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      type: event.type,
    });
    return [{ nodeId: this.localNodeId, signature: signPayload(this.localSecret, payload) }];
  }

  private auditEvent(event: TrustEvent, verified: boolean): void {
    const payloadHash = createHash('sha256').update(stableStringify(event.payload), 'utf8').digest('hex');
    const record: TrustAuditRecord = {
      recordId: '',
      eventId: event.eventId,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      eventType: event.type,
      payloadHash,
      issuer: event.issuerNodeId,
      verified,
      signerNodeId: this.localNodeId,
      eventPayload: event.payload,
      eventSignature: event.signature,
      ...(event.endorsements.length > 0 ? { endorsements: event.endorsements } : {}),
      recordHash: '',
    };
    this.auditLog.append(record);
  }
}

export function makeLocalTrustEvent(input: {
  type: TrustEventType;
  nodeId: string;
  payload?: Record<string, unknown>;
  issuerNodeId: string;
  timestamp: number;
  signingSecret: string;
}): TrustEvent {
  const base = createUnsignedTrustEvent({
    issuerNodeId: input.issuerNodeId,
    nodeId: input.nodeId,
    payload: input.payload ?? {},
    timestamp: input.timestamp,
    type: input.type,
  });
  return {
    ...base,
    signature: signTrustEvent(base, input.signingSecret),
    endorsements: [],
  };
}
