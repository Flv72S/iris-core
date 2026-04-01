# SDK / runtime logging (16F.5.FINAL.CERTIFICATION)

Enterprise surface for IRIS logging, replay, and audit snapshots. Built on **16F.1–16F.4.HARDENING** with **deterministic-by-default** paths, a **global canonical snapshot contract** (all equality on normalized snapshots only), **formally defined `replayOrdinal`**, **ADR-003 invariant enforcement**, **traceable invariant coverage** (`SN` | `RT` | `TS`), **strict/relaxed isolation**, and **deep-frozen** outputs.

## Module

`src/sdk/runtime.ts` (+ `src/sdk/errors.ts`, `src/sdk/determinism.ts`, `src/sdk/invariants.ts`)

## Path resolution

All replay/export resolve paths through **`normalizeSdkPaths`** (or legacy shims):

| Mode | Behavior |
|------|----------|
| **`deterministic`** (default when `SdkReplayContext.resolution` is omitted) | `<cwd>/artifacts/logs` + `index.json` — **no `IRIS_*` reads** |
| `default` | **Alias** of `deterministic` |
| `explicit` | `logDir` + `indexPath` — portable, CI-safe |
| `environment` | **`IRIS_LOG_DIR`** / **`IRIS_LOG_INDEX_PATH`** — **opt-in** via `{ resolution: { mode: 'environment' } }` |

`resolveSdkLogDir()` / `resolveSdkIndexPath()` remain aliases for **`{ mode: 'environment' }`**.

## Canonical snapshots — global contract

**Type:** `CanonicalAuditSnapshot = ReturnType<typeof normalizeAuditSnapshot>` (`src/logging/audit.ts`).

**Rules (mandatory for certification):**

- Any snapshot **comparison, validation tie-break, or equality** MUST go through **`normalizeAuditSnapshot(snapshot, 'compare')`** (or **`snapshotsAuditCanonicallyEqual(a, b)`** / **`assertAuditSnapshotsCanonicallyEqual`**, which wrap it).
- Disallowed: raw **`JSON.stringify`** of full snapshots for equality, or deep equality on **non-normalized** snapshot objects.

**Semantics:**

- **`normalizeAuditSnapshot(snapshot, 'export')`:** stable ordering of **`logEntries`** / **`traceability`**, recursive **key ordering** — used on **export** before `stableStringify` to disk.
- **`normalizeAuditSnapshot(snapshot, 'compare')`:** same structural canonicalization **plus** replaces volatile **`generatedAt`** with a fixed marker and normalizes **`indexPath`** separators for **cross-platform logical equality**.
- **`normalizeLogEntriesForAudit` / `normalizeTaggedReplayForAudit`:** used after **replay** so returned rows are canonically ordered and key-sorted; **`assertReplayBitwiseIdentical`** / **`assertReplayTaggedBitwiseIdentical`** normalize before comparing.

Identical logical inputs satisfy **`stableStringify(normalizeAuditSnapshot(S1,'compare')) === stableStringify(normalizeAuditSnapshot(S2,'compare'))`** when only volatile fields differ.

**Invariant:** snapshot equality is defined **only** on **`CanonicalAuditSnapshot`** after **`'compare'`** normalization.

## Audit mode, strict isolation, unsafe replay

- **`auditLevel` / `auditMode` (export):** **`strict`** (default) or **`relaxed`**.
- **`auditMode` on `ValidationReport`:** **`STRICT` | `RELAXED`** (uppercase) — mirrors validation or snapshot `sdkClosure`.
- **`unsafeReplayUsed`:** on report and on snapshot **`sdkClosure.unsafeReplayUsed`** — strict validation **rejects** attestation if **`true`**.
- **Strict replay:** **`indexRecovery: 'archive-scan'` is forbidden** (`STRICT_AUDIT_VIOLATION`). Index/hash chain replay only.
- **Relaxed replay:** **`archive-scan`** allowed **only** with **`unsafeReplay: true`**.
- **Strict validation:** bitwise **gzip** verify when `.json.gz` exists; rejects snapshots emitted under **`sdkClosure.auditMode: RELAXED`** or with **`unsafeReplayUsed: true`**.
- **Relaxed validation:** skips gzip bitwise check; report is still **`valid: true`** when the core payload passes, but **`compliance.enforcementStatus`** remains **`PARTIAL`** and the report includes **`RELAXED_AUDIT_NONCOMPLIANT`** (explicit partial attest).

## Invariant enforcement (`enforceInvariant`)

- **`enforceInvariant(invariantId, context)`** → `{ invariantId, status: 'ENFORCED' | 'VIOLATED', failureMode? }`.
- **`runReplayInvariantSuite`** runs schema, **replayOrdinal uniqueness**, and **correlationId** checks on replay **before** returning frozen results; violations throw **`InvariantViolationError`**.
- **`exportAuditSnapshot`** (logging core) runs the same suite (or accepts **`invariantEnforcement`** override); any **`VIOLATED`** blocks export; results are persisted under **`sdkClosure.invariantEnforcement`**.

ADR-prefixed IDs live in **`ADR003_INVARIANT_IDS`** (`src/sdk/invariants.ts`).

## Snapshot runtime block (ADR-003 SN-only audit)

`AuditSnapshot.runtime` (when present):

- **`state`:** `ACTIVE` | `IDLE` | `DEGRADED` | `FAILED` — derived from log levels and audit flags.
- **`activeComponents` / `activeComponentsList`:** distinct **`runtimeId`** values, sorted; counts must match (validated on snapshot validate).
- **`lastFailedPhase` / `invariantViolations`:** derived deterministically from replayed entries.

Overridable via **`AuditExportOptions.runtime`**.

## Replay contract & formal `replayOrdinal`

**Formal definition (ADR-003 CERT):** given a multiset of log entries **E**, sort **E** deterministically by:

1. **`timestamp`** ascending (lexicographic ISO-UTC string order),
2. **`correlationId`** ascending,
3. **Stable payload key** — lexicographic order of **`stableStringify(entry)`** (total order on duplicates).

For **tagged** replay, ties after (1–3) break on **`(sourceArchive, indexSequence)`** so merged indexes are ordered without filesystem iteration order.

Then **replayOrdinal(e)** is the **1-based index** of **e** in **sorted(E)**.

**Implementation:** pure **`deriveReplayOrdinal(entries: LogEntry[])`** in **`src/logging/stableAudit.ts`** materializes this for bare entry lists (certification/tests). **`replayTaggedEntriesFromIndex`** builds provisional rows, applies **`sortTaggedDeterministically`**, then **`assignFormalReplayOrdinals`** sets **`replayOrdinal = i + 1`** — invariant suite **`enforceReplayOrdinalFormal`** and **`assertReplayOrdinalDeterminism`** enforce the same ordering class.

**Outputs:** deep-frozen; hooks receive **`structuredClone(entry)`**.

## Validation report (certification closure)

`validateAuditSnapshot(path, ctx?)` returns **`ValidationReport`**:

- **`auditMode`**, **`unsafeReplayUsed`** — attest surface for the run.
- **`compliance.adrVersion`** — expected ADR compliance stamp.
- **`compliance.invariantCoverage`** — **`InvariantCoverageEntry[]`**: **`{ id, enforced, evidence: 'SN'|'RT'|'TS', enforcementLocation? }`** — full declaration list from **`ADR003_INVARIANT_DECLARATIONS`** merged with suite/export enforcement (**principle → enforcement → evidence**). **`legacyInvariantCoverageIds`** / **`invariantCoverageDetail`** remain for backward-compatible consumers.
- **Strict validation:** coverage must be **complete** (no missing declaration IDs) and every row must be **`enforced: true`** for **`COMPLETION`/`COMPLETE`** attestation paths where applicable; gaps surface as validation failures.
- **`compliance.enforcementStatus`:** **`COMPLETE`** only for **strict + valid**; **`PARTIAL`** for relaxed success or any failure path.
- **`compliance.failureClassifications`** — string list (primary single classification + trace).
- **`compliance.failureClassification`** — primary enum-style class (includes **`strict_attestation`**).
- **`compliance.invariantEnforcement`** — snapshot closure rows when present.
- **Evidence channels:** **`SN`** — verifiable from persisted snapshot fields (e.g. **traceability**, **hash chain**, **compliance version**); **`RT`** — enforced on replay/export/runtime path before attest; **`TS`** — declared invariant justified by tests/SDK policy only.

**Cross-check:** `validateAuditSnapshot` aligns enforcement results with snapshot content (e.g. **`runtime.invariantViolations`** vs non-compliant **`logEntries`**, no **`VIOLATED`** rows in **`sdkClosure.invariantEnforcement`** on valid strict paths).

## API summary

| Function | Purpose |
|----------|---------|
| `normalizeSdkPaths` | Path resolution. |
| `normalizeAuditSnapshot` | Canonical snapshot for export/compare. |
| `snapshotsAuditCanonicallyEqual` / `assertAuditSnapshotsCanonicallyEqual` | Mandatory equality for snapshots. |
| `deriveReplayOrdinal` | Formal ordinal assignment (pure, entry list). |
| `assertReplayOrdinalDeterminism` | Cert: same logical tagged replay → same ordinals. |
| `buildCertCoverageRows` | Merge declarations + enforcement → coverage rows. |
| `enforceInvariant` | Named invariant check. |
| `createRuntimeLogger` | Logger + `onAfterEmit` (clone). |
| `replayAuditEntries` / `replayAuditTaggedEntries` | Index or relaxed+unsafe archive scan; frozen. |
| `exportAuditSnapshot` | Export + runtime + sdkClosure + invariants. |
| `validateAuditSnapshot` | Full SDK validation report. |
| `assertReplayBitwiseIdentical` / `assertReplayTaggedBitwiseIdentical` | Determinism CI helpers. |
| `deepFreezeSdk` | Deep freeze utility. |

See `docs/logging/16F4-HARDENING.md` and `artifacts/compliance/ADR-003-B-compliance-matrix.json`.
