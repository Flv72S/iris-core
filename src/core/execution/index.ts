/**
 * Controlled Execution — Invocata da pipeline, guardata, auditable, kill-switchable.
 * Fase 7.1: input da ResolutionResult; ActionIntent; domain executors; idempotenza.
 */

export type { ExecutionAction, ExecutionActionType } from './ExecutionAction';
export type { ActionIntent, ResolutionStatusAllowed } from './action-intent';
export { isResolutionStatusExecutable } from './action-intent';
export type {
  ExecutionPlan,
  ResolutionResultSnapshot,
  CandidateAction,
  ExecutionPlanOptions,
} from './execution-plan';
export { buildExecutionPlan, DEFAULT_ACTION_TYPE_PRIORITY } from './execution-plan';
export type {
  ActionLifecycleState,
  ActionLifecycleEntry,
  ActionLifecycleAuditEntry,
  ActionLifecycleStore,
} from './action-lifecycle';
export {
  getNextAllowedStates,
  canTransition,
  transition,
  createPlannedEntry,
  transitionAndPersist,
  InMemoryActionLifecycleStore,
  appendLifecycleAudit,
  readLifecycleAudit,
  _resetLifecycleAuditForTest,
} from './action-lifecycle';
export {
  executeFromResolution,
  InMemoryIdempotencyStore,
  type IdempotencyStore,
} from './execution-engine-core';
export type { DomainExecutor } from './domain-executors/DomainExecutor';
export { DEFAULT_DOMAIN_EXECUTORS } from './domain-executors';
export type { ExecutionResult } from './ExecutionResult';
export type { ExecutionContext, ExecutionAuditEntryRef } from './ExecutionContext';
export { ExecutionEngine } from './ExecutionEngine';
export {
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE_COMPONENT_ID,
  isExecutionEnabled,
  type ExecutionKillSwitchRegistry,
} from './kill-switch/ExecutionKillSwitch';
export {
  GLOBAL_KILL_SWITCH_KEY,
  FEATURE_KILL_SWITCH_PREFIX,
  ACTION_ID_KILL_SWITCH_PREFIX,
  getFeatureKillSwitchKey,
  getActionTypeKillSwitchKey,
  getActionIdKillSwitchKey,
  isExecutionAllowedForAction,
  getExecutionBlockReason,
} from './execution-killswitch';
export {
  createSharedRegistry,
  triggerGlobalStop,
  isGlobalStopActive,
  clearGlobalStop,
  PROPAGATION_CONTRACT,
} from './killswitch-propagation';
export type { ExecutionGuardrail } from './guardrails/ExecutionGuardrail';
export { maxActionsPerWindowGuardrail } from './guardrails/MaxActionsPerWindowGuardrail';
export { cooldownPerFeatureGuardrail } from './guardrails/CooldownPerFeatureGuardrail';
export { wellbeingBlockGuardrail } from './guardrails/WellbeingBlockGuardrail';
export type {
  RateLimitSpec,
  CooldownSpec,
  ActionBudgetSpec,
  AbortConditionSpec,
  ExecutionGuardrailSpecs,
} from './execution-guardrails';
export {
  checkRateLimit,
  checkCooldown,
  checkActionBudget,
  checkAbortConditions,
  createGuardrailFromSpecs,
  DEFAULT_RATE_LIMIT_SPEC,
  DEFAULT_COOLDOWN_SPEC,
  DEFAULT_ACTION_BUDGET_SPEC,
  WELLBEING_ABORT_CONDITION,
} from './execution-guardrails';
export type {
  PreExecutionBlockPhase,
  PreExecutionValidationResult,
  PreExecutionStateChecker,
  PreExecutionValidatorOptions,
} from './preexecution-validator';
export {
  validatePreExecution,
  defaultStateCheckers,
} from './preexecution-validator';
export type { ExecutionAdapter } from './adapters/ExecutionAdapter';
export { notificationAdapter } from './adapters/NotificationAdapter';
export { calendarAdapter } from './adapters/CalendarAdapter';
export { blockInputAdapter, deferMessageAdapter } from './adapters/InboxAdapter';
export type { ExecutionAuditEntry } from './audit/ExecutionAuditLog';
export { appendAudit, readAudit, _resetAuditForTest } from './audit/ExecutionAuditLog';
export type {
  LifecycleTrace,
  ResolutionCorrelation,
  ExecutionAuditRecord,
  ExecutionAuditRecordInput,
} from './execution-audit';
export {
  appendExecutionAuditRecord,
  readExecutionAudit,
  readExecutionAuditByActionId,
  readExecutionAuditByResolutionId,
  _resetExecutionAuditForTest,
} from './execution-audit';
export type {
  ForensicContextSnapshot,
  ForensicTraceEntry,
  ForensicTraceEntryInput,
} from './forensic-trace';
export {
  canonicalPayloadForVerification,
  verifyTraceIntegrity,
  appendForensicTrace,
  readForensicTrace,
  readForensicTraceByIntentId,
  readForensicTraceByResolutionId,
  readForensicTraceByTraceId,
  _resetForensicTraceForTest,
} from './forensic-trace';
