/**
 * S-4 — Risk report structure. Deterministic, hashable.
 */

import type { AggregatedRiskMetrics } from '../core/RiskTypes.js';
import type { RiskEnvelopeClassification } from '../core/RiskTypes.js';

export interface RiskReport {
  readonly scenarioName: string;
  readonly baseSeed: string;
  readonly totalRuns: number;
  readonly safetyFailureRate: number;
  readonly livenessFailureRate: number;
  readonly maxSoftEvents: number;
  readonly avgSoftEvents: number;
  readonly maxLivenessDelay: number;
  readonly avgLivenessDelay: number;
  readonly worstPartitionDuration: number;
  readonly worstSplitBrainDuration: number;
  readonly stabilityIndex: number;
  readonly riskEnvelope: RiskEnvelopeClassification;
  readonly riskReportHash: string;
}

export function createRiskReport(
  scenarioName: string,
  baseSeed: string,
  aggregated: AggregatedRiskMetrics,
  stabilityIndex: number,
  riskEnvelope: RiskEnvelopeClassification,
  riskReportHash: string,
): RiskReport {
  return Object.freeze({
    scenarioName,
    baseSeed,
    totalRuns: aggregated.totalRuns,
    safetyFailureRate: aggregated.safetyFailureRate,
    livenessFailureRate: aggregated.livenessFailureRate,
    maxSoftEvents: aggregated.maxSoftEventsObserved,
    avgSoftEvents: aggregated.avgSoftEvents,
    maxLivenessDelay: aggregated.maxLivenessDelay,
    avgLivenessDelay: aggregated.avgLivenessDelay,
    worstPartitionDuration: aggregated.worstPartitionDuration,
    worstSplitBrainDuration: aggregated.worstSplitBrainDuration,
    stabilityIndex,
    riskEnvelope,
    riskReportHash,
  });
}

export function formatRiskReport(report: RiskReport): string {
  const parts = [
    '--------------------------------------------------',
    'S-4 DETERMINISTIC RISK REPORT',
    '--------------------------------------------------',
    '',
    'Scenario: ' + report.scenarioName,
    'Base Seed: ' + report.baseSeed,
    'Total Runs: ' + String(report.totalRuns),
    '',
    'Safety Failure Rate: ' + report.safetyFailureRate.toFixed(2),
    'Liveness Failure Rate: ' + report.livenessFailureRate.toFixed(2),
    '',
    'Max Soft Events: ' + String(report.maxSoftEvents),
    'Average Soft Events: ' + report.avgSoftEvents.toFixed(2),
    '',
    'Max Liveness Delay: ' + String(report.maxLivenessDelay) + ' ticks',
    'Average Liveness Delay: ' + report.avgLivenessDelay.toFixed(2) + ' ticks',
    '',
    'Worst Partition Duration: ' + String(report.worstPartitionDuration) + ' ticks',
    'Worst Split-Brain Duration: ' + String(report.worstSplitBrainDuration) + ' ticks',
    '',
    'Stability Index: ' + report.stabilityIndex.toFixed(2),
    'Risk Envelope: ' + report.riskEnvelope,
    '',
    '--------------------------------------------------',
    'Risk Report Hash: ' + report.riskReportHash,
    '--------------------------------------------------',
  ];
  return parts.join('\n');
}
