import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import type { ComplianceActionType, ComplianceDecision } from './cluster_compliance_engine';
import { resolveComplianceConflict } from './conflict/compliance_conflict_resolver';

export type ComplianceAction = ComplianceActionType;
export type ExecutorMode = 'STRICT' | 'PERMISSIVE';

export interface ExecutorOptions {
  readonly mode?: ExecutorMode;
  readonly dryRun?: boolean;
  readonly logOnly?: boolean;
  readonly executionTimestamp?: number;
}

export interface ComplianceExecutionRecord {
  readonly decisionId: string;
  readonly timestamp: number;
  readonly actions: readonly ComplianceAction[];
  readonly applied: boolean;
}

export interface ComplianceExecutionResult<TCluster = ClusterStateExecutionInput> {
  readonly actions: readonly ComplianceAction[];
  readonly mutatedCluster: TCluster;
  readonly executionRecord: ComplianceExecutionRecord;
}

export interface ClusterStateExecutionInput {
  readonly globalPhase?: string;
  readonly transitionLocks?: Readonly<Record<string, boolean>>;
  readonly locked?: boolean;
  readonly requiresOperator?: boolean;
  readonly escalation?: boolean;
  readonly executionJournal?: Readonly<Record<string, ComplianceExecutionRecord>>;
  readonly executionMetadata?: Readonly<Record<string, unknown>>;
  readonly executedActions?: readonly ComplianceAction[];
  readonly executionTimestamp?: number;
  readonly complianceDecision?: ComplianceDecision;
}

const ACTION_ORDER: Readonly<Record<ComplianceAction, number>> = {
  HALT_CLUSTER: 0,
  FREEZE_TRANSITIONS: 1,
  REQUIRE_MANUAL_INTERVENTION: 2,
  ESCALATE: 3,
  LOG_ONLY: 4,
  NO_OP: 5,
};

function canonicalizeActions(actions: readonly ComplianceAction[]): readonly ComplianceAction[] {
  const uniq = [...new Set(actions)];
  uniq.sort((a, b) => ACTION_ORDER[a] - ACTION_ORDER[b]);
  return Object.freeze(uniq);
}

export function deriveComplianceDecisionId(decision: ComplianceDecision): string {
  const body = canonicalizeKeysDeep({
    severity: decision.severity,
    action: decision.action,
    invariantIds: [...decision.invariantIds].sort(),
    reasons: [...decision.reasons].sort(),
    timestamp: decision.timestamp,
  });
  const digest = crypto.createHash('sha256').update(stableStringify(body), 'utf8').digest('hex');
  return `CMP:${digest}`;
}

function downgradeAction(action: ComplianceAction): ComplianceAction {
  if (action === 'HALT_CLUSTER') return 'FREEZE_TRANSITIONS';
  if (action === 'FREEZE_TRANSITIONS' || action === 'REQUIRE_MANUAL_INTERVENTION') return 'ESCALATE';
  return action;
}

function effectiveAction(decisionAction: ComplianceAction, mode: ExecutorMode, logOnly: boolean): ComplianceAction {
  if (logOnly) return 'LOG_ONLY';
  if (mode === 'PERMISSIVE') return downgradeAction(decisionAction);
  return decisionAction;
}

function applyAction<TCluster extends ClusterStateExecutionInput>(
  cluster: TCluster,
  action: ComplianceAction,
  timestamp: number,
): TCluster {
  const base: Record<string, unknown> = { ...cluster };
  if (action === 'HALT_CLUSTER') {
    base.globalPhase = 'HALTED';
    base.transitionLocks = Object.freeze({ all: true });
  } else if (action === 'FREEZE_TRANSITIONS') {
    base.transitionLocks = Object.freeze({ all: true });
  } else if (action === 'ESCALATE') {
    base.escalation = true;
  } else if (action === 'REQUIRE_MANUAL_INTERVENTION') {
    base.locked = true;
    base.requiresOperator = true;
  }
  base.executedActions = canonicalizeActions([...(cluster.executedActions ?? []), action]);
  base.executionTimestamp = timestamp;
  return Object.freeze(base as TCluster);
}

function mergeJournal<TCluster extends ClusterStateExecutionInput>(
  cluster: TCluster,
  record: ComplianceExecutionRecord,
): TCluster {
  const prior = cluster.executionJournal ?? Object.freeze({});
  const nextJournalObj = {
    ...prior,
    [record.decisionId]: record,
  };
  const journalKeys = Object.keys(nextJournalObj).sort();
  const nextJournal = Object.freeze(nextJournalObj);
  return Object.freeze({
    ...cluster,
    executionJournal: nextJournal,
    executionMetadata: Object.freeze({
      ...(cluster.executionMetadata ?? {}),
      lastDecisionId: journalKeys[journalKeys.length - 1],
      appliedCount: journalKeys.length,
      anyApplied: journalKeys.some((id) => nextJournalObj[id]?.applied === true),
    }),
  } as TCluster);
}

function executeCore<TCluster extends ClusterStateExecutionInput>(
  cluster: TCluster,
  decision: ComplianceDecision,
  options?: ExecutorOptions,
  simulate = false,
): ComplianceExecutionResult<TCluster> {
  const resolvedDecision = cluster.complianceDecision !== undefined
    ? resolveComplianceConflict(cluster.complianceDecision, decision)
    : decision;
  const decisionId = deriveComplianceDecisionId(resolvedDecision);
  const timestamp = options?.executionTimestamp ?? resolvedDecision.timestamp;
  const mode: ExecutorMode = options?.mode ?? 'STRICT';
  const action = effectiveAction(resolvedDecision.action, mode, options?.logOnly === true);
  const actions = canonicalizeActions([action]);

  const existing = cluster.executionJournal?.[decisionId];
  if (existing !== undefined) {
    return Object.freeze({
      actions: existing.actions,
      mutatedCluster: cluster,
      executionRecord: existing,
    });
  }

  const applied = !(simulate || options?.dryRun === true);
  const record: ComplianceExecutionRecord = Object.freeze({
    decisionId,
    timestamp,
    actions,
    applied,
  });

  if (!applied) {
    return Object.freeze({
      actions,
      mutatedCluster: cluster,
      executionRecord: record,
    });
  }

  const transformed = applyAction(cluster, action, timestamp);
  const withDecision = Object.freeze({
    ...transformed,
    complianceDecision: resolvedDecision,
  } as TCluster);
  const withJournal = mergeJournal(withDecision, record);
  return Object.freeze({
    actions,
    mutatedCluster: withJournal,
    executionRecord: record,
  });
}

export function executeComplianceDecision<TCluster extends ClusterStateExecutionInput>(
  cluster: TCluster,
  decision: ComplianceDecision,
  options?: ExecutorOptions,
): ComplianceExecutionResult<TCluster> {
  return executeCore(cluster, decision, options, false);
}

export function simulateComplianceExecution<TCluster extends ClusterStateExecutionInput>(
  cluster: TCluster,
  decision: ComplianceDecision,
  options?: ExecutorOptions,
): ComplianceExecutionResult<TCluster> {
  return executeCore(cluster, decision, options, true);
}
