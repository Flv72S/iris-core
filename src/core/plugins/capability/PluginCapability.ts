/**
 * Plugin Capability - modello capability-based
 * Microstep 5.4.1
 *
 * Permesso esplicito che il plugin deve dichiarare per accedere a poteri sensibili.
 */

import type { CapabilityDecision } from './CapabilityDecision';
import { capabilityAllowed, capabilityDenied } from './CapabilityDecision';

export type PluginCapability =
  | 'read:projection'
  | 'read:dlq'
  | 'runtime:clock'
  | 'runtime:logger'
  | 'write:command';

export type PluginCapabilitySet = readonly PluginCapability[];

export function hasCapability(
  set: readonly string[] | PluginCapabilitySet | undefined,
  capability: PluginCapability
): boolean {
  if (!set || set.length === 0) return false;
  return (set as readonly string[]).includes(capability);
}

/**
 * Verifica se la capability è dichiarata nel set. Non valuta policy.
 */
export function requireCapability(
  set: readonly string[] | PluginCapabilitySet | undefined,
  capability: PluginCapability
): CapabilityDecision {
  if (!hasCapability(set, capability)) {
    return capabilityDenied(`Capability "${capability}" is not declared`);
  }
  return capabilityAllowed();
}
