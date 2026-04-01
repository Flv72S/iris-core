import { DEFAULT_CANONICAL_IDENTITY } from '../../control_plane/identity/canonical_identity.js';
import type { CanonicalIdentityType } from '../../control_plane/identity/canonical_identity.js';
import type { TlsContext } from './tls_context.js';
import { getEndpointServer } from './secure_transport_bus.js';
import {
  buildHandshakeHello,
  verifyHandshakeHello,
  makeSignedChallengeResponse,
  verifySignedChallengeResponse,
  parseEphemeralPublicKeyB64,
  buildPfsEphemeralSignatureHash,
  verifyPfsEphemeralBinding,
} from './handshake_protocol.js';
import type { HandshakeHello, HandshakeNow, HandshakeServerHello } from './handshake_protocol.js';
import { deriveSessionKey } from './pfs_kdf.js';
import { deriveSharedSecret, generateEphemeralKeyPair, zeroBuffer } from './pfs_keys.js';
import { securityLog } from '../../security/security_logger.js';
import type { ReplayGuard } from './replay_protection.js';
import { TtlNonceReplayGuard } from './replay_protection.js';
import { type TransportTrustEngineLike } from './transport_trust_enforcement.js';
import type { SecureConnection } from './secure_connection.js';
import type { TransportAuditHook } from './audit_hooks.js';
import { effectiveRequiresPfs, isStrictPfs, type TransportSecurityPolicy } from './transport_policy.js';
import { incMetric } from './transport_metrics.js';

export interface SecureTransportClient {
  connect(endpoint: string): Promise<SecureConnection>;
}

export type SecureClientConnectOptions = {
  nonceOverride?: string;
  timestampOverride?: number;
  tamperSignature?: boolean;
  /** Test-only: replace the server hello ephemeral (MITM / key mismatch simulation). */
  debugMitmServerEphemeralB64?: string;
  /** Test-only: send an invalid client PFS public key (server must reject). */
  debugInvalidClientEphemeralB64?: string;
  /** Test-only: omit PFS ephemeral signature on the challenge response (policy / binding tests). */
  debugOmitEphemeralSignature?: boolean;
  /** Test-only: corrupt PFS ephemeral signature (server must reject ephemeral binding). */
  debugTamperEphemeralSignature?: boolean;
  /** Test-only: wrong hex channel key for finalize (server KDF vs client mismatch). */
  debugWrongFinalizeChannelKeyHex?: string;
};

export type SecureClientOptions = {
  endpointTrustDomainId?: string;
  nodeId: string;
  domainId: string;
  tlsContext: TlsContext;
  trustEngine: TransportTrustEngineLike;
  auditHook?: TransportAuditHook;
  acceptedCanonicalIdentity?: CanonicalIdentityType;
  supportedCanonicalIdentities?: CanonicalIdentityType[];
  maxSkewMs?: number;
  replayGuard?: ReplayGuard;
  idleTimeoutMs?: number;
  now?: HandshakeNow;
  /** When true, perform ECDHE (X25519) + HKDF session key derivation (16F.X5.X6). */
  pfs?: boolean;
  /** When requirePfs / pfsMode REQUIRED|STRICT, legacy/downgrade paths are rejected (16F.X5.X6.HARDENING). */
  transportSecurity?: TransportSecurityPolicy;
};

export class SecureTransportClientImpl implements SecureTransportClient {
  private readonly acceptedCanonicalIdentity: CanonicalIdentityType;
  private readonly supportedCanonicalIdentities: CanonicalIdentityType[];
  private readonly maxSkewMs: number;
  private readonly idleTimeoutMs: number | undefined;
  private readonly now: HandshakeNow;
  private readonly replayGuard: ReplayGuard;

  constructor(private readonly opts: SecureClientOptions) {
    this.acceptedCanonicalIdentity = opts.acceptedCanonicalIdentity ?? DEFAULT_CANONICAL_IDENTITY;
    this.supportedCanonicalIdentities = opts.supportedCanonicalIdentities ?? [this.acceptedCanonicalIdentity];
    this.maxSkewMs = opts.maxSkewMs ?? 60_000;
    this.idleTimeoutMs = opts.idleTimeoutMs;
    this.now = opts.now ?? Date.now;
    this.replayGuard = opts.replayGuard ?? new TtlNonceReplayGuard();
  }

  async connect(endpoint: string, connectOpts?: SecureClientConnectOptions): Promise<SecureConnection> {
    const server = getEndpointServer(endpoint);
    if (!server) throw new Error('TRANSPORT_ENDPOINT_NOT_FOUND');

    if (effectiveRequiresPfs(this.opts.transportSecurity) && !this.opts.pfs) {
      incMetric('pfsRejected', 1);
      const err = new Error('PFS_REQUIRED');
      (err as NodeJS.ErrnoException).code = 'PFS_REQUIRED';
      throw err;
    }

    this.opts.auditHook?.({ type: 'TRANSPORT_CONNECT', timestamp: this.now(), peerNodeId: (server as any).nodeId });

    let clientEphemeralPriv: Buffer | null = null;
    try {
    let clientHello: HandshakeHello;
    if (this.opts.pfs && connectOpts?.debugInvalidClientEphemeralB64) {
      clientEphemeralPriv = null;
      clientHello = buildHandshakeHello({
        nodeId: this.opts.nodeId,
        domainId: this.opts.domainId,
        canonicalIdentity: this.acceptedCanonicalIdentity,
        supportedCanonicalIdentities: this.supportedCanonicalIdentities,
        ephemeralPublicKey: connectOpts.debugInvalidClientEphemeralB64,
        pfs: true,
        ...(connectOpts?.nonceOverride !== undefined ? { nonce: connectOpts.nonceOverride } : {}),
        ...(connectOpts?.timestampOverride !== undefined ? { timestamp: connectOpts.timestampOverride } : {}),
      });
    } else if (this.opts.pfs) {
      const ep = generateEphemeralKeyPair();
      clientEphemeralPriv = ep.privateKey;
      clientHello = buildHandshakeHello({
        nodeId: this.opts.nodeId,
        domainId: this.opts.domainId,
        canonicalIdentity: this.acceptedCanonicalIdentity,
        supportedCanonicalIdentities: this.supportedCanonicalIdentities,
        ephemeralPublicKey: ep.publicKey.toString('base64'),
        pfs: true,
        ...(connectOpts?.nonceOverride !== undefined ? { nonce: connectOpts.nonceOverride } : {}),
        ...(connectOpts?.timestampOverride !== undefined ? { timestamp: connectOpts.timestampOverride } : {}),
      });
    } else {
      clientHello = buildHandshakeHello({
        nodeId: this.opts.nodeId,
        domainId: this.opts.domainId,
        canonicalIdentity: this.acceptedCanonicalIdentity,
        supportedCanonicalIdentities: this.supportedCanonicalIdentities,
        ...(connectOpts?.nonceOverride !== undefined ? { nonce: connectOpts.nonceOverride } : {}),
        ...(connectOpts?.timestampOverride !== undefined ? { timestamp: connectOpts.timestampOverride } : {}),
      });
    }

    const handshake = await (server as any).__performHandshake({
      clientHello,
      clientTlsContext: this.opts.tlsContext,
    });

    let serverHello: HandshakeServerHello = handshake.serverHello;
    if (connectOpts?.debugMitmServerEphemeralB64) {
      serverHello = {
        ...serverHello,
        ephemeralPublicKey: connectOpts.debugMitmServerEphemeralB64,
      };
    }

    // Verify server hello freshness, identity binding, canonical negotiation, trust and replay.
    verifyHandshakeHello({
      hello: serverHello as any,
      remoteTls: (server as any).tlsContext as TlsContext,
      trustEngine: this.opts.trustEngine,
      trustEnforcementDomainMissingPolicy: 'reject-if-missing',
      maxSkewMs: this.maxSkewMs,
      now: this.now(),
      replayGuard: this.replayGuard,
      acceptedCanonicalIdentity: this.acceptedCanonicalIdentity,
    } as any);

    // Verify server signature on challenge.
    const okServerSig = verifySignedChallengeResponse({
      publicKeyPem: (server as any).tlsContext.publicKeyPem,
      response: serverHello.challengeResponse,
      localNonce: serverHello.nonce,
      peerNonce: clientHello.nonce,
    });
    if (!okServerSig) {
      const err = new Error('TRANSPORT_HANDSHAKE_SIGNATURE_INVALID');
      (err as any).code = 'TRANSPORT_HANDSHAKE_SIGNATURE_INVALID';
      throw err;
    }

    let channelKeyHexForFinalize = handshake.channelKeyHex;

    if (this.opts.pfs) {
      if (!handshake.pfsEnabled) {
        securityLog('PFS_DOWNGRADE_ATTEMPT', {
          peerNodeId: (server as any).nodeId as string,
          sessionId: handshake.sessionId,
          reason: 'server-legacy-response',
        });
        incMetric('pfsDowngradeAttempts', 1);
        if (effectiveRequiresPfs(this.opts.transportSecurity)) {
          incMetric('pfsRejected', 1);
          this.opts.auditHook?.({
            type: 'PFS_DOWNGRADE_BLOCKED',
            timestamp: this.now(),
            sessionId: handshake.sessionId,
            peerNodeId: (server as any).nodeId as string,
          });
          securityLog('PFS_REQUIRED_REJECTED', { sessionId: handshake.sessionId, policy: 'pfs-downgrade' });
          const err = new Error('PFS_REQUIRED');
          (err as NodeJS.ErrnoException).code = 'PFS_REQUIRED';
          throw err;
        }
        const err = new Error('PFS_HANDSHAKE_FAILED');
        (err as NodeJS.ErrnoException).code = 'PFS_HANDSHAKE_FAILED';
        throw err;
      }
      if (handshake.pfsEnabled && (!serverHello.ephemeralPublicKey || !serverHello.ephemeralSignature)) {
        securityLog('PFS_DOWNGRADE_ATTEMPT', { peerNodeId: (server as any).nodeId as string, sessionId: handshake.sessionId });
        incMetric('pfsDowngradeAttempts', 1);
        if (effectiveRequiresPfs(this.opts.transportSecurity)) {
          incMetric('pfsRejected', 1);
          this.opts.auditHook?.({
            type: 'PFS_DOWNGRADE_BLOCKED',
            timestamp: this.now(),
            sessionId: handshake.sessionId,
            peerNodeId: (server as any).nodeId as string,
            meta: { reason: 'pfs-material-missing' },
          });
          securityLog('PFS_REQUIRED_REJECTED', { sessionId: handshake.sessionId, policy: 'pfs-material-missing' });
          const err = new Error('PFS_REQUIRED');
          (err as NodeJS.ErrnoException).code = 'PFS_REQUIRED';
          throw err;
        }
      }
      if (!serverHello.ephemeralPublicKey || !serverHello.ephemeralSignature) {
        const err = new Error('PFS_HANDSHAKE_FAILED');
        (err as NodeJS.ErrnoException).code = 'PFS_HANDSHAKE_FAILED';
        throw err;
      }
      const srvHash = buildPfsEphemeralSignatureHash({
        ephemeralPublicKeyB64: serverHello.ephemeralPublicKey,
        nodeId: serverHello.nodeId,
        sessionId: handshake.sessionId,
        timestamp: serverHello.timestamp,
      });
      if (
        !verifyPfsEphemeralBinding({
          publicKeyPem: (server as any).tlsContext.publicKeyPem,
          hash: srvHash,
          signatureB64: serverHello.ephemeralSignature,
        })
      ) {
        const err = new Error('PFS_EPHEMERAL_SIGNATURE_INVALID');
        (err as NodeJS.ErrnoException).code = 'PFS_EPHEMERAL_SIGNATURE_INVALID';
        throw err;
      }
      if (clientEphemeralPriv && clientHello.ephemeralPublicKey) {
        const serverPub = parseEphemeralPublicKeyB64(serverHello.ephemeralPublicKey);
        const shared = deriveSharedSecret(clientEphemeralPriv, serverPub);
        const sessionKeyBuf = deriveSessionKey(shared, {
          nodeIdA: this.opts.nodeId,
          nodeIdB: (server as any).nodeId as string,
          sessionId: handshake.sessionId,
          ephemeralPublicKeyA: clientHello.ephemeralPublicKey,
          ephemeralPublicKeyB: serverHello.ephemeralPublicKey,
        });
        zeroBuffer(shared);
        const derivedHex = sessionKeyBuf.toString('hex');
        zeroBuffer(sessionKeyBuf);
        zeroBuffer(clientEphemeralPriv);
        clientEphemeralPriv = null;
        securityLog('PFS_ZEROIZATION_COMPLETED', { sessionId: handshake.sessionId, side: 'client-handshake' });
        channelKeyHexForFinalize = derivedHex;
      }
    }

    if (!this.opts.pfs && handshake.pfsEnabled && effectiveRequiresPfs(this.opts.transportSecurity)) {
      incMetric('pfsRejected', 1);
      const err = new Error('PFS_REQUIRED');
      (err as NodeJS.ErrnoException).code = 'PFS_REQUIRED';
      throw err;
    }

    // Create client signature response.
    const clientChallengeResponse = makeSignedChallengeResponse({
      privateKeyPem: this.opts.tlsContext.privateKeyPem,
      localNonce: clientHello.nonce,
      peerNonce: serverHello.nonce,
      ...(this.opts.pfs && clientHello.ephemeralPublicKey && !connectOpts?.debugInvalidClientEphemeralB64
        ? {
            pfsEphemeral: {
              ephemeralPublicKeyB64: clientHello.ephemeralPublicKey,
              nodeId: this.opts.nodeId,
              sessionId: handshake.sessionId,
              timestamp: clientHello.timestamp,
            },
          }
        : {}),
    });

    const finalResponse =
      connectOpts?.debugOmitEphemeralSignature && clientChallengeResponse.ephemeralSignature !== undefined
        ? { signatureB64: clientChallengeResponse.signatureB64 }
        : connectOpts?.debugTamperEphemeralSignature && clientChallengeResponse.ephemeralSignature !== undefined
          ? (() => {
              const raw = Buffer.from(clientChallengeResponse.ephemeralSignature!, 'base64');
              const t = Buffer.from(raw);
              if (t.length > 0) t[0] ^= 0xff;
              return {
                signatureB64: clientChallengeResponse.signatureB64,
                ephemeralSignature: t.toString('base64'),
              };
            })()
          : connectOpts?.tamperSignature && clientChallengeResponse.ephemeralSignature !== undefined
          ? {
              signatureB64:
                `${clientChallengeResponse.signatureB64}`.slice(0, Math.max(0, clientChallengeResponse.signatureB64.length - 2)) + 'aa',
              ephemeralSignature: clientChallengeResponse.ephemeralSignature,
            }
          : connectOpts?.tamperSignature
            ? {
                signatureB64:
                  `${clientChallengeResponse.signatureB64}`.slice(0, Math.max(0, clientChallengeResponse.signatureB64.length - 2)) + 'aa',
              }
            : clientChallengeResponse;

    if (connectOpts?.debugWrongFinalizeChannelKeyHex) {
      channelKeyHexForFinalize = connectOpts.debugWrongFinalizeChannelKeyHex;
    }

    const finalized = await (server as any).__finalizeHandshake({
      clientHello,
      clientTlsContext: this.opts.tlsContext,
      serverHello,
      clientChallengeResponse: finalResponse,
      channelKeyHex: channelKeyHexForFinalize,
      sessionId: handshake.sessionId,
      trustLevel: handshake.trustLevel,
      pfsEnabled: handshake.pfsEnabled as boolean,
    });

    if (handshake.pfsEnabled && isStrictPfs(this.opts.transportSecurity)) {
      this.opts.auditHook?.({
        type: 'PFS_STRICT_MODE',
        timestamp: this.now(),
        sessionId: handshake.sessionId,
        peerNodeId: (server as any).nodeId as string,
        meta: { side: 'client' },
      });
    }

    // Client-side dynamic enforcement must use the client's trust engine.
    finalized.clientConn.__setTrustEngine?.(this.opts.trustEngine);
    // Ensure control frames also deliver when used (rekey request etc. already delivered via frame sink).

    // Patch idle timeout if configured on client.
    if (this.idleTimeoutMs != null) {
      // We keep this simulation minimal; SecureConnection already honors idle timeout passed by server.
    }

    return finalized.clientConn;
    } finally {
      if (clientEphemeralPriv) {
        zeroBuffer(clientEphemeralPriv);
        securityLog('PFS_ZEROIZATION_COMPLETED', { side: 'client-finally-ephemeral' });
      }
    }
  }
}

