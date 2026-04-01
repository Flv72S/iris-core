import { executeComplianceDecision } from '../../distributed/cluster_compliance_executor';
import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import type { StoredDecision } from '../persistence/file_store';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function deterministicCounterFromDecisionId(decisionId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < decisionId.length; i++) {
    h ^= decisionId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function sortStoredDecisionsCanonical(entries: readonly StoredDecision[]): readonly StoredDecision[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    const ca = deterministicCounterFromDecisionId(a.decisionId);
    const cb = deterministicCounterFromDecisionId(b.decisionId);
    if (ca !== cb) return ca - cb;
    return a.decisionId.localeCompare(b.decisionId);
  });
  return Object.freeze(copy);
}

export function replayDeterministically(
  initialState: ClusterState,
  entries: readonly StoredDecision[],
): ClusterState {
  const ordered = sortStoredDecisionsCanonical(entries);
  let replayed = deepClone(initialState);
  for (const entry of ordered) {
    const result = executeComplianceDecision(replayed, deepClone(entry.decision), {
      mode: 'STRICT',
      executionTimestamp: entry.executionTimestamp,
    });
    replayed = deepClone(result.mutatedCluster as ClusterState);
  }
  return replayed;
}
