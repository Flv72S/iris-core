# Causality model (16F.6.B + HARDENING + CLOSURE + FINAL + CERTIFICATION)

Deterministic **happens-before**, **multi-parent DAG** construction, causal linear extensions, **concurrency classification**, **materialized conflict sets** (audit ids), **associative non-destructive merge** with **lineage** (`resolvedFrom`, `mergePolicy`, `conflictSetId`), and **commutative stream merge** — aligned with **ADR-002** and **ADR-003**.

See also: [event_model.md](./event_model.md) (logical time, identity, global input).

## Logical clock propagation

In `logical_time.ts`:

- **`advanceLocalClock(prev)`** — `counter := prev.counter + 1`, `nodeId` unchanged (local tick).
- **`mergeClocks(local, remote)`** — `counter := max(local.counter, remote.counter) + 1`, `nodeId` is the **local** identity (receive rule).

No wall clock; all values are explicit integers on nodes.

## Happens-before (`causality.ts`)

`happensBefore(a, b, events)` is true iff there is a directed path in the causal graph built from `events`:

1. **Same node:** events with the same `nodeId` are chained by **strictly increasing `sequence`** (consecutive pairs in sequence-sorted order get edges `eᵢ → eᵢ₊₁`).
2. **Parents:** for each id in **normalized** `parentEventIds` (and legacy `parentEventId`), edge `parent → child`.
3. **Merge lineage:** for each id in **`resolvedFrom`**, edge **source → merged event** (same audit role as a causal predecessor).
4. **Transitive closure** is the reachability relation of the union of those edges.

`assertCausalReplaySafe(events)` requires that for every `i < j`, **not** `happensBefore(events[j], events[i])`.

## Concurrency and classification

- **`areConcurrent(a, b, events)`** — true iff not `happensBefore(a,b)` and not `happensBefore(b,a)` (distinct events).
- **`classifyEventRelation` / `classifyEventRelationFromDesc`** — **`BEFORE` | `AFTER` | `CONCURRENT` | `EQUAL`**.

## Logical conflict domain (`payload_domain.ts`)

**`payloadsOverlap(a, b)`** — for plain objects only, true when some **own enumerable key** appears in both payloads.

**`mergeObjectPayloadsConcurrent(winner, loser)`** — two-way merge (backward compat).

**`mergeObjectPayloadsGroup(events, compareDistributedEvents)`** — for each key in the lexicographic union of object keys, if all values agree (`stableStringify`), keep one; otherwise the value from the **maximum** holder under `compareDistributedEvents` wins for that key.

### `resolveConcurrentEvents(a, b, events)`

Returns a **single** winning event (no new row). Used for semantic “who wins” outside the merge engine.

## Canonical conflict sets (`conflict_sets.ts`)

**`ConflictSet`** — `{ eventIds: string[] }` with ids **sorted lexicographically**.

**`buildConflictSets(events, descendants)`** — deterministic grouping **independent of input order**:

- Build an undirected graph on **primitive** events only (see below): an edge exists between two events iff they are **concurrent** and **`payloadsOverlap`** on object payloads.
- **Connected components** with **≥ 2** vertices become conflict sets; each set’s `eventIds` are sorted; the list of sets is sorted by **first** `eventId`.

### `mergeConflictSet(members, contextEvents)` (`causal_graph.ts`, re-exported from `causality.ts`)

**Group merge (replaces pairwise loops):** one derived **`iris.merge.resolved`** row for the whole conflict set:

- **`resolvedFrom`:** **all** source `eventId`s, sorted  
- **`mergePolicy`:** `classifyMergePolicy(globalWinner, secondPlace)` where globals are **max** / **second** under `compareDistributedEvents` on `members`  
- **`payload`:** `mergeObjectPayloadsGroup`  
- **`parentEventIds`:** union of normalized parents across `members`  
- **`logicalTime` / `nodeId` / `sequence`:** from global winner; `sequence` = next on that node in `contextEvents`

### `mergeConcurrentEvents(a, b, contextEvents)`

Delegates to **`mergeConflictSet([a, b], contextEvents)`** (backward compatible).

### Primitive-only conflict detection (`causal_graph.ts`)

**`mergeDeterministicUnion`** builds conflict sets only on events whose **`type` ≠ `iris.merge.resolved`**. Derived rows do **not** participate in new conflict edges in the same union pass. This yields **associative** union on multisets of primitive events and avoids ambiguous pairwise ordering. A **second** call to **`mergeDeterministicUnion`** (e.g. merging another stream into an already-merged bundle) can still add new merges among **new** primitives.

Identity (`deriveDeterministicEventId`) and canonical serialization **include** `resolvedFrom` and `mergePolicy` when present.

## Merge policy (`merge_policy.ts`)

```ts
type MergePolicy =
  | 'CAUSAL_PRIORITY'
  | 'LOGICAL_TIME'
  | 'NODE_ID'
  | 'EVENT_ID';
```

**Default tie-break** for concurrent pairs matches `compareDistributedEvents`: differing **`logicalTime.counter`** → `LOGICAL_TIME`; same counter, differing **`nodeId`** → `NODE_ID`; then **`sequence`** (still labeled `LOGICAL_TIME`); finally **`EVENT_ID`**. `CAUSAL_PRIORITY` is reserved for causal dominance (not used for purely concurrent pairwise merge).

## Causal graph (`causal_graph.ts`)

- **`buildCausalGraph(events)`** — adds edges for same-node sequence, **all** normalized parents, and **each `resolvedFrom` id → child**.
- **`computeDescendants(events)`** — reachability for HB / `compareEventsCausally`.
- **`mergeDeterministicUnion(A, B)`** — union by `eventId` (canonical equality); **one round** of conflict processing: **`buildConflictSets`** on primitives → for each set without an existing derived row with the same `resolvedFrom`, append **`mergeConflictSet`**. **Sources are never removed.** Final causal sort via **`compareEventsCausally`**.

## Causal ordering × `event_ordering.ts`

**`compareEventsCausally`** — HB / concurrent, then `compareDistributedEvents` tie-break.

**Normalization** (`normalizeGlobalInput`) sorts events with `compareEventsCausally` after `computeDescendants` on the canonicalized list.

## Merge semantics (`logical_clock.ts`)

**`mergeEventStreams(eventsA, eventsB)`** — `mergeDeterministicUnion` + full validation and invariant suites (distributed + causal).

## Traceability (`event_traceability.ts`)

- **`causalPredecessorIdsForEvent(e)`** — `normalizeParentEventIds(e) ∪ resolvedFrom(e)` (unique, sorted). Used for **DAG checks** and **`getEventAncestors`**.
- **`validateEventTraceability`** — parents and `resolvedFrom` targets exist; no self-reference; global **DAG**.
- **`getEventAncestors` / `getEventDescendants`** — as in the causal graph above.

## Parent normalization (`parent_refs.ts`)

**`normalizeParentEventIds(event)`** — legacy + multi-parent, sorted unique; strict validation (no dupes, no empty strings in array).

## Causal invariants (`causal_invariants.ts`)

| Id | Description |
|----|-------------|
| INV-CAUSAL-001 | No causal cycles (DAG) |
| INV-CAUSAL-002 | Parents **and** `resolvedFrom` sources strictly before child in stream |
| INV-CAUSAL-003 | Happens-before consistent with stream + `compareEventsCausally` monotonicity |
| INV-CAUSAL-004 | Logical time non-decreasing per `nodeId` along stream |
| INV-CAUSAL-005 | Merge commutativity (split test via `mergeDeterministicUnion`) |
| INV-CAUSAL-006 | Multi-parent integrity |
| INV-CAUSAL-007 | Concurrency classification symmetric |
| INV-CAUSAL-008 | `resolveConcurrentEvents` stable |
| INV-CAUSAL-009 | Merge closure (idempotent on merged output) |
| INV-CAUSAL-010 | Every `resolvedFrom` id names an existing row |
| INV-CAUSAL-011 | `mergeConcurrentEvents` deterministic for the same inputs |
| INV-CAUSAL-012 | Lineage shape: sorted unique `resolvedFrom`, `mergePolicy` pairing, merge type has ≥2 sources |
| INV-CAUSAL-013 | Merge algebra: associativity (bounded `mergeDeterministicUnion` on multiset) |
| INV-CAUSAL-014 | Merge algebra: commutativity (same as split commutativity check) |
| INV-CAUSAL-015 | Merge algebra: idempotency (`merge(merge(S),[])`) |
| INV-CAUSAL-016 | `buildConflictSets` identical for 100 deterministic permutations (bounded n, primitive filter) |
| INV-CAUSAL-017 | Formal associativity: `mergeEventSets(A ∪ B ∪ C) === mergeEventSets(mergeEventSets(A ∪ B) ∪ C)` (bounded) |
| INV-CAUSAL-018 | Formal commutativity: `mergeEventSets(A ∪ B) === mergeEventSets(B ∪ A)` |
| INV-CAUSAL-019 | Formal idempotency: `mergeEventSets(A ∪ A) === mergeEventSets(A)` |
| INV-CAUSAL-020 | **ConflictSet traceability:** certified merge rows have **`conflictSetId`**, matching **`deriveConflictSetId(resolvedFrom)`**, one derived row per id |
| INV-CAUSAL-021 | **MergePolicy completeness:** object form — **`winner ∈ participants`**, **`participants`** match **`resolvedFrom`** sorted |

## Merge algebra (FINAL + CERTIFICATION)

On multisets of **primitive** events, **`mergeDeterministicUnion`** / **`mergeEventSets`** satisfy:

- **Commutativity** and **idempotency** (INV-005 / INV-009 / INV-014 / INV-015; formal INV-018 / INV-019).
- **Associativity** (INV-013 on union; formal **INV-017** on **`mergeEventSets`**).

**Canonical grouping** (INV-016): **`buildConflictSets`** is order-invariant for a fixed multiset.

## Validation integration

- **`validateNormalizedGlobalInput`** — structural body, **INV-DIST-***, **INV-CAUSAL-***.
- **`validateCausalConsistency(normalized)`** — per-event `validateDistributedEvent`, **`validateEventTraceability`**, **`assertCausalReplaySafe`**, causal suite (including **013–016** algebra / grouping checks where applicable); `{ valid, causalInvariantCoverage, structuralErrors? }`.
- **`validateNormalizedGlobalInputWithResult`** — distributed + causal coverage rows.

## Module map

| Module | Role |
|--------|------|
| `causality.ts` | HB, concurrency, `resolveConcurrentEvents`, re-exports merge API + policy types |
| `conflict_sets.ts` | `ConflictSet`, `deriveConflictSetId`, `buildConflictSets` |
| `merge_policy.ts` | `MergePolicy` (object), `LegacyMergePolicy`, `classifyMergePolicyForSet` |
| `merge_algebra.ts` | `mergeEventSets`, `mergeDeterministicUnion`, `mergeConflictSet`, `mergeConcurrentEvents`, `IRIS_MERGE_RESOLVED_EVENT_TYPE` re-export |
| `payload_domain.ts` | `payloadsOverlap`, `mergeObjectPayloadsGroup`, two-way merge |
| `parent_refs.ts` | Parent id normalization |
| `causal_graph.ts` | `buildCausalGraph`, `computeDescendants`, `IRIS_MERGE_RESOLVED_EVENT_TYPE` |
| `causal_invariants.ts` | INV-CAUSAL-001 … 021 |
| `logical_clock.ts` | `mergeEventStreams` |
| `event_equality.ts` | `areEventSetsCanonicallyEqual` (multiset canonical compare) |
