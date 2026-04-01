# 16F.4 — Audit layer (replay, snapshots, CLI)

Deterministic replay of archived JSONL logs via `index.json`, export of compliance snapshots, and a validator CLI for CI and SDK consumption.

## Module overview

| Symbol | Location | Purpose |
|--------|----------|---------|
| `replayFromIndex` | `src/logging/indexer.ts` | Validate chain (`validateReplayIndex`), read archives in `sequence` order, optional filters, return `LogEntry[]` sorted by `timestamp` then `correlationId`. |
| `ReplayFilters` | `src/logging/indexer.ts` | `{ startTime?, endTime?, invariantIds?, nondeterministicOnly? }` |
| `ReplayIndexError` | `src/logging/indexer.ts` | Thrown when chain/hash/files fail or a line is not a valid log entry. |
| `exportAuditSnapshot` | `src/logging/audit.ts` | Build `AuditSnapshot`, atomically write `artifacts/logs/audit-snapshot-<indexHash>-<filterDigest>.json` (deterministic stem; 16F.4.HARDENING), optional `.json.gz` and `replayLogPath`. |
| `validateAuditSnapshot` | `src/logging/audit.ts` | Programmatic checks: 16F.1 schema, `indexHash`, replay parity, traceability vs `logEntries`. |
| `stableStringify` | `src/logging/audit.ts` | Key-sorted JSON for deterministic hashes. |

## `exportAuditSnapshot` options

- `indexPath` — path to `index.json` (absolute recommended in consuming runtimes).
- `runtimeId` — optional; defaults first entry’s `runtimeId` or index `generatedAt` when logs are empty.
- `filters` — same as `replayFromIndex`; stored on the snapshot as `filters` (`null` when none).
- `outputDir` — defaults to `artifacts/logs` under `cwd`.
- `compress` — write `zlib` gzip next to the JSON snapshot.
- `replayLogPath` — optional atomic write of the replayed array JSON.
- `now` — ISO `generatedAt` only; **filenames do not use wall-clock** (use `deriveSnapshotBasename`).
- `allowOverwrite` — default `false` to enforce append-only snapshot paths; set `true` to replace an existing file.

## Snapshot shape (`AuditSnapshot`)

- `version` — semver (`AUDIT_SNAPSHOT_VERSION`).
- `complianceVersion` — `AUDIT_COMPLIANCE_VERSION` (e.g. `16F.4.1` after HARDENING; aligned with ADR-003-B).
- `signatureStub` — placeholder for future signing (`algorithm` / `signature` / `keyId` all `null`).
- Traceability rows may include `sourceArchive` and `indexSequence` linking to `index.json` segments.
- `generatedAt` — ISO UTC.
- `runtimeId` — correlation scope for the bundle.
- `indexPath`, `indexHash` — chain-of-trust anchor for `index.json` bytes.
- `logEntries` — full filtered replay, sorted.
- `traceability` — rows for entries with `invariantId` and/or `audit.onFailure`.
- `filters` — optional replay filters used when exporting.

## CLI: `iris-audit-validate`

**Usage:** `iris-audit-validate <snapshotPath>`

- Loads JSON, runs `validateAuditSnapshot(snapshot, true)`.
- Prints a report (VALID / INVALID, compliance metadata, invariant summary, errors).
- Exit code **0** if valid, **1** if invalid or missing file.

**Local development:** `npm run audit:validate -- path/to/audit-snapshot-*.json`

**npm link:** `bin/iris-audit-validate.mjs` delegates to `tsx` and `src/logging/cli/audit.ts`.

## Safety properties

- Snapshot, gzip, and replay outputs use **temp file + `fsync` + atomic `rename`** (16F.4.HARDENING).
- Replay refuses broken `sequence` / `prevHash` / missing files / content `hash` mismatches, and re-checks chain per file before parsing.
- Validator recomputes `indexHash`, re-validates the index chain, and re-runs `replayFromIndex` with stored filters to match `logEntries`.

**Hardening details:** `docs/logging/16F4-HARDENING.md`.

## Tests

See `tests/logging/audit.replay.test.ts`, `audit.snapshot.test.ts`, `audit.cli.test.ts` and their `*.spec.ts` entrypoints. Regression coverage remains in `schema`, `logger`, `rotation`, `retention`, and `indexer` tests.
