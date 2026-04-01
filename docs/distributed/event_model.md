# Distributed event model (16F.6.A.FORMALIZATION + 16F.6.C.B.1)

## 16F.6.C.B.1 Causal Foundation

This step introduces a deterministic event identity and causal DAG foundation
independent from merge logic.

### Event identity

- Event shape: `Event = { id, type, payload, parents, timestampLogical, actorId? }`
- Canonical serialization:
  - `serializeEvent(event) = stableStringify(canonicalizeEvent(event))`
- Event id derivation:
  - `id = EVT:${sha256(serializeEvent(eventWithoutIdWithDerivedIdPath))}`
- `createEvent` always derives `id`; caller cannot authoritatively provide it.

### Causal DAG

- Nodes are immutable events with explicit parent links.
- Graph invariants:
  - parent ids must exist at insertion time (strict mode)
  - node id must match recomputed deterministic id
  - no cycle is allowed
- `happensBefore(a, b)` is reachability over parent edges.
- `topologicalSort` uses deterministic tie-breaking for globally reproducible traversal.

### Causal Integrity Guarantees

- Parents are treated as a **canonical set**:
  - duplicates removed
  - deterministic ordering enforced
- Self-reference is forbidden:
  - `event.id` cannot appear in `event.parents`
- Event structure is deeply immutable after creation (including parent arrays).
- Graph is defensive:
  - rejects non-canonical events
  - rejects duplicate parents
  - rejects non-deterministically ordered parent lists
  - rejects malformed ids even when builder is bypassed

### Determinism guarantees

- Same logical event input -> same `Event.id`
- Parent ordering permutations do not change id (parents are canonically sorted)
- Same DAG structure -> same deterministic topological order
- Cycles are rejected at insertion boundary

Formal deterministic global input and events for multi-node execution, aligned with **ADR-002** (deterministic execution) and **ADR-003** (verifiable invariants and audit traceability). Compatible with the **16F.5** logging certification stack (`stableStringify`, `canonicalizeKeysDeep`, SHA-256 digests).

## Logical time

A **logical instant** is a value `LogicalTime = { counter: number; nodeId: string }`:

- `counter`: finite integer **≥ 0**; **16F.6.B** adds **`advanceLocalClock`** / **`mergeClocks`** propagation rules (see [causality_model.md](./causality_model.md)).
- `nodeId`: non-empty string; must match the event’s top-level `nodeId` at validation.

**Comparison** `compareLogicalTime(a, b)` is total and deterministic:

1. `counter` ascending  
2. tie-break: `nodeId` lexicographic (`localeCompare`)

**Serialization** for identity and hashing: `serializeLogicalTime(lt)` → `stableStringify` of a key-canonical object (no wall clock, no locale-dependent time parsing).

## Total order on events

`compareDistributedEvents` defines a **strict total order**:

1. `(logicalTime.counter, logicalTime.nodeId)` via `compareLogicalTime`
2. `sequence` (numeric)
3. `eventId` (tie-breaker)

Top-level `nodeId` is **not** an independent sort key; it must equal `logicalTime.nodeId` (enforced in `validateDistributedEvent`).

Properties required for certification: **totality**, **antisymmetry**, **transitivity** (see tests under `tests/distributed/event_model.test.ts`).

**16F.6.B:** `normalizeGlobalInput` sorts events with **`compareEventsCausally`** (causal linear extension, then this total order for concurrent pairs). See [causality_model.md](./causality_model.md).

## Event identity

\[
\texttt{eventId} = \texttt{sha256-}(\text{UTF-8}(\texttt{stableStringify}(\text{canonical body})))
\]

Canonical body fields (sorted keys via `stableStringify`):

- `logicalTime`: `{ counter, nodeId }` after `canonicalizeKeysDeep`
- `nodeId`
- `parentEventIds`: present **only when non-empty** — lexicographically sorted unique ids (see `normalizeParentEventIds` in `parent_refs.ts`)
- `resolvedFrom`: present **only when non-empty** — sorted unique source `eventId`s for a **derived merge** row
- `mergePolicy`: present when stipulated by validation (required whenever `resolvedFrom` is non-empty); **`DistributedMergePolicy`** in `merge_policy.ts` — **object** `{ type, winner, participants }` for new certified merges, or **legacy** string union
- `conflictSetId`: present when stipulated (required for **`iris.merge.resolved`** rows with object **`mergePolicy`**); must equal **`deriveConflictSetId(resolvedFrom)`** — links the row to the materialized **ConflictSet** (ADR-003 traceability)
- `payload`: `canonicalizeKeysDeep(payload)`
- `sequence`
- `type`

Legacy **`parentEventId`** is normalized into **`parentEventIds`** for hashing and identity; it does not appear as its own field in the canonical body.

### Derived merge events

Rows produced by **`mergeConflictSet`** (including via **`mergeConcurrentEvents`**) / **`mergeDeterministicUnion`** use **`type = 'iris.merge.resolved'`**, non-empty **`resolvedFrom`**, and **`mergePolicy`**. They participate in the causal graph via **lineage edges** (each id in `resolvedFrom` → derived event). Sources remain as separate events (non-destructive merge).

### Canonical conflict grouping (16F.6.B.FINAL)

**`buildConflictSets`** (see [causality_model.md](./causality_model.md)) partitions **primitive** events into **conflict sets**: connected components of the graph where edges mean **concurrent** + **overlapping object payload keys**. Sets are **sorted** and **order-independent**. **`mergeDeterministicUnion`** emits **one** derived event per set (with **`resolvedFrom`** listing **all** sources in that set). Rows of type **`iris.merge.resolved`** are **excluded** from conflict detection inside a **single** union pass so merge is **associative** on primitive multisets; chaining unions can add further merges across streams.

## Traceability (optional)

- **`parentEventId?: string`** — single parent (legacy). If **`parentEventIds`** is also set, **`parentEventId` must appear in that array**.
- **`parentEventIds?: string[]`** — **multi-parent DAG**: must not contain duplicates; values are non-empty strings. Canonical form uses **sorted unique** ids.
- **`resolvedFrom?: string[]`** — merge **lineage**; must be **lexicographically sorted**, unique, non-empty strings; must not include **self** `eventId`. When non-empty, **`mergePolicy`** is **required**.
- **`mergePolicy?: DistributedMergePolicy`** — audit field; **forbidden** unless `resolvedFrom` is non-empty. Object form requires **`winner`** ∈ **`participants`** and **`participants`** aligned with **`resolvedFrom`** (sorted).
- **`conflictSetId?: string`** — **forbidden** unless `resolvedFrom` is non-empty; when set, must match **`deriveConflictSetId(resolvedFrom)`**.

`validateEventTraceability` enforces:

- every normalized parent and every **`resolvedFrom`** id exists in the set  
- no self-edge on parents or lineage  
- **global** graph is a **DAG** (no cycles), including lineage edges

## Global input

- **Normalize**: sort node configs by `nodeId`, events by `compareEventsCausally` (causal linear extension), admin rows by `compareLogicalTime` then `type` then stable payload string.
- **Hash**: `digestGlobalInputNormalized` = `sha256-` over `stableStringify` of canonical `{ nodeConfigs, events, adminInputs }`.

## Invariant suite (ADR-003)

`src/distributed/invariants.ts` declares **INV-DIST-001 … INV-DIST-008** with evidence classes `SN` | `RT` | `TS`. `runDistributedInvariantSuite(normalized)` returns:

- per-invariant `OK` | `VIOLATED`
- `InvariantCoverageEntry[]` compatible with SDK ADR-003 coverage rows

`validateNormalizedGlobalInput` runs structural validation, then requires **all** suite rows `OK`.  
`validateNormalizedGlobalInputWithResult` returns `{ valid, errors, invariantCoverage, causalInvariantCoverage }` without throwing on first failure (distributed + causal suites run first so coverage is always populated). See [causality_model.md](./causality_model.md) for **INV-CAUSAL-***.

## Certification

`certifyGlobalInput(input)` (see `global_input_certification.ts`):

1. `normalizeGlobalInput` (validate + normalize)  
2. `digestGlobalInputNormalized`  
3. `runDistributedInvariantSuite` for the returned `invariantCoverage` snapshot

## Canonical equality

`areDistributedEventsCanonicallyEqual` / `assertDistributedEventsCanonicallyEqual` compare only `stableStringify(canonicalizeDistributedEvent(·))` — never raw reference or deep-equal.

**Multiset / set of events:** `areEventSetsCanonicallyEqual(a, b)` canonicalizes each event, sorts by **`eventId`**, then compares **`stableStringify`** of the arrays — used for merge algebra certification and replay checks.

## Module map

| Module | Role |
|--------|------|
| `logical_time.ts` | `LogicalTime`, compare, serialize, assert valid |
| `event_ordering.ts` | `compareDistributedEvents` |
| `event_identity.ts` | `deriveDeterministicEventId` |
| `event_serialization.ts` | Canonical event, serialize, per-event hash |
| `event_equality.ts` | Per-event and multiset canonical equality (`areEventSetsCanonicallyEqual`) |
| `event_validation.ts` | Structural + monotonicity + suite gate |
| `event_traceability.ts` | Parent graph rules |
| `invariants.ts` | INV-DIST-* suite |
| `global_input_certification.ts` | `certifyGlobalInput` |
| `errors.ts` | `DistributedInputValidationError` |
