/**
 * Capability Governance - engine centrale per capability
 * Microstep 5.4.1
 *
 * Nessuna policy → deny (fail-safe).
 * Una policy nega → deny. Policy che lancia → deny con reason.
 * Tutte allow → allow. Ordine deterministico.
 */

import type { PluginActivationContext } from '../governance/PluginActivationContext';
import type { PluginForPolicy } from '../governance/PluginPolicy';
import type { PluginCapability } from './PluginCapability';
import type { CapabilityDecision } from './CapabilityDecision';
import { capabilityDenied, isCapabilityAllowed } from './CapabilityDecision';
import type { CapabilityPolicy } from './CapabilityPolicy';
import { hasCapability } from './PluginCapability';

export class CapabilityGovernance {
  private readonly policies: CapabilityPolicy[] = [];

  registerPolicy(policy: CapabilityPolicy): void {
    this.policies.push(policy);
  }

  /**
   * Valuta se il plugin può usare la capability nel contesto dato.
   * Fail-safe: nessuna policy → deny; capability non dichiarata → deny.
   */
  canUseCapability(
    plugin: PluginForPolicy,
    capability: PluginCapability,
    context: PluginActivationContext
  ): CapabilityDecision {
    const declared = plugin.metadata.capabilities;
    if (!hasCapability(declared, capability)) {
      return capabilityDenied(`Capability "${capability}" is not declared by plugin`);
    }

    if (this.policies.length === 0) {
      return capabilityDenied('No capability policy registered (fail-safe)');
    }

    for (const policy of this.policies) {
      try {
        const decision = policy.evaluate(plugin, capability, context);
        if (!isCapabilityAllowed(decision)) {
          return decision;
        }
      } catch (err) {
        return capabilityDenied(
          `Policy "${policy.name}" threw: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { allowed: true };
  }
}
