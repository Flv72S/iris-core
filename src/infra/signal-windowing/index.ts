/**
 * Signal Windowing — Organizzazione temporale meccanica.
 * Importa solo da infra/signal-quality. Non importato da UX/product.
 */

export type { SignalWindow } from './SignalWindow';
export type { SignalWindowingStrategy } from './SignalWindowingStrategy';
export { SignalWindowingEngine } from './SignalWindowingEngine';
export {
  SIGNAL_WINDOWING_COMPONENT_ID,
  isSignalWindowingEnabled,
  type SignalWindowingRegistry,
} from './SignalWindowingKillSwitch';
export { fixedTimeWindowStrategy } from './strategies/FixedTimeWindowStrategy';
export { slidingWindowStrategy } from './strategies/SlidingWindowStrategy';
export { sourceBasedWindowStrategy } from './strategies/SourceBasedWindowStrategy';
