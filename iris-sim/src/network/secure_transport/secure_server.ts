import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import type { CanonicalIdentityType } from '../../control_plane/identity/canonical_identity.js';
import type { TlsContext } from './tls_context.js';
import type { SecureConnection } from './secure_connection.js';
import { createSecureConnection } from './secure_connection.js';
import { TtlNonceReplayGuard, type ReplayGuard } from './replay_protection.js';
import {
  verifyHandshakeHello,
  verifySignedChallengeResponse,
  parseEphemeralPublicKeyB64,
  buildPfsEphemeralSignatureHash,
  signPfsEphemeralBinding,
  verifyPfsEphemeralBinding,
  type HandshakeHello,
  type HandshakeServerHello,
  type HandshakeNow,
  makeSignedChallengeResponse,
} from './handshake_protocol.js';
import { deriveSessionKey } from './pfs_kdf.js';
import { deriveSharedSecret, generateEphemeralKeyPair, zeroBuffer } from './pfs_keys.js';
import type { TransportTrustEngineLike, TransportTrustLevel } from './transport_trust_enforcement.js';
import { registerEndpoint, unregisterEndpoint } from './secure_transport_bus.js';

import { DEFAULT_CANONICAL_IDENTITY } from '../../control_plane/identity/canonical_identity.js';
import type { TransportAuditHook } from './audit_hooks.js';
import { incMetric, patchTransportSessionLifecycleDebug, setTransportSessionDebug } from './transport_metrics.js';
import { securityLog } from '../../security/security_logger.js';
import {
  effectiveRequiresPfs,
  isStrictPfs,
  resolvePfsMode,
  resolveSessionLifecyclePolicy,
  type TransportSecurityPolicy,
} from './transport_policy.js';

export interface SecureTransportServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export type SecureServerOptions = {
  endpoint: string;
  nodeId: string;
  domainId: string;
  tlsContext: TlsContext;
  trustEngine: TransportTrustEngineLike;
  transportSecurity?: TransportSecurityPolicy;
  auditHook?: TransportAuditHook;
  acceptedCanonicalIdentity?: CanonicalIdentityType;
  supportedCanonicalIdentities?: CanonicalIdentityType[];
  maxSkewMs?: number;
  idleTimeoutMs?: number;
  sessionTtlMs?: number;
  rekeyIntervalMs?: number;
  replayGuard?: ReplayGuard;
  now?: HandshakeNow;
};

type PendingPfsMaterial = {
  serverPriv: Buffer;
  clientPubB64: string;
};

export class SecureTransportServerImpl implements SecureTransportServer {
  private started = false;
  private readonly connections = new Set<SecureConnection>();
  private connectionHandlers: Array<(conn: SecureConnection) => void> = [];
  private readonly pendingPfsBySession = new Map<string, PendingPfsMaterial>();

  private readonly acceptedCanonicalIdentity: CanonicalIdentityType;
  private readonly supportedCanonicalIdentities: CanonicalIdentityType[];
  private readonly maxSkewMs: number;
  private readonly idleTimeoutMs: number | undefined;
  private readonly now: HandshakeNow;
  private readonly replayGuard: ReplayGuard;

  constructor(
    private readonly opts: SecureServerOptions,
  ) {
    this.acceptedCanonicalIdentity = opts.acceptedCanonicalIdentity ?? DEFAULT_CANONICAL_IDENTITY;
    this.supportedCanonicalIdentities = opts.supportedCanonicalIdentities ?? [this.acceptedCanonicalIdentity];
    this.maxSkewMs = opts.maxSkewMs ?? 60_000;
    this.idleTimeoutMs = opts.idleTimeoutMs;
    this.now = opts.now ?? Date.now;
    this.replayGuard = opts.replayGuard ?? new TtlNonceReplayGuard();
  }

  get nodeId(): string {
    return this.opts.nodeId;
  }

  get tlsContext(): TlsContext {
    return this.opts.tlsContext;
  }

  get domainId(): string {
    return this.opts.domainId;
  }

  onConnection(handler: (conn: SecureConnection) => void): void {
    this.connectionHandlers.push(handler);
  }

  private clearAllPendingPfs(): void {
    for (const p of this.pendingPfsBySession.values()) {
      zeroBuffer(p.serverPriv);
    }
    this.pendingPfsBySession.clear();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    registerEndpoint(this.opts.endpoint, this);
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    unregisterEndpoint(this.opts.endpoint, this);
    this.clearAllPendingPfs();
    for (const c of this.connections) {
      await c.close();
    }
    this.connections.clear();
    this.connectionHandlers = [];
  }

  async __performHandshake(args: {
    clientHello: HandshakeHello;
    clientTlsContext: TlsContext;
  }): Promise<{
    serverHello: HandshakeServerHello;
    serverNonce: string;
    channelKeyHex: string;
    sessionId: string;
    trustLevel: TransportTrustLevel;
    pfsEnabled: boolean;
  }> {
    if (this.opts.transportSecurity?.maxConnections !== undefined && this.connections.size >= this.opts.transportSecurity.maxConnections) {
      incMetric('rejectedConnections', 1);
      const err = new Error('TRANSPORT_MAX_CONNECTIONS');
      (err as NodeJS.ErrnoException).code = 'TRANSPORT_MAX_CONNECTIONS';
      throw err;
    }
    if (this.opts.transportSecurity?.denyDomains?.includes(args.clientHello.domainId ?? '')) {
      incMetric('rejectedConnections', 1);
      const err = new Error('UNTRUSTED_DOMAIN');
      (err as NodeJS.ErrnoException).code = 'UNTRUSTED_DOMAIN';
      throw err;
    }
    if (this.opts.transportSecurity?.allowDomains && !this.opts.transportSecurity.allowDomains.includes(args.clientHello.domainId ?? '')) {
      incMetric('rejectedConnections', 1);
      const err = new Error('UNTRUSTED_DOMAIN');
      (err as NodeJS.ErrnoException).code = 'UNTRUSTED_DOMAIN';
      throw err;
    }

    const clientOfferedPfs = Boolean(args.clientHello.pfs && args.clientHello.ephemeralPublicKey);
    const clientWantsPfs =
      clientOfferedPfs && !this.opts.transportSecurity?.debugForceLegacyHandshake;
    if (effectiveRequiresPfs(this.opts.transportSecurity) && !clientOfferedPfs) {
      incMetric('failedHandshakes', 1);
      incMetric('pfsRejected', 1);
      securityLog('PFS_REQUIRED_REJECTED', { peerNodeId: args.clientHello.nodeId });
      this.opts.auditHook?.({
        type: 'PFS_POLICY_ENFORCED',
        timestamp: this.now(),
        peerNodeId: args.clientHello.nodeId,
        meta: { reason: 'requirePfs', pfsMode: resolvePfsMode(this.opts.transportSecurity) },
      });
      securityLog('PFS_POLICY_ENFORCED', {
        peerNodeId: args.clientHello.nodeId,
        mode: resolvePfsMode(this.opts.transportSecurity),
      });
      const err = new Error('PFS_REQUIRED_REJECTED');
      (err as NodeJS.ErrnoException).code = 'PFS_REQUIRED_REJECTED';
      throw err;
    }

    try {
      verifyHandshakeHello({
        hello: args.clientHello,
        remoteTls: args.clientTlsContext,
        trustEngine: this.opts.trustEngine,
        trustEnforcementDomainMissingPolicy: 'reject-if-missing',
        maxSkewMs: this.maxSkewMs,
        now: this.now(),
        replayGuard: this.replayGuard,
        acceptedCanonicalIdentity: this.acceptedCanonicalIdentity,
      } as any);
    } catch (e) {
      incMetric('failedHandshakes', 1);
      securityLog('TRANSPORT_HANDSHAKE_FAILED', { code: (e as NodeJS.ErrnoException).code, message: (e as Error).message });
      throw e;
    }

    const serverNonce = randomUUID();
    const serverTimestamp = this.now();
    const sessionId = sha256Hex(`session:${args.clientHello.nodeId}:${this.opts.nodeId}:${args.clientHello.nonce}:${serverNonce}`);

    let channelKeyHex: string;
    let serverEphemeralPublicKeyB64: string | undefined;
    let serverEphemeralSignature: string | undefined;

    if (clientWantsPfs) {
      securityLog('PFS_HANDSHAKE_STARTED', { peerNodeId: args.clientHello.nodeId, sessionId });
      try {
        parseEphemeralPublicKeyB64(args.clientHello.ephemeralPublicKey!);
        const serverEphemeral = generateEphemeralKeyPair();
        serverEphemeralPublicKeyB64 = serverEphemeral.publicKey.toString('base64');
        const srvHash = buildPfsEphemeralSignatureHash({
          ephemeralPublicKeyB64: serverEphemeralPublicKeyB64,
          nodeId: this.opts.nodeId,
          sessionId,
          timestamp: serverTimestamp,
        });
        serverEphemeralSignature = signPfsEphemeralBinding({
          privateKeyPem: this.opts.tlsContext.privateKeyPem,
          hash: srvHash,
        });
        this.pendingPfsBySession.set(sessionId, {
          serverPriv: serverEphemeral.privateKey,
          clientPubB64: args.clientHello.ephemeralPublicKey!,
        });
        channelKeyHex = '';
        incMetric('pfsSessions', 1);
        securityLog('PFS_HANDSHAKE_COMPLETED', { peerNodeId: args.clientHello.nodeId, sessionId });
      } catch (e) {
        incMetric('pfsRejected', 1);
        const code = (e as NodeJS.ErrnoException).code;
        securityLog('PFS_HANDSHAKE_FAILED', { peerNodeId: args.clientHello.nodeId, sessionId, code });
        if (code === 'PFS_INVALID_PUBLIC_KEY') securityLog('PFS_INVALID_PUBLIC_KEY', { peerNodeId: args.clientHello.nodeId, sessionId });
        if (code === 'PFS_DERIVATION_FAILED') securityLog('PFS_DERIVATION_FAILED', { peerNodeId: args.clientHello.nodeId, sessionId });
        const pending = this.pendingPfsBySession.get(sessionId);
        if (pending) {
          zeroBuffer(pending.serverPriv);
          this.pendingPfsBySession.delete(sessionId);
          securityLog('PFS_ZEROIZATION_COMPLETED', { sessionId, side: 'server-perform' });
        }
        throw e;
      }
    } else {
      securityLog('PFS_FALLBACK_LEGACY_MODE', { peerNodeId: args.clientHello.nodeId, sessionId });
      incMetric('pfsFallbacks', 1);
      this.opts.auditHook?.({
        type: 'PFS_FALLBACK',
        timestamp: this.now(),
        sessionId,
        peerNodeId: args.clientHello.nodeId,
      });
      channelKeyHex = sha256Hex(`transport:${sessionId}:${args.clientHello.nonce}:${serverNonce}`);
    }

    const serverHello: HandshakeServerHello = Object.freeze({
      nodeId: this.opts.nodeId,
      domainId: this.opts.domainId,
      canonicalIdentity: this.acceptedCanonicalIdentity,
      supportedCanonicalIdentities: this.supportedCanonicalIdentities,
      nonce: serverNonce,
      timestamp: serverTimestamp,
      challengeResponse: makeSignedChallengeResponse({
        privateKeyPem: this.opts.tlsContext.privateKeyPem,
        localNonce: serverNonce,
        peerNonce: args.clientHello.nonce,
      }),
      ...(serverEphemeralPublicKeyB64 !== undefined ? { ephemeralPublicKey: serverEphemeralPublicKeyB64 } : {}),
      ...(serverEphemeralSignature !== undefined ? { ephemeralSignature: serverEphemeralSignature } : {}),
    });

    const trustLevel = this.opts.trustEngine.getTrustLevel(args.clientHello.nodeId);

    return { serverHello, serverNonce, channelKeyHex, sessionId, trustLevel, pfsEnabled: clientWantsPfs };
  }

  async __finalizeHandshake(args: {
    clientHello: HandshakeHello;
    clientTlsContext: TlsContext;
    serverHello: HandshakeServerHello;
    clientChallengeResponse: { signatureB64: string; ephemeralSignature?: string };
    channelKeyHex: string;
    sessionId: string;
    trustLevel: TransportTrustLevel;
    pfsEnabled: boolean;
  }): Promise<{ clientConn: SecureConnection; serverConn: SecureConnection }> {
    const okClientSig = verifySignedChallengeResponse({
      publicKeyPem: args.clientTlsContext.publicKeyPem,
      response: { signatureB64: args.clientChallengeResponse.signatureB64 },
      localNonce: args.clientHello.nonce,
      peerNonce: args.serverHello.nonce,
    });
    if (!okClientSig) {
      if (args.pfsEnabled) {
        const leaked = this.pendingPfsBySession.get(args.sessionId);
        if (leaked) {
          zeroBuffer(leaked.serverPriv);
          this.pendingPfsBySession.delete(args.sessionId);
          securityLog('PFS_ZEROIZATION_COMPLETED', { sessionId: args.sessionId, side: 'server-bad-client-sig' });
        }
      }
      const err = new Error('TRANSPORT_HANDSHAKE_SIGNATURE_INVALID');
      (err as NodeJS.ErrnoException).code = 'TRANSPORT_HANDSHAKE_SIGNATURE_INVALID';
      throw err;
    }

    let effectiveChannelKeyHex = args.channelKeyHex;

    if (args.pfsEnabled) {
      const pending = this.pendingPfsBySession.get(args.sessionId);
      if (!pending) {
        const err = new Error('PFS_HANDSHAKE_STATE');
        (err as NodeJS.ErrnoException).code = 'PFS_HANDSHAKE_STATE';
        incMetric('pfsRejected', 1);
        throw err;
      }
      try {
        if (!args.clientHello.ephemeralPublicKey) {
          incMetric('pfsRejected', 1);
          const err = new Error('PFS_EPHEMERAL_SIGNATURE_MISSING');
          (err as NodeJS.ErrnoException).code = 'PFS_EPHEMERAL_SIGNATURE_MISSING';
          throw err;
        }
        if (!args.clientChallengeResponse.ephemeralSignature) {
          securityLog('PFS_EPHEMERAL_SIGNATURE_MISSING', { sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId });
          incMetric('pfsRejected', 1);
          const err = new Error('PFS_EPHEMERAL_SIGNATURE_MISSING');
          (err as NodeJS.ErrnoException).code = 'PFS_EPHEMERAL_SIGNATURE_MISSING';
          throw err;
        }
        const clHash = buildPfsEphemeralSignatureHash({
          ephemeralPublicKeyB64: args.clientHello.ephemeralPublicKey,
          nodeId: args.clientHello.nodeId,
          sessionId: args.sessionId,
          timestamp: args.clientHello.timestamp,
        });
        const clOk = verifyPfsEphemeralBinding({
          publicKeyPem: args.clientTlsContext.publicKeyPem,
          hash: clHash,
          signatureB64: args.clientChallengeResponse.ephemeralSignature,
        });
        if (!clOk) {
          securityLog('PFS_EPHEMERAL_SIGNATURE_INVALID', { sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId });
          incMetric('pfsRejected', 1);
          const err = new Error('PFS_EPHEMERAL_SIGNATURE_INVALID');
          (err as NodeJS.ErrnoException).code = 'PFS_EPHEMERAL_SIGNATURE_INVALID';
          throw err;
        }
        if (!args.serverHello.ephemeralPublicKey || !args.serverHello.ephemeralSignature) {
          securityLog('PFS_EPHEMERAL_SIGNATURE_MISSING', { sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId, side: 'server-hello' });
          incMetric('pfsRejected', 1);
          const err = new Error('PFS_EPHEMERAL_SIGNATURE_MISSING');
          (err as NodeJS.ErrnoException).code = 'PFS_EPHEMERAL_SIGNATURE_MISSING';
          throw err;
        }
        this.opts.auditHook?.({
          type: 'PFS_EPHEMERAL_AUTH',
          timestamp: this.now(),
          sessionId: args.sessionId,
          peerNodeId: args.clientHello.nodeId,
        });

        const clientPub = parseEphemeralPublicKeyB64(pending.clientPubB64);
        let shared: Buffer;
        try {
          shared = deriveSharedSecret(pending.serverPriv, clientPub);
        } catch {
          incMetric('pfsRejected', 1);
          const err = new Error('PFS_DERIVATION_FAILED');
          (err as NodeJS.ErrnoException).code = 'PFS_DERIVATION_FAILED';
          throw err;
        }
        const sessionKeyBuf = deriveSessionKey(shared, {
          nodeIdA: args.clientHello.nodeId,
          nodeIdB: this.opts.nodeId,
          sessionId: args.sessionId,
          ephemeralPublicKeyA: args.clientHello.ephemeralPublicKey,
          ephemeralPublicKeyB: args.serverHello.ephemeralPublicKey,
        });
        zeroBuffer(shared);
        const serverDerivedHex = sessionKeyBuf.toString('hex');
        zeroBuffer(sessionKeyBuf);

        const clientExpect = Buffer.from(args.channelKeyHex, 'hex');
        const serverBuf = Buffer.from(serverDerivedHex, 'hex');
        if (clientExpect.length !== serverBuf.length || !timingSafeEqual(clientExpect, serverBuf)) {
          securityLog('PFS_CONTEXT_MISMATCH', { sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId });
          securityLog('PFS_DERIVATION_MISMATCH', { sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId });
          incMetric('pfsRejected', 1);
          const err = new Error('PFS_CONTEXT_MISMATCH');
          (err as NodeJS.ErrnoException).code = 'PFS_CONTEXT_MISMATCH';
          throw err;
        }
        this.opts.auditHook?.({
          type: 'PFS_CONTEXT_BOUND',
          timestamp: this.now(),
          sessionId: args.sessionId,
          peerNodeId: args.clientHello.nodeId,
        });
        effectiveChannelKeyHex = serverDerivedHex;
        if (isStrictPfs(this.opts.transportSecurity)) {
          incMetric('pfsStrictSessions', 1);
          this.opts.auditHook?.({
            type: 'PFS_STRICT_MODE',
            timestamp: this.now(),
            sessionId: args.sessionId,
            peerNodeId: args.clientHello.nodeId,
            meta: { side: 'server' },
          });
        }
      } finally {
        zeroBuffer(pending.serverPriv);
        this.pendingPfsBySession.delete(args.sessionId);
        securityLog('PFS_ZEROIZATION_COMPLETED', { sessionId: args.sessionId, side: 'server-finalize' });
      }
    }

    const createdAt = this.now();
    const sl = this.opts.transportSecurity?.sessionLifecycle;
    const resolvedLifecycle =
      sl !== undefined
        ? resolveSessionLifecyclePolicy(sl, resolvePfsMode(this.opts.transportSecurity))
        : undefined;
    const maxWall = resolvedLifecycle?.maxSessionDurationMs;
    const expiresAt =
      maxWall !== undefined
        ? createdAt + Math.min(this.opts.sessionTtlMs ?? maxWall, maxWall)
        : createdAt + (this.opts.sessionTtlMs ?? 5 * 60_000);
    const rekeyAt =
      resolvedLifecycle !== undefined
        ? createdAt + resolvedLifecycle.rekeyIntervalMs
        : (this.opts.rekeyIntervalMs ?? 0) > 0
          ? createdAt + (this.opts.rekeyIntervalMs as number)
          : Number.POSITIVE_INFINITY;
    const rekeyMode = args.pfsEnabled ? 'PFS' : 'SYMMETRIC';
    const pfsMode = resolvePfsMode(this.opts.transportSecurity);
    setTransportSessionDebug({
      sessionId: args.sessionId,
      pfsEnabled: args.pfsEnabled,
      rekeyMode,
      pfsMode,
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: createdAt },
    });
    const serverSession = {
      sessionId: args.sessionId,
      peerNodeId: args.clientHello.nodeId,
      createdAt,
      lastActivity: createdAt,
    };
    const clientSession = {
      sessionId: args.sessionId,
      peerNodeId: this.opts.nodeId,
      createdAt,
      lastActivity: createdAt,
    };

    const serverConn = createSecureConnection({
      localNodeId: this.opts.nodeId,
      peerNodeId: args.clientHello.nodeId,
      ...(args.clientHello.domainId !== undefined ? { peerDomainId: args.clientHello.domainId } : {}),
      session: serverSession,
      trustLevel: args.trustLevel,
      ...(this.idleTimeoutMs !== undefined ? { idleTimeoutMs: this.idleTimeoutMs } : {}),
      channelKeyHex: effectiveChannelKeyHex,
      pfsEnabled: args.pfsEnabled,
      rekeyMode,
      expiresAt,
      rekeyAt,
      trustEngine: this.opts.trustEngine,
      ...(this.opts.auditHook !== undefined ? { auditHook: this.opts.auditHook } : {}),
      ...(this.opts.transportSecurity?.rateLimit
        ? {
            rateLimit: {
              messagesPerSecond: this.opts.transportSecurity.rateLimit.messagesPerSecond ?? 100,
              bytesPerSecond: this.opts.transportSecurity.rateLimit.bytesPerSecond ?? 1_000_000,
            },
          }
        : {}),
      ...(this.opts.transportSecurity?.debugTamperRekeyResponse
        ? { debugTamperRekeyResponse: true }
        : {}),
      ...(this.opts.transportSecurity?.trafficDuringRekey
        ? { trafficDuringRekey: this.opts.transportSecurity.trafficDuringRekey }
        : {}),
      ...(resolvedLifecycle !== undefined ? { sessionLifecycle: resolvedLifecycle, pfsMode } : {}),
      now: this.now,
    });
    const clientConn = createSecureConnection({
      localNodeId: args.clientHello.nodeId,
      peerNodeId: this.opts.nodeId,
      peerDomainId: this.opts.domainId,
      session: clientSession,
      trustLevel: args.trustLevel,
      ...(this.idleTimeoutMs !== undefined ? { idleTimeoutMs: this.idleTimeoutMs } : {}),
      channelKeyHex: effectiveChannelKeyHex,
      pfsEnabled: args.pfsEnabled,
      rekeyMode,
      expiresAt,
      rekeyAt,
      trustEngine: this.opts.trustEngine,
      ...(this.opts.auditHook !== undefined ? { auditHook: this.opts.auditHook } : {}),
      ...(this.opts.transportSecurity?.rateLimit
        ? {
            rateLimit: {
              messagesPerSecond: this.opts.transportSecurity.rateLimit.messagesPerSecond ?? 100,
              bytesPerSecond: this.opts.transportSecurity.rateLimit.bytesPerSecond ?? 1_000_000,
            },
          }
        : {}),
      ...(this.opts.transportSecurity?.trafficDuringRekey
        ? { trafficDuringRekey: this.opts.transportSecurity.trafficDuringRekey }
        : {}),
      ...(resolvedLifecycle !== undefined ? { sessionLifecycle: resolvedLifecycle, pfsMode } : {}),
      now: this.now,
    });

    clientConn.__setFrameSink?.((frame) => serverConn.handleIncomingEncrypted(frame));
    serverConn.__setFrameSink?.((frame) => clientConn.handleIncomingEncrypted(frame));

    this.connections.add(serverConn);

    for (const h of this.connectionHandlers) h(serverConn);
    this.opts.auditHook?.({ type: 'TRANSPORT_HANDSHAKE_OK', timestamp: this.now(), sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId });
    if (args.pfsEnabled) {
      this.opts.auditHook?.({ type: 'PFS_SESSION_ESTABLISHED', timestamp: this.now(), sessionId: args.sessionId, peerNodeId: args.clientHello.nodeId });
    }

    return { clientConn, serverConn };
  }
}
