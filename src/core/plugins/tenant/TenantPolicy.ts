/**
 * Tenant Policy - contratto di policy per tenant e compliance
 * Microstep 5.4.2
 *
 * Policy pure, deterministiche, senza side-effect.
 * Nessun accesso a storage o HTTP.
 */

import type { PluginActivationContext } from '../governance/PluginActivationContext';
import type { PluginForPolicy } from '../governance/PluginPolicy';
import type { TenantContext } from './TenantContext';
import type { TenantDecision } from './TenantDecision';

export interface TenantPolicy {
  readonly name: string;
  evaluate(
    plugin: PluginForPolicy,
    tenant: TenantContext,
    context: PluginActivationContext
  ): TenantDecision;
}
