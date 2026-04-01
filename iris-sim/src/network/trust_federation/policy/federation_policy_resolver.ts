/**
 * Microstep 10K — Governance Trust Federation Engine. Federation policy resolver.
 */

import type { TrustPolicy } from '../../trust_policy/types/trust_policy_types.js';
import type { GovernanceTrustExportPackage } from '../../trust_export/types/trust_export_types.js';

/**
 * Merge local policies with policies from imported packages; dedupe by policy_id; sort by policy_id.
 */
export function resolveFederationPolicies(
  local_policies: readonly TrustPolicy[],
  imported_packages: readonly GovernanceTrustExportPackage[]
): TrustPolicy[] {
  const byId = new Map<string, TrustPolicy>();
  for (const p of local_policies) {
    byId.set(p.policy_id, p);
  }
  for (const pkg of imported_packages) {
    for (const p of pkg.policies) {
      if (!byId.has(p.policy_id)) byId.set(p.policy_id, p);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.policy_id < b.policy_id ? -1 : a.policy_id > b.policy_id ? 1 : 0
  );
}
