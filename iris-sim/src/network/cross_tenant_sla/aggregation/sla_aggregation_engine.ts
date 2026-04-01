/**
 * Phase 11C — SLA Aggregation Engine.
 * Deterministic grouping and conservative aggregation rules.
 */

import type { LocalNodeSLA, TenantSLAState, TenantServiceSLA } from '../types/cross_tenant_sla_types.js';

export function groupSLAsByTenant(nodeSlas: readonly LocalNodeSLA[]): Map<string, LocalNodeSLA[]> {
  const byTenant = new Map<string, LocalNodeSLA[]>();
  for (const sla of nodeSlas) {
    const arr = byTenant.get(sla.tenant_id) ?? [];
    arr.push(sla);
    byTenant.set(sla.tenant_id, arr);
  }
  // Ensure deterministic ordering within each tenant for downstream steps
  for (const [tenant, slas] of byTenant) {
    slas.sort((a, b) => a.service_name.localeCompare(b.service_name) || a.node_id.localeCompare(b.node_id));
    byTenant.set(tenant, slas);
  }
  return byTenant;
}

export function groupSLAsByService(tenantSlas: readonly LocalNodeSLA[]): Map<string, LocalNodeSLA[]> {
  const byService = new Map<string, LocalNodeSLA[]>();
  for (const sla of tenantSlas) {
    const arr = byService.get(sla.service_name) ?? [];
    arr.push(sla);
    byService.set(sla.service_name, arr);
  }
  for (const [service, slas] of byService) {
    slas.sort((a, b) => a.node_id.localeCompare(b.node_id));
    byService.set(service, slas);
  }
  return byService;
}

/**
 * Conservative deterministic aggregation:
 * - uptime target = minimum across nodes
 * - latency target = maximum across nodes
 * - throughput target = minimum across nodes
 */
export function aggregateTenantServiceSLAs(serviceSlas: readonly LocalNodeSLA[]): TenantServiceSLA {
  const participating_nodes = [...new Set(serviceSlas.map((s) => s.node_id))].sort();
  const service_name = serviceSlas[0]?.service_name ?? '';
  const aggregated_uptime_target = Math.min(...serviceSlas.map((s) => s.uptime_target));
  const aggregated_latency_target_ms = Math.max(...serviceSlas.map((s) => s.latency_target_ms));
  const aggregated_throughput_target = Math.min(...serviceSlas.map((s) => s.throughput_target));

  return Object.freeze({
    service_name,
    participating_nodes,
    aggregated_uptime_target,
    aggregated_latency_target_ms,
    aggregated_throughput_target,
  });
}

export function aggregateTenantStates(nodeSlas: readonly LocalNodeSLA[]): TenantSLAState[] {
  const byTenant = groupSLAsByTenant(nodeSlas);
  const tenantIds = [...byTenant.keys()].sort();

  const states: TenantSLAState[] = [];
  for (const tenant_id of tenantIds) {
    const tenantSlas = byTenant.get(tenant_id) ?? [];
    const byService = groupSLAsByService(tenantSlas);
    const serviceNames = [...byService.keys()].sort();
    const services: TenantServiceSLA[] = [];
    for (const service_name of serviceNames) {
      const slas = byService.get(service_name) ?? [];
      if (slas.length === 0) continue;
      services.push(aggregateTenantServiceSLAs(slas));
    }
    states.push(Object.freeze({ tenant_id, services }));
  }

  return states;
}

