/**
 * Tenant & Compliance Boundary Layer
 * Microstep 5.4.2
 */

export {
  createTenantContext,
  type TenantContext,
} from './TenantContext';
export {
  tenantAllowed,
  tenantDenied,
  isTenantAllowed,
  type TenantDecision,
} from './TenantDecision';
export type { TenantPolicy } from './TenantPolicy';
export { TenantGovernance } from './TenantGovernance';
