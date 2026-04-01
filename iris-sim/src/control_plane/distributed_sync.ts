import fs from 'node:fs';
import path from 'node:path';

import { securityLog } from '../security/security_logger.js';
import { tryCanonicalizePublicKey } from './identity/key_canonicalization.js';
import { DEFAULT_CANONICAL_IDENTITY, type CanonicalIdentityType } from './identity/canonical_identity.js';
import type { DomainRegistry } from './domain_registry.js';
import type { TrustDomain } from './trust_domain.js';
import type { TrustLevel } from './trust_domain.js';
import type { PeerInfo } from './peer_types.js';
import type { KeyProvider } from './keys/key_types.js';
import { verifyMerkleProof } from './merkle_proof.js';
import type { PeerRegistry } from './peer_registry.js';
import { negotiateCanonicalIdentity } from './federation/negotiation.js';
import type { DomainCertificate } from './federation/domain_certificate.js';
import {
  DomainCertificateVerificationError,
  verifyDomainCertificate,
} from './federation/domain_certificate_verify.js';
import {
  signProtocolMessage,
  verifyProtocolMessage,
  type VerifyProtocolOptions,
} from './trust_sync_protocol_sign.js';
import type { ProofRequest, ProofResponse, RootAnnouncement, SyncState } from './trust_sync_protocol.js';
import type { TrustSyncEngine } from './trust_sync_engine.js';

/** Replay / clock skew window for signed sync envelopes. */
export const SYNC_PROTOCOL_MAX_SKEW_MS = 300_000;

export type DistributedSyncOptions = {
  /** Required to verify legacy HMAC envelopes without `signerPublicKey`. */
  legacySharedSecret?: string;
};

export type FederationObservability = {
  domainId: string;
  peersByDomain: Record<string, number>;
  rejectedByPolicy: number;
};

export type FederationSecurityObservability = {
  revokedDomainAttempts: number;
  negotiationFailures: number;
  trustLevelEnforcements: Record<string, number>;
  // Reserved for forward-compatibility with a previous placeholder metric name.
  rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo?: number;
};

export type SyncMetrics = {
  peers: number;
  divergences: number;
  federation?: FederationObservability;
  federationSecurity?: FederationSecurityObservability;
};

type FederationOperation = 'ROOT_RECEIVE' | 'PROOF_REQUEST_RECEIVE' | 'PROOF_RESPONSE_RECEIVE';

/** Read metrics persisted via `configureMetricsPersistence` (best-effort). */
export function tryLoadSyncMetrics(cwd: string): SyncMetrics | undefined {
  const p = path.join(cwd, '.iris', 'sync_metrics.json');
  if (!fs.existsSync(p)) return undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      peers?: unknown;
      divergences?: unknown;
      federation?: unknown;
      federationSecurity?: unknown;
    };
    if (typeof raw.peers !== 'number' || typeof raw.divergences !== 'number') return undefined;
    if (!raw.federation || typeof raw.federation !== 'object') {
      return { peers: raw.peers, divergences: raw.divergences };
    }
    const fed = raw.federation as {
      domainId?: unknown;
      peersByDomain?: unknown;
      rejectedByPolicy?: unknown;
    };
    const sec = raw.federationSecurity as {
      revokedDomainAttempts?: unknown;
      negotiationFailures?: unknown;
      trustLevelEnforcements?: unknown;
      rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo?: unknown;
    };
    if (
      typeof fed.domainId !== 'string' ||
      !fed.peersByDomain ||
      typeof fed.rejectedByPolicy !== 'number' ||
      typeof fed.peersByDomain !== 'object'
    ) {
      return { peers: raw.peers, divergences: raw.divergences };
    }

    const federationSecurity =
      sec &&
      typeof sec.revokedDomainAttempts === 'number' &&
      typeof sec.negotiationFailures === 'number' &&
      sec.trustLevelEnforcements &&
      typeof sec.trustLevelEnforcements === 'object'
        ? ({
            revokedDomainAttempts: sec.revokedDomainAttempts,
            negotiationFailures: sec.negotiationFailures,
            trustLevelEnforcements: sec.trustLevelEnforcements as Record<string, number>,
            ...(typeof sec.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo === 'number'
              ? { rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo: sec.rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo }
              : {}),
          } as FederationSecurityObservability)
        : undefined;
    return {
      peers: raw.peers,
      divergences: raw.divergences,
      federation: {
        domainId: fed.domainId,
        peersByDomain: fed.peersByDomain as Record<string, number>,
        rejectedByPolicy: fed.rejectedByPolicy,
      },
      ...(federationSecurity ? { federationSecurity } : {}),
    };
  } catch {
    return undefined;
  }
}

function peerDomain(peer: PeerInfo | null, fallback: string): string {
  if (!peer) return fallback;
  if (typeof peer.domainId === 'string' && peer.domainId.length > 0) return peer.domainId;
  return fallback;
}

export class DistributedSyncManager {
  private readonly states = new Map<string, SyncState>();
  private readonly peerRoots = new Map<string, string>();
  private pending: ProofRequest | null = null;
  private divergenceCount = 0;
  private metricsCwd: string | undefined;

  private rejectedByPolicyCount = 0;
  private peersByDomain: Record<string, number> = {};
  private revokedDomainAttempts = 0;
  private negotiationFailures = 0;
  private trustLevelEnforcements: Record<string, number> = {};

  constructor(
    private readonly keyProvider: KeyProvider,
    private readonly trustEngine: TrustSyncEngine,
    private readonly peerRegistry: PeerRegistry,
    private readonly domainRegistry: DomainRegistry,
    private readonly localDomainId: string,
    private readonly opts?: DistributedSyncOptions,
  ) {}

  /** Write metrics to `.iris/sync_metrics.json` for CLI / observability. */
  configureMetricsPersistence(cwd: string): void {
    this.metricsCwd = cwd;
    this.flushMetrics();
  }

  private flushMetrics(): void {
    if (!this.metricsCwd) return;
    const dir = path.join(this.metricsCwd, '.iris');
    fs.mkdirSync(dir, { recursive: true });
    const payload: SyncMetrics = {
      peers: this.states.size,
      divergences: this.divergenceCount,
      federation: {
        domainId: this.localDomainId,
        peersByDomain: this.peersByDomain,
        rejectedByPolicy: this.rejectedByPolicyCount,
      },
      federationSecurity: {
        revokedDomainAttempts: this.revokedDomainAttempts,
        negotiationFailures: this.negotiationFailures,
        trustLevelEnforcements: this.trustLevelEnforcements,
      },
    };
    const p = path.join(dir, 'sync_metrics.json');
    const tmp = `${p}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(payload)}\n`, 'utf8');
    fs.renameSync(tmp, p);
  }

  private get localNodeId(): string {
    return this.trustEngine.getLocalNodeId();
  }

  private legacyVerifyOptions(): VerifyProtocolOptions | undefined {
    const s = this.opts?.legacySharedSecret;
    if (s === undefined) return undefined;
    return { legacySharedSecret: s };
  }

  private now(): number {
    return Date.now();
  }

  private fresh(ts: number): boolean {
    return Math.abs(this.now() - ts) <= SYNC_PROTOCOL_MAX_SKEW_MS;
  }

  private async protocolSignerPublicKey(): Promise<string | undefined> {
    const pair = await this.keyProvider.getKey('protocol_signing');
    const pub = pair?.publicKey ?? '';
    if (pub.trim().length === 0) return undefined;
    return pub;
  }

  private validateSignerPublicKeyMaterial(signerPublicKey: string | undefined, phase: string): boolean {
    if (!signerPublicKey || signerPublicKey.length === 0) return true; // legacy / HMAC
    const c = tryCanonicalizePublicKey(signerPublicKey);
    if (c.ok) return true;
    const ev = c.code === 'INVALID_PUBLIC_KEY_FORMAT' ? 'INVALID_PUBLIC_KEY_FORMAT' : 'PUBLIC_KEY_CANONICALIZATION_FAILED';
    securityLog(ev, { phase: `sync_${phase}` });
    return false;
  }

  private validatePeerSignerPublicKey(peer: PeerInfo, signerPublicKey: string | undefined, phase: string): boolean {
    // Legacy / HMAC mode: no signerPublicKey in the envelope.
    if (!signerPublicKey || signerPublicKey.length === 0) return true;
    // Legacy peer may have no stored publicKey.
    if (!peer.publicKey || peer.publicKey.length === 0) {
      securityLog('SYNC_INVALID_PUBLIC_KEY', { phase, nodeId: peer.nodeId });
      return false;
    }
    const a = tryCanonicalizePublicKey(peer.publicKey);
    const b = tryCanonicalizePublicKey(signerPublicKey);
    if (!a.ok || !b.ok) {
      securityLog('SYNC_INVALID_PUBLIC_KEY', { phase, nodeId: peer.nodeId });
      return false;
    }
    if (!a.der.equals(b.der)) {
      securityLog('SYNC_INVALID_PUBLIC_KEY', { phase, nodeId: peer.nodeId });
      return false;
    }
    return true;
  }

  private incrementRejection(reason: string, meta?: Record<string, unknown>): void {
    this.rejectedByPolicyCount += 1;
    securityLog(reason, meta ?? {});
  }

  private getLocalDomain(): TrustDomain | null {
    return this.domainRegistry.getDomain(this.localDomainId);
  }

  private validateDomainSpoof(peer: PeerInfo, msgDomainId: string | undefined, phase: string): boolean {
    // Compatibility: missing domainId means "assume local domain".
    if (!msgDomainId) return true;
    if (peer.domainId && msgDomainId !== peer.domainId) {
      this.incrementRejection('DOMAIN_SPOOF_DETECTED', { phase, expected: peer.domainId, claimed: msgDomainId });
      return false;
    }
    return true;
  }

  private selectLocalCanonicalIdentity(localDomain: TrustDomain | null): CanonicalIdentityType {
    const ids = localDomain?.acceptedCanonicalIdentities ?? [];
    if (ids.length > 0) return ids[0]!;
    return DEFAULT_CANONICAL_IDENTITY;
  }

  private isTrustLevelOperationAllowed(trustLevel: TrustLevel, op: FederationOperation): boolean {
    switch (trustLevel) {
      case 'FULL':
        return true;
      case 'PARTIAL': // allowSyncOnly
        return op === 'ROOT_RECEIVE';
      case 'READ_ONLY': // allowReceiveOnly
        return op === 'ROOT_RECEIVE' || op === 'PROOF_RESPONSE_RECEIVE';
      case 'PROOF_ONLY': // allowProofExchangeOnly
        return op === 'PROOF_REQUEST_RECEIVE' || op === 'PROOF_RESPONSE_RECEIVE';
      default:
        return false;
    }
  }

  private enforceFederationPolicy(args: {
    phase: string;
    operation: FederationOperation;
    peer: PeerInfo;
    msgDomainId: string;
    msgCanonicalIdentity: CanonicalIdentityType | undefined;
    msgSupportedCanonicalIdentities: CanonicalIdentityType[] | undefined;
    msgDomainCertificate: DomainCertificate | undefined;
  }): boolean {
    const localDomain = this.getLocalDomain();
    if (!localDomain) {
      this.incrementRejection('CROSS_DOMAIN_FORBIDDEN', { phase: args.phase, reason: 'missing_local_domain' });
      return false;
    }
    const remoteDomain = this.domainRegistry.getDomain(args.msgDomainId);
    if (!remoteDomain) {
      this.incrementRejection('UNTRUSTED_DOMAIN', { phase: args.phase, domainId: args.msgDomainId });
      return false;
    }

    // Step 2 — Domain certificate validation (or legacy fallback)
    if (args.msgDomainCertificate) {
      try {
        verifyDomainCertificate(args.msgDomainCertificate);
      } catch (e) {
        if (e instanceof DomainCertificateVerificationError) {
          securityLog(e.code, { phase: args.phase });
        } else {
          securityLog('DOMAIN_CERT_INVALID_KEY', { phase: args.phase });
        }
        this.incrementRejection('DOMAIN_CERT_INVALID', { phase: args.phase });
        return false;
      }
      if (args.msgDomainCertificate.domainId !== args.msgDomainId) {
        securityLog('DOMAIN_IDENTITY_MISMATCH', { phase: args.phase });
        this.incrementRejection('DOMAIN_IDENTITY_MISMATCH', { phase: args.phase });
        return false;
      }
    } else {
      // Backward compatible legacy mode.
      securityLog('LEGACY_DOMAIN_MODE', { phase: args.phase });
    }

    // Step 3 — Revocation check (hard deny)
    const locallyRevoked =
      localDomain.revokedDomains?.includes(args.msgDomainId) ?? false;
    if (locallyRevoked || this.domainRegistry.isDomainRevoked(args.msgDomainId)) {
      securityLog('DOMAIN_REVOKED', { phase: args.phase, domainId: args.msgDomainId });
      this.revokedDomainAttempts += 1;
      return false;
    }

    // Step 4 — Negotiation
    const negotiated = negotiateCanonicalIdentity(localDomain, remoteDomain);
    if (!negotiated) {
      securityLog('NO_COMMON_CANONICAL_IDENTITY', { phase: args.phase });
      this.negotiationFailures += 1;
      return false;
    }

    const msgCanonicalIdentity = args.msgCanonicalIdentity ?? negotiated;
    if (args.msgSupportedCanonicalIdentities) {
      if (!args.msgSupportedCanonicalIdentities.includes(negotiated)) {
        securityLog('NO_COMMON_CANONICAL_IDENTITY', { phase: args.phase });
        this.negotiationFailures += 1;
        return false;
      }
    }
    if (msgCanonicalIdentity !== negotiated) {
      securityLog('CANONICAL_IDENTITY_MISMATCH', {
        phase: args.phase,
        canonicalIdentity: msgCanonicalIdentity,
        negotiated,
      });
      this.incrementRejection('UNSUPPORTED_CANONICAL_IDENTITY', { phase: args.phase });
      return false;
    }

    // Step 5 — Trust level enforcement
    if (!this.isTrustLevelOperationAllowed(localDomain.trustLevel, args.operation)) {
      const k = `${localDomain.trustLevel}:${args.operation}`;
      this.trustLevelEnforcements[k] = (this.trustLevelEnforcements[k] ?? 0) + 1;
      securityLog('TRUST_LEVEL_ENFORCEMENT_DENIED', { phase: args.phase, trustLevel: localDomain.trustLevel, operation: args.operation });
      return false;
    }

    // Step 6 — Cross-domain enforcement
    const sameDomain = args.msgDomainId === this.localDomainId;
    if (!sameDomain) {
      const allowed = localDomain.allowCrossDomainSync && localDomain.trustedDomains.includes(args.msgDomainId);
      if (!allowed) {
        securityLog('UNTRUSTED_DOMAIN', { phase: args.phase, domainId: args.msgDomainId });
        this.incrementRejection('UNTRUSTED_DOMAIN', { phase: args.phase });
        return false;
      }
    }

    return true;
  }

  private noteAcceptedPeer(peer: PeerInfo): void {
    const did = peerDomain(peer, this.localDomainId);
    this.peersByDomain[did] = (this.peersByDomain[did] ?? 0) + 1;
  }

  async announceRoot(): Promise<RootAnnouncement> {
    const snap = this.trustEngine.getAuditSnapshot();
    const timestamp = this.now();
    const localDomain = this.getLocalDomain();
    const canonicalIdentity = this.selectLocalCanonicalIdentity(localDomain);
    const base = {
      nodeId: this.localNodeId,
      merkleRoot: snap.merkleRoot,
      totalRecords: snap.totalRecords,
      timestamp,
      canonicalIdentity,
      supportedCanonicalIdentities:
        localDomain?.supportedCanonicalIdentities ?? localDomain?.acceptedCanonicalIdentities ?? [canonicalIdentity],
      domainId: this.localDomainId,
      ...(localDomain?.domainCertificate ? { domainCertificate: localDomain.domainCertificate } : {}),
    };
    const pub = await this.protocolSignerPublicKey();
    const payload = pub ? { ...base, signerPublicKey: pub } : base;
    const signature = await signProtocolMessage(payload, this.keyProvider);
    return { ...payload, signature };
  }

  async receiveRoot(announcement: RootAnnouncement): Promise<void> {
    if (!this.validateSignerPublicKeyMaterial(announcement.signerPublicKey, 'root')) return;

    const peer = this.peerRegistry.resolve(announcement.nodeId);
    if (!peer) {
      securityLog('SYNC_UNTRUSTED_PEER', { nodeId: announcement.nodeId });
      this.incrementRejection('UNTRUSTED_PEER', { phase: 'root' });
      return;
    }
    if (peer.revoked) {
      securityLog('SYNC_REVOKED_PEER', { nodeId: announcement.nodeId });
      this.incrementRejection('REVOKED_PEER', { phase: 'root' });
      return;
    }
    if (!peer.trusted) {
      securityLog('SYNC_UNTRUSTED_PEER', { nodeId: announcement.nodeId });
      this.incrementRejection('UNTRUSTED_PEER', { phase: 'root' });
      return;
    }

    if (!this.validatePeerSignerPublicKey(peer, announcement.signerPublicKey, 'root')) return;

    if (!this.validateDomainSpoof(peer, announcement.domainId, 'root')) return;
    const claimedDomainId = announcement.domainId ?? this.localDomainId;
    if (
      !this.enforceFederationPolicy({
        phase: 'root',
        operation: 'ROOT_RECEIVE',
        peer,
        msgDomainId: claimedDomainId,
        msgCanonicalIdentity: announcement.canonicalIdentity,
        msgSupportedCanonicalIdentities: announcement.supportedCanonicalIdentities,
        msgDomainCertificate: announcement.domainCertificate,
      })
    ) {
      return;
    }

    const ok = await verifyProtocolMessage(announcement, this.keyProvider, this.legacyVerifyOptions());
    if (!ok) {
      securityLog('SYNC_SIGNATURE_INVALID', { phase: 'root', nodeId: announcement.nodeId });
      return;
    }

    if (!this.fresh(announcement.timestamp)) {
      securityLog('SYNC_SIGNATURE_INVALID', { phase: 'root_stale', nodeId: announcement.nodeId });
      return;
    }

    if (announcement.nodeId === this.localNodeId) return;

    const localRoot = this.trustEngine.getAuditSnapshot().merkleRoot;
    const divergenceDetected = localRoot !== announcement.merkleRoot;
    if (divergenceDetected) {
      this.divergenceCount += 1;
      securityLog('SYNC_DIVERGENCE_DETECTED', { localRoot, remoteRoot: announcement.merkleRoot, peer: announcement.nodeId });
    }

    this.peerRoots.set(announcement.nodeId, announcement.merkleRoot);
    this.states.set(announcement.nodeId, {
      nodeId: announcement.nodeId,
      lastKnownRoot: announcement.merkleRoot,
      lastSyncTimestamp: announcement.timestamp,
      divergenceDetected,
    });

    this.noteAcceptedPeer(peer);
    this.flushMetrics();
  }

  detectDivergence(remote: RootAnnouncement): boolean {
    const localRoot = this.trustEngine.getAuditSnapshot().merkleRoot;
    return localRoot !== remote.merkleRoot;
  }

  async requestProof(targetNodeId: string, index: number): Promise<ProofRequest> {
    // Prefer the lastKnownRoot we already recorded during `receiveRoot()`.
    // This avoids any internal key/path mismatch affecting expectedRoot selection.
    const st = this.states.get(targetNodeId);
    const expectedRoot = st?.lastKnownRoot ?? this.trustEngine.getAuditSnapshot().merkleRoot;
    const localDomain = this.getLocalDomain();
    const canonicalIdentity = this.selectLocalCanonicalIdentity(localDomain);
    const timestamp = this.now();
    const base = {
      requesterNodeId: this.localNodeId,
      targetNodeId,
      recordIndex: index,
      expectedRoot,
      timestamp,
      canonicalIdentity,
      supportedCanonicalIdentities:
        localDomain?.supportedCanonicalIdentities ?? localDomain?.acceptedCanonicalIdentities ?? [canonicalIdentity],
      domainId: this.localDomainId,
      ...(localDomain?.domainCertificate ? { domainCertificate: localDomain.domainCertificate } : {}),
    };
    const pub = await this.protocolSignerPublicKey();
    const payload = pub ? { ...base, signerPublicKey: pub } : base;
    const signature = await signProtocolMessage(payload, this.keyProvider);
    const req: ProofRequest = { ...payload, signature };
    this.pending = req;
    return req;
  }

  async createProofResponse(request: ProofRequest): Promise<ProofResponse | null> {
    if (request.targetNodeId !== this.localNodeId) return null;
    if (!this.validateSignerPublicKeyMaterial(request.signerPublicKey, 'proof_request')) return null;

    const peer = this.peerRegistry.resolve(request.requesterNodeId);
    if (!peer) {
      this.incrementRejection('UNTRUSTED_PEER', { phase: 'proof_request' });
      return null;
    }
    if (peer.revoked || !peer.trusted) {
      this.incrementRejection(peer.revoked ? 'REVOKED_PEER' : 'UNTRUSTED_PEER', { phase: 'proof_request' });
      return null;
    }

    if (!this.validatePeerSignerPublicKey(peer, request.signerPublicKey, 'proof_request')) return null;
    if (!this.validateDomainSpoof(peer, request.domainId, 'proof_request')) return null;

    const claimedDomainId = request.domainId ?? this.localDomainId;
    if (
      !this.enforceFederationPolicy({
        phase: 'proof_request',
        operation: 'PROOF_REQUEST_RECEIVE',
        peer,
        msgDomainId: claimedDomainId,
        msgCanonicalIdentity: request.canonicalIdentity,
        msgSupportedCanonicalIdentities: request.supportedCanonicalIdentities,
        msgDomainCertificate: request.domainCertificate,
      })
    ) {
      return null;
    }

    const ok = await verifyProtocolMessage(request, this.keyProvider, this.legacyVerifyOptions());
    if (!ok) {
      securityLog('SYNC_SIGNATURE_INVALID', { phase: 'proof_request' });
      return null;
    }
    if (!this.fresh(request.timestamp)) {
      securityLog('SYNC_SIGNATURE_INVALID', { phase: 'proof_request_stale' });
      return null;
    }

    const localRoot = this.trustEngine.getAuditSnapshot().merkleRoot;
    if (request.expectedRoot !== localRoot) {
      securityLog('SYNC_PROOF_INVALID', { phase: 'expected_root', expected: request.expectedRoot, actual: localRoot });
      return null;
    }

    const log = this.trustEngine.getAuditLog();
    const all = log.getAll();
    const idx = request.recordIndex;
    if (idx < 0 || idx >= all.length) return null;

    const proof = log.getProofForRecord(idx);
    if (proof.root !== localRoot) return null;

    const record = all[idx]!;
    const ts = this.now();
    const localDomain = this.getLocalDomain();
    const canonicalIdentity = this.selectLocalCanonicalIdentity(localDomain);
    const base = {
      responderNodeId: this.localNodeId,
      proof,
      record,
      timestamp: ts,
      canonicalIdentity,
      supportedCanonicalIdentities:
        localDomain?.supportedCanonicalIdentities ?? localDomain?.acceptedCanonicalIdentities ?? [canonicalIdentity],
      domainId: this.localDomainId,
      ...(localDomain?.domainCertificate ? { domainCertificate: localDomain.domainCertificate } : {}),
    };

    const pub = await this.protocolSignerPublicKey();
    const payload = pub ? { ...base, signerPublicKey: pub } : base;
    const signature = await signProtocolMessage(payload, this.keyProvider);
    return { ...payload, signature };
  }

  async receiveProofResponse(response: ProofResponse): Promise<void> {
    const pending = this.pending;
    if (!pending) return;
    if (response.responderNodeId !== pending.targetNodeId) return;

    if (!this.validateSignerPublicKeyMaterial(response.signerPublicKey, 'proof_response')) {
      this.pending = null;
      return;
    }

    const peer = this.peerRegistry.resolve(response.responderNodeId);
    if (!peer) {
      this.pending = null;
      this.incrementRejection('UNTRUSTED_PEER', { phase: 'proof_response' });
      return;
    }
    if (peer.revoked || !peer.trusted) {
      this.pending = null;
      this.incrementRejection(peer.revoked ? 'REVOKED_PEER' : 'UNTRUSTED_PEER', { phase: 'proof_response' });
      return;
    }

    if (!this.validatePeerSignerPublicKey(peer, response.signerPublicKey, 'proof_response')) {
      this.pending = null;
      return;
    }
    if (!this.validateDomainSpoof(peer, response.domainId, 'proof_response')) {
      this.pending = null;
      return;
    }
    const claimedDomainId = response.domainId ?? this.localDomainId;
    if (
      !this.enforceFederationPolicy({
        phase: 'proof_response',
        operation: 'PROOF_RESPONSE_RECEIVE',
        peer,
        msgDomainId: claimedDomainId,
        msgCanonicalIdentity: response.canonicalIdentity,
        msgSupportedCanonicalIdentities: response.supportedCanonicalIdentities,
        msgDomainCertificate: response.domainCertificate,
      })
    ) {
      this.pending = null;
      return;
    }

    const ok = await verifyProtocolMessage(response, this.keyProvider, this.legacyVerifyOptions());
    if (!ok) {
      securityLog('SYNC_SIGNATURE_INVALID', { phase: 'proof_response' });
      this.pending = null;
      return;
    }
    if (!this.fresh(response.timestamp)) {
      securityLog('SYNC_SIGNATURE_INVALID', { phase: 'proof_response_stale' });
      this.pending = null;
      return;
    }
    if (!verifyMerkleProof(response.proof)) {
      securityLog('SYNC_PROOF_INVALID', { phase: 'merkle' });
      this.pending = null;
      return;
    }
    if (response.proof.leafHash !== response.record.recordHash) {
      securityLog('SYNC_PROOF_INVALID', { phase: 'leaf_mismatch' });
      this.pending = null;
      return;
    }
    if (response.proof.root !== pending.expectedRoot) {
      securityLog('SYNC_PROOF_INVALID', { phase: 'root_mismatch' });
      this.pending = null;
      return;
    }

    const local = this.trustEngine.getAuditLog();
    const locAll = local.getAll();
    const idx = pending.recordIndex;
    if (idx < locAll.length) {
      if (locAll[idx]!.recordHash === response.record.recordHash) {
        this.pending = null;
        return;
      }
      securityLog('SYNC_CONFLICT_DETECTED', { recordIndex: idx });
      this.pending = null;
      return;
    }
    if (idx > locAll.length) {
      securityLog('SYNC_CONFLICT_DETECTED', {
        reason: 'index_gap',
        localLen: locAll.length,
        requested: idx,
      });
      this.pending = null;
      return;
    }

    try {
      local.appendReplica(response.record);
    } catch (e) {
      securityLog('SYNC_CONFLICT_DETECTED', { message: (e as Error).message });
    }
    this.pending = null;

    this.noteAcceptedPeer(peer);
    this.flushMetrics();
  }

  getSyncState(peerNodeId: string): SyncState {
    return (
      this.states.get(peerNodeId) ?? {
        nodeId: peerNodeId,
        lastKnownRoot: '',
        lastSyncTimestamp: 0,
        divergenceDetected: false,
      }
    );
  }

  getObservabilitySync(): { peers: number; divergences: number } {
    return { peers: this.states.size, divergences: this.divergenceCount };
  }

  getObservabilityFederation(): FederationObservability {
    return { domainId: this.localDomainId, peersByDomain: this.peersByDomain, rejectedByPolicy: this.rejectedByPolicyCount };
  }
}
