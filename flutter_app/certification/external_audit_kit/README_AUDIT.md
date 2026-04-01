# External Audit Execution Kit

## 1. Purpose

Technical kit for an external auditor to run deterministic verification of the Public Verification Package and related hashes. The kit is offline and self-contained. It does not express normative or evaluative claims.

## 2. Contained Artifacts

- Public Verification Package (reference files to obtain separately)
- Expected hashes (VERIFY_HASHES.txt)
- Verification instructions (EXECUTION_STEPS.txt, README_AUDIT.md)
- Deterministic verification script (scripts/deterministic_verify.sh)

## 3. Execution Context

- Local filesystem only.
- Standard hashing tool (e.g. sha256sum).
- No network access.
- No IRIS runtime dependency.

## 4. Deterministic Verification Flow

1. Extract the kit and the Public Verification Package.
2. Sort package filenames alphabetically.
3. For each file in order: output filename (LF), then file content (LF).
4. Compute SHA-256 of the concatenation (UTF-8).
5. Compare the result to PACKAGE_SHA256 in VERIFY_HASHES.txt.
6. Verify structural hash, scope hash, evidence index hash, audit chain root, and build fingerprint against VERIFY_HASHES.txt.

## 5. Interpretation Boundary

- This kit does not produce certifications.
- This kit does not evaluate conformity or sufficiency.
- This kit verifies only deterministic technical coherence of hashes and package content.
