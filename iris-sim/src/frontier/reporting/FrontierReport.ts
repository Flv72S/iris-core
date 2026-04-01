/**
 * S-5B — Frontier discovery report text. Deterministic format.
 */

import type { FrontierRunnerResult } from '../core/FrontierRunner.js';

function maxDegradationOverResults(results: FrontierRunnerResult['allResults']): {
  maxLatency: number;
  maxDrops: number;
  maxSaturation: number;
} {
  let maxLatency = 0;
  let maxDrops = 0;
  let maxSaturation = 0;
  for (const r of results) {
    const l = r.maxDegradationLatencyMultiplier ?? 0;
    const d = r.maxDegradationDrops ?? 0;
    const s = r.maxDegradationSaturationEvents ?? 0;
    if (l > maxLatency) maxLatency = l;
    if (d > maxDrops) maxDrops = d;
    if (s > maxSaturation) maxSaturation = s;
  }
  return { maxLatency, maxDrops, maxSaturation };
}

export function formatFrontierReport(
  result: FrontierRunnerResult,
  _seedsPerConfig: number,
  frontierHash: string,
  exitCode: number,
): string {
  const results = result.allResults;
  const safeCount = results.filter((r) => r.riskEnvelope === 'SAFE').length;
  const stressCount = results.filter((r) => r.riskEnvelope === 'STRESS').length;
  const criticalCount = results.filter((r) => r.riskEnvelope === 'CRITICAL').length;
  const deg = maxDegradationOverResults(results);

  const lines: string[] = [
    '----------------------------------------------------------',
    'S-5B FRONTIER EXPLORATION REPORT',
    '----------------------------------------------------------',
    '',
    'Total Configurations Explored: ' + String(results.length),
    'SAFE Count: ' + String(safeCount),
    'STRESS Count: ' + String(stressCount),
    'CRITICAL Count: ' + String(criticalCount),
    '',
  ];

  if (result.firstStressConfig) {
    lines.push('First STRESS Configuration:');
    lines.push('  (nodeCount=' + String(result.firstStressConfig.nodeCount) + ', intensity=' + String(result.firstStressConfig.intensity) + ', duration=' + String(result.firstStressConfig.duration) + ')');
    lines.push('');
  }
  if (result.firstCriticalConfig) {
    lines.push('First CRITICAL Configuration (if any):');
    lines.push('  (nodeCount=' + String(result.firstCriticalConfig.nodeCount) + ', intensity=' + String(result.firstCriticalConfig.intensity) + ', duration=' + String(result.firstCriticalConfig.duration) + ')');
    lines.push('');
  } else {
    lines.push('First CRITICAL Configuration (if any): none');
    lines.push('');
  }

  lines.push('Max Observed Latency Multiplier: ' + String(deg.maxLatency));
  lines.push('Max Observed Drops: ' + String(deg.maxDrops));
  lines.push('Max Observed Saturation Events: ' + String(deg.maxSaturation));
  lines.push('');
  lines.push('Exploration Hash: ' + frontierHash);
  lines.push('Exit Code: ' + String(exitCode));
  lines.push('');
  lines.push('----------------------------------------------------------');
  return lines.join('\n');
}
