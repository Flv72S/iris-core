/**
 * DryRunKillSwitch - C.4.D
 * Registry e flag per abilitare/disabilitare il Dry-Run Engine.
 */

export const DRY_RUN_COMPONENT_ID = 'dry-run';

export type DryRunRegistry = Record<string, boolean>;

export function isDryRunEnabled(registry: DryRunRegistry): boolean {
  return registry[DRY_RUN_COMPONENT_ID] === true;
}
