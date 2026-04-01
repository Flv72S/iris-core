/**
 * Step 8B — Default policy registry. Predefined governance policies.
 */

import type { GovernancePolicy } from '../types/policy_types.js';

export const DEFAULT_POLICIES: readonly GovernancePolicy[] = Object.freeze([
  Object.freeze({
    id: 'block_autonomous_decision_low_tier',
    description: 'Block autonomous_decision when tier is below TIER_2',
    condition: Object.freeze({ field: 'tier', operator: '<', value: 'TIER_2' }),
    action: Object.freeze({
      type: 'block_feature',
      params: Object.freeze({ feature: 'autonomous_decision' }),
    }),
  }),
  Object.freeze({
    id: 'audit_pressure_rule',
    description: 'Increase audit frequency when violation pressure exceeds 0.40',
    condition: Object.freeze({
      field: 'violationPressure',
      operator: '>',
      value: 0.4,
    }),
    action: Object.freeze({ type: 'increase_audit_frequency' }),
  }),
]);
