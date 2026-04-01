/**
 * Phase 13K — Governance Automation Engine.
 */

export type {
  GovernanceAutomationInput,
  GovernanceOperationType,
  GovernanceOperation,
} from './governance_automation_types.js';
export type {
  GovernanceAutomationResult,
  GovernanceExecutionRequest,
} from './governance_automation_result.js';
export type { GovernanceAutomationOptions } from './governance_automation_engine.js';
export { runGovernanceAutomation, MAX_OPERATIONS_PER_CYCLE } from './governance_automation_engine.js';
export { buildGovernanceOperation } from './governance_operation_builder.js';
