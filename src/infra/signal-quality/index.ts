/**
 * Signal Quality — Layer meccanico di qualità segnale.
 * Importa solo da infra/signal-adapters. Non importato da UX/product.
 */

export type { SignalQuality } from './SignalQuality';
export type { QualifiedSignalEvent } from './QualifiedSignalEvent';
export type { SignalQualityRule } from './SignalQualityRule';
export { SignalQualityEngine } from './SignalQualityEngine';
export {
  SIGNAL_QUALITY_COMPONENT_ID,
  isSignalQualityEnabled,
  type SignalQualityRegistry,
} from './SignalQualityKillSwitch';
export { duplicateSuppressionRule } from './rules/DuplicateSuppressionRule';
export { timeNoiseRule } from './rules/TimeNoiseRule';
export { emptyPayloadRule } from './rules/EmptyPayloadRule';
