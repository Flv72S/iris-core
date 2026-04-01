/**
 * SignalQualityKillSwitch — OFF → tutti gli eventi sono RAW.
 */

export const SIGNAL_QUALITY_COMPONENT_ID = 'signal-quality';

export type SignalQualityRegistry = Record<string, boolean>;

export function isSignalQualityEnabled(
  registry: SignalQualityRegistry
): boolean {
  return registry[SIGNAL_QUALITY_COMPONENT_ID] !== false;
}
