/**
 * Microstep 16A — IRIS Node (SDK facade).
 *
 * Notes:
 * - It orchestrates existing Phase 14–15 modules (no protocol logic duplication).
 * - It defaults to a zero-config WS loopback node suitable for local integration tests.
 */

import { generateKeyPairSync, randomUUID } from 'node:crypto';

import type { Transport, TransportMessage } from '../network/transport/index.js';
import { TransportFactory, TransportError, TransportErrorCode } from '../network/transport/index.js';

import { DefaultCryptoProvider, TrustEngine, TrustSigner, TrustRegistry, TrustVerifier, FederationRegistry, AuthorityRegistry, ReplayProtection } from '../network/covenant_trust/index.js';
import { SessionManager, SessionRegistry } from '../network/secure_session/index.js';
import { MessageEnvelopeSigner, MessageEnvelopeValidator, computePayloadHash } from '../network/message_envelope/index.js';

import { ReplayProtectionEngine } from '../network/replay_protection/index.js';
import { EncryptionEngine, KeyExchange } from '../network/encryption/index.js';
import { AuthenticatedKeyExchangeHandshake } from '../network/encryption/encryption_handshake.js';

import { EventBus, CovenantRuntimeEngine, CovenantRuntimeStore } from '../network/covenant_runtime/index.js';
import { CovenantRegistry } from '../network/covenants/index.js';
import { CovenantPersistenceStore } from '../network/covenant_persistence/index.js';

import { ConsoleIrisLogger, type IrisLogger } from './iris_logger.js';
import { IrisError, IrisErrorCode } from './iris_errors.js';
import type { IrisConfig, TransportConfig } from './iris_config.js';
import {
  mapMetricsToPrometheus,
  renderPrometheusMetrics,
  resolveObservability,
  startMetricsServer,
} from '../observability/index.js';
import type { IrisObservabilitySnapshot } from '../observability/observability_contract.js';
import { writeLegacyDerivedFiles, writeObservabilitySnapshot } from '../observability/observability_persist.js';
import { validateNodeSecretLength } from '../security/index.js';
import { postObservabilityIngest } from '../control_plane/transport/http_client.js';
import { tryAuditSummary } from '../control_plane/audit_log.js';
import { tryLoadNodeIdentity } from '../control_plane/identity/identity_persist.js';
import { tryLoadSyncMetrics } from '../control_plane/distributed_sync.js';
import { readTrustSnapshot, computeTrustSnapshotDrift } from '../control_plane/federation/trust_persist.js';
import { normalizeTrustSnapshot } from '../control_plane/federation/trust_snapshot.js';
import { getSecureTransportMetricsSnapshot } from '../network/secure_transport/transport_metrics.js';
import {
  getGossipConsistencyStats,
  getGossipControlStats,
  getGossipDebugSnapshot,
  getGossipMetricsSnapshot,
} from '../network/gossip/gossip_metrics.js';
import { getCRDTMetricsSnapshot } from '../state/crdt/crdt_metrics.js';
import {
  ControlPlaneRegistry,
  DistributedSyncManager,
  InMemoryDomainRegistry,
  InMemoryEd25519KeyProvider,
  InMemoryPeerRegistry,
  TrustSyncEngine,
} from '../control_plane/index.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../control_plane/identity/canonical_identity.js';
import { GossipDedupCache, GossipEngine, GossipRateLimiter, PeerManager } from '../network/gossip/index.js';
import { buildTlsContext, SecureTransportClientImpl, SecureTransportServerImpl } from '../network/secure_transport/index.js';
import type { TransportTrustEngineLike } from '../network/secure_transport/index.js';
import { deriveNodeIdFromTlsContext } from '../network/secure_transport/transport_identity.js';
import { CRDTEngine, CRDTPersistence, CRDTSyncBridge } from '../state/crdt/index.js';
import { LWWRegisterCRDT } from '../state/crdt/crdt_lww_register.js';
import { signCRDTOperation } from '../state/crdt/crdt_security.js';
import { createTracerSpanSource } from '../observability/span_source.js';
import { OpenTelemetryAdapter } from '../observability/opentelemetry/otel_adapter.js';
import { resolveOtelConfig } from '../observability/opentelemetry/otel_config.js';
import {
  AlertActionPipeline,
  AlertEngine,
  AlertRegistry,
  AlertState,
  createConsoleAlertAction,
  createFileAlertAction,
  loadAlertRules,
} from '../observability/alerting/index.js';
import type { MetricsServerHandle } from '../observability/index.js';
import type { ResolvedObservability } from '../observability/observability_context.js';
import type { Span } from '../observability/tracing/span.js';
import {
  runWithTraceContextAsync,
  generateTraceId,
  generateSpanId,
  isValidTraceContext,
} from '../observability/tracing/trace_context.js';
import type { MetricsSnapshot, StandardMetricsSnapshot } from '../observability/metrics/metrics_types.js';
import type { SpanModel } from '../observability/tracing/span.js';
import type { IrisEvent } from './iris_events.js';
import type { IrisHealthStatus } from './iris_health.js';
import type { IrisModules, MessageEnvelopeService } from './iris_modules.js';
import type { IrisMessage, NodeStatusWithState } from './iris_types.js';
import { NodeState } from './iris_types.js';

export type IrisRuntimeState = 'INITIALIZING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';
type RuntimeComponent = 'identity' | 'transport' | 'gossip' | 'crdt' | 'federation' | 'observability';

class RuntimeInitError extends Error {
  readonly phase: string;
  readonly cause: Error | undefined;
  constructor(phase: string, message: string, cause?: Error) {
    super(message);
    this.name = 'RuntimeInitError';
    this.phase = phase;
    this.cause = cause;
  }
}

type StartBootContext = {
  trustRegistry: TrustRegistry;
  trustEngine: TrustEngine;
  trustSigner: TrustSigner;
  sessionManager: SessionManager;
  transportUrlForLog: string;
};

function isIrisMessage(value: unknown): value is IrisMessage {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as any).type === 'string' &&
    'payload' in (value as any)
  );
}

class NoOpReplayStore {
  has(_identifier: any): boolean {
    return false;
  }
  add(_identifier: any): void {
    // no-op
  }
  getAll(): any[] {
    return [];
  }
}

function generateEd25519Base64(): { publicKey: string; privateKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = (privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64');
  const spki = (pubObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  return { publicKey: spki, privateKey: pkcs8 };
}

type RuntimeConvergenceComponents = {
  secureTransportServer: SecureTransportServerImpl;
  secureTransportClient: SecureTransportClientImpl;
  trustSyncEngine: TrustSyncEngine;
  distributedSync: DistributedSyncManager;
  gossipEngine: GossipEngine;
  gossipPeerManager: PeerManager;
  crdtEngine: CRDTEngine;
  crdtSync: CRDTSyncBridge;
  crdtPersistence: CRDTPersistence;
};

class RuntimeTransportTrustEngine implements TransportTrustEngineLike {
  constructor(
    private readonly localNodeId: string,
    private readonly localDomainId: string,
    private readonly trustedNodes: () => Set<string>,
  ) {}

  isNodeTrusted(nodeId: string): boolean {
    return nodeId === this.localNodeId || this.trustedNodes().has(nodeId);
  }

  isDomainTrusted(domainId: string | undefined): boolean {
    return !domainId || domainId === this.localDomainId;
  }

  getTrustLevel(_nodeId: string): 'FULL' {
    return 'FULL';
  }
}

export class IrisNode {
  private static readonly runtimeRegistry = new Map<string, IrisNode>();

  private state: NodeState = NodeState.INIT;
  private runtimeState: IrisRuntimeState = 'STOPPED';
  private started = false;

  private transport: Transport | null = null;
  private modules: IrisModules | null = null;

  private node_id: string;
  private selfSessionId: string | null = null;
  private activeSessions = 0;

  private logger: IrisLogger;
  private readonly listeners = new Map<IrisEvent, Array<(payload: any) => void>>();

  private encryptionEnabled = false;
  private replayEnabled = false;
  private covenantsEnabled = true;
  private devMode = true;

  // observable for tests/debug
  private lastSentRaw: unknown = null;

  private readonly config: Partial<IrisConfig> | undefined;

  private readonly obs: ResolvedObservability;
  private nodeReadyAt: number | null = null;
  private obsTicker: ReturnType<typeof setInterval> | null = null;
  private controlPlaneTicker: ReturnType<typeof setInterval> | null = null;
  private prometheusMetricsServer: MetricsServerHandle | null = null;
  private otelAdapter: OpenTelemetryAdapter | null = null;
  private runtimeBootStartedAtMs = 0;
  private runtimeErrors = 0;
  private runtimeComponents: RuntimeConvergenceComponents | null = null;
  private trustedRuntimePeers = new Set<string>();
  private runtimeConnections = new Map<string, { close: () => Promise<void> }>();
  private runtimeSecureNodeId: string | null = null;
  private readonly activeComponents = new Set<RuntimeComponent>();
  private readonly runtimeDomainsRegistered = new Set<string>();
  private lastInitPhase: string | undefined;
  private lastInitPhaseStatus: 'OK' | 'FAILED' | undefined;
  private lastInitErrorPhase: string | undefined;

  private readonly alertRegistry: AlertRegistry | null;
  private readonly alertState: AlertState | null;
  private readonly alertEngine: AlertEngine | null;
  private readonly alertPipeline: AlertActionPipeline | null;

  constructor(config?: Partial<IrisConfig>) {
    this.config = config;
    this.node_id = config?.node_id ?? randomUUID();
    this.devMode = config?.dev_mode ?? true;
    this.logger = new ConsoleIrisLogger(this.devMode ? 'DEVELOPMENT' : 'PRODUCTION');

    this.encryptionEnabled = config?.features?.encryption ?? config?.security?.encryption ?? false;
    this.replayEnabled = config?.features?.replay_protection ?? config?.security?.replay_protection ?? false;
    this.covenantsEnabled = config?.features?.covenants ?? true;

    const obsCwd = config?.observability?.cwd ?? process.cwd();
    this.obs = resolveObservability(config, { cwd: obsCwd, nodeId: this.node_id });
    if (this.obs.bridge) {
      this.obs.bridge.wire((ev, fn) => this.on(ev, fn as (p: unknown) => void));
    }

    const otelCfg = resolveOtelConfig(config?.observability?.otel);
    if (otelCfg.enabled && this.obs.tracer) {
      this.otelAdapter = new OpenTelemetryAdapter({
        spanSource: createTracerSpanSource(this.obs.tracer),
        endpoint: otelCfg.endpoint,
        serviceName: otelCfg.serviceName,
        flushIntervalMs: otelCfg.flushIntervalMs,
        nodeId: this.node_id,
        events: otelCfg.events,
      });
    }

    if (this.obs.metrics && this.obs.flags.alerting) {
      this.alertRegistry = new AlertRegistry();
      this.alertState = new AlertState();
      this.alertPipeline = new AlertActionPipeline();
      this.alertPipeline.register(createConsoleAlertAction(), createFileAlertAction(this.obs.cwd));
      for (const r of loadAlertRules(this.obs.cwd)) {
        this.alertRegistry.register(r);
      }
      this.alertEngine = new AlertEngine(this.alertRegistry, this.alertState, {
        defaultCooldownMs: 60_000,
        actionPipeline: this.alertPipeline,
      });
    } else {
      this.alertRegistry = null;
      this.alertState = null;
      this.alertPipeline = null;
      this.alertEngine = null;
    }
  }

  on(event: IrisEvent, handler: Function): void {
    const list = this.listeners.get(event) ?? [];
    list.push(handler as any);
    this.listeners.set(event, list);
  }

  private emit(event: IrisEvent, payload: unknown): void {
    const list = this.listeners.get(event) ?? [];
    for (const h of list) {
      try {
        h(payload);
      } catch {
        // ignore handler exceptions
      }
    }
  }

  private logStartup(transportUrl: string): void {
    if (this.obs.flags.logging === false) return;
    if (this.obs.logger) {
      this.obs.logger.info('Node started', { transport: transportUrl, mode: this.devMode ? 'DEVELOPMENT' : 'PRODUCTION' });
      this.obs.logger.info(`Node ID: ${this.node_id}`, { transport: transportUrl });
      this.obs.logger.info(`Transport: ${transportUrl}`, {});
      this.obs.logger.info(`Mode: ${this.devMode ? 'DEVELOPMENT' : 'PRODUCTION'}`, {});
    } else {
      this.logger.info('Node started');
      this.logger.info(`Node ID: ${this.node_id}`);
      this.logger.info(`Transport: ${transportUrl}`);
      this.logger.info(`Mode: ${this.devMode ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    }
  }

  /** Microstep 16D.X1 — require valid shared secret when node signing is enabled + control plane push. */
  private validateNodeSecurityForControlPlane(): void {
    const cp = this.config?.controlPlane;
    const ns = this.config?.nodeSecurity;
    if (!cp?.enabled) return;
    if (!ns?.enabled) return;
    const hasPrimary = !!(ns.nodeSecret && validateNodeSecretLength(ns.nodeSecret));
    const hasNext = !!(ns.nextSecret && validateNodeSecretLength(ns.nextSecret));
    if (!hasPrimary && !hasNext) {
      throw new IrisError(
        IrisErrorCode.INVALID_CONFIG,
        'nodeSecurity.enabled requires nodeSecret or nextSecret (>=32 UTF-8 bytes)',
        'Set nodeSecurity secrets or disable nodeSecurity.enabled',
      );
    }
  }

  /** Microstep 16D — periodic observability push to control plane (non-blocking; retries inside client). */
  private scheduleControlPlanePush(): void {
    const cp = this.config?.controlPlane;
    if (!cp?.enabled || !cp.endpoint) return;
    const intervalMs = cp.intervalMs ?? 15_000;
    const endpoint = cp.endpoint;
    const ns = this.config?.nodeSecurity;
    const auth =
      ns?.enabled && (
        (ns.nodeSecret && validateNodeSecretLength(ns.nodeSecret)) ||
        (ns.nextSecret && validateNodeSecretLength(ns.nextSecret))
      )
        ? {
            enabled: true as const,
            ...(ns.nodeSecret && validateNodeSecretLength(ns.nodeSecret) ? { nodeSecret: ns.nodeSecret } : {}),
            ...(ns.nextSecret && validateNodeSecretLength(ns.nextSecret) ? { nextSecret: ns.nextSecret } : {}),
          }
        : undefined;
    const push = (): void => {
      void postObservabilityIngest({
        baseUrl: endpoint,
        nodeId: this.node_id,
        snapshot: this.getObservabilitySnapshot(),
        ...(auth !== undefined ? { auth } : {}),
      });
    };
    this.controlPlaneTicker = setInterval(push, intervalMs);
    void push();
  }

  private maybeStartPrometheusExporter(): void {
    const cfg = this.config?.observability?.prometheus;
    if (!cfg?.enabled || !this.obs.metrics) return;
    const port = cfg.port ?? 9464;
    this.prometheusMetricsServer = startMetricsServer(() => {
      this.flushObsSnapshot();
      const snap = this.obs.metrics!.exportJson();
      return renderPrometheusMetrics(mapMetricsToPrometheus({ ...snap, nodeId: this.node_id }));
    }, port);
  }

  private reloadAlertRulesFromDisk(): void {
    if (!this.alertRegistry || !this.alertState) return;
    this.alertRegistry.clear();
    const rules = loadAlertRules(this.obs.cwd);
    const ids = new Set(rules.map((r) => r.id));
    for (const r of rules) {
      this.alertRegistry.register(r);
    }
    for (const a of this.alertState.getAllActive()) {
      if (!ids.has(a.ruleId)) {
        this.alertState.resolve(a.ruleId, Date.now());
      }
    }
  }

  private applyMetricGauges(): void {
    if (!this.obs.metrics) return;
    const now = Date.now();
    const uptime = this.nodeReadyAt != null ? (now - this.nodeReadyAt) / 1000 : 0;
    this.obs.metrics.gauge('node_uptime_seconds', uptime);
    this.obs.metrics.gauge('active_sessions', this.activeSessions);
  }

  private sortMetricKeys(metrics: Record<string, number>): Record<string, number> {
    const keys = Object.keys(metrics).sort();
    const out: Record<string, number> = {};
    for (const k of keys) out[k] = metrics[k]!;
    return out;
  }

  private sortStrings(values: Iterable<string>): string[] {
    return [...values].sort();
  }

  private compareSpanModels(a: SpanModel, b: SpanModel): number {
    const ta = a.traceId ?? '';
    const tb = b.traceId ?? '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return a.startTime - b.startTime;
  }

  /** Unified observability snapshot (metrics, optional traces & alerts). */
  getObservabilitySnapshot(): IrisObservabilitySnapshot {
    return this.buildObservabilitySnapshot();
  }

  private buildObservabilitySnapshot(): IrisObservabilitySnapshot {
    const now = Date.now();
    const uptime = this.nodeReadyAt != null ? (now - this.nodeReadyAt) / 1000 : 0;

    this.applyMetricGauges();

    if (this.obs.flags.alerting && this.alertEngine && this.alertRegistry && this.alertState && this.obs.metrics) {
      this.reloadAlertRulesFromDisk();
      this.alertEngine.evaluate(this.obs.metrics.exportJson().metrics);
    }

    let metricsBlock: StandardMetricsSnapshot;
    if (this.obs.metrics) {
      const snap = this.obs.metrics.exportJson();
      metricsBlock = {
        metrics: this.sortMetricKeys(snap.metrics),
        timestamp: snap.generatedAt,
        nodeId: this.node_id,
      };
    } else {
      metricsBlock = {
        metrics: {},
        timestamp: new Date().toISOString(),
        nodeId: this.node_id,
      };
    }

    const out: IrisObservabilitySnapshot = {
      node: { id: this.node_id, timestamp: now, uptime_seconds: uptime },
      metrics: metricsBlock,
    };

    if (this.obs.metrics) {
      this.obs.metrics.gauge('runtime.boot.time', this.runtimeBootStartedAtMs > 0 ? now - this.runtimeBootStartedAtMs : 0);
      this.obs.metrics.gauge('runtime.state', this.runtimeState === 'RUNNING' ? 1 : this.runtimeState === 'INITIALIZING' ? 0.5 : 0);
      this.obs.metrics.gauge('runtime.errors', this.runtimeErrors);
      this.obs.metrics.gauge('runtime.active_components', this.activeComponents.size);
      this.obs.metrics.gauge('runtime.component.count', this.activeComponents.size);
    }
    out.runtime = {
      state: this.runtimeState,
      ...(this.runtimeBootStartedAtMs > 0 ? { bootStartedAt: this.runtimeBootStartedAtMs } : {}),
      updatedAt: new Date(now).toISOString(),
      errors: this.runtimeErrors,
      activeComponents: this.activeComponents.size,
      activeComponentsList: this.sortStrings(this.activeComponents),
      ...(this.lastInitPhase ? { lastInitPhase: this.lastInitPhase } : {}),
      ...(this.lastInitPhaseStatus ? { lastInitPhaseStatus: this.lastInitPhaseStatus } : {}),
      ...(this.lastInitErrorPhase ? { lastInitErrorPhase: this.lastInitErrorPhase } : {}),
    };
    if (this.obs.metrics) {
      const snap = this.obs.metrics.exportJson();
      out.metrics = {
        metrics: this.sortMetricKeys(snap.metrics),
        timestamp: snap.generatedAt,
        nodeId: this.node_id,
      };
    }

    if (this.obs.flags.tracing && this.obs.tracer) {
      const spans = [...this.obs.tracer.exportSpans()].sort((a, b) => this.compareSpanModels(a, b));
      out.traces = { spans };
    }

    if (this.obs.flags.alerting && this.alertState) {
      out.alerts = { active: this.alertState.getAllActive() };
    }

    const auditSnap = tryAuditSummary(this.obs.cwd);
    if (auditSnap) {
      out.audit = auditSnap;
    }

    const syncSnap = tryLoadSyncMetrics(this.obs.cwd);
    if (syncSnap) {
      out.sync = { peers: syncSnap.peers, divergences: syncSnap.divergences };
      if (syncSnap.federation) {
        out.federation = {
          ...syncSnap.federation,
          ...(this.runtimeDomainsRegistered.size > 0
            ? { domainsRegistered: this.sortStrings(this.runtimeDomainsRegistered) }
            : {}),
        };
      }
      if (syncSnap.federationSecurity) {
        out.federationSecurity = syncSnap.federationSecurity;
      }
    }
    if (!out.federation && this.runtimeDomainsRegistered.size > 0) {
      out.federation = {
        domainId: 'local',
        peersByDomain: {},
        rejectedByPolicy: 0,
        domainsRegistered: this.sortStrings(this.runtimeDomainsRegistered),
      };
    }

    const trustSnap = readTrustSnapshot(this.obs.cwd);
    if (trustSnap) {
      const normalized = normalizeTrustSnapshot(trustSnap);
      const drift = computeTrustSnapshotDrift(this.obs.cwd, normalized);
      out.trust = {
        domains: normalized.domains.length,
        revoked: normalized.revokedDomains.length,
        lastUpdate: normalized.timestamp,
        driftDetected: drift.driftDetected,
      };
    }

    const idSnap = tryLoadNodeIdentity(this.obs.cwd);
    if (idSnap) {
      out.identity = idSnap;
    }

    // 16F.X5.HARDENING — transport security metrics
    out.transport = getSecureTransportMetricsSnapshot();

    // 16F.X6 — gossip metrics (in-process)
    out.gossip = getGossipMetricsSnapshot();
    const gs = getGossipDebugSnapshot();
    if (gs) out.gossipState = gs;
    out.gossipControl = getGossipControlStats();
    out.gossipConsistency = getGossipConsistencyStats();
    out.crdt = getCRDTMetricsSnapshot();

    return out;
  }

  private flushObsSnapshot(): void {
    if (this.obs.disabled) return;
    if (!this.obs.metrics && !this.obs.tracer) return;
    try {
      const snap = this.buildObservabilitySnapshot();
      writeObservabilitySnapshot(snap, this.obs.cwd);
      writeLegacyDerivedFiles(this.obs.cwd, snap);
    } catch {
      // ignore persist / validation errors
    }
  }

  private scheduleObsSnapshot(): void {
    if (this.obs.disabled) return;
    if (!this.obs.metrics && !this.obs.tracer) return;
    this.flushObsSnapshot();
    if (this.obsTicker) clearInterval(this.obsTicker);
    const intervalMs = this.config?.runtime?.observability?.snapshotIntervalMs ?? 5000;
    this.obsTicker = setInterval(() => this.flushObsSnapshot(), intervalMs);
  }

  /** Expose metrics for tests / CLI (JSON snapshot). */
  getMetricsSnapshot(): MetricsSnapshot | null {
    if (!this.obs.metrics) return null;
    this.flushObsSnapshot();
    return this.obs.metrics.exportJson();
  }

  getStatus(): NodeStatusWithState {
    return {
      started: this.started,
      node_id: this.node_id,
      active_sessions: this.activeSessions,
      state: this.state,
      last_sent_is_encrypted: this.lastSentRaw != null && this.isEncryptedRaw(this.lastSentRaw),
    };
  }

  getState(): NodeStatusWithState {
    return this.getStatus();
  }

  getRuntimeState(): IrisRuntimeState {
    return this.runtimeState;
  }

  health(): IrisHealthStatus {
    const transportUp = this.started && this.transport != null;
    const sessionUp = this.selfSessionId != null;
    const messagingUp = this.modules?.messaging != null;
    const encryptionUp = this.encryptionEnabled ? this.modules?.encryption != null : false;
    const replayUp = this.replayEnabled ? this.modules?.replay != null : false;
    const covenantsUp = this.covenantsEnabled ? this.modules?.covenants != null : false;

    return {
      status: transportUp && sessionUp && messagingUp ? 'ok' : transportUp || sessionUp ? 'degraded' : 'error',
      modules: {
        transport: transportUp ? 'up' : 'down',
        session: sessionUp ? 'up' : 'down',
        messaging: messagingUp ? 'up' : 'down',
        encryption: encryptionUp ? 'up' : 'down',
        replay: replayUp ? 'up' : 'down',
        covenants: covenantsUp ? 'up' : 'down',
      },
    };
  }

  async start(): Promise<void> {
    if (this.state !== NodeState.INIT && this.state !== NodeState.STOPPED) {
      throw new IrisError(IrisErrorCode.START_FAILED, `Cannot start from state ${this.state}`);
    }
    this.state = NodeState.STARTING;
    this.runtimeState = 'INITIALIZING';
    this.runtimeBootStartedAtMs = Date.now();
    this.lastInitPhase = undefined;
    this.lastInitPhaseStatus = undefined;
    this.lastInitErrorPhase = undefined;
    this.emit('node:starting', { node_id: this.node_id });

    try {
      const boot: Partial<StartBootContext> = {};
      await this.runInitPhase('configuration', async () => this.initConfiguration());
      await this.runInitPhase('identity', async () => {
        const { trustRegistry, trustEngine, trustSigner } = this.initIdentity();
        boot.trustRegistry = trustRegistry;
        boot.trustEngine = trustEngine;
        boot.trustSigner = trustSigner;
        this.activeComponents.add('identity');
      });
      await this.runInitPhase('federation', async () => {
        this.initFederation();
        this.activeComponents.add('federation');
      });
      await this.runInitPhase('transport', async () => {
        const out = await this.initTransport();
        boot.transportUrlForLog = out.transportUrlForLog;
        this.activeComponents.add('transport');
      });
      await this.runInitPhase('session_control', async () => {
        const sm = this.initSessionControl(boot.trustRegistry!, boot.trustEngine!, boot.trustSigner!);
        boot.sessionManager = sm;
      });
      await this.runInitPhase('gossip', async () => {
        await this.initGossip();
        this.activeComponents.add('gossip');
      });
      await this.runInitPhase('crdt', async () => {
        await this.initCRDT();
        this.activeComponents.add('crdt');
      });
      await this.runInitPhase('crdt_sync', async () => this.initCRDTSync());
      await this.runInitPhase('distributed_sync', async () => this.initDistributedSync());
      await this.runInitPhase('observability', async () => {
        this.initObservability(boot.transportUrlForLog ?? 'ws://localhost:4000');
        this.activeComponents.add('observability');
      });

      this.started = true;
      this.state = NodeState.READY;
      this.runtimeState = 'RUNNING';
      this.nodeReadyAt = Date.now();
      this.emit('node:ready', { node_id: this.node_id });
    } catch (e) {
      this.state = NodeState.ERROR;
      this.runtimeState = 'ERROR';
      this.runtimeErrors += 1;
      this.started = false;
      this.emit('error', { error: e });
      if (e instanceof IrisError) throw e;
      if (e instanceof RuntimeInitError && e.cause instanceof IrisError) {
        throw e.cause;
      }
      if (e instanceof RuntimeInitError && e.cause instanceof TransportError) {
        if (e.cause.code === TransportErrorCode.UNSUPPORTED_TRANSPORT || e.cause.code === TransportErrorCode.INVALID_MESSAGE) {
          throw new IrisError(IrisErrorCode.INVALID_CONFIG, e.cause.message, 'Verify IrisConfig.transport.type/options');
        }
      }
      if (e instanceof TransportError) {
        if (e.code === TransportErrorCode.UNSUPPORTED_TRANSPORT || e.code === TransportErrorCode.INVALID_MESSAGE) {
          throw new IrisError(IrisErrorCode.INVALID_CONFIG, e.message, 'Verify IrisConfig.transport.type/options');
        }
      }
      throw new IrisError(IrisErrorCode.START_FAILED, (e as Error).message, 'Check logs and module initialization');
    }
  }

  private async runInitPhase<T>(phase: string, fn: () => Promise<T> | T): Promise<T> {
    const startedAt = Date.now();
    this.lastInitPhase = phase;
    this.logger.info('RUNTIME_INIT_START');
    try {
      const out = await fn();
      if (this.obs.metrics) this.obs.metrics.gauge('runtime.init.phase.duration', Date.now() - startedAt);
      this.lastInitPhaseStatus = 'OK';
      this.lastInitErrorPhase = undefined;
      this.logger.info('RUNTIME_INIT_SUCCESS');
      return out;
    } catch (err) {
      if (this.obs.metrics) this.obs.metrics.increment('runtime.init.phase.failures');
      this.lastInitPhaseStatus = 'FAILED';
      this.lastInitErrorPhase = phase;
      this.logger.error('RUNTIME_INIT_FAILURE');
      const cause = err instanceof Error ? err : new Error(String(err));
      throw new RuntimeInitError(phase, `Runtime init failed at phase: ${phase}`, cause);
    }
  }

  private initConfiguration(): void {
    this.validateNodeSecurityForControlPlane();
    const allowLegacy = this.config?.runtime?.allowLegacy ?? false;
    if (allowLegacy) this.logger.warn('RUNTIME_LEGACY_MODE_ENABLED');
  }

  private initIdentity(): { trustRegistry: TrustRegistry; trustEngine: TrustEngine; trustSigner: TrustSigner } {
    const crypto = new DefaultCryptoProvider();
    const { publicKey, privateKey } = generateEd25519Base64();
    const keyId = 'default';
    const registry = new TrustRegistry();
    registry.registerKey(this.node_id, {
      node_id: this.node_id,
      public_key: publicKey,
      key_id: keyId,
      created_at: 1,
    });
    const federation = new FederationRegistry();
    federation.registerMember({ node_id: this.node_id, authority_id: 'root-1' });
    const authorities = new AuthorityRegistry();
    authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
    const verifier = new TrustVerifier(crypto);
    const trustEngine = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
    const trustSigner = new TrustSigner(crypto, privateKey, publicKey, this.node_id, keyId);
    return { trustRegistry: registry, trustEngine, trustSigner };
  }

  private initFederation(): void {
    // Federation runtime checks are enforced in convergence init guards.
  }

  private async initTransport(): Promise<{ transportUrlForLog: string }> {
    const effective = this.buildEffectiveTransportConfig();
    const transportFactory = new TransportFactory();
    const transport = transportFactory.create(effective.transportConfig);
    transport.onReceive((tm) => void this.handleTransportReceive(tm));
    if (transport.start) await transport.start();
    this.transport = transport;
    return { transportUrlForLog: effective.transportUrlForLog };
  }

  private initSessionControl(trustRegistry: TrustRegistry, trustEngine: TrustEngine, trustSigner: TrustSigner): SessionManager {
    const sessionRegistry = new SessionRegistry();
    const sessionManager = new SessionManager(sessionRegistry, trustEngine, trustSigner, trustRegistry, this.node_id, {
      ttlMs: 60_000,
      maxSkewMs: 30_000,
      idleTimeoutMs: 5 * 60_000,
    });
    const init = sessionManager.initiateHandshake(this.node_id);
    const challenge = sessionManager.handleInit(init);
    const response = sessionManager.handleChallenge(challenge);
    const session = sessionManager.finalizeHandshake(response);
    this.selfSessionId = session.session_id;
    this.activeSessions = 1;
    this.emit('session:open', { session_id: session.session_id });

    const signer = new MessageEnvelopeSigner(trustSigner);
    const replayEngine = this.replayEnabled ? new ReplayProtectionEngine() : this.createNoOpReplayEngine();
    const validator = new MessageEnvelopeValidator(sessionManager, trustEngine, replayEngine);
    const messaging: MessageEnvelopeService = { signer, validator };

    let encryptionEngine: EncryptionEngine | undefined;
    if (this.encryptionEnabled) {
      encryptionEngine = new EncryptionEngine(sessionManager, trustEngine);
      const ke = new KeyExchange();
      const remoteEph = ke.generateEphemeralKeyPair();
      const remoteHandshake = new AuthenticatedKeyExchangeHandshake(trustSigner, trustEngine).createSignedHandshake({
        session_id: session.session_id,
        sender_node_id: this.node_id,
        recipient_node_id: this.node_id,
        ephemeral_public_key: remoteEph.publicKey,
        timestamp: Date.now(),
      });
      encryptionEngine.initializeEncryptionSession(session.session_id, remoteHandshake);
    }
    const covenants = this.covenantsEnabled ? this.initCovenantRuntime() : undefined;
    this.modules = {
      transport: this.transport!,
      session: sessionManager,
      messaging,
      ...(encryptionEngine ? { encryption: encryptionEngine } : {}),
      ...(this.replayEnabled ? { replay: replayEngine } : {}),
      ...(covenants ? { covenants } : {}),
    };
    return sessionManager;
  }

  private initObservability(transportUrlForLog: string): void {
    this.logStartup(transportUrlForLog);
    this.scheduleObsSnapshot();
    this.otelAdapter?.start();
    this.maybeStartPrometheusExporter();
    this.scheduleControlPlanePush();
  }

  private async stopObservability(): Promise<void> {
    if (this.prometheusMetricsServer) {
      await this.prometheusMetricsServer.close().catch(() => {});
      this.prometheusMetricsServer = null;
    }
    this.flushObsSnapshot();
    if (this.otelAdapter) {
      await this.otelAdapter.exportNow().catch(() => {});
      this.otelAdapter.stop();
      this.otelAdapter = null;
    }
    this.activeComponents.delete('observability');
  }

  private async stopDistributedSync(): Promise<void> {
    if (!this.runtimeComponents) return;
    await this.runtimeComponents.trustSyncEngine.stop().catch(() => {});
    this.activeComponents.delete('federation');
  }

  private async stopCRDT(): Promise<void> {
    this.activeComponents.delete('crdt');
  }

  private async stopGossip(): Promise<void> {
    for (const c of this.runtimeConnections.values()) {
      await c.close().catch(() => {});
    }
    this.runtimeConnections.clear();
    this.activeComponents.delete('gossip');
  }

  private async stopTransport(): Promise<void> {
    if (this.runtimeComponents) {
      await this.runtimeComponents.secureTransportServer.stop().catch(() => {});
    }
    if (this.transport?.stop) await this.transport.stop();
    this.activeComponents.delete('transport');
    this.activeComponents.delete('identity');
  }

  private async writeFinalObservabilitySnapshot(): Promise<void> {
    if (this.obs.disabled) return;
    try {
      const snap = this.buildObservabilitySnapshot();
      writeObservabilitySnapshot(snap, this.obs.cwd);
      writeLegacyDerivedFiles(this.obs.cwd, snap);
    } catch {
      // keep stop resilient; snapshot emission is best-effort
    }
  }

  async stop(): Promise<void> {
    if (this.state !== NodeState.READY && this.state !== NodeState.ERROR) return;
    this.state = NodeState.STOPPING;
    this.runtimeState = 'STOPPING';
    try {
      await this.stopObservability();
      await this.stopDistributedSync();
      await this.stopCRDT();
      await this.stopGossip();
      await this.stopTransport();
    } finally {
      if (this.obsTicker) {
        clearInterval(this.obsTicker);
        this.obsTicker = null;
      }
      if (this.controlPlaneTicker) {
        clearInterval(this.controlPlaneTicker);
        this.controlPlaneTicker = null;
      }
      this.emit('session:close', { node_id: this.node_id });
      this.transport = null;
      this.modules = null;
      this.selfSessionId = null;
      this.started = false;
      this.activeSessions = 0;
      this.nodeReadyAt = null;
      this.runtimeComponents = null;
      this.runtimeSecureNodeId = null;
      this.trustedRuntimePeers = new Set();
      this.activeComponents.clear();
      this.runtimeDomainsRegistered.clear();
      IrisNode.runtimeRegistry.delete(this.node_id);
      // Do not flush here: OTLP exportNow() drains finished spans; a second flush would overwrite
      // observability.snapshot.json with empty traces. Pre-export flush above persists final traces.
      this.state = NodeState.STOPPED;
      this.runtimeState = 'STOPPED';
      await this.writeFinalObservabilitySnapshot();
      this.emit('node:stopped', { node_id: this.node_id });
    }
  }

  async send(message: IrisMessage): Promise<void> {
    const modules = this.modules;
    const selfSessionId = this.selfSessionId;
    if (!modules || !selfSessionId) {
      throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'Node not started');
    }
    if (!isIrisMessage(message)) {
      throw new IrisError(IrisErrorCode.INVALID_CONFIG, 'Invalid IrisMessage');
    }

    const doSend = async (): Promise<void> => {
    const parent = isValidTraceContext(message.meta?.trace) ? message.meta!.trace : undefined;
    const traceId = parent ? parent.traceId : generateTraceId();
    const parentSpanId = parent ? parent.spanId : undefined;

    let span: Span | undefined;
    if (this.obs.tracer) {
      span = this.obs.tracer.startSpan('message_send', {
        traceId,
        ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
        type: message.type,
      });
    }
    const spanId = span?.id ?? generateSpanId();
    if (!message.meta) message.meta = {};
    message.meta.trace = {
      traceId,
      spanId,
      ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
    };

    const timestamp = Date.now();
    const payloadHash = computePayloadHash(message);
    const nonce = this.replayEnabled ? `nonce-${payloadHash.slice(0, 16)}` : randomUUID();

    const envelope = modules.messaging.signer.sign({
      message_id: randomUUID(),
      session_id: selfSessionId,
      sender_node_id: this.node_id,
      recipient_node_id: this.node_id,
      timestamp,
      nonce,
      payload: message,
    });

    let raw: unknown = envelope;
    if (this.encryptionEnabled && modules.encryption) {
      raw = modules.encryption.encryptEnvelope(envelope);
    }
    this.lastSentRaw = raw;

    const tm: TransportMessage = {
      raw,
      metadata: {
        sender_node_id: this.node_id,
        recipient_node_id: this.node_id,
        timestamp,
        type: message.type,
      },
    };
    if (this.obs.logger) {
      this.obs.logger.info('message_send', {
        traceId,
        spanId,
        ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
        messageType: message.type,
      });
    }
    try {
      if (this.obs.metrics) {
        this.obs.metrics.increment('messages_sent');
      }
      await modules.transport.send(tm);
      this.flushObsSnapshot();
    } finally {
      if (span && this.obs.tracer) {
        this.obs.tracer.endSpan(span);
      }
    }
    };

    if (this.obs.tracer) {
      return runWithTraceContextAsync(this.obs.tracer, doSend);
    }
    return doSend();
  }

  private createNoOpReplayEngine(): ReplayProtectionEngine {
    const store = new NoOpReplayStore() as any;
    const validator = { validate: () => {} } as any;
    return new ReplayProtectionEngine({ store, validator });
  }

  private buildEffectiveTransportConfig(): {
    transportConfig: TransportConfig;
    transportUrlForLog: string;
  } {
    // Zero-config defaults:
    // transport = WebSocket localhost
    // encryption OFF, replay protection OFF
    const nodeId = this.node_id;
    const port = 4000;
    const host = '127.0.0.1';
    const url = `ws://localhost:${port}`;

    // If user provided transport, respect it but ensure self peer is present for WS loopback.
    const userTransport = this.config?.transport as TransportConfig | undefined;
    if (userTransport?.type === 'ws') {
      const opts = userTransport.options as any;
      const p = typeof opts?.port === 'number' ? opts.port : port;
      const h = typeof opts?.host === 'string' ? opts.host : host;
      const peers = Array.isArray(opts?.peers) ? opts.peers : [];
      const hasSelfPeer = peers.some((p: any) => p.node_id === nodeId);
      const finalPeers = hasSelfPeer ? peers : [{ node_id: nodeId, url: `ws://${h}:${p}` }, ...peers];
      return {
        transportConfig: { type: 'ws', options: { node_id: nodeId, port: p, host: h, peers: finalPeers } },
        transportUrlForLog: `ws://${h === '127.0.0.1' ? 'localhost' : h}:${p}`,
      };
    }
    if (userTransport) {
      // Other transports: no default peer wiring.
      return { transportConfig: userTransport, transportUrlForLog: `${userTransport.type}://unknown` };
    }
    return {
      transportConfig: { type: 'ws', options: { node_id: nodeId, port, host, peers: [{ node_id: nodeId, url }] } },
      transportUrlForLog: url,
    };
  }

  private async handleTransportReceive(tm: TransportMessage): Promise<void> {
    const modules = this.modules;
    if (!modules) return;
    const doReceive = async (): Promise<void> => {
    try {
      let raw = tm.raw as any;
      if (this.encryptionEnabled && modules.encryption) {
        if (raw && typeof raw === 'object' && 'encrypted_payload' in raw) {
          raw = modules.encryption.decryptEnvelope(raw);
        }
      }
      modules.messaging.validator.validate(raw);
      const payload = (raw as any).payload;
      if (isIrisMessage(payload)) {
        const incoming = isValidTraceContext(payload.meta?.trace) ? payload.meta!.trace : undefined;
        const traceId = incoming?.traceId ?? generateTraceId();
        const parentSpanId = incoming?.spanId;
        let span: Span | undefined;
        if (this.obs.tracer) {
          span = this.obs.tracer.startSpan('message_receive', {
            traceId,
            ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
            messageType: payload.type,
          });
        }
        if (this.obs.logger) {
          this.obs.logger.info('message_receive', {
            traceId,
            spanId: span?.id,
            ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
            messageType: payload.type,
          });
        }
        this.emit('message', payload);
        if (span && this.obs.tracer) this.obs.tracer.endSpan(span);
      }
    } catch (e) {
      this.emit('error', { error: e });
    }
    };

    if (this.obs.tracer) {
      return runWithTraceContextAsync(this.obs.tracer, doReceive);
    }
    return doReceive();
  }

  private initCovenantRuntime(): CovenantRuntimeEngine {
    const registry = new CovenantRegistry();
    const eventBus = new EventBus();
    const store = new CovenantRuntimeStore();

    // Minimal deps; runtime can be started without consensus/replay integration.
    const deps = {
      getState: () =>
        Object.freeze({
          accepted_proposals: [],
          last_accepted_proposal_id: null,
          last_expected_state_hash: null,
        }),
      getLog: () => [],
      replay: () =>
        Object.freeze({
          final_state: {
            accepted_proposals: [],
            last_accepted_proposal_id: null,
            last_expected_state_hash: null,
          },
          final_hash: '',
          valid: true,
          errors: [],
        }),
    };

    const engine = new CovenantRuntimeEngine(registry as any, eventBus as any, store as any, deps as any);
    engine.start();
    // CovenantPersistenceStore is part of phase 14 persistence; instantiate for completeness.
    // (No persistence coupling in this microstep’s minimal SDK.)
    void new CovenantPersistenceStore();
    return engine;
  }

  private async initializeRuntimeConvergence(): Promise<RuntimeConvergenceComponents> {
    const allowLegacy = this.config?.runtime?.allowLegacy ?? false;
    if ((this.config?.runtime?.transport?.secure ?? true) !== true) {
      throw new IrisError(IrisErrorCode.INVALID_CONFIG, 'secure transport must be enabled');
    }
    if ((this.config?.runtime?.gossip?.enabled ?? true) !== true) {
      this.logger.warn('NON_HARDENED_GOSSIP_USAGE');
      throw new IrisError(IrisErrorCode.INVALID_CONFIG, 'gossip must be enabled');
    }
    if ((this.config?.runtime?.crdt?.enabled ?? true) !== true) {
      throw new IrisError(IrisErrorCode.INVALID_CONFIG, 'crdt must be enabled');
    }
    if ((this.config?.runtime?.federation?.enabled ?? true) !== true) {
      throw new IrisError(IrisErrorCode.INVALID_CONFIG, 'federation must be enabled');
    }
    if (!allowLegacy && this.config?.transport?.type && this.config.transport.type !== 'ws') {
      this.logger.warn('LEGACY_TRANSPORT_PATH_DETECTED');
      throw new IrisError(IrisErrorCode.INVALID_CONFIG, 'legacy transport path not allowed');
    }

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const tlsContext = buildTlsContext({
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }) as string,
      privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
      certificatePem: 'runtime-cert',
    });
    const secureNodeId = deriveNodeIdFromTlsContext(tlsContext);
    this.runtimeSecureNodeId = secureNodeId;
    const trustTransport = new RuntimeTransportTrustEngine(secureNodeId, 'local', () => this.trustedRuntimePeers);
    const secureTransportServer = new SecureTransportServerImpl({
      endpoint: `runtime://${this.node_id}`,
      nodeId: secureNodeId,
      domainId: 'local',
      tlsContext,
      trustEngine: trustTransport,
      transportSecurity: { requirePfs: true },
    } as any);
    await secureTransportServer.start();
    const secureTransportClient = new SecureTransportClientImpl({
      nodeId: secureNodeId,
      domainId: 'local',
      tlsContext,
      trustEngine: trustTransport,
      pfs: true,
      transportSecurity: { requirePfs: true },
    } as any);

    const cpRegistry = new ControlPlaneRegistry();
    cpRegistry.registerNode(this.node_id, Date.now());
    cpRegistry.activateNode(this.node_id, Date.now());
    const keyProvider = new InMemoryEd25519KeyProvider();
    const trustSyncEngine = new TrustSyncEngine({
      localNodeId: this.node_id,
      registry: cpRegistry,
      localSecret: `runtime-secret-${this.node_id}-012345678901234567890123456789`,
      resolveIssuerSecret: () => `runtime-secret-${this.node_id}-012345678901234567890123456789`,
      send: () => {},
      auditKeyProvider: keyProvider,
    });
    trustSyncEngine.start();

    const peerManager = new PeerManager({ cwd: this.obs.cwd, persist: true });
    const dedup = new GossipDedupCache();
    const rateLimiter = new GossipRateLimiter();
    const gossipEngine = new GossipEngine({
      nodeId: this.node_id,
      domainId: 'local',
      peerManager,
      dedup,
      rateLimiter,
      keyResolver: () => 'runtime-gossip-shared-secret-012345678901234567890123456789',
      sendToPeer: (peerNodeId, msg) => IrisNode.runtimeRegistry.get(peerNodeId)?.receiveRuntimeGossip(msg, this.node_id),
      hooks: {
        onCustomReceived: (payload) => {
          if (payload?.topic === 'crdt' && payload.operation) {
            this.runtimeComponents?.crdtSync.receiveCRDTOperation(payload.operation);
          }
        },
      },
    });

    const crdtEngine = new CRDTEngine(this.node_id);
    crdtEngine.registerCRDT('runtime:lww', new LWWRegisterCRDT<unknown>());
    const crdtSync = new CRDTSyncBridge({
      engine: crdtEngine,
      gossip: gossipEngine,
      keyResolver: () => 'runtime-crdt-shared-secret-012345678901234567890123456789',
      trustScoreProvider: () => 100,
    });
    const crdtPersistence = new CRDTPersistence(this.obs.cwd);

    const peers = new InMemoryPeerRegistry();
    const domains = new InMemoryDomainRegistry();
    domains.register({
      domainId: 'local',
      name: 'local',
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      supportedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: ['local'],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });
    this.runtimeDomainsRegistered.add('local');
    const distributedSync = new DistributedSyncManager(keyProvider, trustSyncEngine, peers, domains, 'local', {});
    distributedSync.configureMetricsPersistence(this.obs.cwd);

    for (const [peerId, n] of IrisNode.runtimeRegistry.entries()) {
      if (peerId === this.node_id) continue;
      this.trustedRuntimePeers.add(n.getRuntimeSecureNodeId());
      peerManager.addPeer({ nodeId: peerId, trustScore: 100, lastSeen: Date.now(), domainId: 'local' });
      n.registerRuntimeSecurePeer(secureNodeId);
      n.registerRuntimePeer(this.node_id);
    }
    IrisNode.runtimeRegistry.set(this.node_id, this);

    return {
      secureTransportServer,
      secureTransportClient,
      trustSyncEngine,
      distributedSync,
      gossipEngine,
      gossipPeerManager: peerManager,
      crdtEngine,
      crdtSync,
      crdtPersistence,
    };
  }

  private async initGossip(): Promise<void> {
    this.runtimeComponents = await this.initializeRuntimeConvergence();
  }

  private initCRDT(): void {
    if (!this.runtimeComponents?.crdtEngine) {
      throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'CRDT engine not initialized');
    }
  }

  private initCRDTSync(): void {
    if (!this.runtimeComponents?.crdtSync) {
      throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'CRDT sync bridge not initialized');
    }
  }

  private initDistributedSync(): void {
    if (!this.runtimeComponents?.distributedSync) {
      throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'Distributed sync manager not initialized');
    }
  }

  private registerRuntimePeer(peerNodeId: string): void {
    this.runtimeComponents?.gossipPeerManager.addPeer({ nodeId: peerNodeId, trustScore: 100, lastSeen: Date.now(), domainId: 'local' });
  }

  private registerRuntimeSecurePeer(secureNodeId: string): void {
    this.trustedRuntimePeers.add(secureNodeId);
  }

  private receiveRuntimeGossip(msg: unknown, fromPeer: string): void {
    this.runtimeComponents?.gossipEngine.receive(msg as any, fromPeer);
  }

  applyCRDTOperation(type: string, payload: unknown, crdtId = 'runtime:lww'): void {
    if (!this.runtimeComponents) {
      throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'Runtime convergence layer not started');
    }
    const unsigned = this.runtimeComponents.crdtEngine.createOperation({ crdtId, type, payload });
    const op = {
      ...unsigned,
      signature: signCRDTOperation(unsigned, 'runtime-crdt-shared-secret-012345678901234567890123456789'),
    };
    this.runtimeComponents.crdtSync.receiveCRDTOperation(op);
    this.runtimeComponents.crdtSync.publishCRDTOperation(op);
    this.runtimeComponents.crdtPersistence.appendOperation(op);
    this.runtimeComponents.crdtPersistence.saveSnapshot(this.runtimeComponents.crdtEngine.getStateSnapshot());
  }

  getRuntimeCRDTSnapshot(): Record<string, unknown> {
    return this.runtimeComponents?.crdtEngine.getStateSnapshot() ?? {};
  }

  async connectRuntimePeer(peerNodeId: string): Promise<void> {
    if (!this.runtimeComponents) throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'Runtime convergence layer not started');
    const peer = IrisNode.runtimeRegistry.get(peerNodeId);
    if (!peer) throw new IrisError(IrisErrorCode.MODULE_FAILURE, `Peer not found: ${peerNodeId}`);
    const peerSecureNodeId = peer.getRuntimeSecureNodeId();
    const mySecureNodeId = this.getRuntimeSecureNodeId();
    this.trustedRuntimePeers.add(peerSecureNodeId);
    peer.registerRuntimeSecurePeer(mySecureNodeId);
    peer.registerRuntimePeer(this.node_id);
    this.runtimeComponents.gossipPeerManager.addPeer({ nodeId: peerNodeId, trustScore: 100, lastSeen: Date.now(), domainId: 'local' });
    const c = await this.runtimeComponents.secureTransportClient.connect(`runtime://${peerNodeId}`);
    this.runtimeConnections.set(peerNodeId, c as any);
  }

  private getRuntimeSecureNodeId(): string {
    if (this.runtimeSecureNodeId) return this.runtimeSecureNodeId;
    throw new IrisError(IrisErrorCode.MODULE_FAILURE, 'Runtime secure transport is not initialized');
  }

  private isEncryptedRaw(raw: unknown): boolean {
    if (raw == null || typeof raw !== 'object') return false;
    const o = raw as Record<string, unknown>;
    return typeof o.encrypted_payload === 'string' && typeof o.iv === 'string' && typeof o.auth_tag === 'string';
  }
}


