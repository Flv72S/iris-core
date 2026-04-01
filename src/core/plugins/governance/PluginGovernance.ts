/**
 * Plugin Governance - orchestratore centrale
 * Microstep 5.3.3
 *
 * Valuta un plugin prima di ogni esecuzione. Decisione deterministica.
 * Una policy che nega → plugin non invocato. Default fail-safe.
 */

import type { PluginActivationContext } from './PluginActivationContext';
import type { PluginDecision } from './PluginDecision';
import { deny, isAllowed } from './PluginDecision';
import type { PluginPolicy, PluginForPolicy } from './PluginPolicy';

export class PluginGovernance {
  private readonly policies: PluginPolicy[] = [];

  registerPolicy(policy: PluginPolicy): void {
    this.policies.push(policy);
  }

  /**
   * Valuta se il plugin può essere eseguito nel contesto dato.
   * Deterministico: stesso plugin + stesso contesto → stessa decisione.
   * Fail-safe: una policy nega → deny; policy lancia → deny con reason.
   */
  canExecute(plugin: PluginForPolicy, context: PluginActivationContext): PluginDecision {
    for (const policy of this.policies) {
      try {
        const decision = policy.evaluate(plugin, context);
        if (!isAllowed(decision)) {
          return decision;
        }
      } catch (err) {
        return deny(
          `Policy "${policy.name}" threw: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    return { allow: true };
  }
}
