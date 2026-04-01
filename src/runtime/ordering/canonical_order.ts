import { deriveComplianceDecisionId } from '../../distributed/cluster_compliance_executor';
import { sha256Canonical } from '../ops/deterministic_utils';
import type { RuntimeDecision } from '../execution/decision_types';

export function sortDecisionsCanonical(decisions: readonly RuntimeDecision[]): readonly RuntimeDecision[] {
  const copy = [...decisions];
  copy.sort((a, b) => {
    const byCounter = a.logicalClock.counter - b.logicalClock.counter;
    if (byCounter !== 0) return byCounter;
    const byNode = a.logicalClock.nodeId.localeCompare(b.logicalClock.nodeId);
    if (byNode !== 0) return byNode;
    const bySequence = (a.sequence ?? 0) - (b.sequence ?? 0);
    if (bySequence !== 0) return bySequence;
    const ida = deriveComplianceDecisionId(a.decision);
    const idb = deriveComplianceDecisionId(b.decision);
    const byDecisionId = ida.localeCompare(idb);
    if (byDecisionId !== 0) return byDecisionId;
    const ha = sha256Canonical(a.decision);
    const hb = sha256Canonical(b.decision);
    return ha.localeCompare(hb);
  });
  return Object.freeze(copy);
}
