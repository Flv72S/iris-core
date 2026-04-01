/**
 * S-5 — Parameter exploration report. Deterministic.
 */

import type { FragilityBoundaries } from '../mapping/FragilityAnalyzer.js';

export interface ExplorationReport {
  readonly totalConfigurations: number;
  readonly seedsPerConfiguration: number;
  readonly safeCount: number;
  readonly stressCount: number;
  readonly criticalCount: number;
  readonly maxStableNodeCount: number;
  readonly maxStableIntensity: number;
  readonly maxStableDuration: number;
  readonly criticalBoundaryDetected: boolean;
  readonly explorationHash: string;
}

export function createExplorationReport(
  resultCount: number,
  seedsPerConfig: number,
  boundaries: FragilityBoundaries,
  explorationHash: string,
): ExplorationReport {
  return Object.freeze({
    totalConfigurations: resultCount,
    seedsPerConfiguration: seedsPerConfig,
    safeCount: boundaries.safeCount,
    stressCount: boundaries.stressCount,
    criticalCount: boundaries.criticalCount,
    maxStableNodeCount: boundaries.maxStableNodeCount,
    maxStableIntensity: boundaries.maxStableIntensity,
    maxStableDuration: boundaries.maxStableDuration,
    criticalBoundaryDetected: boundaries.criticalBoundaryDetected,
    explorationHash,
  });
}

export function formatExplorationReport(report: ExplorationReport, surfaceSummaryLines: string[]): string {
  const lines: string[] = [
    '----------------------------------------------------------',
    'S-5 PARAMETER SPACE EXPLORATION REPORT',
    '----------------------------------------------------------',
    '',
    'Total Configurations: ' + String(report.totalConfigurations),
    'Seeds per Configuration: ' + String(report.seedsPerConfiguration),
    '',
    'SAFE Configurations: ' + String(report.safeCount),
    'STRESS Configurations: ' + String(report.stressCount),
    'CRITICAL Configurations: ' + String(report.criticalCount),
    '',
    'Maximum Stable NodeCount: ' + String(report.maxStableNodeCount),
    'Maximum Stable Intensity: ' + String(report.maxStableIntensity),
    'Maximum Stable Duration: ' + String(report.maxStableDuration),
    '',
    'Critical Boundary Detected: ' + (report.criticalBoundaryDetected ? 'YES' : 'NO'),
    '',
    '----------------------------------------------------------',
    'Stability Surface Summary',
    '----------------------------------------------------------',
    '',
  ];
  for (const line of surfaceSummaryLines) lines.push(line);
  lines.push('');
  lines.push('----------------------------------------------------------');
  lines.push('Exploration Hash: ' + report.explorationHash);
  lines.push('----------------------------------------------------------');
  return lines.join('\n');
}
