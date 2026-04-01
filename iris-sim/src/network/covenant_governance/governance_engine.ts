/**
 * Microstep 14Q — Identity & Governance Layer. Authorization engine.
 */

import type { Actor } from './governance_types.js';
import type { GovernanceAction } from './governance_types.js';
import type { GovernancePolicy } from './governance_policy.js';
import { GovernanceError, GovernanceErrorCode } from './governance_errors.js';

export class GovernanceEngine {
  private readonly policyByRole: Map<string, readonly GovernanceAction[]>;

  constructor(policies: readonly GovernancePolicy[]) {
    this.policyByRole = new Map();
    for (const p of policies) {
      this.policyByRole.set(p.role, p.allowed_actions);
    }
  }

  /**
   * Verify actor is allowed to perform action. Throws GovernanceError if not.
   */
  authorize(actor: Actor, action: GovernanceAction): void {
    if (typeof actor.actor_id !== 'string' || actor.actor_id.trim().length === 0) {
      throw new GovernanceError(GovernanceErrorCode.INVALID_ACTOR, 'Invalid or missing actor_id');
    }
    if (!actor.roles || actor.roles.length === 0) {
      throw new GovernanceError(GovernanceErrorCode.NO_ROLES, 'Actor has no roles');
    }
    for (const role of actor.roles) {
      const allowed = this.policyByRole.get(role);
      if (allowed?.includes(action)) return;
    }
    throw new GovernanceError(
      GovernanceErrorCode.UNAUTHORIZED,
      `Actor ${actor.actor_id} not authorized for action ${action}`,
    );
  }
}
