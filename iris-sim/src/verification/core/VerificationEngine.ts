/**
 * S-3 — Formal verification engine. Read-only observation of simulation; deterministic evaluation.
 */

import { createHash } from 'crypto';
import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import type { VerificationConfig } from './VerificationConfig.js';
import type {
  VerifiableProperty,
  VerificationTickContext,
  VerificationFinalContext,
  PropertyStatus,
} from './VerificationTypes.js';
import { PropertyType } from './VerificationTypes.js';
import { createVerificationReport, formatVerificationReport } from '../reporting/VerificationReport.js';
import { createPropertyResult } from '../reporting/PropertyResult.js';
import { serializeVerificationState, type VerificationSnapshotData } from './VerificationSnapshot.js';

function stablePropertyPayload(results: { id: string; type: string; status: string }[]): string {
  const parts = results
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((r) => r.id + ':' + r.type + ':' + r.status);
  return parts.join('|');
}

export class VerificationEngine {
  private readonly _engine: GlobalSimulationEngine;
  private readonly _config: VerificationConfig;
  private readonly _properties: VerifiableProperty[] = [];
  private _initialized = false;
  private _finalized = false;
  private _lastEvaluatedTick = -1n;

  constructor(simulationEngine: GlobalSimulationEngine, config: VerificationConfig) {
    this._engine = simulationEngine;
    this._config = config;
  }

  registerProperty(property: VerifiableProperty): void {
    if (this._initialized) return;
    this._properties.push(property);
  }

  initialize(): void {
    this._initialized = true;
    this._finalized = false;
    this._lastEvaluatedTick = -1n;
  }

  private _buildTickContext(tick: bigint): VerificationTickContext {
    const entries = this._engine.runtime.trace.entries;
    const entriesAtTick = entries.filter((e) => e.tick === String(tick));
    const allEntriesUpToTick = entries.filter((e) => BigInt(e.tick) <= tick);
    const engine = this._engine;
    return Object.freeze({
      tick,
      entriesAtTick,
      allEntriesUpToTick,
      getNodeAlive: (nodeId: string) => engine.getNode(nodeId)?.isAlive ?? false,
      getNodeCluster: (nodeId: string) => engine.getNode(nodeId)?.clusterId,
      isPartitioned: (clusterA: string, clusterB: string) =>
        engine.getPartitionManager()?.isPartitioned(clusterA, clusterB) ?? false,
      schedulerSize: engine.runtime.scheduler.size,
    });
  }

  private _buildFinalContext(): VerificationFinalContext {
    const entries = this._engine.runtime.trace.entries;
    const maxTick = this._engine.runtime.clock.currentTick;
    const engine = this._engine;
    return Object.freeze({
      maxTick,
      allEntries: entries,
      getNodeAlive: (nodeId: string) => engine.getNode(nodeId)?.isAlive ?? false,
      getNodeCluster: (nodeId: string) => engine.getNode(nodeId)?.clusterId,
      isPartitioned: (clusterA: string, clusterB: string) =>
        engine.getPartitionManager()?.isPartitioned(clusterA, clusterB) ?? false,
    });
  }

  evaluateTick(tick: bigint): void {
    if (!this._initialized || this._finalized) return;
    const ctx = this._buildTickContext(tick);
    for (const p of this._properties) p.evaluateTick(ctx);
    this._lastEvaluatedTick = tick;
  }

  finalize(): void {
    if (!this._initialized || this._finalized) return;
    const ctx = this._buildFinalContext();
    for (const p of this._properties) p.finalize(ctx);
    this._finalized = true;
  }

  getVerificationReport(): ReturnType<typeof createVerificationReport> {
    if (!this._finalized) this.finalize();
    const safetyResults = this._properties
      .filter((p) => p.type === PropertyType.SAFETY)
      .map((p) => createPropertyResult(p.id, p.description, p.type, p.getResult() as PropertyStatus));
    const livenessResults = this._properties
      .filter((p) => p.type === PropertyType.LIVENESS)
      .map((p) => createPropertyResult(p.id, p.description, p.type, p.getResult() as PropertyStatus));
    const hash = this.getVerificationHash();
    return createVerificationReport(safetyResults, livenessResults, hash);
  }

  getVerificationHash(): string {
    if (!this._finalized) this.finalize();
    const results = this._properties.map((p) => ({ id: p.id, type: p.type, status: p.getResult() }));
    const payload = stablePropertyPayload(results);
    const meta = 'S3:' + String(this._lastEvaluatedTick) + ':' + this._config.maxTraceWindowSize;
    return createHash('sha256').update(payload + '\n' + meta).digest('hex');
  }

  snapshot(): VerificationSnapshotData {
    const propertyStates: Record<string, string> = {};
    for (const p of this._properties) propertyStates[p.id] = p.getResult();
    return serializeVerificationState(this._lastEvaluatedTick, propertyStates, new Set());
  }

  restore(_data: VerificationSnapshotData): void {
    // Restore would require property implementations to accept state; for S-3 we only require snapshot serialization.
  }

  formatReport(): string {
    return formatVerificationReport(this.getVerificationReport());
  }
}
