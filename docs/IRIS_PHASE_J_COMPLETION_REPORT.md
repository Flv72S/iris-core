# IRIS — Phase J Completion Report
## Persistence, Replay & Forensic Architecture

---

## 1. Executive Summary

Phase J introduces a **deterministic persistence, replay and forensic stack** for IRIS, without modifying Core or introducing non-deterministic behaviour. It provides:

- **Deterministic persistence** — Records are stored by content hash; no overwrites; idempotent saves.
- **Hash-based immutability** — Canonical serialization and SHA-256 hashing for all persisted models (J2).
- **Tamper detection** — Integrity verification (J5) reconciles filename hash with recomputed content hash and reports mismatches.
- **Replay engine** — Full execution can be re-run from persisted snapshot and result compared to recomputed result (J6).
- **Time travel debugging** — Step-by-step timeline (snapshot → pre-execution → post-execution → final result) with deterministic flag (J7).
- **Forensic package generation** — Deterministic audit bundle: manifest, ordered records, package hash; export to directory with stable manifest and record files (J8).

All components depend only on ports (PersistencePort, VerifiablePersistencePort, ExecutionOrchestratorPort); the reference implementation uses a file-system adapter (J4) with hash-indexed, append-only storage.

---

## 2. Architectural Overview

### J1 — Persistence Contract Layer

Definition of **ports** only: no implementation, no infrastructure.

- **PersistencePort** — Aggregates: SnapshotStorePort, EventStorePort, ExecutionResultStorePort, GuardReportStorePort.
- **VerifiablePersistencePort** (J5) — Extends PersistencePort with: list hashes by record type, get raw record content for verification.
- Stores expose save/load/delete (where applicable) and get-by-executionId where needed; no business logic in contracts.

### J2 — Persistent Record Model

Versioned, immutable, serializable models used only for persistence:

- **PersistedGovernanceSnapshot** — executionId, schemaVersion, governanceHash, lifecycleHash, governanceData, lifecycleData, logicalTimestamp.
- **PersistedExecutionResult** — executionId, schemaVersion, resultHash, resultData, logicalTimestamp.
- **PersistedObservabilityEvent** — executionId, eventId, eventType, payload, logicalTimestamp, eventHash, schemaVersion.
- **PersistedGuardReport** — executionId, schemaVersion, compliant, violations, guardHash, logicalTimestamp.
- **PersistedFailureEvent** (adapter-level) — For failure records where supported.

All expose `toMap()` and `fromMap()` for canonical serialization; no real timestamps or UUIDs in the model.

### J3 — Deterministic Hash Engine

- **DeterministicHashEngine** — Canonical key ordering, stable serialization, string hashing.
- **Sha256DeterministicHashEngine** — SHA-256 over canonical representation; same input ⇒ same hash across runs and instances.
- Used for: content hashes, record identity, manifest and package hashes.

### J4 — FileSystem Persistence Adapter

- Implements **VerifiablePersistencePort** (and thus PersistencePort).
- **Append-only, hash-indexed** storage: one file per record, path `{base}/{subdir}/{hash}.record`.
- Subdirs: snapshots, results, events, failures, guards.
- Idempotent save: no overwrite if file exists; load by executionId via directory scan and filter.
- No dependency on IRIS Core; only J2 models and J3 engine.

### J5 — Integrity Verification Layer

- **IntegrityVerifier** — Takes VerifiablePersistencePort and DeterministicHashEngine; read-only.
- **verifyAll()** / **verifyByType()** — For each stored hash: read raw content, recompute hash from body, compare to filename and content hash.
- **IntegrityReport** — totalRecordsChecked, validRecords, corruptedRecords, missingFiles, mismatchedHash, violations list.
- **IntegrityViolation** — recordType, hashFromFilename, hashFromContent, recomputedHash, violationType (FILE_MISSING, HASH_MISMATCH_*, CORRUPTED_FORMAT), details.
- No repair; no write to existing files.

### J6 — Replay Engine

- **ReplayEngine** — PersistencePort, DeterministicHashEngine, ExecutionOrchestratorPort.
- **replayExecution(executionId)** — Load snapshot and persisted result; run orchestrator.execute(snapshot); compare original result hash to recomputed result hash.
- **ReplayResult** — executionId, replaySuccessful, originalHash, recomputedHash, differences (ReplayDifference: fieldName, originalValue, recomputedValue, differenceType).
- Difference types: HASH_MISMATCH, FIELD_MISMATCH, MISSING_RECORD, CORRUPTED_RECORD.
- No disk write; deterministic.

### J7 — Time Travel Debug Layer

- **TimeTravelEngine** — PersistencePort, DeterministicHashEngine, ExecutionOrchestratorPort.
- **buildTimeline(executionId)** — Builds ReplayTimeline: steps (ReplayStep: stepIndex, stepType, inputState, outputState, stateHash, matchesPersistedState, differences), deterministic flag, finalOriginalHash, finalRecomputedHash.
- Step types: INITIAL_SNAPSHOT, PRE_EXECUTION, POST_EXECUTION, FINAL_RESULT.
- **replayUntil(executionId, stepIndex)** — Replay up to a given step for inspection.
- Read-only; no file creation or modification.

### J8 — Forensic Export & Audit Package Generator

- **ForensicExportService** — PersistencePort, DeterministicHashEngine, IntegrityVerifier, TimeTravelEngine (interfaces only).
- **generatePackage(executionId)** — Runs integrity verification, builds timeline, loads all records for execution, orders by type then hash, builds manifest and package hash; returns immutable **ForensicPackage** (executionId, integrityReport, replayTimeline, records, packageHash, integrityValid, replayDeterministic, manifest).
- **ForensicManifest** — executionId, totalRecords, recordHashes (ordered), integrityStatus, replayStatus, manifestHash.
- **ForensicRecord** — recordType, recordHash, schemaVersion, canonicalContent.
- **exportToDirectory(executionId, targetDirectory)** — Writes deterministic manifest.txt and records/{hash}.record (UTF-8); no compression; no timestamps in content.
- integrityValid = (report.violations.isEmpty); replayDeterministic = timeline.deterministic.

---

## 3. Deterministic Guarantees

- **No real timestamps** — Only logical timestamps from the execution model; no system clock in persisted data or hashes.
- **No UUIDs** — Identifiers are executionId and content-derived hashes.
- **No non-deterministic serialization** — Canonical key order and stable encoding (e.g. deterministic hash engine and toMap/fromMap).
- **Stable hashes** — Same input ⇒ same hash across runs and engine instances.
- **Stable ordering** — Records in forensic package and export ordered by type then record hash; manifest and package hash reproducible.
- **Reproducible replay** — Same snapshot and orchestrator ⇒ same recomputed result; replay success/failure and differences are deterministic.

---

## 4. Security & Audit Properties

- **Tamper detection** — Integrity verifier detects content change (recomputed hash ≠ filename/content hash) and reports violation types.
- **Hash verification** — Every stored record can be checked against its filename and body; violations listed in IntegrityReport.
- **Forensic export** — Deterministic bundle (manifest + record files) for external audit; package hash and manifest hash allow verification without runtime access.
- **Replay validation** — Replay engine confirms that re-execution matches persisted result or reports differences.
- **Deterministic timeline** — Time travel layer provides a step-by-step view and a single deterministic flag for the full execution.

---

## 5. Limitations (Deliberate)

- **No encryption** — Persisted data and forensic export are not encrypted.
- **No digital signature** — No signing of manifest or package; integrity is hash-based only.
- **No database** — Reference storage is file-based; no SQL or external DB.
- **No advanced concurrency** — Single process / single writer assumptions; no distributed locking.
- **No distribution** — No built-in remote transfer or replication; export is local directory.

These limits keep Phase J focused on deterministic persistence, replay and forensic packaging; they can be addressed in a later phase.

---

## 6. Next Phase Recommendation

**Phase K — Real Infrastructure Binding (proposed)**

- **Digital signature and notarization** — Sign manifest and package hash; optional notarization service.
- **Encryption layer** — Optional encryption at rest and in export for sensitive environments.
- **Remote audit verification** — Transfer of forensic bundle and verification of package hash/manifest without access to original runtime.

Phase J remains unchanged; Phase K would add optional layers on top of the existing ports and forensic export.

---

## 7. Validation Status

- **End-to-end tests** — Package `phasej.e2e`; `PhaseJEndToEndTest`:
  - Full flow: setup (J1–J8 components), execution, persistence (snapshot, result, events, guard), integrity (verifyAll), replay (replayExecution), timeline (buildTimeline), forensic (generatePackage), deterministic re-run (same packageHash, manifestHash, record count).
  - Tampering: alter persisted file → integrity mismatch, replay fails (replaySuccessful false), forensic package integrityValid false.
  - Missing snapshot: delete snapshot → replay MISSING_RECORD, package reflects incomplete state (no snapshot record).
- **Persistence and Phase J unit tests** — J4 adapter, J3 hash engine, J5 integrity verifier, J6 replay engine, J7 time travel engine, J8 forensic export service; all passing.
- **No Core changes** — Phase J does not modify IRIS Core.
- **No cyclic dependencies** — Persistence and forensic packages depend only on ports and J2/J3.

Phase J is **formally closed** with all tests green and this completion report generated.
