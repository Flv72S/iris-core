import { computeStateHash } from './state_inspector';

export interface ConvergenceReport {
  readonly converged: boolean;
  readonly hashes: Readonly<Record<string, string>>;
  readonly dimension?: Readonly<{
    hash: boolean;
    journal: boolean;
    actions: boolean;
    decision: boolean;
  }>;
}

export function checkConvergence(statesByNode: Readonly<Record<string, unknown>>): ConvergenceReport {
  const hashes: Record<string, string> = {};
  for (const nodeId of Object.keys(statesByNode).sort()) {
    hashes[nodeId] = computeStateHash(statesByNode[nodeId]);
  }
  const uniq = new Set(Object.values(hashes));
  return Object.freeze({
    converged: uniq.size <= 1,
    hashes: Object.freeze(hashes),
  });
}

export function checkConvergenceByHash(hashesByNode: Readonly<Record<string, string>>): ConvergenceReport {
  const hashes: Record<string, string> = {};
  for (const nodeId of Object.keys(hashesByNode).sort()) {
    hashes[nodeId] = hashesByNode[nodeId]!;
  }
  const uniq = new Set(Object.values(hashes));
  return Object.freeze({
    converged: uniq.size <= 1,
    hashes: Object.freeze(hashes),
  });
}

export interface RuntimeSnapshotLike {
  readonly nodeId: string;
  readonly stateHash: string;
  readonly executionJournalIds: readonly string[];
  readonly executedActions: readonly string[];
  readonly lastDecisionId: string | null;
}

function canonicalSet(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function equalSets(a: readonly string[], b: readonly string[]): boolean {
  const ca = canonicalSet(a);
  const cb = canonicalSet(b);
  return JSON.stringify(ca) === JSON.stringify(cb);
}

export function checkStrongConvergence(snapshots: readonly RuntimeSnapshotLike[]): ConvergenceReport {
  const sorted = [...snapshots].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const hashes: Record<string, string> = {};
  for (const s of sorted) hashes[s.nodeId] = s.stateHash;
  const first = sorted[0];
  const hashSet = new Set(sorted.map((s) => s.stateHash));
  const journalOk = first === undefined ? true : sorted.every((s) => equalSets(s.executionJournalIds, first.executionJournalIds));
  const actionOk = first === undefined ? true : sorted.every((s) => equalSets(s.executedActions, first.executedActions));
  const decisionSet = new Set(sorted.map((s) => String(s.lastDecisionId ?? '')));
  const dimension = Object.freeze({
    hash: hashSet.size <= 1,
    journal: journalOk,
    actions: actionOk,
    decision: decisionSet.size <= 1,
  });
  return Object.freeze({
    converged: dimension.hash && dimension.journal && dimension.actions && dimension.decision,
    hashes: Object.freeze(hashes),
    dimension,
  });
}
