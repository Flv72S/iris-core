/**
 * Microstep 16D — Control plane facade (registry + state + cluster snapshot).
 */

import { setTimeout as sleep } from 'node:timers/promises';

import { InMemoryNonceStore } from '../security/nonce.js';
import type { NonceStore } from '../security/nonce.js';
import { setSecurityLogSink } from '../security/security_logger.js';
import type { SecurityLogSink } from '../security/security_logger.js';
import type { IrisObservabilitySnapshot } from '../observability/observability_contract.js';
import type { ControlPlaneNodeInfo, ControlPlaneSnapshot, IrisNodeId } from './control_plane_types.js';
import { validateIngestPayload } from './control_plane_ingestion.js';
import { ControlPlaneRegistry } from './control_plane_registry.js';
import { finalizeRotation, initiateRotation } from './control_plane_rotation.js';
import { ControlPlaneState } from './control_plane_state.js';
import { buildClusterSnapshot } from './control_plane_snapshot.js';
import { writeControlPlaneSnapshot } from './control_plane_persist.js';

export type IngestSnapshotResult = { ok: true } | { ok: false; error: string };
export const DEFAULT_MAX_INGEST_BYTES = 512 * 1024;
type ClosableControlPlaneServer = { close: () => Promise<void> };

export type ControlPlaneOptions = {
  /** Working directory for `.iris/control_plane.snapshot.json`. */
  cwd?: string;
  /** Clock (tests). */
  now?: () => number;
  /** Persist cluster file after each successful ingest. Default true. */
  persist?: boolean;
  /**
   * Microstep 16D.X1 — reject unsigned POST /ingest (401).
   * Default false (dev: unsigned allowed with warning).
   */
  requireSignedIngest?: boolean;
  /** Pluggable nonce store (in-memory by default; can be Redis-backed). */
  nonceStore?: NonceStore;
  /** Max raw bytes accepted for POST /ingest payloads. */
  maxIngestBytes?: number;
  /** Optional security sink (SIEM/observability integration). */
  securityLogSink?: SecurityLogSink;
  /** When true, throws on invalid trust lifecycle records at bootstrap. */
  strictTrustValidation?: boolean;
};

export class ControlPlane {
  readonly registry: ControlPlaneRegistry;
  readonly state: ControlPlaneState;
  readonly nonceStore: NonceStore;
  /** When true, POST /ingest must include valid HMAC headers. */
  readonly requireSignedIngest: boolean;
  readonly maxIngestBytes: number;
  private readonly cwd: string;
  private readonly now: () => number;
  private readonly persist: boolean;
  private httpServer: ClosableControlPlaneServer | null = null;
  private readonly rotationTimers = new Set<NodeJS.Timeout>();
  private readonly shutdownHooks: Array<() => Promise<void>> = [];

  constructor(options?: ControlPlaneOptions) {
    this.registry = new ControlPlaneRegistry();
    this.state = new ControlPlaneState();
    this.cwd = options?.cwd ?? process.cwd();
    this.now = options?.now ?? Date.now;
    this.persist = options?.persist !== false;
    this.requireSignedIngest = options?.requireSignedIngest === true;
    this.nonceStore = options?.nonceStore ?? new InMemoryNonceStore();
    this.maxIngestBytes = options?.maxIngestBytes ?? DEFAULT_MAX_INGEST_BYTES;
    if (options?.securityLogSink) {
      setSecurityLogSink(options.securityLogSink);
    }
    this.registry.recoverTrustState(options?.strictTrustValidation === true);
  }

  /** Wall clock for auth skew (tests inject via ControlPlaneOptions.now). */
  nowMs(): number {
    return this.now();
  }

  ingestSnapshot(nodeId: string, snapshot: IrisObservabilitySnapshot): IngestSnapshotResult {
    const v = validateIngestPayload(nodeId, snapshot);
    if (!v.ok) {
      return { ok: false, error: v.reason };
    }

    const accepted = this.state.setNodeSnapshot(nodeId, snapshot);
    if (!accepted) {
      return { ok: false, error: 'snapshot older than stored observability timestamp' };
    }

    const t = this.now();
    this.registry.updateHeartbeat(nodeId, t);

    if (this.persist) {
      try {
        writeControlPlaneSnapshot(this.cwd, this.getClusterSnapshot());
      } catch {
        // persistence must not break ingest
      }
    }

    return { ok: true };
  }

  getClusterSnapshot(): ControlPlaneSnapshot {
    return buildClusterSnapshot(this.registry, this.state, this.now());
  }

  getNode(nodeId: IrisNodeId): { info: ControlPlaneNodeInfo; observability: IrisObservabilitySnapshot } | undefined {
    const snap = this.state.getNodeSnapshot(nodeId);
    if (!snap) return undefined;
    const info = this.registry.getNode(nodeId, this.now());
    if (!info) {
      return {
        info: {
          nodeId,
          lastSeen: snap.node.timestamp,
          status: 'offline',
          trustState: 'REVOKED',
          activeSecret: '',
          createdAt: snap.node.timestamp,
        },
        observability: snap,
      };
    }
    return { info, observability: snap };
  }

  getAllNodes(): ControlPlaneSnapshot['nodes'] {
    return this.getClusterSnapshot().nodes;
  }

  getTrustSnapshot(): Record<string, { trustState: string; updatedAt: number; rotatedAt?: number; revokedAt?: number }> {
    return this.registry.getTrustSnapshot();
  }

  markOffline(nodeId: IrisNodeId): void {
    this.registry.markOffline(nodeId);
    if (this.persist) {
      try {
        writeControlPlaneSnapshot(this.cwd, this.getClusterSnapshot());
      } catch {
        // ignore
      }
    }
  }

  activateNode(nodeId: IrisNodeId): boolean {
    const ok = this.registry.activateNode(nodeId, this.now());
    if (ok && this.persist) {
      try {
        writeControlPlaneSnapshot(this.cwd, this.getClusterSnapshot());
      } catch {
        // ignore
      }
    }
    return ok;
  }

  revokeNode(nodeId: IrisNodeId): boolean {
    const ok = this.registry.revokeNode(nodeId, this.now());
    if (ok && this.persist) {
      try {
        writeControlPlaneSnapshot(this.cwd, this.getClusterSnapshot());
      } catch {
        // ignore
      }
    }
    return ok;
  }

  initiateRotation(nodeId: IrisNodeId): string | null {
    return initiateRotation(this.registry, nodeId, this.now());
  }

  initiateRotationWithDelivery(nodeId: IrisNodeId): { ok: true; nextSecret: string } | { ok: false; status: 400 | 409 } {
    const auth = this.registry.getNodeAuth(nodeId);
    if (auth?.trustState === 'ROTATING' && auth.nextSecret) {
      const delivered = this.registry.markRotationSecretDelivered(nodeId);
      if (!delivered) return { ok: false, status: 409 };
      return { ok: true, nextSecret: auth.nextSecret };
    }
    const nextSecret = this.initiateRotation(nodeId);
    if (!nextSecret) return { ok: false, status: 400 };
    const delivered = this.registry.markRotationSecretDelivered(nodeId);
    if (!delivered) return { ok: false, status: 400 };
    return { ok: true, nextSecret };
  }

  finalizeRotation(nodeId: IrisNodeId): boolean {
    return finalizeRotation(this.registry, nodeId, this.now());
  }

  attachHttpServer(server: ClosableControlPlaneServer): void {
    this.httpServer = server;
  }

  /**
   * Register async cleanup (e.g. WsTransport.stop). Invoked before HTTP close.
   * Hooks run once per shutdown; register again after if needed.
   */
  registerShutdownHook(fn: () => Promise<void>): void {
    this.shutdownHooks.push(fn);
  }

  registerRotationTimer(timer: NodeJS.Timeout): void {
    this.rotationTimers.add(timer);
  }

  async shutdown(): Promise<void> {
    const hooks = [...this.shutdownHooks];
    this.shutdownHooks.length = 0;
    for (const fn of hooks) {
      try {
        await fn();
      } catch {
        // best effort — continue tearing down
      }
    }
    if (this.httpServer) {
      await this.httpServer.close();
      this.httpServer = null;
    }
    for (const timer of this.rotationTimers) {
      clearInterval(timer);
    }
    this.rotationTimers.clear();
    await sleep(10);
  }
}
