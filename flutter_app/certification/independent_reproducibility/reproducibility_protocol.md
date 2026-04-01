# Independent Reproducibility Verification Protocol

## 1. Purpose

Technical procedure for an independent party to verify the Public Verification Package and related artifacts. The procedure is deterministic and offline. It does not express normative or evaluative claims.

## 2. Required Inputs

- Public Certification Manifest
- Core Structural Hash
- Certification Scope Hash
- Evidence Index Hash
- Freeze Seal
- Audit Chain Root
- Reproducible Build Fingerprint
- Binary Provenance
- Core Certification Snapshot

## 3. Deterministic Reconstruction Procedure

1. Acquire the Public Verification Package (all listed files).
2. Sort filenames alphabetically.
3. For each file in that order: concatenate filename (LF), then file content (LF).
4. Compute SHA-256 of the full concatenation (UTF-8).
5. Compare the result to the expected PACKAGE_SHA256 value.
6. Verify structural hash, scope hash, evidence index hash, and audit chain root against expected_hashes.txt.

## 4. Expected Outputs

- PACKAGE_SHA256 identical to the value in expected_hashes.txt.
- Structural hash unchanged from expected.
- Evidence chain hashes match expected.
- Freeze snapshot hashes match expected.

## 5. Failure Conditions

- Hash mismatch: computed hash differs from expected.
- Missing file: a required file is absent.
- Non-canonical order: files not ordered alphabetically by filename.
- Content divergence: file content not byte-identical to reference.

## 6. Reproducibility Properties (Technical)

- Determinism: same inputs yield same hash.
- Environment-independent: no clock, network, or environment variables.
- Offline-verifiable: no external services.
- Artifact immutability: inputs are fixed references.
