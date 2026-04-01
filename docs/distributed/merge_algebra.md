# Merge algebra (distributed)

IRIS defines two related merge surfaces:

1. **Multiset merge over `DistributedEvent`** — `mergeEventSets`, `mergeDeterministicUnion`, `mergeConflictSet` (payload overlap, conflict sets, `iris.merge.resolved` rows). See `causality_model.md` and ADR-003.
2. **Causal DAG merge over `Event` / `EventGraph`** — **16F.6.C.B.2** — bitwise-convergent union of replica graphs without wall-clock resolution.

This document focuses on (2).

---

## Merge algebra guarantees (EventGraph)

| Property        | Meaning |
|----------------|---------|
| **Idempotent** | Canonical serialization of `mergeGraphs(G, G)` equals that of `G`. |
| **Commutative** | `mergeGraphs(A, B)` and `mergeGraphs(B, A)` yield the same `serializeEventGraph` output. |
| **Associative** | `mergeGraphs(mergeGraphs(A, B), C)` and `mergeGraphs(A, mergeGraphs(B, C))` yield the same canonical serialization. |
| **Deterministic** | Same operand graphs → same union map, same insertion schedule, same frozen nodes — no randomness, no `Date.now`, no locale-dependent ordering. |

All ordering uses `deterministicCompare` from the deterministic state/value layer.

---

## Conflict model (concurrent events)

For `EventId` nodes `a` and `b` in an `EventGraph` `G`:

- **Concurrent** iff `a ≠ b`, `¬happensBefore(a, b, G)`, and `¬happensBefore(b, a, G)` (`areEventDagConcurrent`).

There is **no reliance on physical time**: `timestampLogical` is part of the hashed payload but does **not** drive conflict resolution in this layer.

---

## Resolution strategy

**`resolveConflict(a, b, graph)`** is **total** and **pure**:

1. Greater **causal depth** wins (`computeDepth` — longest parent chain in `graph`, roots at depth 0, memoized).
2. If depths tie, **lexicographically larger `Event.id`** wins (`deterministicCompare`).

The loser is **not removed** from the graph. Resolution defines a **dominance order** used for canonical linear extensions, not deletion.

**`topologicalSortDepthDominant`** is Kahn topological traversal with the same tie-break among ready nodes (deeper first, then larger id), so concurrent peers get a stable, replayable ordering.

---

## Graph merge algorithm (`mergeGraphs`)

1. **Union** — Collect events from both graphs by `EventId`. If the same id appears twice, bodies must serialize identically; otherwise `DistributedInputValidationError`.
2. **Rebuild** — Insert into a fresh `EventGraph` in **topological** order derived only from parent pointers in that union (`topologicalInsertionOrderFromEventMap`), with the same depth-dominant ready-queue policy.
3. **Conflicts** — Concurrent events remain in the DAG; dominance is expressed through deterministic sort order, not edge rewriting.

**`serializeEventGraph`** produces a canonical audit string: sorted ids, each event as `serializeEvent`.

---

## Convergence proof sketch

- **State**: The merged replica state is the **set of events** (vertices) with fixed parent edges, all `Event` values frozen and id-derived.
- **Merge** is **set union with consistency check** plus **one deterministic linear extension schedule** for insertion. No merge introduces new ids unless you extend the algorithm later; repeated merge is the same union.
- **Idempotence**: `G ⊔ G = G` (no new events, identical insertion product).
- **Commutativity / associativity**: Union of finite sets is commutative and associative; duplicate ids are reconciled by equality of canonical serialization; topological scheduling is a **pure function** of that union set.
- Therefore any binary tree sequence of merges converges to the **unique** canonical graph view for a given multiset of replica graphs — CRDT-style **join-semilattice** behavior on the encoded (serialized) state.

---

## API (Event DAG layer)

| Export | Role |
|--------|------|
| `mergeGraphs` | Binary merge of two `EventGraph` instances. |
| `serializeEventGraph` | Canonical string for equality / audits. |
| `computeDepth` | Memoized max-chain depth from parents in a graph. |
| `areEventDagConcurrent` | Predicate for concurrency in the DAG sense. |
| `resolveConflict` | Depth-then-id winner for two `Event` nodes in a graph. |
| `topologicalSortDepthDominant` | Deterministic topo order with depth/id tie-break. |

`resolveConflict` requires the **`EventGraph` context** so parent chains (and depths) are well-defined on the merged DAG.

---

## See also

- `event_model.md` — `Event`, `EventGraph`, `happensBefore`, base `topologicalSort`.
- `state_model.md` — `deterministicCompare`, deterministic value domain.
- `causality_model.md` — `DistributedEvent` merge algebra and conflict sets.
