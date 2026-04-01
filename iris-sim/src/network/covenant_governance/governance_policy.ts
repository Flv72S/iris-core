/**
 * Microstep 14Q — Identity & Governance Layer. Policy definition.
 */

import type { GovernanceAction, Role } from './governance_types.js';

export interface GovernancePolicy {
  readonly role: Role;
  readonly allowed_actions: readonly GovernanceAction[];
}

export const DEFAULT_POLICY: readonly GovernancePolicy[] = Object.freeze([
  {
    role: 'ADMIN',
    allowed_actions: Object.freeze<GovernanceAction[]>(['CREATE', 'UPDATE', 'DISABLE', 'ROLLBACK', 'READ']),
  },
  {
    role: 'OPERATOR',
    allowed_actions: Object.freeze<GovernanceAction[]>(['CREATE', 'UPDATE', 'READ']),
  },
  {
    role: 'AUDITOR',
    allowed_actions: Object.freeze<GovernanceAction[]>(['READ']),
  },
]);
