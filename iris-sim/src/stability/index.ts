/**
 * Stability Layer — Adaptive Rate Limiting + Hysteresis Framework.
 * Structural damping only. Not yet activated in modules; ready for progressive integration.
 */

export { AdaptiveRateLimiter } from './rateLimiter.js';
export type { AdaptiveRateLimiterOptions } from './rateLimiter.js';
export { HysteresisController } from './hysteresis.js';
export type { HysteresisControllerOptions } from './hysteresis.js';
export { AdaptiveController } from './adaptiveController.js';
export type { AdaptiveControllerOptions } from './adaptiveController.js';
export { registerAdaptiveModule, getRegisteredModules, clearRegistry } from './stabilityRegistry.js';
export {
  setStabilityDiagnosticEnabled,
  isStabilityDiagnosticEnabled,
  logRateLimitHit,
  logHysteresisBlock,
  logDeltaReduction,
  logSmoothingApplied,
} from './diagnosticLogger.js';
export { collectRateLimiterMetrics, collectHysteresisMetrics, mergeStabilityMetrics } from './metrics.js';
export type {
  RateLimitConfig,
  HysteresisConfig,
  AdaptiveModuleRegistration,
  StabilityMetrics,
  StabilityDiagnosticLog,
} from './stabilityTypes.js';

export { StabilityValidator, ImpactEstimator, StabilityBudgetController, StabilityLedger } from './validator/index.js';
export { collectStabilityValidatorMetrics } from './validator/stabilityMetrics.js';
export type {
  StabilityBudgetConfig,
  ImpactEstimate,
  ValidationResult,
  StabilityLedgerEntry,
} from './validator/stabilityBudgetTypes.js';
export type { StabilityValidatorMetrics } from './validator/stabilityMetrics.js';

export { GlobalStateAdapter, ControlledCommitPipeline } from './pipeline/index.js';
export { collectCommitPipelineMetrics } from './pipeline/commitMetrics.js';
export type { PipelineResult, GlobalStateSnapshot, CommitApplicationRecord } from './pipeline/pipelineTypes.js';
export type { CommitPipelineMetrics } from './pipeline/commitMetrics.js';
export type { CommitPipelineInterface } from './sandbox/executionContext.js';

export { RegimeDynamicsAnalyzer, TransitionTracker, ConvergenceDetector } from './dynamics/index.js';
export type {
  EnvelopeState,
  RegimeSnapshot,
  TrajectoryMetrics,
  TransitionEntry,
  EnvelopeResidenceStats,
  ConvergenceResult,
  ResidualRiskProjection,
  MonitoringConfig,
  DynamicsReport,
  PlateauStrength,
} from './dynamics/dynamicsTypes.js';
export { robustStdDev, detectShock, detectMetaStability } from './dynamics/robustMetrics.js';
export type { ShockDetectionResult } from './dynamics/robustMetrics.js';
export { DefaultMonitoringConfig } from './dynamics/dynamicsTypes.js';

export { GovernanceSignalGenerator } from '../governance/governanceSignalGenerator.js';
export type { GovernanceMode, GovernanceSignal, GovernanceConfig } from '../governance/governanceTypes.js';
export { DefaultGovernanceConfig } from '../governance/governanceTypes.js';
export { GovernanceSignalStabilityMonitor } from '../governance/governanceSignalStabilityMonitor.js';
export type {
  GovernanceSignalSnapshot,
  GovernanceStabilityReport,
  GovernanceStabilityThresholds,
} from '../governance/governanceSignalStabilityTypes.js';
export { HardeningInvariantEngine } from '../governance/hardening/index.js';
export type {
  FormalInvariantResult,
  HardeningAuditReport,
  DynamicsSnapshot,
} from '../governance/hardening/index.js';
export { DefaultGovernanceStabilityThresholds } from '../governance/governanceSignalStabilityTypes.js';
export { GovernanceActuationGate } from '../governance/governanceActuationGate.js';
export type {
  GovernanceActuationDecision,
  GovernanceActuationReason,
  GovernanceActuationConfig,
} from '../governance/governanceActuationTypes.js';
export { DefaultGovernanceActuationConfig } from '../governance/governanceActuationTypes.js';
export { GovernanceActivationReadinessEvaluator } from '../governance/activation/activationReadinessEvaluator.js';
export type {
  GovernanceActivationReadinessReport,
  GovernanceActivationIntent,
  GovernanceTargetModule,
} from '../governance/activation/activationTypes.js';
