/**
 * Capability Policy - contratto di policy per capability
 * Microstep 5.4.1
 *
 * Policy pure, deterministiche, senza side-effect.
 * PluginForPolicy espone solo metadata e capabilities dichiarate.
 */

import type { PluginActivationContext } from '../governance/PluginActivationContext';
import type { PluginForPolicy } from '../governance/PluginPolicy';
import type { PluginCapability } from './PluginCapability';
import type { CapabilityDecision } from './CapabilityDecision';

export interface CapabilityPolicy {
  readonly name: string;
  evaluate(
    plugin: PluginForPolicy,
    capability: PluginCapability,
    context: PluginActivationContext
  ): CapabilityDecision;
}
