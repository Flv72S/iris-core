/**
 * Step 8L — Policy violation detector. Decision allowed but policy blocks features.
 */

import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import { createGovernanceAlert } from '../types/governance_alert.js';
import type { GovernanceAlert } from '../types/governance_alert.js';

interface WatcherPolicyEnforcement extends PolicyEnforcementResult {
  readonly blocked?: boolean;
}

/**
 * Detect violation when a runtime decision is allowed but policy indicates a block.
 * Supports the existing blockedFeatures model and an optional blocked boolean flag.
 */
export function detectPolicyViolations(
  enforcement: WatcherPolicyEnforcement,
  runtimeDecision: RuntimeDecision
): GovernanceAlert[] {
  if (!runtimeDecision.allowed) return [];

  if (enforcement.blocked === true) {
    return [
      createGovernanceAlert(
        'POLICY_VIOLATION',
        'HIGH',
        'Runtime decision allowed while policy enforcement reported a blocked state'
      ),
    ];
  }

  const blocked = new Set(enforcement.blockedFeatures);
  for (const feature of runtimeDecision.allowedFeatures) {
    if (blocked.has(feature)) {
      return [
        createGovernanceAlert(
          'POLICY_VIOLATION',
          'HIGH',
          `Runtime decision allowed feature "${feature}" despite policy enforcement block`
        ),
      ];
    }
  }

  return [];
}
