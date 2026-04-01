# Phase 11.7.1 - Compliance Pack

## Purpose

The Compliance Pack is a deterministic, exportable artefact built exclusively from a VerifiedForensicBundle. It structures evidence for AI Act, audit and legal use without interpretation or subjective evaluation.

## Evidence vs claim

- **Compliance evidence:** Facts mechanically derived from the verified bundle (store hash, bundle hash, session id, logical time, trace IDs, navigation stack). The pack contains only such evidence.
- **Compliance claim:** A statement that the system satisfies a norm. The pack does not make claims; it provides structured evidence that auditors or legal teams use to evaluate claims.

## How an auditor uses the pack

1. Obtain a Forensic Export Bundle and verify it via Forensic Import.
2. From the resulting VerifiedForensicBundle, generate a Compliance Pack.
3. Use the pack sections: Determinism, Explainability, Replayability, Audit Trail, Time and Session Integrity.
4. Verify pack integrity with verifyPackHash(pack).
5. Cross-check evidence (e.g. replay the bundle and confirm storeHash and navigation stack match).

## What the pack demonstrates and does not state

- **Demonstrates:** Presence and consistency of hashes, session, logical time, trace IDs and navigation stack derived from the same verified bundle.
- **Does not state:** That the system is compliant with a given regulation or any normative conclusion. Those are for the auditor or legal assessor.

## Components

- CompliancePack, ComplianceSection, ComplianceEvidence (DTOs).
- CompliancePackGenerator: generate(VerifiedForensicBundle) returns CompliancePack.
- CompliancePackSerializer: canonical JSON, UTF-8, SHA-256 packHash, verifyPackHash(pack).

## Constraints

- No inference, no subjective evaluation, no decision logic.
- Evidence is projection only from VerifiedForensicBundle.
- Deterministic: same bundle yields same pack bytes and packHash.
- Read-only: generation does not mutate any store.
