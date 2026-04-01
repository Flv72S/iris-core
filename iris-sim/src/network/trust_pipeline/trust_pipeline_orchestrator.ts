/**
 * Phase 13J — Trust Pipeline Orchestrator.
 * Central execution engine for the full Phase 13 trust intelligence pipeline.
 * Deterministic, auditable; no new trust logic — orchestrates existing engines only.
 */

import type { NetworkTrustSnapshot } from './trust_pipeline_types.js';
import type { TrustPipelineResult, TrustObservatoryReport } from './trust_pipeline_result.js';
import type { NodeIdentityRegistry } from '../node_identity/index.js';
import { normalizeBehaviorProfiles } from '../trust_normalization/index.js';
import {
  computeReputationBatch,
  DEFAULT_REPUTATION_WEIGHTS,
} from '../reputation_engine/index.js';
import { buildTrustGraph } from '../reputation_trust_graph/index.js';
import { detectNetworkAnomalies } from '../anomaly_detection/index.js';
import { processAnomalyReports } from '../trust_recovery/index.js';
import { generateGovernanceTriggers } from '../trust_governance_bridge/index.js';
import { generateNetworkObservatoryReport } from '../trust_observatory/index.js';
import { generateNodeExplainability } from '../trust_explainability/index.js';

export interface TrustPipelineOptions {
  readonly debug?: boolean;
  /** When set, only behavior_profiles for nodes with ACTIVE registration are processed. */
  readonly nodeRegistry?: NodeIdentityRegistry;
}

function log(debug: boolean, stage: string, _detail?: unknown): void {
  if (debug) {
    // eslint-disable-next-line no-console
    console.debug(`[TrustPipeline] ${stage}`);
  }
}

/**
 * Run the full trust intelligence pipeline in deterministic order.
 * Uses only the snapshot timestamp; no randomness or internal timestamps.
 *
 * @param snapshot - Current network state (behavior profiles and optional prior trust states)
 * @param options - Optional: { debug: true } to log each stage
 * @returns Unified trust pipeline result
 * @throws If snapshot or behavior_profiles is invalid
 */
export function runTrustPipeline(
  snapshot: NetworkTrustSnapshot,
  options: TrustPipelineOptions = {}
): TrustPipelineResult {
  const { debug = false } = options;

  if (snapshot == null) {
    throw new Error('Trust pipeline requires a valid snapshot (received null/undefined).');
  }
  if (!Array.isArray(snapshot.behavior_profiles)) {
    throw new Error('Trust pipeline requires snapshot.behavior_profiles to be an array.');
  }

  const timestamp = snapshot.timestamp;
  let behavior_profiles = [...snapshot.behavior_profiles];
  if (options.nodeRegistry) {
    behavior_profiles = behavior_profiles.filter((p) => options.nodeRegistry!.isActive(p.node_id));
  }

  log(debug, 'Step 1 — Behavior Monitoring (use snapshot profiles)');

  // Step 2 — Trust Normalization
  log(debug, 'Step 2 — Trust Normalization');
  const normalized_metrics = normalizeBehaviorProfiles(behavior_profiles, timestamp);

  // Step 3 — Reputation Engine
  log(debug, 'Step 3 — Reputation Engine');
  const reputation_profiles = computeReputationBatch(
    normalized_metrics,
    DEFAULT_REPUTATION_WEIGHTS,
    timestamp
  );

  // Step 4 — Trust Graph Engine
  log(debug, 'Step 4 — Trust Graph Engine');
  const trust_graph = buildTrustGraph(reputation_profiles);

  // Step 5 — Anomaly Detection
  log(debug, 'Step 5 — Anomaly Detection');
  const anomaly_reports = detectNetworkAnomalies(
    behavior_profiles,
    normalized_metrics,
    reputation_profiles,
    trust_graph,
    timestamp
  );

  // Step 6 — Trust Recovery
  log(debug, 'Step 6 — Trust Recovery');
  const existing_states = snapshot.existing_trust_states ?? [];
  const { actions: recovery_actions, updated_states: trust_states } = processAnomalyReports(
    anomaly_reports,
    reputation_profiles,
    existing_states,
    timestamp
  );

  // Step 7 — Governance Bridge
  log(debug, 'Step 7 — Governance Bridge');
  const governance_events = generateGovernanceTriggers(
    anomaly_reports,
    trust_states,
    reputation_profiles,
    timestamp
  );

  // Step 8 — Trust Observatory
  log(debug, 'Step 8 — Trust Observatory');
  const observatory_report: TrustObservatoryReport = generateNetworkObservatoryReport(
    reputation_profiles,
    trust_graph,
    anomaly_reports,
    trust_states,
    governance_events,
    timestamp
  );

  // Step 9 — Trust Explainability (one report per node; stable order by node_id)
  log(debug, 'Step 9 — Trust Explainability');
  const nodeIds = [...new Set(behavior_profiles.map((p) => p.node_id))].sort((a, b) =>
    a.localeCompare(b)
  );
  const explainability_reports = nodeIds.map((node_id) =>
    generateNodeExplainability(node_id, reputation_profiles, anomaly_reports, trust_states)
  );

  return Object.freeze({
    timestamp,
    behavior_profiles,
    normalized_metrics,
    reputation_profiles,
    trust_graph,
    anomaly_reports,
    recovery_actions,
    trust_states,
    governance_events,
    observatory_report,
    explainability_reports,
  });
}
