/**
 * 16F.6.A.FORMALIZATION + 16F.6.B + HARDENING — Multi-parent DAG traceability (audit-traceable).
 * 16F.6.B.CLOSURE — Lineage (`resolvedFrom`) edges in cycle detection and ancestors.
 */
import { computeDescendants } from './causal_graph';

import type { DistributedEvent } from './global_input';
import { DistributedInputValidationError } from './errors';
import { normalizeParentEventIds } from './parent_refs';

/** Structural causal predecessors: normalized parents ∪ `resolvedFrom` sources (unique, sorted). */
export function causalPredecessorIdsForEvent(e: DistributedEvent): readonly string[] {
  const parents = normalizeParentEventIds(e);
  const rf = e.resolvedFrom ?? [];
  return Object.freeze([...new Set([...parents, ...rf])].sort((a, b) => a.localeCompare(b)));
}

/**
 * Validates all normalized parents and `resolvedFrom` sources exist in the set, no self-edge, graph is a DAG.
 */
export function validateEventTraceability(events: readonly DistributedEvent[]): void {
  const byId = new Map(events.map((e) => [e.eventId, e] as const));

  for (const e of events) {
    let parents: readonly string[];
    try {
      parents = normalizeParentEventIds(e);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new DistributedInputValidationError(`traceability: ${msg}`, [`eventId=${e.eventId}`]);
    }
    for (const p of parents) {
      if (p === e.eventId) {
        throw new DistributedInputValidationError(
          `traceability: self-reference (eventId ${e.eventId})`,
          [`parent=${p}`],
        );
      }
      if (!byId.has(p)) {
        throw new DistributedInputValidationError(
          `traceability: parentEventId not found in event set: ${p}`,
          [`eventId=${e.eventId}`, `parentEventId=${p}`],
        );
      }
    }

    const rf = e.resolvedFrom;
    if (rf !== undefined) {
      for (const r of rf) {
        if (r === e.eventId) {
          throw new DistributedInputValidationError(
            `traceability: self-reference in resolvedFrom (eventId ${e.eventId})`,
            [`resolvedFrom=${r}`],
          );
        }
        if (!byId.has(r)) {
          throw new DistributedInputValidationError(
            `traceability: resolvedFrom id not found in event set: ${r}`,
            [`eventId=${e.eventId}`],
          );
        }
      }
    }
  }

  const visiting = new Set<string>();
  const finished = new Set<string>();

  function visit(u: string): void {
    if (finished.has(u)) return;
    if (visiting.has(u)) {
      throw new DistributedInputValidationError(
        `traceability: cycle detected involving ${JSON.stringify(u)}`,
      );
    }
    visiting.add(u);
    const ev = byId.get(u);
    if (ev !== undefined) {
      for (const p of causalPredecessorIdsForEvent(ev)) {
        visit(p);
      }
    }
    visiting.delete(u);
    finished.add(u);
  }

  for (const e of [...events].sort((a, b) => a.eventId.localeCompare(b.eventId))) {
    visit(e.eventId);
  }
}

/** All transitive causal predecessors (parents + merge sources), lexicographically sorted. */
export function getEventAncestors(eventId: string, events: readonly DistributedEvent[]): readonly string[] {
  const byId = new Map(events.map((e) => [e.eventId, e] as const));
  const root = byId.get(eventId);
  if (root === undefined) {
    return Object.freeze([]);
  }

  const acc = new Set<string>();
  const stack = [...causalPredecessorIdsForEvent(root)].reverse();
  while (stack.length > 0) {
    const p = stack.pop()!;
    if (acc.has(p)) continue;
    acc.add(p);
    const pe = byId.get(p);
    if (pe !== undefined) {
      stack.push(...[...causalPredecessorIdsForEvent(pe)].reverse());
    }
  }
  return Object.freeze([...acc].sort((a, b) => a.localeCompare(b)));
}

/** All events causally reachable from `eventId` (same graph as {@link buildCausalGraph}). */
export function getEventDescendants(eventId: string, events: readonly DistributedEvent[]): readonly string[] {
  const desc = computeDescendants(events);
  const set = desc.get(eventId) ?? new Set<string>();
  return Object.freeze([...set].sort((a, b) => a.localeCompare(b)));
}
