/**
 * S-5B — Deterministic frontier report hash. No randomness.
 */

import { createHash } from 'crypto';
import type { ParameterResult } from '../../exploration/core/ExplorationTypes.js';
import { parameterConfigKey } from '../../exploration/core/ParameterConfig.js';
import type { FrontierRunnerResult } from '../core/FrontierRunner.js';

function configOrder(a: ParameterResult, b: ParameterResult): number {
  const ka = parameterConfigKey(a.config);
  const kb = parameterConfigKey(b.config);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

function canonicalResult(r: ParameterResult): string {
  return [
    parameterConfigKey(r.config),
    String(r.stabilityIndex),
    r.riskEnvelope,
    r.riskReportHash,
  ].join('|');
}

export function computeFrontierHash(result: FrontierRunnerResult): string {
  const sorted = [...result.allResults].sort(configOrder);
  const resultsPayload = sorted.map(canonicalResult).join('\n');

  const firstStress = result.firstStressConfig;
  const firstCritical = result.firstCriticalConfig;
  const boundaryPayload = [
    firstStress ? parameterConfigKey(firstStress) : '',
    firstCritical ? parameterConfigKey(firstCritical) : '',
  ].join('|');

  const maxStable = result.surface.getMaxStableValues();
  const refinementPayload = [
    String(maxStable.nodeCount),
    String(maxStable.intensity),
    String(maxStable.duration),
  ].join('|');

  const payload = resultsPayload + '\n---\n' + boundaryPayload + '\n---\n' + refinementPayload;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
