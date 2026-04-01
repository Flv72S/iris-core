/**
 * Microstep 16D — Node registry (heartbeats, stale/offline).
 * Microstep 16D.X1 — optional shared secret per node (HMAC ingest).
 * Microstep 16D.X2 — trust lifecycle + dual-secret rotation.
 */

import * as crypto from 'node:crypto';

import { validateNodeSecretLength } from '../security/index.js';
import { securityLog } from '../security/security_logger.js';
import type { ControlPlaneNodeInfo, IrisNodeId } from './control_plane_types.js';
import type { TrustEvent } from './trust_events.js';
import type { TrustState } from './trust_types.js';
import { CP_ONLINE_MAX_MS, CP_STALE_MAX_MS } from './control_plane_types.js';

type Entry = {
  lastSeen: number;
  pinnedOffline: boolean;
  metadata?: Record<string, unknown>;
  activeSecret: string;
  nextSecret?: string;
  rotationSecretDelivered?: boolean;
  rotationExpiresAt?: number;
  trustState: TrustState;
  createdAt: number;
  rotatedAt?: number;
  revokedAt?: number;
};

export function computeNodeStatus(lastSeen: number, now: number, pinnedOffline: boolean): ControlPlaneNodeInfo['status'] {
  if (pinnedOffline) return 'offline';
  const age = now - lastSeen;
  if (age > CP_STALE_MAX_MS) return 'offline';
  if (age >= CP_ONLINE_MAX_MS) return 'stale';
  return 'online';
}

export class ControlPlaneRegistry {
  private readonly nodes = new Map<IrisNodeId, Entry>();
  private readonly lastTrustEventTs = new Map<IrisNodeId, number>();
  static readonly DEFAULT_ROTATION_TTL = 10 * 60 * 1000;

  private randomSecret(): string {
    return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  }

  /**
   * Register node with shared secret (≥32 UTF-8 bytes) for signed ingest verification.
   */
  registerNodeWithSecret(
    nodeId: IrisNodeId,
    secret: string,
    now: number,
    metadata?: Record<string, unknown>,
  ): void {
    if (!validateNodeSecretLength(secret)) {
      throw new Error('node secret must be at least 32 UTF-8 bytes');
    }
    const cur = this.nodes.get(nodeId);
    const base: Entry = cur
      ? {
          ...cur,
          lastSeen: now,
          pinnedOffline: false,
          activeSecret: secret,
          trustState: 'PENDING',
          createdAt: cur.createdAt ?? now,
          ...(metadata !== undefined ? { metadata } : {}),
        }
      : {
          lastSeen: now,
          pinnedOffline: false,
          activeSecret: secret,
          trustState: 'PENDING',
          createdAt: now,
          ...(metadata !== undefined ? { metadata } : {}),
        };
    this.nodes.set(nodeId, base);
  }

  registerNode(nodeId: IrisNodeId, now: number, metadata?: Record<string, unknown>): void {
    const cur = this.nodes.get(nodeId);
    if (cur) {
      this.nodes.set(nodeId, {
        ...cur,
        lastSeen: now,
        pinnedOffline: false,
        ...(metadata !== undefined ? { metadata } : {}),
      });
      return;
    }
    // Backward-compatible auto registration path for unsigned/dev ingest.
    this.nodes.set(nodeId, {
      lastSeen: now,
      pinnedOffline: false,
      activeSecret: this.randomSecret(),
      trustState: 'ACTIVE',
      createdAt: now,
      ...(metadata !== undefined ? { metadata } : {}),
    });
  }

  getNodeSecret(nodeId: IrisNodeId): string | undefined {
    const s = this.nodes.get(nodeId)?.activeSecret;
    return s && validateNodeSecretLength(s) ? s : undefined;
  }

  getNodeAuth(nodeId: IrisNodeId): { trustState: TrustState; activeSecret?: string; nextSecret?: string } | undefined {
    const n = this.nodes.get(nodeId);
    if (!n) return undefined;
    return {
      trustState: n.trustState,
      ...(validateNodeSecretLength(n.activeSecret) ? { activeSecret: n.activeSecret } : {}),
      ...(n.nextSecret && validateNodeSecretLength(n.nextSecret) ? { nextSecret: n.nextSecret } : {}),
      ...(n.rotationExpiresAt !== undefined ? { rotationExpiresAt: n.rotationExpiresAt } : {}),
    };
  }

  activateNode(nodeId: IrisNodeId, now: number): boolean {
    const n = this.nodes.get(nodeId);
    if (!n || n.trustState !== 'PENDING') return false;
    const { revokedAt: _revokedAt, ...rest } = n;
    this.nodes.set(nodeId, { ...rest, trustState: 'ACTIVE', lastSeen: now });
    securityLog('NODE_ACTIVATED', { nodeId });
    return true;
  }

  startRotation(nodeId: IrisNodeId, nextSecret: string, now: number): boolean {
    if (!validateNodeSecretLength(nextSecret)) return false;
    const n = this.nodes.get(nodeId);
    if (!n || (n.trustState !== 'ACTIVE' && n.trustState !== 'ROTATING')) return false;
    this.nodes.set(nodeId, {
      ...n,
      trustState: 'ROTATING',
      nextSecret,
      rotationSecretDelivered: false,
      rotationExpiresAt: now + ControlPlaneRegistry.DEFAULT_ROTATION_TTL,
      rotatedAt: now,
      lastSeen: now,
    });
    securityLog('ROTATION_STARTED', { nodeId });
    return true;
  }

  completeRotation(nodeId: IrisNodeId, now: number): boolean {
    const n = this.nodes.get(nodeId);
    if (!n || n.trustState !== 'ROTATING' || !n.nextSecret) return false;
    const {
      nextSecret: _oldNextSecret,
      rotationSecretDelivered: _rotationSecretDelivered,
      rotationExpiresAt: _rotationExpiresAt,
      ...rest
    } = n;
    this.nodes.set(nodeId, {
      ...rest,
      trustState: 'ACTIVE',
      activeSecret: n.nextSecret,
      rotatedAt: now,
      lastSeen: now,
    });
    securityLog('ROTATION_COMPLETED', { nodeId });
    return true;
  }

  revokeNode(nodeId: IrisNodeId, now: number): boolean {
    const n = this.nodes.get(nodeId);
    if (!n) return false;
    const {
      nextSecret: _nextSecret,
      rotationSecretDelivered: _rotationSecretDelivered,
      rotationExpiresAt: _rotationExpiresAt,
      ...rest
    } = n;
    this.nodes.set(nodeId, {
      ...rest,
      trustState: 'REVOKED',
      revokedAt: now,
      pinnedOffline: true,
      lastSeen: 0,
    });
    securityLog('NODE_REVOKED', { nodeId });
    return true;
  }

  updateHeartbeat(nodeId: IrisNodeId, now: number): void {
    const cur = this.nodes.get(nodeId);
    if (!cur) {
      this.registerNode(nodeId, now);
      return;
    }
    this.nodes.set(nodeId, { ...cur, lastSeen: now, pinnedOffline: false });
  }

  markOffline(nodeId: IrisNodeId): void {
    const cur = this.nodes.get(nodeId);
    if (cur) {
      this.nodes.set(nodeId, { ...cur, pinnedOffline: true, lastSeen: 0 });
    } else {
      this.nodes.set(nodeId, {
        lastSeen: 0,
        pinnedOffline: true,
        activeSecret: this.randomSecret(),
        trustState: 'REVOKED',
        createdAt: Date.now(),
      });
    }
  }

  getNode(nodeId: IrisNodeId, now: number): ControlPlaneNodeInfo | undefined {
    const e = this.nodes.get(nodeId);
    if (!e) return undefined;
    return this.toInfo(nodeId, e, now);
  }

  getAllNodes(now: number): ControlPlaneNodeInfo[] {
    const out: ControlPlaneNodeInfo[] = [];
    for (const [id, e] of this.nodes) {
      out.push(this.toInfo(id, e, now));
    }
    out.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    return out;
  }

  getAllNodeIds(): IrisNodeId[] {
    return [...this.nodes.keys()].sort((a, b) => a.localeCompare(b));
  }

  has(nodeId: IrisNodeId): boolean {
    return this.nodes.has(nodeId);
  }

  markRotationSecretDelivered(nodeId: IrisNodeId): boolean {
    const n = this.nodes.get(nodeId);
    if (!n || n.trustState !== 'ROTATING' || !n.nextSecret) return false;
    if (n.rotationSecretDelivered) return false;
    this.nodes.set(nodeId, { ...n, rotationSecretDelivered: true });
    return true;
  }

  expireRotation(nodeId: IrisNodeId): boolean {
    const n = this.nodes.get(nodeId);
    if (!n || n.trustState !== 'ROTATING') return false;
    const { nextSecret: _ns, rotationExpiresAt: _re, rotationSecretDelivered: _rd, ...rest } = n;
    this.nodes.set(nodeId, { ...rest, trustState: 'ACTIVE' });
    return true;
  }

  recoverTrustState(strict: boolean): void {
    for (const [nodeId, n] of this.nodes) {
      const trustState = (n as any).trustState as TrustState | undefined;
      const activeSecret = (n as any).activeSecret as string | undefined;
      if (!trustState) {
        (n as any).trustState = 'PENDING';
        securityLog('TRUST_STATE_RECOVERY', { nodeId });
      }
      if (!activeSecret || !validateNodeSecretLength(activeSecret)) {
        if (strict) throw new Error(`Invalid node: missing activeSecret (${nodeId})`);
        (n as any).activeSecret = this.randomSecret();
      }
      if ((n as any).trustState === 'ROTATING' && !(n as any).nextSecret) {
        (n as any).trustState = 'ACTIVE';
        securityLog('ROTATION_STATE_RECOVERY', { nodeId });
      }
      this.nodes.set(nodeId, n);
    }
  }

  applyTrustEvent(event: TrustEvent): void {
    const last = this.lastTrustEventTs.get(event.nodeId);
    if (last !== undefined && event.timestamp < last) return;

    if (event.type === 'NODE_ACTIVATED') {
      if (!this.has(event.nodeId)) {
        const fallback = this.randomSecret();
        this.registerNodeWithSecret(event.nodeId, fallback, event.timestamp);
      }
      this.activateNode(event.nodeId, event.timestamp);
      this.lastTrustEventTs.set(event.nodeId, Math.max(last ?? 0, event.timestamp));
      return;
    }

    if (event.type === 'NODE_REVOKED') {
      if (!this.has(event.nodeId)) {
        this.registerNode(event.nodeId, event.timestamp);
      }
      this.revokeNode(event.nodeId, event.timestamp);
      this.lastTrustEventTs.set(event.nodeId, Math.max(last ?? 0, event.timestamp));
      return;
    }

    if (event.type === 'ROTATION_STARTED') {
      const nextSecret = event.payload.nextSecret;
      if (typeof nextSecret !== 'string' || !validateNodeSecretLength(nextSecret)) return;
      if (!this.has(event.nodeId)) return;
      this.startRotation(event.nodeId, nextSecret, event.timestamp);
      this.lastTrustEventTs.set(event.nodeId, Math.max(last ?? 0, event.timestamp));
      return;
    }

    if (event.type === 'ROTATION_COMPLETED') {
      if (!this.has(event.nodeId)) return;
      const auth = this.getNodeAuth(event.nodeId);
      if (auth?.trustState !== 'ROTATING') return;
      this.completeRotation(event.nodeId, event.timestamp);
      this.lastTrustEventTs.set(event.nodeId, Math.max(last ?? 0, event.timestamp));
    }
  }

  getTrustSnapshot(): Record<string, { trustState: TrustState; updatedAt: number; rotatedAt?: number; revokedAt?: number }> {
    const out: Record<string, { trustState: TrustState; updatedAt: number; rotatedAt?: number; revokedAt?: number }> = {};
    for (const [nodeId, e] of this.nodes) {
      out[nodeId] = {
        trustState: e.trustState,
        updatedAt: this.lastTrustEventTs.get(nodeId) ?? e.lastSeen ?? e.createdAt,
        ...(e.rotatedAt !== undefined ? { rotatedAt: e.rotatedAt } : {}),
        ...(e.revokedAt !== undefined ? { revokedAt: e.revokedAt } : {}),
      };
    }
    return out;
  }

  private toInfo(nodeId: IrisNodeId, e: Entry, now: number): ControlPlaneNodeInfo {
    return {
      nodeId,
      lastSeen: e.lastSeen,
      status: computeNodeStatus(e.lastSeen, now, e.pinnedOffline),
      trustState: e.trustState,
      activeSecret: e.activeSecret,
      ...(e.nextSecret !== undefined ? { nextSecret: e.nextSecret } : {}),
      ...(e.rotationSecretDelivered !== undefined ? { rotationSecretDelivered: e.rotationSecretDelivered } : {}),
      ...(e.rotationExpiresAt !== undefined ? { rotationExpiresAt: e.rotationExpiresAt } : {}),
      createdAt: e.createdAt,
      ...(e.rotatedAt !== undefined ? { rotatedAt: e.rotatedAt } : {}),
      ...(e.revokedAt !== undefined ? { revokedAt: e.revokedAt } : {}),
      ...(e.metadata !== undefined ? { metadata: e.metadata } : {}),
    };
  }
}
