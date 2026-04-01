# 16F.4.HARDENING — Enterprise audit layer hardening

This pass tightens **determinism**, **tamper-evidence**, **crash-safety**, and **ADR-003-B alignment** while keeping the public API of **16F.1 → 16F.4** stable.

## Compliance version

- `AUDIT_COMPLIANCE_VERSION` is **`16F.4.1`**, referenced alongside the ADR-003-B matrix (`artifacts/compliance/ADR-003-B-compliance-matrix.json`, `versioning.complianceVersion`).

## Replay (`indexer.ts`)

1. **Full index check** — `validateReplayIndex()` runs first (sequence, `prevHash`, file presence, content `hash`).
2. **Per-archive gate** — Before parsing lines, each segment is verified with `assertArchiveTrustedBeforeReplay()`:
   - `file.prevHash` must match the running chain tip.
   - File bytes must match `file.hash` (single read; lines parsed from that buffer).
3. **16F.1** — Each line is validated with `validateLogEntry`.
4. **Provenance** — `replayTaggedEntriesFromIndex()` yields `ReplayTaggedEntry[]` (`entry`, `sourceArchive`, `indexSequence`, **`replayOrdinal`**) for compliance traceability and tertiary sort order (**16F.5.CLOSURE**).
5. **Formal `replayOrdinal` (16F.5.FINAL.CERTIFICATION)** — **Mathematically:** sort all filtered rows by **`timestamp` → `correlationId` → `stableStringify(entry)`**, then tie-break **`(sourceArchive, indexSequence)`**; **`replayOrdinal`** is the **1-based position** in that sorted list. **Implementation:** rows are collected with a provisional line-global counter, then **`sortTaggedDeterministically`** + **`assignFormalReplayOrdinals`** reassign **`replayOrdinal = i + 1`**, matching **`deriveReplayOrdinal`** on the entry multiset modulo provenance ties. Same logical index + filters ⇒ identical ordinal sequence; not dependent on filesystem directory order. Lexical **`archive-scan`** (unsafe) uses sorted filenames + the same final sort/assign pass.
6. **Filters / order** — Same `ReplayFilters` as before; **returned** order is the formal sort above (**`replayOrdinal`** is consistent with that total order).
7. **`replayFromIndex`** — Unchanged signature; implemented as tagged replay mapped to entries.

## Snapshots (`audit.ts`)

| Mechanism | Behavior |
|-----------|----------|
| **Filename** | `deriveSnapshotBasename(indexHash, filters)` — deterministic from **index hash** + **stable filter digest**; **no wall-clock** in the stem. |
| **Atomic + durable write** | `writeAtomicDurable()` — temp file, `fsyncSync` on temp FD, `renameSync`, optional `fsyncSync` on final path (platform-dependent durability). |
| **Append-only** | Default **`allowOverwrite: false`**: existing snapshot / gzip / replay target → `AuditExportError`. Opt in with `allowOverwrite: true`. |
| **`indexHash`** | SHA-256 over raw `index.json` UTF-8 (prefix `sha256-`), same as 16F.3.HARDENING. |
| **Traceability** | Rows link `invariantId` / `onFailure` to **`sourceArchive`** and **`indexSequence`** when exported from tagged replay. Legacy rows (no provenance) still validate via `buildTraceabilityFromEntries`. |
| **`signatureStub`** | `{ algorithm: null, signature: null, keyId: null }` on each export; reserved for future signing. Wrong shape fails validation. |
| **Gzip** | Canonical **RFC 1952** member: **mtime 0**, **OS 255**, `deflateRawSync` with fixed **level** (`AUDIT_GZIP_LEVEL` = 6), **memLevel** 8, **strategy** default; **CRC-32** trailer. Same UTF-8 JSON body → **identical `.gz` bytes** across platforms (same Node/zlib). SDK **strict** validation recomputes gzip from the on-disk `.json` bytes; **`auditLevel: relaxed`** skips bitwise gzip verification. |
| **Canonical snapshot object** | `normalizeAuditSnapshot(snapshot, 'export')` runs before durable JSON write: sorted **`logEntries`** / **`traceability`**, recursive key order — so on-disk snapshots are **comparable** and **bitwise stable** for a fixed `deterministicGeneratedAt`. **`runtime`** + **`sdkClosure`** (`auditMode`, `unsafeReplayUsed`, **`invariantEnforcement`**) are part of the persisted bundle for ADR-003 closure. |

## Canonical audit snapshot (16F.5.FINAL.CERTIFICATION)

- **`CanonicalAuditSnapshot`** — `ReturnType<typeof normalizeAuditSnapshot>`. All **equality and cross-run comparison** for attestation MUST use **`normalizeAuditSnapshot(..., 'compare')`** (or **`snapshotsAuditCanonicallyEqual`** / SDK **`assertAuditSnapshotsCanonicallyEqual`**). Raw snapshot object equality or unnormalized **`JSON.stringify`** comparisons are **out of contract** for certification.
- **Audit self-sufficiency:** **`SN`**-class invariants must surface in snapshot fields (traceability, chain metadata, compliance version). When invariants fail, **`runtime.invariantViolations`** and **`logEntries`** / closure rows must **not** contradict each other — **`validateAuditSnapshot`** cross-checks enforcement vs evidence.

## Invariant traceability model

- Each declared invariant in **`ADR003_INVARIANT_DECLARATIONS`** maps to **`InvariantCoverageEntry`**: **`id`**, **`enforced`** (bool after suites/export), **`evidence`** **`SN` | `RT` | `TS`**, optional **`enforcementLocation`** (runtime function/module).
- **`runReplayInvariantSuite` / `runExportInvariantSuite`** return **`{ enforcement, coverage }`**; **`ValidationReport.compliance.invariantCoverage`** is the **full structured list** (no implicit-only invariants). **Strict** validation rejects **coverage gaps** or **`enforced: false`** where certification requires complete attestation.

## Validation & CLI

- `validateAuditSnapshot()` returns a report with **`VALID` / `INVALID` on the first line**, then sections:
  - **Index integrity** — presence, chain, hash match.
  - **Per-entry validation (16F.1)** — counts and schema errors.
  - **Traceability** — row count and parity with replay (tagged or legacy).
  - **Compliance / snapshot** — metadata and invariant summary.
- `iris-audit-validate` / `npm run audit:validate` — unchanged usage; richer stdout.

## SDK defaults (16F.5.FINAL)

- **Replay/export default:** **`deterministic`** paths (`<cwd>/artifacts/logs`) — no implicit `IRIS_*`.
- **Archive recovery:** `archive-scan` requires **`unsafeReplay: true`** on `SdkReplayContext` — see `docs/sdk/runtime.md`.

## Tests

- `tests/logging/audit.hardening.test.ts` (+ `.spec.ts`) — compliance version, basename, overwrite policy, `fsync`, traceability provenance, gzip determinism, replay determinism / chain tamper, `signatureStub`, durable append-only.
- `tests/sdk/runtime.*.test.ts` — deterministic default, strict vs relaxed validation, unsafe replay gating, `replayOrdinal` assertions.

## Usage snippets

```typescript
import { exportAuditSnapshot, deriveSnapshotBasename, AUDIT_COMPLIANCE_VERSION } from './src/logging/audit';
import { replayTaggedEntriesFromIndex } from './src/logging/indexer';

// Tagged replay for custom tooling
const tagged = replayTaggedEntriesFromIndex('artifacts/logs/index.json', { invariantIds: ['INV-001'] });

// Snapshot (deterministic path; replace only when intended)
exportAuditSnapshot({
  indexPath: 'artifacts/logs/index.json',
  outputDir: 'artifacts/logs',
  allowOverwrite: true, // only if re-emitting same logical bundle
});
```

See also: `docs/logging/16F4-audit-layer.md` (overview) and ADR-003-B docs for matrix semantics (`onFailure`, degradation policy).
