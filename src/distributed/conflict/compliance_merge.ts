import { stableStringify } from '../../logging/audit';

import type { ComplianceActionType, ComplianceDecision } from '../cluster_compliance_engine';
import type { ComplianceExecutionRecord } from '../cluster_compliance_executor';
import { resolveComplianceConflict } from './compliance_conflict_resolver';
import { maxAction, ACTION_PRIORITY } from './compliance_lattice';

type MergeableCluster = {
  readonly globalPhase?: string;
  readonly transitionLocks?: Readonly<Record<string, boolean>>;
  readonly escalation?: boolean;
  readonly requiresOperator?: boolean;
  readonly locked?: boolean;
  readonly executionJournal?: Readonly<Record<string, ComplianceExecutionRecord>>;
  readonly executedActions?: readonly ComplianceActionType[];
  readonly executionTimestamp?: number;
  readonly executionMetadata?: Readonly<Record<string, unknown>>;
  readonly complianceDecision?: ComplianceDecision;
  readonly nodes?: unknown;
  readonly logicalTime?: { readonly counter: number; readonly nodeId: string };
  readonly expectedNodeIds?: readonly string[];
  readonly violations?: readonly unknown[];
};

const PHASE_PRIORITY: Readonly<Record<string, number>> = Object.freeze({
  INITIALIZING: 0,
  PARTIAL: 1,
  SYNCING: 2,
  READY: 3,
  RUNNING: 4,
  DEGRADED: 5,
  STOPPING: 6,
  STOPPED: 7,
  FAILED: 8,
  HALTED: 9,
});

function phaseMax(a?: string, b?: string): string | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const pa = PHASE_PRIORITY[a] ?? -1;
  const pb = PHASE_PRIORITY[b] ?? -1;
  if (pa > pb) return a;
  if (pb > pa) return b;
  return a >= b ? a : b;
}

function mergeLocks(
  a: Readonly<Record<string, boolean>> | undefined,
  b: Readonly<Record<string, boolean>> | undefined,
): Readonly<Record<string, boolean>> {
  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].sort();
  const out: Record<string, boolean> = {};
  for (const k of keys) out[k] = Boolean(a?.[k]) || Boolean(b?.[k]);
  return Object.freeze(out);
}

function mergeJournal(
  a: Readonly<Record<string, ComplianceExecutionRecord>> | undefined,
  b: Readonly<Record<string, ComplianceExecutionRecord>> | undefined,
): Readonly<Record<string, ComplianceExecutionRecord>> {
  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].sort();
  const out: Record<string, ComplianceExecutionRecord> = {};
  for (const k of keys) {
    const ra = a?.[k];
    const rb = b?.[k];
    if (ra === undefined) out[k] = rb!;
    else if (rb === undefined) out[k] = ra;
    else {
      // deterministic winner by timestamp then canonical payload
      if (ra.timestamp < rb.timestamp) out[k] = ra;
      else if (rb.timestamp < ra.timestamp) out[k] = rb;
      else out[k] = stableStringify(ra) >= stableStringify(rb) ? ra : rb;
    }
  }
  return Object.freeze(out);
}

function mergeActions(a: readonly ComplianceActionType[] | undefined, b: readonly ComplianceActionType[] | undefined): readonly ComplianceActionType[] {
  const uniq = [...new Set([...(a ?? []), ...(b ?? [])])];
  uniq.sort((x, y) => (ACTION_PRIORITY[y] - ACTION_PRIORITY[x]) || x.localeCompare(y));
  return Object.freeze(uniq);
}

function mergeBoolean(a: boolean | undefined, b: boolean | undefined): boolean | undefined {
  if (a === true || b === true) return true;
  if (a === false || b === false) return false;
  return undefined;
}

export function mergeClusterStates<T extends MergeableCluster>(stateA: T, stateB: T): T {
  const base = stableStringify(stateA) >= stableStringify(stateB) ? stateA : stateB;
  const mergedDecision = stateA.complianceDecision && stateB.complianceDecision
    ? resolveComplianceConflict(stateA.complianceDecision, stateB.complianceDecision)
    : stateA.complianceDecision ?? stateB.complianceDecision;
  const mergedJournal = mergeJournal(stateA.executionJournal, stateB.executionJournal);
  const journalKeys = Object.keys(mergedJournal).sort();
  const mergedLogicalTime = (() => {
    const a = stateA.logicalTime;
    const b = stateB.logicalTime;
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (a.counter !== b.counter) return a.counter > b.counter ? a : b;
    return a.nodeId >= b.nodeId ? a : b;
  })();
  const mergedExpectedNodeIds = Object.freeze([
    ...new Set([...(stateA.expectedNodeIds ?? []), ...(stateB.expectedNodeIds ?? [])]),
  ].sort());

  return Object.freeze({
    ...base,
    globalPhase: phaseMax(stateA.globalPhase, stateB.globalPhase),
    transitionLocks: mergeLocks(stateA.transitionLocks, stateB.transitionLocks),
    escalation: mergeBoolean(stateA.escalation, stateB.escalation),
    requiresOperator: mergeBoolean(stateA.requiresOperator, stateB.requiresOperator),
    locked: mergeBoolean(stateA.locked, stateB.locked),
    executionJournal: mergedJournal,
    executedActions: mergeActions(stateA.executedActions, stateB.executedActions),
    executionTimestamp: Math.max(stateA.executionTimestamp ?? -1, stateB.executionTimestamp ?? -1),
    logicalTime: mergedLogicalTime,
    expectedNodeIds: mergedExpectedNodeIds,
    violations: Object.freeze(
      (() => {
        const keyed = new Map<string, unknown>();
        for (const v of [...(stateA.violations ?? []), ...(stateB.violations ?? [])]) {
          keyed.set(stableStringify(v), v);
        }
        return [...keyed.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map((entry) => entry[1]);
      })(),
    ),
    executionMetadata: Object.freeze({
      ...(base.executionMetadata ?? {}),
      appliedCount: journalKeys.length,
      anyApplied: journalKeys.some((id) => mergedJournal[id]?.applied === true),
      lastDecisionId: journalKeys[journalKeys.length - 1],
    }),
    complianceDecision: mergedDecision,
    nodes: base.nodes,
  }) as T;
}

export function mergeActionPair(a: ComplianceActionType, b: ComplianceActionType): ComplianceActionType {
  return maxAction(a, b);
}
