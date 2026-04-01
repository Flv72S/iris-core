/**
 * Phase 12A — Governance Action Model.
 * Foundational data structure for governance actions; deterministic, immutable, serialization-safe.
 */

export type {
  ActionType,
  ActionStatus,
  GovernanceAction,
  GovernanceActionMetadata,
} from './governance_action_types.js';
export {
  createGovernanceAction,
  validateGovernanceAction,
  stableGovernanceActionStringify,
  computeGovernanceActionHash,
} from './governance_action_helpers.js';
