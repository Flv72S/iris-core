/**
 * Phase 13M — Scalable Trust Graph Engine. Build graph from reputation profiles.
 * 13M.1: Pluggable trust weight calculator, profile validation.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { ScalableTrustGraph, TrustEdge } from './scalable_graph_types.js';
import { ScalableTrustGraphEngine } from './scalable_trust_graph.js';
import type { TrustGraphPolicy } from '../trust_policy/index.js';
import { DEFAULT_TRUST_POLICY } from '../trust_policy/index.js';
import type { TrustWeightCalculator } from './trust_weight_calculator.js';
import { DefaultTrustWeightCalculator } from './trust_weight_calculator.js';

const MIN_EDGE_WEIGHT = 0.2;

function isValidProfile(p: NodeReputationProfile): boolean {
  if (p == null || typeof p !== 'object') return false;
  if (typeof p.node_id !== 'string' || p.node_id.length === 0) return false;
  const score = p.reputation_score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) return false;
  return true;
}

/**
 * Build a scalable trust graph from reputation profiles.
 * Invalid profiles (missing node_id or score not in [0,1]) are ignored with a warning.
 * Steps: validate profiles, extract nodes, compute trust via calculator, add edges respecting policy limits.
 */
export function buildScalableTrustGraph(
  reputation_profiles: readonly NodeReputationProfile[],
  policy?: TrustGraphPolicy,
  calculator?: TrustWeightCalculator
): ScalableTrustGraph {
  const graphPolicy = policy ?? DEFAULT_TRUST_POLICY.trust_graph;
  const weightCalc = calculator ?? new DefaultTrustWeightCalculator();

  const validProfiles: NodeReputationProfile[] = [];
  for (const r of reputation_profiles) {
    if (isValidProfile(r)) {
      validProfiles.push(r);
    } else {
      if (typeof process !== 'undefined' && process.emitWarning) {
        process.emitWarning(
          `Trust graph builder: ignoring invalid profile (node_id=${String((r as { node_id?: string })?.node_id ?? '?')}, score=${Number((r as { reputation_score?: number })?.reputation_score)})`,
          { code: 'IRIS_TRUST_POLICY' }
        );
      }
    }
  }

  const engine = new ScalableTrustGraphEngine(graphPolicy);
  const profileByNode = new Map<string, NodeReputationProfile>();
  for (const r of validProfiles) {
    profileByNode.set(r.node_id, r);
    engine.addNode(r.node_id);
  }

  const nodeIds = [...profileByNode.keys()].sort((a, b) => a.localeCompare(b));

  for (const source of nodeIds) {
    const sourceProfile = profileByNode.get(source)!;
    const outEdges: TrustEdge[] = [];
    for (const target of nodeIds) {
      if (source === target) continue;
      const targetProfile = profileByNode.get(target)!;
      const weight = weightCalc.computeTrustWeight(sourceProfile, targetProfile);
      if (weight >= MIN_EDGE_WEIGHT) {
        outEdges.push(Object.freeze({ source, target, weight }));
      }
    }
    engine.updateNodeTrust(source, outEdges);
  }

  return engine.snapshot();
}
