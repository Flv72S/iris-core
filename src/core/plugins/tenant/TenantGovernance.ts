/**
 * Tenant Governance - engine per tenant e compliance
 * Microstep 5.4.2
 *
 * Nessuna policy → allow (tenant presente ma non vincolato).
 * Una policy nega → deny. Policy che lancia → deny fail-safe.
 */

import type { PluginActivationContext } from '../governance/PluginActivationContext';
import type { PluginForPolicy } from '../governance/PluginPolicy';
import type { TenantContext } from './TenantContext';
import type { TenantDecision } from './TenantDecision';
import { tenantDenied, isTenantAllowed } from './TenantDecision';
import type { TenantPolicy } from './TenantPolicy';

export class TenantGovernance {
  private readonly policies: TenantPolicy[] = [];

  registerPolicy(policy: TenantPolicy): void {
    this.policies.push(policy);
  }

  /**
   * Valuta se il plugin può essere eseguito per il tenant nel contesto dato.
   * Nessuna policy → allow. Una policy nega → deny. Policy che lancia → deny.
   */
  canExecute(
    plugin: PluginForPolicy,
    tenant: TenantContext,
    context: PluginActivationContext
  ): TenantDecision {
    for (const policy of this.policies) {
      try {
        const decision = policy.evaluate(plugin, tenant, context);
        if (!isTenantAllowed(decision)) {
          return decision;
        }
      } catch (err) {
        return tenantDenied(
          `Policy "${policy.name}" threw: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    return { allow: true };
  }
}
