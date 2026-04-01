/**
 * Phase 11C.2 — Trust-weighted SLA aggregation.
 * weighted_uptime = Σ(uptime × weight), weighted_latency = Σ(latency × weight), weighted_throughput = Σ(throughput × weight).
 */

import type { LocalNodeSLA } from '../types/cross_tenant_sla_types.js';
import type { WeightedServiceSLA } from './sla_trust_types.js';
import { buildNodeTrustMap, weightsForNodes } from './sla_trust_weight_engine.js';
import type { NodeTrustScore } from './sla_trust_types.js';

/** Key: tenant_id + \0 + service_name */
function key(tenant_id: string, service_name: string): string {
  return `${tenant_id}\0${service_name}`;
}

/**
 * Group node SLAs by tenant and then by service. Deterministic sort: tenant_id, service_name, node_id.
 */
export function groupSlasByTenantService(nodeSlas: readonly LocalNodeSLA[]): Map<string, LocalNodeSLA[]> {
  const byKey = new Map<string, LocalNodeSLA[]>();
  for (const sla of nodeSlas) {
    const k = key(sla.tenant_id, sla.service_name);
    const arr = byKey.get(k) ?? [];
    arr.push(sla);
    byKey.set(k, arr);
  }
  for (const arr of byKey.values()) {
    arr.sort((a, b) => a.node_id.localeCompare(b.node_id));
  }
  return byKey;
}

/**
 * Compute weighted SLA for one service: weighted_uptime = Σ(uptime × weight), etc.
 * Nodes processed in deterministic order (node_id).
 */
export function computeWeightedServiceSla(
  tenant_id: string,
  service_name: string,
  serviceSlas: readonly LocalNodeSLA[],
  nodeWeights: Map<string, number>
): WeightedServiceSLA {
  const sorted = [...serviceSlas].sort((a, b) => a.node_id.localeCompare(b.node_id));
  let wUptime = 0;
  let wLatency = 0;
  let wThroughput = 0;
  for (const s of sorted) {
    const w = nodeWeights.get(s.node_id) ?? 0;
    wUptime += s.uptime_target * w;
    wLatency += s.latency_target_ms * w;
    wThroughput += s.throughput_target * w;
  }
  return Object.freeze({
    tenant_id,
    service_name,
    weighted_uptime_target: wUptime,
    weighted_latency_target_ms: wLatency,
    weighted_throughput_target: wThroughput,
  });
}

/**
 * Compute weighted SLAs for all (tenant, service) in nodeSlas. Weights normalized per service.
 */
export function computeWeightedTenantSla(
  nodeSlas: readonly LocalNodeSLA[],
  trustScores: readonly NodeTrustScore[]
): WeightedServiceSLA[] {
  const trustMap = buildNodeTrustMap(trustScores);
  const byKey = groupSlasByTenantService(nodeSlas);
  const keys = [...byKey.keys()].sort();
  const result: WeightedServiceSLA[] = [];
  for (const k of keys) {
    const [tenant_id, service_name] = k.split('\0');
    const slas = byKey.get(k) ?? [];
    if (slas.length === 0) continue;
    const nodeIds = [...new Set(slas.map((s) => s.node_id))];
    const weights = weightsForNodes(nodeIds, trustMap);
    result.push(computeWeightedServiceSla(tenant_id!, service_name!, slas, weights));
  }
  return result.sort((a, b) => a.tenant_id.localeCompare(b.tenant_id) || a.service_name.localeCompare(b.service_name));
}
