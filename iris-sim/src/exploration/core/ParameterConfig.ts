/**
 * S-5 — Parameter config helpers. Deterministic, no randomness.
 */

import type { ParameterConfig } from './ExplorationTypes.js';

export function parameterConfigKey(c: ParameterConfig): string {
  return String(c.nodeCount) + ':' + String(c.intensity) + ':' + String(c.duration);
}

export function parseParameterConfigKey(key: string): ParameterConfig | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  const nodeCount = parseInt(parts[0], 10);
  const intensity = parseFloat(parts[1]);
  const duration = parseInt(parts[2], 10);
  if (Number.isNaN(nodeCount) || Number.isNaN(intensity) || Number.isNaN(duration)) return null;
  return Object.freeze({ nodeCount, intensity, duration });
}
