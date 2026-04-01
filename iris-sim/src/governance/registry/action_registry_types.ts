/**
 * Phase 12D — Governance Action Registry. Types.
 * All types are immutable.
 */

import type { GovernanceAction } from '../action_model/index.js';
import type { GovernanceAuthorizationResult } from '../authorization/index.js';
import type { GovernanceExecutionResult } from '../execution/index.js';

/** Full lifecycle record of a governance action. Immutable; hash must match action content. */
export interface GovernanceActionRecord {
  readonly action: GovernanceAction;
  readonly action_hash: string;
  readonly authorization_result?: GovernanceAuthorizationResult;
  readonly execution_result?: GovernanceExecutionResult;
  readonly recorded_timestamp: number;
}

/** Deterministic query parameters for the registry. */
export interface GovernanceActionQueryFilter {
  readonly action_type?: string;
  readonly initiator_id?: string;
  /** Status derived from execution_result, authorization_result, or action.status */
  readonly status?: string;
}
