# State engine (CRDT operational closure) — 16F.6.C.B.2.bis + .ter

This module closes the loop:

```text
Event DAG  →  deterministic linearization  →  frozen key/value State
```

The causal DAG remains the **source of truth** for *what happened*. **Evaluation** defines *what state means* — deterministically, without physical clocks.

---

## State semantics

- **Stored shape:** each operation is a normal `Event` with `type === 'ir.state.op'` and frozen payload `{ op: EventOperation }` (see `state_engine.ts`). Identity and parents stay in the existing `Event` / `EventGraph` pipeline (`hashEvent`, `mergeGraphs`, …).
- **Operational view:** `CrdtEvent` is the microstep contract (`id`, `parents`, `op` only), via `eventToCrdtEvent`.
- **Operations:**
  - `{ type: 'set', key, value }` — `value` must be in the deterministic JSON tree (same constraints as event payloads: no `undefined`, no non-finite numbers, plain objects only, etc.).
  - `{ type: 'delete', key }` — removes the key if present.
- **Materialized state:** `State` is a **frozen** plain object (`Record<string, unknown>`) whose values are deep-frozen deterministic trees. Canonical comparison: `serializeEngineState` (`stableStringify`).

---

## Dominance consistency guarantee (16F.6.C.B.2.ter)

**Definition:** for distinct events `a`, `b`, write **`a` dominates `b`** (`dominates(a, b, graph) === true`) when `a` must be applied **after** `b` in a legal, dominance-consistent evaluation:

- If `b` happens-before `a` (causal), then **`a` dominates `b`** (the successor wins in causal order).
- If concurrent, **`a` dominates `b`** iff `a === resolveConflict(a, b, graph)` (depth + `EventId` per `merge_algebra`; unchanged here).

**Why it matters:** LWW requires that the **last** applied concurrent operation match the declared conflict winner. That must hold for **every** concurrent pair, not only pairwise demos.

**Enforcement:**

1. `topologicalSortDominanceAware` — Kahn’s algorithm with ready-queue order: pop “losing” side first (`compareDominanceEvaluationOrder`: if `a` dominates `b`, `b` comes before `a` in the schedule).
2. `validateDominanceOrdering(orderedEvents, graph)` — for **each** concurrent pair, asserts `index(winner) > index(loser)`; on violation throws `Dominance violation in evaluation ordering`. Invoked only in **strict** evaluation mode (`evaluateGraphStrict` / `validateDominance: true`).
3. Default `evaluateGraph(graph)` skips that check (fast mode) for scalable runtime; semantics of ordering and fold are unchanged.

`resolveConflict` and `mergeGraphs` are **not** modified by this patch; only where validation runs is controlled in `state_engine.ts`.

---

## Ordering model (merge vs evaluation)

| Concern | Ordering | Role |
|--------|-----------|------|
| **Merge** (`mergeGraphs`) | Depth-dominant **insertion** when rebuilding the union DAG | Deterministic graph union; **not** the same as evaluation order. |
| **Evaluation** | `topologicalSortDominanceAware` — dominance-aware Kahn | Produces a linear extension where **losers precede winners** for every concurrent pair (and predecessors before successors causally). |
| **Legacy id list** | `topologicalSortForStateEvaluation` | Returns the same ids as `topologicalSortDominanceAware(...).map(e => e.id)`. |

Merge **scheduling** uses “deeper / larger id first” on ready queues **for insertion**. Evaluation uses the **dual** policy on ready queues so that **winners are applied later** — the only schedule consistent with `resolveConflict` + LWW.

---

## Conflict resolution model

- **Concurrent** events: neither happens-before the other (`areEventDagConcurrent` in `merge_algebra`).
- **Merge** does not rewrite ops; dominance for **state** is entirely in evaluation order + validation.

---

## CRDT guarantees

| Property | Meaning here |
|----------|----------------|
| **Convergence** | Same event multiset and DAG shape ⇒ same `serializeEngineState` after `evaluateGraph`. |
| **Merge invariance** | `evaluateGraph(merge(A,B))` agrees with `evaluateGraph(merge(B,A))` (and associative merge chains), bit-for-bit on serialized state. |
| **Determinism** | No randomness, no wall-clock; only `deterministicCompare` and stable serialization. |
| **Immutability** | Inputs are not mutated; outputs are frozen; `applyEvent` uses structural sharing where keys are unchanged. |
| **Dominance consistency** | Every concurrent pair: `resolveConflict` winner appears strictly after the loser in the evaluation list. |

---

## Formal convergence guarantees

- Formal model and theorem are documented in `docs/distributed/convergence_proof.md`.
- Proof basis:
  - merge is idempotent/commutative/associative on canonical event-id unions,
  - evaluation is deterministic and dominance-consistent,
  - therefore replicas with the same eventual event set converge to identical serialized state.
- Empirical validation:
  - adversarial generator (`tests/utils/adversarial_graph_generator.ts`),
  - seeded deterministic RNG (`tests/utils/seeded_random.ts`),
  - Omega suite (`tests/distributed/convergence_omega.test.ts`) for permutation/merge-order/concurrency/large-graph stress.
- Limitation: guarantees are crash/replay deterministic, not Byzantine-fault tolerant.

---

## Evaluation model

1. `evaluateGraph` asserts every vertex is `ir.state.op`.
2. `topologicalSortDominanceAware` yields event order.
3. Optional dominance verification:
   - `evaluateGraph(graph)` => fast mode (default, no O(N^2) check),
   - `evaluateGraph(graph, { validateDominance: true })` or `evaluateGraphStrict(graph)` => strict mode (`validateDominanceOrdering` ON).
4. Fold with `applyEvent`.

`EVAL_MODE_FAST` / `EVAL_MODE_STRICT` constants are provided for explicit call-site intent.

---

## Limitations

- **Registers:** single-value LWW per key — no multi-value register / OR-set (yet).
- **Op set:** only `set` and `delete`; no built-in counters or maps-as-CRDTs.
- **Event graph:** must be a DAG; cycles are rejected at sort time.

---

## See also

- `event_model.md` — `Event`, `EventGraph`, `happensBefore`.
- `merge_algebra.md` — `mergeGraphs`, `resolveConflict`, `topologicalSortDepthDominant`, `areEventDagConcurrent`.
- `state_model.md` — certified `DistributedState` (separate from this lightweight key/value engine).
