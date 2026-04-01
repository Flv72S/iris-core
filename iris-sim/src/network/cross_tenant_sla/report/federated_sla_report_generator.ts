/**
 * Phase 11C — Federated SLA Report Generator.
 * Deterministic hashing via stableStringify + SHA-256.
 */

import { createHash } from 'node:crypto';
import type { FederatedSLAReport, SLAComplianceGap, TenantSLAState } from '../types/cross_tenant_sla_types.js';
import type { SLADriftSignal } from '../drift/sla_drift_types.js';
import type { WeightedServiceSLA } from '../trust/sla_trust_types.js';
import type { SLAConsensusCheckResult } from '../verification/sla_consensus_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

export function calculateFederatedSlaHash(payload: {
  timestamp: number;
  tenant_states: readonly TenantSLAState[];
  detected_gaps: readonly SLAComplianceGap[];
  drift_signals?: readonly SLADriftSignal[];
  weighted_service_slas?: readonly WeightedServiceSLA[];
  sla_consensus_check?: SLAConsensusCheckResult;
}): string {
  const obj: Record<string, unknown> = {
    timestamp: payload.timestamp,
    tenant_states: payload.tenant_states,
    detected_gaps: payload.detected_gaps,
  };
  if (payload.drift_signals !== undefined) obj.drift_signals = payload.drift_signals;
  if (payload.weighted_service_slas !== undefined) obj.weighted_service_slas = payload.weighted_service_slas;
  if (payload.sla_consensus_check !== undefined) obj.sla_consensus_check = payload.sla_consensus_check;
  return sha256Hex(stableStringify(obj));
}

export function buildFederatedSlaReport(
  tenant_states: readonly TenantSLAState[],
  detected_gaps: readonly SLAComplianceGap[],
  timestamp: number = Date.now(),
  drift_signals?: readonly SLADriftSignal[],
  weighted_service_slas?: readonly WeightedServiceSLA[],
  sla_consensus_check?: SLAConsensusCheckResult
): FederatedSLAReport {
  const sortedStates = [...tenant_states].sort((a, b) => a.tenant_id.localeCompare(b.tenant_id));
  const normalizedStates = sortedStates.map((t) =>
    Object.freeze({
      tenant_id: t.tenant_id,
      services: [...t.services].sort((a, b) => a.service_name.localeCompare(b.service_name)),
    })
  );
  const sortedGaps = [...detected_gaps].sort(
    (a, b) =>
      a.tenant_id.localeCompare(b.tenant_id) ||
      a.service_name.localeCompare(b.service_name) ||
      String(a.gap_type).localeCompare(String(b.gap_type)) ||
      String(a.severity).localeCompare(String(b.severity))
  );
  const sortedDrift =
    drift_signals === undefined
      ? undefined
      : [...drift_signals].sort(
          (a, b) =>
            a.tenant_id.localeCompare(b.tenant_id) ||
            a.service_name.localeCompare(b.service_name) ||
            String(a.metric).localeCompare(String(b.metric))
        );
  const sortedWeighted =
    weighted_service_slas === undefined
      ? undefined
      : [...weighted_service_slas].sort(
          (a, b) => a.tenant_id.localeCompare(b.tenant_id) || a.service_name.localeCompare(b.service_name)
        );

  const hashPayload: {
    timestamp: number;
    tenant_states: readonly TenantSLAState[];
    detected_gaps: readonly SLAComplianceGap[];
    drift_signals?: readonly SLADriftSignal[];
    weighted_service_slas?: readonly WeightedServiceSLA[];
    sla_consensus_check?: SLAConsensusCheckResult;
  } = { timestamp, tenant_states: normalizedStates, detected_gaps: sortedGaps };
  if (sortedDrift !== undefined) hashPayload.drift_signals = sortedDrift;
  if (sortedWeighted !== undefined) hashPayload.weighted_service_slas = sortedWeighted;
  if (sla_consensus_check !== undefined) hashPayload.sla_consensus_check = sla_consensus_check;
  const report_hash = calculateFederatedSlaHash(hashPayload);

  const report: FederatedSLAReport = Object.freeze({
    timestamp,
    tenant_states: normalizedStates,
    detected_gaps: sortedGaps,
    report_hash,
    ...(sortedDrift !== undefined && { drift_signals: sortedDrift }),
    ...(sortedWeighted !== undefined && { weighted_service_slas: sortedWeighted }),
    ...(sla_consensus_check !== undefined && { sla_consensus_check }),
  });
  return report;
}

export function verifyFederatedSlaReport(report: FederatedSLAReport): boolean {
  const hashPayload: {
    timestamp: number;
    tenant_states: readonly TenantSLAState[];
    detected_gaps: readonly SLAComplianceGap[];
    drift_signals?: readonly SLADriftSignal[];
    weighted_service_slas?: readonly WeightedServiceSLA[];
    sla_consensus_check?: SLAConsensusCheckResult;
  } = { timestamp: report.timestamp, tenant_states: report.tenant_states, detected_gaps: report.detected_gaps };
  if (report.drift_signals !== undefined) hashPayload.drift_signals = report.drift_signals;
  if (report.weighted_service_slas !== undefined) hashPayload.weighted_service_slas = report.weighted_service_slas;
  if (report.sla_consensus_check !== undefined) hashPayload.sla_consensus_check = report.sla_consensus_check;
  const expected = calculateFederatedSlaHash(hashPayload);
  return expected === report.report_hash;
}

