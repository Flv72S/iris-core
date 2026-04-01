/**
 * Phase 13K — Governance Automation Engine. Input types.
 */

import type { TrustPipelineResult } from '../trust_pipeline/index.js';

export interface GovernanceAutomationInput {
  readonly pipeline_result: TrustPipelineResult;
}

export type GovernanceOperationType =
  | 'NODE_QUARANTINE'
  | 'NODE_TRUST_REDUCTION'
  | 'NODE_RECOVERY'
  | 'TRUST_FLAG'
  | 'NETWORK_ALERT';

export interface GovernanceOperation {
  readonly operation_id: string;
  readonly type: GovernanceOperationType;
  readonly target_node: string;
  readonly reason: string;
  readonly severity: number;
  readonly timestamp: number;
}
