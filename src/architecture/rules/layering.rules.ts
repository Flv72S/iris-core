/**
 * Layering — Regole architetturali statiche
 * Microstep 5.5.1
 *
 * Invarianti di dipendenza tra layer. Nessuna lettura filesystem.
 */

import type { ImportGraph, Violation, ArchitectureRule } from './types';
import { normalizePath } from './types';

// —— Layer logici ——

export type Layer =
  | 'Domain'
  | 'Application'
  | 'ReadPlatform'
  | 'SemanticLayer'
  | 'PluginRuntime'
  | 'Infrastructure'
  | 'Unknown';

/** Mappatura path → layer. Ordine rilevante (primo match vince). */
const LAYER_PATTERNS: ReadonlyArray<{ prefix: string; layer: Layer }> = [
  { prefix: 'src/core/domain', layer: 'Domain' },
  { prefix: 'src/core/messages', layer: 'Application' },
  { prefix: 'src/core/threads', layer: 'Application' },
  { prefix: 'src/api/core', layer: 'Application' },
  { prefix: 'src/read-platform', layer: 'ReadPlatform' },
  { prefix: 'src/core/read-events', layer: 'ReadPlatform' },
  { prefix: 'src/core/projections', layer: 'ReadPlatform' },
  { prefix: 'src/core/queries', layer: 'ReadPlatform' },
  { prefix: 'src/core/read-sla', layer: 'ReadPlatform' },
  { prefix: 'src/core/observability', layer: 'ReadPlatform' },
  { prefix: 'src/semantic-layer', layer: 'SemanticLayer' },
  { prefix: 'src/core/plugins', layer: 'PluginRuntime' },
  { prefix: 'src/platform', layer: 'PluginRuntime' },
  { prefix: 'src/persistence', layer: 'Infrastructure' },
  { prefix: 'src/api/', layer: 'Infrastructure' },
  { prefix: 'src/runtime', layer: 'Infrastructure' },
  { prefix: 'src/observability', layer: 'Infrastructure' },
  { prefix: 'src/app', layer: 'Infrastructure' },
];

/**
 * Dipendenze consentite per layer (8.1.0: Phase 8 → Phase 7 read-only).
 * SemanticLayer MAY depend only on Domain, Application, ReadPlatform (never write).
 * Domain, Application, ReadPlatform MUST NOT depend on SemanticLayer.
 */
const ALLOWED_DEPENDENCIES: Readonly<Record<Layer, readonly Layer[]>> = {
  Domain: ['Domain'],
  Application: ['Domain', 'Application'],
  ReadPlatform: ['Domain', 'Application', 'ReadPlatform'],
  SemanticLayer: ['Domain', 'Application', 'ReadPlatform', 'SemanticLayer'],
  PluginRuntime: ['Domain', 'PluginRuntime'],
  Infrastructure: ['Domain', 'Application', 'Infrastructure', 'SemanticLayer'],
  Unknown: ['Domain', 'Application', 'ReadPlatform', 'SemanticLayer', 'PluginRuntime', 'Infrastructure', 'Unknown'],
};

/** Restituisce il layer per un path normalizzato. */
export function pathToLayer(path: string): Layer {
  const n = normalizePath(path);
  for (const { prefix, layer } of LAYER_PATTERNS) {
    if (n.startsWith(prefix)) return layer;
  }
  return 'Unknown';
}

/** Restituisce i layer da cui un dato layer può dipendere. */
export function getAllowedDependencies(layer: Layer): readonly Layer[] {
  return ALLOWED_DEPENDENCIES[layer];
}

/** Verifica se un layer può importare da un altro. */
export function canDependOn(fromLayer: Layer, toLayer: Layer): boolean {
  return getAllowedDependencies(fromLayer).includes(toLayer);
}

// —— Regola di layering ——

const RULE_LAYERING: ArchitectureRule = {
  id: 'LAYER-001',
  description: 'Dependencies must respect layer boundaries (Domain → Application → ReadPlatform/PluginRuntime → Infrastructure)',
  check(graph: ImportGraph): Violation[] {
    const violations: Violation[] = [];
    for (const edge of graph.edges) {
      const from = normalizePath(edge.from);
      const to = normalizePath(edge.to);
      const fromLayer = pathToLayer(from);
      const toLayer = pathToLayer(to);
      if (!canDependOn(fromLayer, toLayer)) {
        violations.push({
          ruleId: RULE_LAYERING.id,
          message: `Layer "${fromLayer}" cannot depend on "${toLayer}": ${from} → ${to}`,
          from,
          to,
        });
      }
    }
    return violations;
  },
};

/** Tutte le regole di layering. */
export const LAYERING_RULES: readonly ArchitectureRule[] = [RULE_LAYERING];

/** Valuta tutte le regole di layering sul grafo e restituisce le violazioni. */
export function checkLayeringRules(graph: ImportGraph): Violation[] {
  const result: Violation[] = [];
  for (const rule of LAYERING_RULES) {
    result.push(...rule.check(graph));
  }
  return result;
}
