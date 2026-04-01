/**
 * Phase 13XX-E — Governance Decision Engine. Action executor.
 */

import type { GovernanceDecision } from './governance_types.js';
import type { NodeIdentityRegistry } from '../node_identity/index.js';
import type { NodePassportUpdater } from '../node_passport/index.js';

export interface GovernanceActionExecutorOptions {
  /** Called when ESCALATE_MANUAL_REVIEW is executed (observability). */
  onManualReviewEscalation?: (decision: GovernanceDecision) => void;
}

/**
 * Applies governance decisions to node registry and passport. Deterministic.
 */
export class GovernanceActionExecutor {
  constructor(
    private readonly nodeRegistry: NodeIdentityRegistry,
    private readonly passportUpdater: NodePassportUpdater,
    private readonly options: GovernanceActionExecutorOptions = {}
  ) {}

  execute(decision: GovernanceDecision): void {
    const { node_id, action, decided_at } = decision;
    switch (action) {
      case 'NO_ACTION':
        break;
      case 'FLAG_UNDER_REVIEW':
        this.passportUpdater.applyGovernanceFlag(node_id, 'UNDER_REVIEW', decided_at);
        break;
      case 'LIMIT_PROPAGATION':
        this.passportUpdater.applyGovernanceFlag(node_id, 'LIMITED_PROPAGATION', decided_at);
        break;
      case 'SUSPEND_NODE':
        this.nodeRegistry.suspendNode(node_id);
        break;
      case 'REVOKE_NODE':
        this.nodeRegistry.revokeNode(node_id);
        break;
      case 'ESCALATE_MANUAL_REVIEW':
        this.passportUpdater.applyGovernanceFlag(node_id, 'UNDER_REVIEW', decided_at);
        this.options.onManualReviewEscalation?.(decision);
        break;
      default:
        break;
    }
  }
}
