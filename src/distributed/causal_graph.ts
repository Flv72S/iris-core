/**
 * 16F.6.B — Deterministic causal DAG over distributed events (ADR-002/ADR-003).
 * 16F.6.B.HARDENING — Multi-parent edges.
 * 16F.6.B.CLOSURE — Non-destructive merge + lineage (`resolvedFrom`).
 * 16F.6.B.FINAL — Canonical conflict sets + group merge (`mergeConflictSet`).
 * 16F.6.B.CERTIFICATION — Merge operators live in `merge_algebra.ts` (no import cycle).
 */
import type { DistributedEvent } from './global_input';
import { normalizeParentEventIds } from './parent_refs';

export const IRIS_MERGE_RESOLVED_EVENT_TYPE = 'iris.merge.resolved';

export type { ConflictSet } from './conflict_sets';
export { buildConflictSets } from './conflict_sets';

export type CausalGraph = {
  nodes: Map<string, DistributedEvent>;
  /** Direct edges: parent eventId → child eventId (same-node sequence chain + parent links + lineage). */
  edges: Map<string, Set<string>>;
};

/**
 * Builds a DAG: consecutive same-node events (by `sequence`), normalized parent → child,
 * and each `resolvedFrom` id → merged event.
 */
export function buildCausalGraph(events: readonly DistributedEvent[]): CausalGraph {
  const nodes = new Map(
    [...events]
      .map((e) => [e.eventId, e] as const)
      .sort((a, b) => a[0].localeCompare(b[0])),
  );

  const edges = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string): void => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)!.add(to);
  };

  const byNode = new Map<string, DistributedEvent[]>();
  for (const e of events) {
    if (!byNode.has(e.nodeId)) byNode.set(e.nodeId, []);
    byNode.get(e.nodeId)!.push(e);
  }

  const nodeKeys = [...byNode.keys()].sort((a, b) => a.localeCompare(b));
  for (const nk of nodeKeys) {
    const list = byNode.get(nk)!;
    const s = [...list].sort((a, b) => a.sequence - b.sequence || a.eventId.localeCompare(b.eventId));
    for (let i = 1; i < s.length; i++) {
      addEdge(s[i - 1]!.eventId, s[i]!.eventId);
    }
  }

  for (const e of [...events].sort((a, b) => a.eventId.localeCompare(b.eventId))) {
    for (const p of normalizeParentEventIds(e)) {
      addEdge(p, e.eventId);
    }
    const rf = e.resolvedFrom ?? [];
    for (const r of [...rf].sort((a, b) => a.localeCompare(b))) {
      addEdge(r, e.eventId);
    }
  }

  return { nodes, edges };
}

/** Transitive descendants per eventId (for happens-before / causal compare). */
export function computeDescendants(events: readonly DistributedEvent[]): Map<string, Set<string>> {
  const { edges } = buildCausalGraph(events);
  const allIds = [...new Set(events.map((e) => e.eventId))].sort((a, b) => a.localeCompare(b));
  const desc = new Map<string, Set<string>>();

  for (const id of allIds) {
    const seen = new Set<string>();
    const stack = [...(edges.get(id) ?? new Set()).values()].sort((a, b) => a.localeCompare(b));
    while (stack.length > 0) {
      const v = stack.pop()!;
      if (seen.has(v)) continue;
      seen.add(v);
      const next = [...(edges.get(v) ?? new Set()).values()].sort((a, b) => b.localeCompare(a));
      for (const w of next) {
        if (!seen.has(w)) stack.push(w);
      }
    }
    desc.set(id, seen);
  }

  return desc;
}
