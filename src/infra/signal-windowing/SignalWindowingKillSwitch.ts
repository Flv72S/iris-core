/**
 * SignalWindowingKillSwitch — OFF → restituisce [].
 */

export const SIGNAL_WINDOWING_COMPONENT_ID = 'signal-windowing';

export type SignalWindowingRegistry = Record<string, boolean>;

export function isSignalWindowingEnabled(
  registry: SignalWindowingRegistry
): boolean {
  return registry[SIGNAL_WINDOWING_COMPONENT_ID] !== false;
}
