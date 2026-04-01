# Convergence Proof Sketch — 16F.6.C.B.2.Omega

This note gives the formal model and proof sketch backing IRIS convergence for the distributed state engine.

## 1) System model

- Let `E` be the finite set of events in an `EventGraph`.
- Let `->` be the parent-edge relation (`p -> e` when `p` is in `e.parents`).
- The graph is a DAG by construction (`EventGraph.addEvent` + cycle checks).
- `happensBefore(a, b)` holds iff there is a directed path `a ->* b`.
- Concurrency:
  - `a || b` iff `a != b`, `!happensBefore(a,b)`, and `!happensBefore(b,a)`.
- Dominance:
  - `dominates(a, b, G)` iff:
    1) `b` happens-before `a`, or
    2) `a || b` and `resolveConflict(a,b,G) = a`.

For concurrent pairs, `resolveConflict` is total/deterministic (depth, then `EventId`).

## 2) Merge algebra properties

Using `mergeGraphs`:

- **Idempotency**: `merge(G, G) = G` (same `eventId` set, duplicate bodies must match, rebuild from same union).
- **Commutativity**: `merge(A, B) = merge(B, A)` because union by `eventId` is commutative and reconstruction is deterministic from that union.
- **Associativity**: `merge(A, merge(B, C)) = merge(merge(A, B), C)` because set union is associative and reconstruction is a pure function of the final union.

In tests, equality is checked via canonical serialization (`serializeEventGraph`), which is the relevant observable state.

## 3) Evaluation determinism

`evaluateGraph` computes:

1. `ordered = topologicalSortDominanceAware(G)`
2. optionally `validateDominanceOrdering(ordered, G)` when `evaluateGraph(G, { validateDominance: true })` or `evaluateGraphStrict(G)` (tests, audits, stress)
3. left-fold `applyEvent` over `ordered`

Default production path omits step 2 for performance; Ω tests and stress tooling use strict mode so dominance consistency remains empirically verified.

Determinism holds because:

- topological scheduling is deterministic (no randomness, deterministic comparator),
- `applyEvent` is pure and immutable,
- state serialization is canonical (`serializeEngineState`).

Dominance consistency is enforced:

- For every concurrent pair `(a,b)`, winner `w = resolveConflict(a,b,G)` satisfies `index(w) > index(loser)` in `ordered`.

Hence LWW semantics aligns with declared conflict winner.

## 4) Convergence theorem

**Theorem (Replica convergence).**
For replicas `R1..Rn` containing the same eventual event set (possibly received in different orders), repeated merge and evaluation produce identical final state.

**Justification.**

1. Any merge schedule converges to the same merged graph serialization (idempotent, commutative, associative).
2. Evaluation is deterministic for that graph.
3. Therefore all replicas produce the same serialized state.

So for any two replicas `Ri`, `Rj`:

- `serializeEngineState(evaluateGraph(merge*(Ri))) = serializeEngineState(evaluateGraph(merge*(Rj)))`

when `merge*` denotes any complete merge schedule over the shared event set.

## 5) Empirical adversarial coverage

The Omega suite (`tests/distributed/convergence_omega.test.ts`) validates:

- multi-replica convergence under merge permutations,
- permutation invariance over valid topological orders,
- merge-order chaos (nested and reordered merges),
- high-concurrency conflict storms,
- deep chain vs concurrent override,
- delete/set adversarial mixes,
- repeated self-merge idempotency,
- large graphs (1k, 5k, 10k events),
- dominance checks on evaluated graphs,
- serialization stability across reruns.

All failures include reproducible context (`seed`, graph size, and test-specific identifiers).

## 6) Limitations

- No Byzantine/faulty node model.
- No wall-clock semantics (intended).
- Single-value LWW register semantics only (`set`/`delete`), not MV-registers or OR-sets.
