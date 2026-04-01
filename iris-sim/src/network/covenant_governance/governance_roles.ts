/**
 * Microstep 14Q — Identity & Governance Layer. Roles.
 */

import type { Role } from './governance_types.js';

export type { Role } from './governance_types.js';

export const ROLES: readonly Role[] = Object.freeze(['ADMIN', 'OPERATOR', 'AUDITOR']);
