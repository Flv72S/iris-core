# Deterministic State Model (16F.6.C.FINAL)

This module defines how IRIS distributed replicated state is represented, validated,
normalized, canonicalized, serialized, hashed, and snapshotted.

The design is deterministic, order-invariant after canonicalization, replayable, and
audit-grade. It is intended to be used as a foundation for the distributed execution
engine (16F.6.C), and must integrate with:

- 16F.5 audit-grade canonical serialization and hashing (`stableStringify`)
- 16F.6.A deterministic input representation
- 16F.6.B causality and merge algebra (conflict sets and derived lineage)

## Formal Definition

State is represented as:

`State = { version, objects }`

with:

- `version: { hash, eventCount }`
- `objects: Record<string, StateObject>`

`DistributedState` is immutable and declarative: it contains only data (no functions,
no class instances, no hidden runtime state).

## Deterministic Value Domain (Strict)

All state payload values must be within `DeterministicValue`:

- `string | number | boolean | null`
- `readonly DeterministicValue[]`
- `{ readonly [key: string]: DeterministicValue }`

Forbidden:

- `undefined`
- `NaN`, `Infinity`, `-Infinity`
- `Date`, `Map`, `Set`, class instances
- functions, closures
- non-plain object prototypes
- circular references

## Canonicalization Rules

`canonicalizeState(state)`:

- excludes `state.version` entirely from the canonical form used for hashing/equality
- sorts object keys deterministically
- canonicalizes payload values recursively into the deterministic domain
- returns a fully canonical form (`CanonicalState`)

Key invariant: for any two states `a` and `b` with identical canonical objects,

`stableStringify(canonicalizeState(a)) === stableStringify(canonicalizeState(b))`

## Serialization (Canonical Only)

Serialization is *canonical only*:

`serializeState(state) = stableStringify(canonicalizeState(state))`

No other serializers are permitted.

## Formal Pipeline

State
  → Normalize (validation only)
  → Canonicalize (single source of truth)
  → Serialize
  → Hash (derivative only)

## Strict Separation

| Layer        | Responsibility |
| ------------ | -------------- |
| `normalize`  | validation + immutable cloning (no canonical sorting) |
| `canonicalize` | deterministic ordering + payload canonicalization |
| `serialize` | canonical representation (`stableStringify`) |
| `hash` | fingerprint only (`STATE:${sha256(serializeState)}`) |

## Invariant Guarantees (Formal)

1. **normalizeState idempotency**: `normalizeState(normalizeState(state))` is stable under deterministic deep comparison.
2. **canonicalizeState structural idempotency**: `canonicalizeState(canonicalizeState(state))` is deeply stable.
3. **Normalization preserves semantics**:
   - `serializeState(state) === serializeState(normalizeState(state))`
   - `hashState(state) === hashState(normalizeState(state))`
4. **Canonical structural purity**: `canonicalizeState(state)` produces new objects and is deeply equal across calls.
5. **cloneState test-only**: `cloneState` is forbidden in production (`NODE_ENV=production`) and must not be used in execution paths.
6. **Snapshot determinism is global**: all snapshot metadata arrays are explicitly sorted deterministically before snapshot creation.
7. **No reference reuse across layers**: there must be no shared object/array references between `state`, `normalizeState(state)`, and `canonicalizeState(state)`.

## Formal Closure Guarantees

1. **Canonicalization is a fixed-point function**:
   - `canonicalizeState(canonicalizeState(state))` is structurally equal to `canonicalizeState(state)`.
2. **Canonical representation is unique**:
   - if `serializeState(a) === serializeState(b)`, then `canonicalizeState(a)` and `canonicalizeState(b)` are deeply equal.
3. **Historical insertion artifacts are erased**:
   - insertion order of objects/payload keys cannot affect canonical structure.
4. **Snapshot metadata is recursively deterministic**:
   - metadata objects are key-sorted recursively and metadata arrays are recursively canonicalized + deterministically sorted.
5. **State equality is equivalent to canonical equality**:
   - equality is defined by canonical serialization (`serializeState`), not by hash authority.

## Deterministic Comparator Guarantees

- A single comparator (`deterministicCompare`) defines total deterministic ordering over canonical space.
- Comparator equality is explicit:
  - `deterministicCompare(a, b) === 0` iff canonical serializations are identical.
- Sorting is collision-safe:
  - no ambiguity when `stableStringify(a) === stableStringify(b)`.
- Sorting is engine-independent:
  - no inline ad-hoc comparators; all ordering in the state model uses `deterministicCompare`.
- Repeated sorts are stable and permutation-invariant under equivalent inputs.

## Hashing Rules

`hashState(state)` is a pure derivative of canonical serialization:

`hashState(state) = STATE:${sha256(serializeState(state))}`

Hash never acts as an authority; it fingerprints canonical serialization only.

## Normalization Boundary

`normalizeState(state)`:

1. validates deterministic compliance and structural correctness
2. creates an immutable clone (no canonical sorting / no payload re-shaping)
3. derives a deterministic `version.hash` after hashing
4. returns a structurally immutable state (deep freeze)

Normalization produces a safe deterministic state suitable for replay and audit.

## Equality Semantics

`areStatesCanonicallyEqual(a, b)` is based on canonical serialization only:

`serializeState(a) === serializeState(b)`

Reference identity and runtime object identity are ignored.

## Integration Notes (Causality, Merge, Audit)

- 16F.6.B produces derived events (`iris.merge.resolved`) with conflict lineage.
- Conflict-set traceability provides stable lineage for audit.
- This state model is merge-safe: payload structures are deterministic and merge-algebra
  safe (shallow object shapes preferred).

When the execution layer folds events into state, the resulting `DistributedState`
must be normalized through this module before:

- hashing / audit snapshotting
- replay parity checks
- convergence-safe comparisons

