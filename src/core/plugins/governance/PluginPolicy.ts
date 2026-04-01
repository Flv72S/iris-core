/**
 * Plugin Policy - contratto di policy
 * Microstep 5.3.3
 *
 * Decide se un plugin può essere eseguito nel contesto dato.
 * Le policy non eseguono plugin. Nessun side-effect.
 */

import type { PluginActivationContext } from './PluginActivationContext';
import type { PluginDecision } from './PluginDecision';

/** Plugin come visto dalla governance (solo metadata necessario). */
export interface PluginForPolicy {
  readonly metadata: {
    readonly id: string;
    readonly version: string;
    readonly kind: string;
    readonly capabilities?: readonly string[];
  };
}

/**
 * Contratto di policy: pura, deterministica, senza side-effect.
 */
export interface PluginPolicy {
  readonly name: string;
  evaluate(plugin: PluginForPolicy, context: PluginActivationContext): PluginDecision;
}
