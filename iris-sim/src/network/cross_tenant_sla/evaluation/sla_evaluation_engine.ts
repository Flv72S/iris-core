/**
 * Phase 11C — SLA Evaluation Engine.
 * Detects conflicts and missing SLA coverage deterministically.
 */

import type {
  LocalNodeSLA,
  SLAComplianceGap,
  TenantSLAState,
  SLAGapType,
} from '../types/cross_tenant_sla_types.js';
import { groupSLAsByTenant, groupSLAsByService } from '../aggregation/sla_aggregation_engine.js';

function uniqueSorted<T>(arr: readonly T[], toKey: (v: T) => string): string[] {
  return [...new Set(arr.map(toKey))].sort();
}

export function detectSlaConflicts(nodeSlas: readonly LocalNodeSLA[]): SLAComplianceGap[] {
  const gaps: SLAComplianceGap[] = [];
  const byTenant = groupSLAsByTenant(nodeSlas);
  const tenantIds = [...byTenant.keys()].sort();

  for (const tenant_id of tenantIds) {
    const byService = groupSLAsByService(byTenant.get(tenant_id) ?? []);
    const serviceNames = [...byService.keys()].sort();
    for (const service_name of serviceNames) {
      const slas = byService.get(service_name) ?? [];
      if (slas.length <= 1) continue;

      const uptimeSet = uniqueSorted(slas, (s) => String(s.uptime_target));
      const latencySet = uniqueSorted(slas, (s) => String(s.latency_target_ms));
      const throughputSet = uniqueSorted(slas, (s) => String(s.throughput_target));

      const hasConflict = uptimeSet.length > 1 || latencySet.length > 1 || throughputSet.length > 1;
      if (!hasConflict) continue;

      gaps.push(
        Object.freeze({
          tenant_id,
          service_name,
          gap_type: 'SLA_CONFLICT' satisfies SLAGapType,
          severity: 'WARNING',
          description: `Conflicting SLA declarations. uptime_targets=${uptimeSet.join(
            ','
          )} latency_targets_ms=${latencySet.join(',')} throughput_targets=${throughputSet.join(',')}`,
        })
      );
    }
  }

  return gaps.sort((a, b) => a.tenant_id.localeCompare(b.tenant_id) || a.service_name.localeCompare(b.service_name) || a.gap_type.localeCompare(b.gap_type));
}

/**
 * Detect missing SLA coverage within a tenant:
 * For each tenant, determine the set of nodes that declared any SLA for that tenant.
 * For each service, if participating_nodes < allTenantNodes, produce NODE_MISSING_SLA gap.
 */
export function detectMissingSlaNodes(nodeSlas: readonly LocalNodeSLA[]): SLAComplianceGap[] {
  const gaps: SLAComplianceGap[] = [];
  const byTenant = groupSLAsByTenant(nodeSlas);
  const tenantIds = [...byTenant.keys()].sort();

  for (const tenant_id of tenantIds) {
    const tenantSlas = byTenant.get(tenant_id) ?? [];
    const tenantNodes = [...new Set(tenantSlas.map((s) => s.node_id))].sort();
    const byService = groupSLAsByService(tenantSlas);
    const serviceNames = [...byService.keys()].sort();

    for (const service_name of serviceNames) {
      const slas = byService.get(service_name) ?? [];
      const participating = [...new Set(slas.map((s) => s.node_id))].sort();
      const missing = tenantNodes.filter((n) => !participating.includes(n));
      if (missing.length === 0) continue;
      gaps.push(
        Object.freeze({
          tenant_id,
          service_name,
          gap_type: 'NODE_MISSING_SLA' satisfies SLAGapType,
          severity: 'WARNING',
          description: `Nodes missing SLA for service: ${missing.join(',')}`,
        })
      );
    }
  }

  return gaps.sort((a, b) => a.tenant_id.localeCompare(b.tenant_id) || a.service_name.localeCompare(b.service_name) || a.gap_type.localeCompare(b.gap_type));
}

export function evaluateTenantSLAs(
  nodeSlas: readonly LocalNodeSLA[],
  _tenantStates: readonly TenantSLAState[]
): SLAComplianceGap[] {
  // Phase 11C evaluation focuses on declaration integrity and coverage.
  // Runtime compliance (uptime/latency/throughput measured) is expected in later phases.
  const conflicts = detectSlaConflicts(nodeSlas);
  const missing = detectMissingSlaNodes(nodeSlas);
  const all = [...conflicts, ...missing];
  return all.sort((a, b) => a.tenant_id.localeCompare(b.tenant_id) || a.service_name.localeCompare(b.service_name) || a.gap_type.localeCompare(b.gap_type));
}

