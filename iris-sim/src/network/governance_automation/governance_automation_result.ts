/**
 * Phase 13K — Governance Automation Engine. Output types.
 */

import type { TrustGovernanceEvent } from '../trust_governance_bridge/index.js';
import type { GovernanceOperation } from './governance_automation_types.js';

export interface GovernanceExecutionRequest {
  readonly operation_id: string;
  readonly payload: GovernanceOperation;
}

export interface GovernanceAutomationResult {
  readonly timestamp: number;
  readonly generated_operations: readonly GovernanceOperation[];
  readonly rejected_events: readonly TrustGovernanceEvent[];
  readonly execution_ready_operations: readonly GovernanceExecutionRequest[];
}
