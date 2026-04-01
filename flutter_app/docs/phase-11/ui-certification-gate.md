# Phase 11.8.1 — UI Certification Gate

## Enforcement vs evidence

- **Evidence:** The Compliance Pack and Forensic Bundle provide structured, verifiable evidence (hashes, session, logical time, navigation stack). They do not by themselves grant or deny access.
- **Enforcement:** The UI Certification Gate uses that evidence to decide at runtime whether the UI may be shown. No verified pack → gate closed → only the deterministic failure screen is visible. This turns compliance from passive documentation into an active access control.

## Why the UI must be gated

The UI is the user-facing surface of IRIS. If it could run without a verified Compliance Pack, an auditor could not rely on “what the user saw” being backed by a reproducible, hash-verified chain (bundle → pack). Gating ensures:

- Every rendered UI session is backed by a Verified Forensic Bundle and a Compliance Pack that references it.
- Tampering (e.g. altered pack hash or bundle/pack mismatch) closes the gate and shows a forensic-safe failure screen instead of normal UI.
- The boundary between “compliant run” and “non-compliant run” is explicit and deterministic.

## Deterministic trust boundary

The gate is a pure function of two inputs: `VerifiedForensicBundle?` and `CompliancePack?`. The verification order is fixed:

1. Bundle null → closedMissingBundle  
2. Pack null → closedInvalidPack  
3. Pack hash invalid (verifyPackHash false) → closedInvalidPack  
4. Pack’s generatedFromBundleHash ≠ bundle’s verifiedHash → closedHashMismatch  
5. Otherwise → open  

No network, no randomness, no mutable state. Same inputs always yield the same `CertificationGateResult`. The widget layer only reads this result: if open, it shows the child; if closed, it shows `CertificationFailureScreen` with state, hashes and reason.

## Relation to forensic bundle and compliance pack

- **Forensic bundle:** Export of the append-only persistence log; verified by import (hash, schema, records, replay). Produces `VerifiedForensicBundle`.
- **Compliance pack:** Generated from `VerifiedForensicBundle`; contains evidence sections and a pack hash. Integrity checked by `CompliancePackSerializer.verifyPackHash`.
- **Certification gate:** Consumes the same verified bundle and pack. Ensures the pack is valid and tied to that bundle (generatedFromBundleHash == bundle.verifiedHash), then allows or blocks UI. Replay integrity is preserved because the bundle (and thus the pack derived from it) is the single source of truth for the session.

## Components

- **CertificationGateState:** enum (open, closedInvalidPack, closedHashMismatch, closedMissingBundle).
- **CertificationGateResult:** immutable DTO (state, bundleHash?, packHash?, reason?).
- **verifyCertificationGate(bundle, pack):** pure function returning CertificationGateResult.
- **CertificationGateController:** read-only wrapper holding result; `isOpen` getter.
- **CertificationGate:** StatelessWidget; if open shows child, else shows CertificationFailureScreen.
- **CertificationFailureScreen:** static screen showing state, hashes and reason; no animation, no system time; forensic-safe.
