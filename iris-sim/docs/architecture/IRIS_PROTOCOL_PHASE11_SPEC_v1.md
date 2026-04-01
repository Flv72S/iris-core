# IRIS Protocol — Phase 11: Trust Governance Architecture

## Full Technical Documentation

This document describes the **Trust Governance Layer** of the IRIS Protocol as implemented in Phase 11. It is intended for protocol documentation, security audit, architecture review, whitepaper drafting, and developer onboarding.

---

# 1 — Phase 11 Overview

## Purpose of Phase 11 in IRIS Protocol

Phase 11 implements the **Trust Governance Layer** of the IRIS Protocol. Its purpose is to evaluate and attest trust across federated organizations in a deterministic, auditable way.

### Role of Trust Governance

- **Multi-organization trust management**: Nodes from different organizations participate in a federation. Phase 11 evaluates how much each node can be trusted based on declared trust, observed SLA behaviour, and verified identity attestation.
- **Deterministic governance architecture**: All evaluations are deterministic and stateless. Given the same inputs (node metadata, trust scores, SLA consensus, node records, trust anchors), the system produces identical trust indices, proofs, reports, and certificates.
- **Why trust evaluation is necessary**: In federated systems, nodes may self-declare metrics or have varying levels of compliance. Phase 11 combines self-declared trust with **observed** (SLA consensus) and **verified** (certificate attestation) components so that no single source can alone determine a node’s trust index. This reduces the impact of manipulation and supports governance decisions (e.g. certificate eligibility, risk forecasting).

### Integration with Previous Phases

Phase 11 builds on:

- **Federated Node Registry (Phase 11B)**: Supplies node metadata and node identity commitments.
- **Node Consensus Engine (Phase 11A)**: Supplies consensus results used for SLA alignment checks.
- **SLA Trust Weighting (Phase 11C.2)**: Supplies `NodeTrustScore` (declared trust).
- **SLA Consensus Verification (Phase 11C.3)**: Supplies `SLAConsensusCheckResult` (observed alignment).

The Trust Governance Layer consumes these outputs and produces trust indices, attestation results, trust proofs, federated trust reports, eligibility results, and federated trust certificates.

---

# 2 — Architectural Principles

## Determinism

- **stableStringify**: All hashes (trust proof, report hash, certificate hash) are computed from a canonical serialization. Objects are serialized with sorted keys and recursive handling of nested structures so that semantically equal payloads produce the same string and thus the same hash.
- **Deterministic ordering**: Node lists are always sorted lexicographically by `node_id` using `node_id.localeCompare()` before hashing or output. Shuffled inputs produce the same ordered outputs.
- **Reproducible hashing**: Hash functions use SHA-256 over the UTF-8 encoding of the stable string. No randomness or timestamp is used inside the trust-index or certificate-level calculations; timestamps appear only in proof/report/certificate metadata.

## Immutability

- All public types use `readonly` for every field. Results are frozen with `Object.freeze()` where appropriate.
- Interfaces such as `NodeTrustIndex`, `CertificateAttestationResult`, `TrustProof`, `FederatedTrustReport`, `NodeCertificateEligibility`, and `FederatedTrustCertificate` are immutable and safe to share and cache.

## Stateless Engines

- Engines take all inputs as parameters and return outputs without reading or writing global state.
- No internal caches or mutable module-level state. Each invocation of `runInterOrgTrustEngine`, `runTrustCertificationEngine`, etc. depends only on its arguments.

## Cryptographic Integrity

- **SHA-256 hashing**: Used for trust proof hash, report hash, certificate hash, and certificate signature (hash of `certificate_hash + signingKey`).
- **Certificate hashes**: Each federated trust certificate carries a `certificate_hash` computed from a deterministic payload (node_id, organization_id, trust_index, trust_level, certificate_level, timestamp).
- **Trust proofs**: The trust proof includes a `trust_hash` over the full evaluation payload (timestamp, evaluated_nodes, trust_summary, node_trust_indices, attestation_results), enabling external verification of the evaluation snapshot.

---

# 3 — Inter-Organizational Trust Layer

## Location and Role

The Inter-Organizational Trust Layer is implemented under:

```
src/network/inter_org_trust/
```

It evaluates trust across federated organizations by combining node metadata, trust scores, SLA consensus, and certificate attestations into a single trust index per node, then producing trust proofs and federated trust reports.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Inter-Organizational Trust Layer                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Inputs                                                                   │
│  • nodeMetadata (NodeMetadataWithCommitment[]) — from registry/consensus  │
│  • trustScores (NodeTrustScore[]) — from SLA trust weighting (11C.2)     │
│  • slaConsensus (SLAConsensusCheckResult | null) — from 11C.3             │
│  • nodeRecords (FederatedNodeRecord[]) — optional, for attestation       │
│  • trustAnchors (TrustAnchor[]) — for certificate verification           │
├─────────────────────────────────────────────────────────────────────────┤
│  Pipeline                                                                 │
│  1. Certificate attestation (if nodeRecords + trustAnchors provided)    │
│  2. Trust index computation (declared + observed + verified)             │
│  3. Trust proof generation (trust_hash, trust_summary)                    │
│  4. Federated trust report (report_hash over payload)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Outputs                                                                  │
│  • node_trust_indices (NodeTrustIndex[])                                 │
│  • attestation_results (CertificateAttestationResult[])                  │
│  • trust_proof (TrustProof)                                               │
│  • report_hash (string)                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Module Structure

| Path | Purpose |
|------|--------|
| `types/trust_types.ts` | `NodeTrustIndex`, `CertificateAttestationResult`, `TrustProof`, `TrustSummary`, `FederatedTrustReport` |
| `evaluation/trust_index_engine.ts` | Multi-component trust index and helpers |
| `attestation/certificate_attestation_verifier.ts` | Governance cert + identity commitment + trust anchor verification |
| `proof/trust_proof_generator.ts` | Trust proof and trust_hash generation |
| `report/federated_trust_report_builder.ts` | Report assembly and report_hash |
| `eligibility/trust_certificate_eligibility_engine.ts` | Eligibility status from trust level |
| `eligibility/trust_certificate_eligibility_types.ts` | Eligibility types |
| `inter_org_trust_engine.ts` | Orchestration: attestation → indices → proof → report |

---

# 4 — Trust Index Model

The trust index is a **multi-component** value per node. Each component is a number in [0, 1].

## Declared Trust

- **Source**: `NodeTrustScore.trust_score` from the SLA trust weighting layer (Phase 11C.2).
- **Lookup**: By `node_id` in the `trustScores` array.
- **Default when missing**: `0.5` (neutral). Implemented as `DECLARED_TRUST_WHEN_MISSING = 0.5`.
- **Normalization**: Value is clamped to [0, 1].

## Observed Trust

Derived from `SLAConsensusCheckResult` (Phase 11C.3):

- **Node not in any mismatch list**: `1` (`OBSERVED_TRUST_IN_GOOD_STANDING`).
- **Node in `nodes_missing_sla`**: `0.25` (`OBSERVED_TRUST_MISSING_SLA`).
- **Node in `nodes_outside_consensus`**: `0.1` (`OBSERVED_TRUST_OUTSIDE_CONSENSUS`). If a node appears in both lists, outside-consensus takes precedence (checked first).
- **No `SLAConsensusCheckResult` (null)**: `0.75` (`OBSERVED_TRUST_NO_CONSENSUS`) for every node.

## Verified Trust

Derived from `CertificateAttestationResult` (from the certificate attestation verifier):

- **Certificate valid and trust anchor associated**: `1` (`VERIFIED_TRUST_FULL`).
- **Certificate valid but trust anchor not associated**: `0.4` (`VERIFIED_TRUST_ANCHOR_INVALID`).
- **Certificate invalid**: `0` (`VERIFIED_TRUST_INVALID`).
- **No attestation for the node**: `0.5` (`VERIFIED_TRUST_NO_ATTESTATION`).

---

# 5 — Trust Index Formula

The composite trust index is:

```
trust_index = clamp(
  0.5 * declared_trust + 0.3 * observed_trust + 0.2 * verified_trust
)
```

- **Weights**: Declared 0.5, observed 0.3, verified 0.2. Declared trust is weighted highest but cannot alone dominate because observed and verified components are independent.
- **Clamping**: The result is clamped to [0, 1] so that `trust_index` is always in that range.
- **Determinism**: The formula is pure arithmetic; no randomness. Inputs are already deterministic (scores, consensus result, attestation results).
- **Rationale**: The weighting limits the impact of self-declared trust (0.5) and rewards observed behaviour (0.3) and verified identity (0.2), supporting governance and audit.

---

# 6 — Trust Levels

Trust level is derived from `trust_index` using fixed thresholds:

| Condition | Trust level |
|-----------|-------------|
| `trust_index >= 0.8` | `HIGH` |
| `trust_index >= 0.6` | `MEDIUM` |
| `trust_index >= 0.3` | `LOW` |
| otherwise | `UNTRUSTED` |

Constants in code: `THRESHOLD_HIGH = 0.8`, `THRESHOLD_MEDIUM = 0.6`, `THRESHOLD_LOW = 0.3`.

### Governance Meaning

- **HIGH**: Node is in good standing (high trust index). Eligible for highest-tier certificate (GOLD) when combined with eligibility rules.
- **MEDIUM**: Acceptable but not highest tier. Maps to PROBATION in eligibility and SILVER certificate when a certificate is issued.
- **LOW**: Reduced trust; PROBATION in eligibility and BRONZE certificate when issued.
- **UNTRUSTED**: Below acceptable threshold; INELIGIBLE for certificates.

---

# 7 — Certificate Attestation Verification

## Location

`src/network/inter_org_trust/attestation/certificate_attestation_verifier.ts`

## Behaviour

For each node (from `FederatedNodeRecord`), the verifier:

1. **Governance certificate**: Calls `verifyGovernanceCertificate(node.certificate, trustAnchors, asOfTime)` from the Federated Node Registry. This checks hash integrity, temporal validity (issued_at ≤ asOfTime ≤ expires_at), and that the issuer is in the trust anchor list.
2. **Node identity commitment**: Calls `verifyNodeIdentityCommitment(node)`, which recomputes the commitment from `node_id`, `certificate.public_key`, `trust_anchor_id`, and `certificate.certificate_hash` and compares it to the stored `node_identity_commitment`.
3. **Trust anchor association**: Ensures the node’s `trust_anchor_id` matches at least one trust anchor (by `trust_anchor_id` or `organization`).

## Valid Attestation

A node’s attestation is **valid** only if all three hold:

- `certificate_valid === true`
- `commitment_verified === true`
- `trust_anchor_associated === true`

The result is a `CertificateAttestationResult` per node (with optional `reason` when invalid). Output is sorted by `node_id`.

---

# 8 — Trust Proof Generation

## Location

`src/network/inter_org_trust/proof/trust_proof_generator.ts`

## TrustProof Structure

- `trust_hash`: SHA-256 hash (hex) of the canonical serialization of the proof payload.
- `timestamp`: Evaluation timestamp.
- `evaluated_nodes`: Sorted list of node IDs (lexicographic).
- `trust_summary`: Aggregated statistics (see below).

## Payload and Hashing

The payload hashed to produce `trust_hash` includes:

- `timestamp`
- `evaluated_nodes`
- `trust_summary`
- `node_trust_indices`
- `attestation_results`

Serialization uses **stableStringify** (sorted keys, recursive), then **sha256Hex**.

## Trust Summary

`TrustSummary` contains:

- `total_nodes`
- `valid_attestation_count`
- `average_trust_index`
- `highest_trust_node` (max trust_index, then lexicographic node_id)
- `lowest_trust_node` (min trust_index, then lexicographic node_id)
- `verified_node_count` (same as valid_attestation_count)
- `untrusted_node_count` (count of nodes with trust_level `UNTRUSTED`)

## Purpose

Trust proofs support audits, external verification, and governance traceability: any party with the same inputs can recompute the same `trust_hash` and confirm the evaluation snapshot.

---

# 9 — Federated Trust Report

## Structure

`FederatedTrustReport` (from `types/trust_types.ts`):

- `node_trust_indices`: readonly array of `NodeTrustIndex`, sorted by `node_id`.
- `attestation_results`: readonly array of `CertificateAttestationResult`, sorted by `node_id`.
- `trust_proof`: `TrustProof`.
- `report_hash`: SHA-256 hash (hex) of the report payload.

## Report Hash

Implemented in `report/federated_trust_report_builder.ts`:

- Payload: `{ node_trust_indices, attestation_results, trust_proof }` (already in sorted form).
- `report_hash = sha256Hex(stableStringify(payload))`.

## Verification

`verifyFederatedTrustReport(report)` recomputes the hash from the report’s three fields and returns `true` only if it equals `report.report_hash`. External systems can do the same to verify integrity without trusting the producer.

---

# 10 — Trust Certificate Eligibility Model

## Location

`src/network/inter_org_trust/eligibility/trust_certificate_eligibility_engine.ts`

## Eligibility Statuses

- **ELIGIBLE**: Node may receive a certificate (only for HIGH trust level in the current mapping).
- **PROBATION**: Node is in a probationary state; may receive SILVER or BRONZE depending on trust level.
- **INELIGIBLE**: Node must not receive a certificate (UNTRUSTED trust level).

## Mapping from Trust Level

| Trust level | Eligibility status | Eligibility reason |
|-------------|--------------------|--------------------|
| HIGH | ELIGIBLE | TRUST_HIGH |
| MEDIUM | PROBATION | TRUST_MEDIUM |
| LOW | PROBATION | TRUST_LOW |
| UNTRUSTED | INELIGIBLE | NODE_UNTRUSTED |

## Eligibility Reasons

- `TRUST_HIGH`: High trust, eligible.
- `TRUST_MEDIUM`: Medium trust, probation.
- `TRUST_LOW`: Low trust, probation.
- `NODE_UNTRUSTED`: Untrusted, ineligible.

Output is one `NodeCertificateEligibility` per node, sorted by `node_id`, with `evaluated_timestamp`.

---

# 11 — Trust Certification System

## Location

```
src/network/trust_certification/
```

## Role

The Trust Certification System turns **eligibility** and **trust indices** into verifiable **federated trust certificates** for eligible nodes only. It does not change trust index calculation; it only consumes it.

## Architecture

- **Classification**: Eligibility + trust level → certificate level (GOLD / SILVER / BRONZE) or no certificate.
- **Generation**: For each eligible node, build a certificate payload, compute `certificate_hash`, and emit a `FederatedTrustCertificate`.
- **Signing**: Optional external step: `signTrustCertificate(certificate, signingKey)` returns a signature string (not stored in the certificate).
- **Verification**: `verifyTrustCertificate(certificate, signature, signingKey)` recomputes hash and signature and returns a boolean.

## Module Layout

| Path | Purpose |
|------|--------|
| `types/trust_certificate_types.ts` | `TrustCertificateLevel`, `FederatedTrustCertificate` |
| `evaluation/certificate_classification_engine.ts` | Eligibility + trust level → GOLD/SILVER/BRONZE or null |
| `generation/trust_certificate_generator.ts` | Build certificates and `certificate_hash` |
| `signing/certificate_signer.ts` | Deterministic signature from certificate + key |
| `verification/certificate_verifier.ts` | Hash and signature verification |
| `trust_certification_engine.ts` | Orchestration: `runTrustCertificationEngine` |

---

# 12 — Certificate Levels

## Levels

- **GOLD**: Highest tier; issued when the node is ELIGIBLE and trust level is HIGH.
- **SILVER**: Mid tier; PROBATION and trust level MEDIUM.
- **BRONZE**: Lower tier; PROBATION and trust level LOW.

## Classification Rules (code)

Implemented in `evaluation/certificate_classification_engine.ts`:

- `INELIGIBLE` → no certificate (`null`).
- `ELIGIBLE` and `trust_level === 'HIGH'` → **GOLD**.
- `PROBATION` and `trust_level === 'MEDIUM'` → **SILVER**.
- `PROBATION` and `trust_level === 'LOW'` → **BRONZE**.
- Any other combination → `null` (no certificate).

## Governance Meaning

- **GOLD**: Fully trusted, no probation; suitable for critical or high-value roles.
- **SILVER**: Trusted under probation; suitable for standard participation.
- **BRONZE**: Lower trust, probation; suitable for limited or monitored participation.

---

# 13 — Certificate Hashing and Signing

## Certificate Hash

- **Payload** (same as used in generator and verifier): `node_id`, `organization_id`, `trust_index`, `trust_level`, `certificate_level`, `timestamp` (the certificate’s `certificate_timestamp`).
- **Algorithm**: `certificate_hash = sha256Hex(stableStringify(payload))`.
- Implemented in `generation/trust_certificate_generator.ts` as `computeCertificateHashPayload(payload)`.

## Certificate Signature

- **Input**: A `FederatedTrustCertificate` and a `signingKey` string.
- **Formula**: `signature = sha256Hex(certificate_hash + signingKey)`.
- The signature is **not** stored inside the certificate; it is returned separately and verified externally.
- Implemented in `signing/certificate_signer.ts`: `signTrustCertificate(certificate, signingKey)`.

## Rationale

- **Hash**: Ensures that any change to the certificate payload (level, trust index, node id, etc.) changes the hash, so tampering is detectable.
- **Signature**: Binds the certificate hash to a key holder. Verification recomputes both hash and signature so that integrity and origin can be checked without storing the key in the certificate.

---

# 14 — Certificate Verification

## Location

`src/network/trust_certification/verification/certificate_verifier.ts`

## Function

`verifyTrustCertificate(certificate, signature, signingKey): boolean`

## Process

1. **Hash recomputation**: Build the payload from the certificate fields (`node_id`, `organization_id`, `trust_index`, `trust_level`, `certificate_level`, `certificate_timestamp`) and compute `expectedHash = computeCertificateHashPayload(payload)`. If `expectedHash !== certificate.certificate_hash`, return `false`.
2. **Signature recomputation**: Compute `expectedSignature = signTrustCertificate(certificate, signingKey)`. If `expectedSignature !== signature`, return `false`.
3. **Outcome**: Return `true` only if both checks pass.

This ensures that the certificate content has not been altered and that the signature was produced by someone with the same signing key.

---

# 15 — Determinism Guarantees

## Identical Inputs → Identical Outputs

- All engines are pure functions of their inputs. No random number generation or external I/O inside the trust index, proof, report, eligibility, or certificate logic.
- Timestamps are passed in as parameters (or set once at the start of the pipeline) and used only in metadata and hashes; they do not affect the trust index or certificate level logic.

## Deterministic Ordering

- Every list of nodes or node-derived items is sorted with `node_id.localeCompare()` before being used in hashes or returned. So the order of inputs (e.g. shuffled arrays) does not change the output order or any hash.

## Stable Hash Generation

- All hashes use the same pattern: **stableStringify** (sorted keys, recursive) then **SHA-256** in hex. The same logical payload always yields the same string and therefore the same hash.

## Importance

- **Distributed governance**: Different replicas or auditors can recompute the same indices, proofs, and hashes from the same inputs.
- **Audit reproducibility**: Past evaluations can be replayed and verified.
- **Consensus verification**: Phase 11 outputs can be compared across nodes without ambiguity.

---

# 16 — Security Considerations

## Trust Manipulation

- The multi-component trust index (0.5 declared + 0.3 observed + 0.2 verified) prevents a node from unilaterally raising its trust by self-declaring high scores; observed SLA alignment and verified attestation are required for high trust.
- Declared trust is capped at 0.5 weight; the rest comes from consensus and attestation.

## Certificate Forgery

- Certificates include a `certificate_hash` over a fixed payload. Forgery would require producing a new hash that matches the payload, which is infeasible with SHA-256. Verification recomputes the hash from the certificate fields.

## Inconsistent Federation Reports

- Report and proof hashes are deterministic. Any change to `node_trust_indices`, `attestation_results`, or `trust_proof` changes `report_hash`. External systems can verify reports by recomputing the hash.

## Node Impersonation

- Certificate attestation ties the node to a governance certificate and a node identity commitment (binding node_id, public key, trust anchor, certificate hash). Verification ensures the commitment matches the stored value and that the certificate is valid and issued by a known trust anchor.

---

# 17 — Test Coverage

## Inter-Org Trust Layer

- **`tests/inter_org_trust_engine.test.ts`**: Deterministic trust index; normalization to [0,1]; use of trust score; certificate attestation (valid node); trust proof determinism; report hash determinism; `verifyFederatedTrustReport`; full engine integration (with and without nodeRecords); multi-component formula (e.g. 0.9 from 0.8/1/1); SLA consensus penalty; certificate invalid → lower verified trust; determinism with shuffled inputs; report hash recompute equals `report_hash`.
- **`tests/trust_certificate_eligibility.test.ts`**: HIGH → ELIGIBLE/TRUST_HIGH; MEDIUM → PROBATION; LOW → PROBATION; UNTRUSTED → INELIGIBLE; determinism with shuffled inputs; integration with `runInterOrgTrustEngine` and `evaluateCertificateEligibility`.

## Trust Certification

- **`tests/trust_certification_engine.test.ts`**: GOLD (HIGH + ELIGIBLE); SILVER (MEDIUM + PROBATION); BRONZE (LOW + PROBATION); INELIGIBLE → no certificate; determinism with shuffled inputs; sign then verify returns true; full pipeline integration (inter-org engine → eligibility → certification engine).

## Approximate Test Count

Phase 11–related tests live in the above files. The full IRIS test suite (including Phase 11) comprises hundreds of tests (e.g. 460+); the Phase 11 modules contribute multiple test cases per engine and integration path as described above.

---

# 18 — Phase 11 Capabilities

Phase 11 enables:

- **Federated trust governance**: A single, deterministic evaluation of trust across organizations using declared, observed, and verified components.
- **Automated certificate issuance**: Eligibility is derived from trust level; certificates (GOLD/SILVER/BRONZE) are generated only for eligible nodes, with a deterministic hash and optional external signing.
- **Audit-grade trust proofs**: Trust proofs and federated trust reports carry hashes that allow any party to verify the evaluation snapshot and report integrity.
- **Deterministic multi-organization trust evaluation**: Same inputs always yield the same indices, proofs, reports, eligibility, and certificates, supporting replication, audit, and consensus-oriented use cases.

---

# 19 — Preparation for Phase 12

Phase 11 establishes a stable trust and certification layer that future phases can build on:

- **Predictive governance**: Trust indices and certificates can feed risk or forecasting engines (e.g. predictive governance already implemented in Phase 11F) to estimate operational risk or evolution of trust.
- **Automated trust risk detection**: The same indices and attestation results can drive alerts or policies when trust level drops or attestation fails.
- **Federated reputation evolution**: Trust reports and proofs provide a reproducible history of trust evaluations, which can support reputation models or incentives across the federation.

The deterministic, hashable, and verifiable design of Phase 11 ensures that downstream phases can rely on consistent, auditable trust and certification data.
