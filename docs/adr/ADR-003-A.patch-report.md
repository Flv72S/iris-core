# ADR-003.A Patch Report — 10-Point Deterministic Upgrade

## Scope

- Repository: `iris-sim`
- Objective: upgrade runtime invariants infrastructure from partially-verifiable to deterministic/audit-ready where technically possible, without breaking APIs.

---

## Section-by-Section Implementation

## 1) Snapshot Model Patch

Target requested: `iris-sim/src/observability/types.ts`  
Actual type source in repo: `iris-sim/src/observability/observability_contract.ts`

Implemented:

- `runtime.activeComponentsList?: string[]`
- `runtime.lastInitPhase?: string`
- `runtime.lastInitPhaseStatus?: 'OK' | 'FAILED'`
- `runtime.lastInitErrorPhase?: string`
- `federation.domainsRegistered?: string[]`

Compatibility:

- All fields optional -> no breaking change.
- JSON-safe types only.

---

## 2) Snapshot Build Patch

Target requested: `iris-sim/src/iris_node.ts`  
Actual file: `iris-sim/src/sdk/iris_node.ts`

Implemented in `buildObservabilitySnapshot()`:

- `runtime.activeComponentsList` from deterministic sort of `activeComponents` set.
- federation domains in snapshot via `domainsRegistered` (sorted).
- if sync federation block is absent, a minimal federation block is emitted when runtime domains are known:
  - `domainId: 'local'`
  - `peersByDomain: {}`
  - `rejectedByPolicy: 0`
  - `domainsRegistered: ['local', ...]`

Notes:

- Domain source is internal runtime registration (`runtimeDomainsRegistered`) populated at convergence bootstrap.

---

## 3) Init Phase Trace (INV-014 Fix)

File: `iris-sim/src/sdk/iris_node.ts`

Implemented in `runInitPhase(phase, fn)`:

- before run: `lastInitPhase = phase`
- on success:
  - `lastInitPhaseStatus = 'OK'`
  - `lastInitErrorPhase = undefined`
- on failure:
  - `lastInitPhaseStatus = 'FAILED'`
  - `lastInitErrorPhase = phase`

Also reset at boot start (`start()`):

- `lastInitPhase = undefined`
- `lastInitPhaseStatus = undefined`
- `lastInitErrorPhase = undefined`

---

## 4) Normalization Function (INV-003 Fix)

New file: `iris-sim/src/observability/normalize_snapshot.ts`

Added:

- `normalizeSnapshot(s: IrisObservabilitySnapshot): Record<string, unknown>`

Behavior:

- removes volatile metrics:
  - `runtime.boot.time`
  - `runtime.init.phase.duration`
  - `node_uptime_seconds`
- removes metrics timestamp
- preserves deterministic runtime core:
  - `runtime.state`
  - `runtime.errors`
  - `runtime.activeComponents`
  - `runtime.activeComponentsList` (sorted)
  - `lastInitPhase*`
- preserves federation deterministically:
  - `federationEnabled` boolean
  - federation block with `domainsRegistered` sorted
- keeps `transport/gossip/crdt` blocks for convergence comparison

---

## 5) Metric State Mapping (INV-001 Fix)

File: `iris-sim/src/observability/observability_invariants.ts`

Implemented:

- official mapping:
  - `INITIALIZING -> 0.5`
  - `RUNNING -> 1`
  - `STOPPING -> 0`
  - `STOPPED -> 0`
  - `ERROR -> 0`
- new function:
  - `assertStateConsistency(snapshot): boolean`
- integrated in validator:
  - adds `runtime.state gauge mismatch` on inconsistency

---

## 6) Deterministic Persistence (INV-012 Fix)

File: `iris-sim/src/observability/observability_persist.ts`

Implemented:

- `isDeterministicSnapshot(snapshot): boolean`
  - sanitize twice
  - stringify twice
  - compare string outputs
- `writeObservabilitySnapshot` now fails if non-deterministic sanitized output is detected.

Also strengthened sanitization:

- deterministic sorting for:
  - `federation.peersByDomain`
  - `federation.domainsRegistered`
  - `runtime.activeComponentsList`
- runtime block now persisted explicitly (state/errors/components + phase trace fields)

---

## 7) Stop Snapshot (INV-005 Fix)

File: `iris-sim/src/sdk/iris_node.ts`

Implemented:

- new helper: `writeFinalObservabilitySnapshot()`
- `stop()` now writes final snapshot after:
  - `state = STOPPED`
  - `runtimeState = 'STOPPED'`

Additional cleanup alignment:

- `runtimeDomainsRegistered.clear()` during stop finalization

Compatibility/safety:

- write is best-effort; failures are swallowed to keep stop resilient.

---

## 8) Federation Invariant Split (INV-009 Fix)

Runtime implementation support added:

- snapshot now carries `federation.domainsRegistered` deterministic list.

Documentation update:

- `docs/adr/ADR-003-A-invariants.md` updated with split:
  - `INV-009a` config-based
  - `INV-009b` snapshot-based (`domainsRegistered`)

No config subsystem changes were made (as requested).

---

## 9) CRDT Invariant Reclassification (INV-006)

No runtime logic changed (as requested).

Documentation updated in `ADR-003-A-invariants.md`:

- INV-006 explicitly marked as `TS_CONTROLLED; non deterministic runtime-wide`.

---

## 10) Classification Preparation

New file: `iris-sim/src/observability/invariant_classification.ts`

Added:

- `InvariantVerificationClass` union:
  - `SN_DETERMINISTIC`
  - `RT_DETERMINISTIC`
  - `TS_CONTROLLED`
  - `NON_DETERMINISTIC`
- `RUNTIME_INVARIANT_CLASSIFICATION` map (`INV-001`..`INV-020`)

Purpose:

- base data layer for ADR-003.B generation, without introducing ADR-003.B now.

---

## Files Modified

- `iris-sim/src/observability/observability_contract.ts`
- `iris-sim/src/sdk/iris_node.ts`
- `iris-sim/src/observability/observability_invariants.ts`
- `iris-sim/src/observability/observability_persist.ts`
- `iris-sim/src/observability/index.ts`
- `iris-sim/src/runtime/tests/runtime_convergence.test.ts`
- `docs/adr/ADR-003-A-invariants.md`

## Files Added

- `iris-sim/src/observability/normalize_snapshot.ts`
- `iris-sim/src/observability/invariant_classification.ts`
- `docs/adr/ADR-003-A.patch-report.md`

---

## Validation Checklist Results

1. Snapshot contains new runtime/federation fields:
   - `activeComponentsList` ✅
   - `domainsRegistered` ✅
   - init phase trace fields (`lastInitPhase*`) ✅
2. `normalizeSnapshot` deterministic/reusable: ✅
3. `stop()` emits post-stop snapshot: ✅
4. Breaking changes: none detected (optional fields only): ✅
5. TypeScript compile: ✅ (`npm run build`)

Runtime tests:

- `dist/runtime/tests/runtime_convergence.test.js`: ✅ pass after normalization update

---

## Invariants Resolved vs Still Limited

Resolved/strengthened:

- INV-001: state<->gauge consistency check added.
- INV-003: canonical reusable normalizer introduced.
- INV-004: active component list surfaced deterministically.
- INV-005: post-stop snapshot emitted.
- INV-009b: snapshot evidence via `domainsRegistered`.
- INV-012: deterministic snapshot check added to write path.
- INV-014: init phase trace persisted.

Still limited by design:

- INV-006 remains `TS_CONTROLLED` / non-deterministic runtime-wide (network/timing dependent).
- Mapping `STOPPING|STOPPED|ERROR -> gauge=0` is intentionally non-injective; string state remains primary discriminator.

---

## Constraint Compliance

- No public API break: maintained.
- Retrocompatibility: maintained through optional additions.
- JSON serialization: maintained.
- Deterministic ordering: applied to new arrays and key records in persistence path.
- No destructive refactors: patch-level incremental edits only.

