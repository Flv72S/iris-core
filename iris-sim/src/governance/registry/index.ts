/**
 * Phase 12D — Governance Action Registry.
 */

export type { GovernanceActionRecord, GovernanceActionQueryFilter } from './action_registry_types.js';
export { verifyRecordIntegrity, sortRegistryRecords } from './action_registry_helpers.js';
export {
  storeAction,
  attachAuthorizationResult,
  attachExecutionResult,
  queryActions,
  getActionByHash,
  getAuditTrail,
} from './governance_action_registry.js';
