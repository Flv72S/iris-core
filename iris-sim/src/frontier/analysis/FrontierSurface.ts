/**
 * S-5B — Surface of explored configs: sorted retrieval, boundary extraction.
 */

import type { ParameterConfig, ParameterResult } from '../../exploration/core/ExplorationTypes.js';
import { parameterConfigKey } from '../../exploration/core/ParameterConfig.js';

export interface FrontierSurfaceEntry {
  readonly stabilityIndex: number;
  readonly envelope: 'SAFE' | 'STRESS' | 'CRITICAL';
  readonly riskHash: string;
}

function configOrder(a: ParameterConfig, b: ParameterConfig): number {
  if (a.nodeCount !== b.nodeCount) return a.nodeCount - b.nodeCount;
  if (a.intensity !== b.intensity) return a.intensity - b.intensity;
  return a.duration - b.duration;
}

export class FrontierSurface {
  private readonly map = new Map<string, ParameterResult>();

  add(result: ParameterResult): void {
    this.map.set(parameterConfigKey(result.config), result);
  }

  addAll(results: readonly ParameterResult[]): void {
    for (const r of results) this.add(r);
  }

  getSortedResults(): ParameterResult[] {
    const entries = [...this.map.values()];
    entries.sort((a, b) => configOrder(a.config, b.config));
    return entries;
  }

  getEntry(config: ParameterConfig): FrontierSurfaceEntry | undefined {
    const r = this.map.get(parameterConfigKey(config));
    if (!r) return undefined;
    return { stabilityIndex: r.stabilityIndex, envelope: r.riskEnvelope, riskHash: r.riskReportHash };
  }

  /** Max nodeCount / intensity / duration among SAFE configs. */
  getMaxStableValues(): { nodeCount: number; intensity: number; duration: number } {
    let maxNode = 0;
    let maxIntensity = 0;
    let maxDuration = 0;
    for (const r of this.map.values()) {
      if (r.riskEnvelope !== 'SAFE') continue;
      if (r.config.nodeCount > maxNode) maxNode = r.config.nodeCount;
      if (r.config.intensity > maxIntensity) maxIntensity = r.config.intensity;
      if (r.config.duration > maxDuration) maxDuration = r.config.duration;
    }
    return { nodeCount: maxNode, intensity: maxIntensity, duration: maxDuration };
  }

  /** First STRESS or CRITICAL in deterministic order. */
  getFirstUnstableConfig(): ParameterConfig | null {
    for (const r of this.getSortedResults()) {
      if (r.riskEnvelope === 'STRESS' || r.riskEnvelope === 'CRITICAL') return r.config;
    }
    return null;
  }

  getAllConfigs(): ParameterConfig[] {
    return this.getSortedResults().map((r) => r.config);
  }
}
