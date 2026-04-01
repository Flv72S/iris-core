/**
 * Policy Kill Switch — Policy OFF → ignorata dall'engine.
 */

export type PolicyKillSwitchRegistry = Record<string, boolean>;

export function isPolicyEnabled(
  registry: PolicyKillSwitchRegistry,
  policyId: string
): boolean {
  return registry[policyId] !== false;
}
