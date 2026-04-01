# IRIS Protocol — Phase 11F–11H Implementation

## Overview

Phase 11 microsteps **11F**, **11G**, and **11H** extend the governance stack with three new layers that sit on top of the Inter-Org Trust Engine (11D) and Trust Certification System (11E):

1. **Predictive Governance Intelligence (11F)** — Analyzes trust evolution and stability to produce risk signals and federation-level risk reports.
2. **Global Governance Audit (11G)** — Verifies the integrity of trust snapshots, certificates, proofs, and federated reports for independent third-party verification.
3. **Federation Coordination & Consensus Orchestration (11H)** — Orchestrates the governance pipeline, produces federation timeline snapshots, and aggregates consensus state.

These layers are **read-only** relative to protocol state: they do not modify trust indices, certificates, proofs, or audit results. They consume outputs from earlier Phase 11 components and produce deterministic, verifiable outputs.

**Architectural summary.** The three layers form an intelligence, verification, and control plane above trust computation and certification. The canonical pipeline order is:

```
Trust Engine → Certification → Predictive Governance → Global Audit → Federation Consensus
```

Example end-to-end flow:

- **Trust Engine** (11D) produces `NodeTrustIndex[]` and `FederatedTrustReport`.
- **Certification** (11E) produces `FederatedTrustCertificate[]` for eligible nodes.
- **Predictive Governance** (11F) consumes trust evolution history and produces `PredictiveGovernanceSignal[]` and `FederationRiskReport`.
- **Global Audit** (11G) verifies snapshots, certificates, proofs, and report consistency and produces a `GlobalAuditReport`.
- **Federation Consensus** (11H) coordinates all stages, builds a timeline, and produces a `FederationConsensusSnapshot` and notifications.

---

# 11F — Predictive Governance Intelligence Layer

## Purpose

The Predictive Governance Intelligence layer analyzes **historical trust evolution** to detect:

- **Instability** — Trust index variation over time.
- **Trust degradation** — Sustained decline in trust (declining or critical trajectories).
- **Volatility** — High variance in trust values without a clear trend.
- **Systemic federation risk** — Aggregation of node-level stability into a federation-wide risk level (LOW, MODERATE, HIGH, SYSTEMIC).

The layer is **read-only**: it does not modify protocol state, trust calculations, or report hashes. It provides an intelligence view over existing trust and certificate data.

## Module Structure

The module lives under:

```
src/network/predictive_governance/
```

| File | Responsibility |
|------|----------------|
| **predictive_governance_types.ts** | Defines immutable types: `TrustEvolutionPoint`, `TrustStabilityStatus`, `RiskLevel`, `PredictiveGovernanceSignal`, `FederationRiskReport`. |
| **trust_evolution_analyzer.ts** | Analyzes a time-ordered list of `TrustEvolutionPoint` per node: computes trust delta (latest − earliest), volatility (standard deviation of trust_index), and assigns a stability status (STABLE, VOLATILE, DECLINING, CRITICAL). |
| **risk_assessment_engine.ts** | Maps stability status and volatility score to a node-level `RiskLevel` (LOW, MODERATE, HIGH, SYSTEMIC). High volatility can upgrade risk by one level. |
| **federation_risk_monitor.ts** | Aggregates node-level signals into a `FederationRiskReport`: counts per stability status and derives `systemic_risk_level` from thresholds (e.g. fraction of critical/declining/volatile nodes). |
| **predictive_governance_engine.ts** | Entry points: `runPredictiveGovernanceAnalysis(history_by_node, timestamp)` for intelligence (signals + federation risk); `runPredictiveGovernanceEngine(...)` for risk forecast using trust indices, certificates, and drift signals. |

## Core Types

- **TrustEvolutionPoint** — A single point in a node’s trust history: `node_id`, `organization_id`, `trust_index`, `trust_level`, `timestamp`. Used as input to evolution analysis.

- **TrustStabilityStatus** — Classification of a node’s trust trajectory: `STABLE` | `VOLATILE` | `DECLINING` | `CRITICAL`. Derived from trust delta and volatility (e.g. delta &lt; −0.2 → CRITICAL, delta &lt; −0.1 → DECLINING, high volatility and small delta → VOLATILE, else STABLE).

- **RiskLevel** — Node or federation risk: `LOW` | `MODERATE` | `HIGH` | `SYSTEMIC`. Used in signals and in `FederationRiskReport.systemic_risk_level`.

- **PredictiveGovernanceSignal** — Per-node output: `node_id`, `organization_id`, `stability_status`, `risk_level`, `trust_delta`, `volatility_score`, `evaluated_timestamp`. Signals are produced in deterministic order (by `node_id`).

- **FederationRiskReport** — Federation-level summary: `total_nodes`, `stable_nodes`, `volatile_nodes`, `declining_nodes`, `critical_nodes`, `systemic_risk_level`, `evaluated_timestamp`. Used by downstream layers (e.g. orchestration) to reflect federation risk in consensus state.

## Analysis Flow

The deterministic analysis pipeline is:

1. **Trust history** — Input: `ReadonlyMap<string, readonly TrustEvolutionPoint[]>` (history per node, keyed by `node_id`).
2. **Trust evolution analysis** — For each node (in sorted `node_id` order), `analyzeTrustEvolution(history)`:
   - Sorts history by timestamp ascending.
   - Computes `trust_delta = latest.trust_index − earliest.trust_index`.
   - Computes `volatility_score` as the standard deviation of `trust_index` values.
   - Assigns `stability_status` using thresholds (e.g. delta &lt; −0.2 → CRITICAL, &lt; −0.1 → DECLINING, volatility ≥ 0.05 and small |delta| → VOLATILE, else STABLE).
3. **Risk assessment** — `assessNodeRisk(stability_status, volatility_score)` maps to `RiskLevel`; high volatility (e.g. &gt; 0.15) can upgrade the level.
4. **Predictive signals** — One `PredictiveGovernanceSignal` per node, with the above fields and `evaluated_timestamp`.
5. **Federation risk report** — `computeFederationRisk(signals, timestamp)` counts nodes by stability status and computes `systemic_risk_level` from proportions (e.g. ≥10% critical → SYSTEMIC, ≥20% declining → HIGH, ≥30% volatile → MODERATE, else LOW).

Volatility is the standard deviation of trust indices in the node’s history. Trust delta is the change from earliest to latest point; negative delta indicates degradation.

---

# 11G — Global Audit & Verification Layer

## Purpose

The Global Audit & Verification layer verifies **governance integrity** across the federation. It allows **independent third-party verification** of:

- Trust snapshot integrity (indices in valid range, valid trust levels).
- Certificate integrity (hash present, optional signature rules, known classification).
- Trust proof consistency (recomputed hash matches stored proof).
- Federated trust report consistency (report hash and node count alignment).
- Cross-node consistency (no certificate without a trust index; optional warning when a trust index has no certificate).

The audit layer is **read-only**: it does not modify any protocol state, trust calculations, certificates, or reports. Its output is a **Global Audit Report** that can be verified by external parties.

## Module Structure

The module lives under:

```
src/network/governance_audit/
```

| File | Responsibility |
|------|----------------|
| **audit_types.ts** | Defines `AuditStatus`, `AuditCheckResult`, `NodeAuditResult`, `GlobalAuditReport` (all immutable). |
| **snapshot_integrity_verifier.ts** | `verifySnapshotIntegrity(trust_indices)`: FAIL if any `trust_index` &lt; 0 or &gt; 1; WARNING if missing or invalid trust level; PASS otherwise. |
| **certificate_integrity_verifier.ts** | `verifyCertificateIntegrity(certificate)`: FAIL if `certificate_hash` missing/empty or if `signature` is present and empty; WARNING if `certificate_level` not GOLD/SILVER/BRONZE; PASS otherwise. Uses `TrustCertificateForAudit` (certificate type with optional `signature`). |
| **trust_proof_verifier.ts** | `verifyTrustProof(proof, node_trust_indices, attestation_results)`: Recomputes proof hash from the same payload as the generator (stable stringify + SHA-256); FAIL on mismatch, PASS if hash matches. |
| **trust_report_verifier.ts** | `verifyFederatedTrustReportIntegrity(report)`: Uses existing `verifyFederatedTrustReport(report)` for hash; FAIL if invalid. WARNING if `trust_proof.evaluated_nodes.length !== report.node_trust_indices.length`. |
| **cross_node_consistency_checker.ts** | `checkCrossNodeConsistency(trust_indices, certificates)`: FAIL if any node has a certificate but no trust index; WARNING if any node has a trust index but no certificate; PASS otherwise. |
| **global_audit_engine.ts** | `runGlobalGovernanceAudit(trust_indices, certificates, proofs, report, timestamp)`: For each node (union of indices and certificates, sorted by `node_id`), runs snapshot, certificate, and proof verification; aggregates passed/warning/failed counts; runs cross-node consistency; returns frozen `GlobalAuditReport` with `audit_results` sorted by `node_id`. |

## Core Types

- **AuditStatus** — Result of a single check: `PASS` | `WARNING` | `FAIL`.

- **AuditCheckResult** — Optional granular result: `check_name`, `status` (AuditStatus), optional `details`.

- **NodeAuditResult** — Per-node audit: `node_id`, `organization_id`, `snapshot_integrity`, `certificate_integrity`, `trust_proof_integrity` (each `AuditStatus`). Node-level status is FAIL if any of these is FAIL, WARNING if any is WARNING, else PASS.

- **GlobalAuditReport** — Aggregated report: `total_nodes`, `passed_nodes`, `warning_nodes`, `failed_nodes`, `cross_node_consistency` (AuditStatus), `audit_results` (readonly array of `NodeAuditResult` sorted by `node_id`), `audit_timestamp`. Invariant: `passed_nodes + warning_nodes + failed_nodes === total_nodes`.

## Audit Verification Flow

The verification process is:

1. **Trust Snapshot Validation** — For each node with a trust index, `verifySnapshotIntegrity([index])`. FAIL for out-of-range or invalid level; WARNING for missing level.
2. **Certificate Integrity Verification** — For each node with a certificate, `verifyCertificateIntegrity(cert)`. FAIL for missing/empty hash or empty signature when present; WARNING for unknown level.
3. **Trust Proof Verification** — Single proof check (provided proof or report’s proof) via `verifyTrustProof(proof, report.node_trust_indices, report.attestation_results)`. FAIL on hash mismatch; PASS on match.
4. **Federated Report Verification** — Handled via report hash and node-count consistency (report verifier); FAIL if hash invalid, WARNING if node count mismatch.
5. **Cross-node Consistency Check** — `checkCrossNodeConsistency(trust_indices, certificates)`: FAIL if any certified node lacks a trust index; WARNING if any indexed node has no certificate.
6. **Global Audit Report** — Node results aggregated; per-node status = FAIL if any of snapshot/cert/proof is FAIL, else WARNING if any is WARNING, else PASS. Counts and `cross_node_consistency` are set; report is immutable.

**PASS / WARNING / FAIL logic:** FAIL takes precedence (any FAIL → node/report can reflect failure); WARNING indicates non-blocking inconsistency; PASS indicates all checks passed.

---

# 11H — Federation Coordination & Consensus Orchestration

## Purpose

The Federation Coordination & Consensus Orchestration layer is the **governance control plane**. It:

- **Coordinates governance execution stages** — Defines and sequences the stages (trust evaluation, certification, predictive analysis, audit, consensus finalization).
- **Produces federation timeline snapshots** — One snapshot per stage, with status and timestamp, in a fixed order.
- **Generates federation notifications** — One notification per completed stage with a fixed message and timestamp.
- **Produces consensus state summaries** — Aggregates counts (trust nodes, certified nodes, predictive signals, audit passed nodes) and federation systemic risk into a single `FederationConsensusState`.

This layer does **not** modify trust indices, certificates, proofs, or audit results. It orchestrates and aggregates existing outputs.

## Module Structure

The module lives under:

```
src/network/federation_orchestration/
```

| File | Responsibility |
|------|----------------|
| **federation_orchestration_types.ts** | Defines `FederationExecutionStage`, `FederationStageStatus`, `FederationStageSnapshot`, `FederationConsensusState`, `FederationConsensusSnapshot`, `FederationNotification`, `RiskLevel` (immutable). |
| **governance_execution_stage.ts** | Defines `GOVERNANCE_EXECUTION_ORDER` (readonly array of the five stages) and `getNextExecutionStage(current_stage)`: null → TRUST_EVALUATION; next in order; CONSENSUS_FINALIZATION → null. |
| **federation_timeline_manager.ts** | `buildFederationTimeline(stages, timestamp)`: Produces one `FederationStageSnapshot` per stage, ordered by `GOVERNANCE_EXECUTION_ORDER`, status COMPLETED, timestamps increasing deterministically (timestamp + index). |
| **federation_state_notifier.ts** | `generateFederationNotifications(timeline)`: One `FederationNotification` per snapshot, in timeline order, with fixed messages per stage. |
| **consensus_state_builder.ts** | `buildFederationConsensusState(trust_indices, certificates, predictive_signals, audit_report)`: Sets `trust_nodes`, `certified_nodes`, `predictive_signals`, `audit_passed_nodes` from lengths/report; derives `systemic_risk_level` from `computeFederationRisk(predictive_signals, timestamp)` (predictive layer). |
| **federation_execution_coordinator.ts** | `runFederationConsensusOrchestration(trust_indices, certificates, predictive_signals, audit_report, timestamp)`: Builds timeline (all five stages), consensus state, and notifications; returns `{ snapshot, notifications }` with `finalized: true`. |

## Governance Execution Stages

The deterministic stage sequence is:

| Stage | Role |
|-------|------|
| **TRUST_EVALUATION** | Trust indices and federated trust report have been produced (11D). |
| **CERTIFICATION** | Certificates have been generated for eligible nodes (11E). |
| **PREDICTIVE_ANALYSIS** | Predictive signals and federation risk have been computed (11F). |
| **AUDIT** | Global audit has been run and the audit report is available (11G). |
| **CONSENSUS_FINALIZATION** | All stages are complete; consensus snapshot and notifications are produced (11H). |

Stages are ordered by `GOVERNANCE_EXECUTION_ORDER`; `getNextExecutionStage` advances through them and returns `null` after CONSENSUS_FINALIZATION.

## Federation Consensus Snapshot

**FederationConsensusSnapshot** has:

- **timeline** — `readonly FederationStageSnapshot[]`. One entry per governance stage, in execution order; each has `stage`, `status` (e.g. COMPLETED), and `timestamp`.
- **consensus_state** — `FederationConsensusState`: aggregates `trust_nodes` (length of trust indices), `certified_nodes` (length of certificates), `predictive_signals` (length of predictive signals), `audit_passed_nodes` (from `GlobalAuditReport.passed_nodes`), and `systemic_risk_level` (from predictive layer’s `computeFederationRisk`).
- **finalized** — Boolean; set to `true` when the orchestration run completes all stages.
- **timestamp** — Orchestration run timestamp.

Consensus state is thus a read-only summary of the outputs of the Trust Engine, Certification, Predictive Governance, and Global Audit layers.

---

# Deterministic Governance Guarantees

All three layers (11F, 11G, 11H) adhere to the following:

- **Deterministic execution** — Same inputs (trust indices, certificates, history, report, timestamp) always produce the same outputs. No randomness.
- **Immutable data structures** — All exported types use `readonly` fields; objects are frozen where appropriate.
- **Read-only orchestration** — No layer mutates protocol state, trust calculations, certificates, proofs, or audit results. Inputs are not modified.
- **No randomness** — No random number generation or non-deterministic branching.
- **No external dependencies** — Only standard Node/TypeScript and existing in-repo modules (e.g. `node:crypto` for hashing in audit). No third-party governance or state stores.

These guarantees support **reproducible governance decisions**: repeated runs with the same inputs yield identical reports, audit results, and consensus snapshots, which is required for verification and dispute resolution.

---

# Integration with Previous Phase 11 Layers

- **Inter-Org Trust Engine (11D)** — Produces `NodeTrustIndex[]`, `FederatedTrustReport` (including `TrustProof` and attestation results). These feed into eligibility (11D/11E), certification (11E), audit (11G), and orchestration (11H).
- **Trust Certification System (11E)** — Consumes trust indices and eligibility; produces `FederatedTrustCertificate[]`. Certificates are inputs to the audit layer (11G) and to the consensus state builder (11H).
- **Federated Trust Reports** — The report (with `node_trust_indices`, `attestation_results`, `trust_proof`, `report_hash`) is used by the audit layer for proof and report verification and by the pipeline as the canonical trust output.

**Full governance pipeline:**

1. **Trust Computation** — 11D: `runInterOrgTrustEngine` → `FederatedTrustReport`, `NodeTrustIndex[]`.
2. **Certificate Eligibility** — 11D: `evaluateCertificateEligibility(trust_indices, timestamp)`.
3. **Trust Certification** — 11E: `runTrustCertificationEngine(trust_indices, eligibility, timestamp)` → `FederatedTrustCertificate[]`.
4. **Predictive Governance Analysis** — 11F: `runPredictiveGovernanceAnalysis(history_by_node, timestamp)` → signals + `FederationRiskReport`.
5. **Global Governance Audit** — 11G: `runGlobalGovernanceAudit(trust_indices, certificates, proofs, report, timestamp)` → `GlobalAuditReport`.
6. **Federation Consensus Orchestration** — 11H: `runFederationConsensusOrchestration(trust_indices, certificates, predictive_signals, audit_report, timestamp)` → `{ snapshot, notifications }`.

All arrays (e.g. audit results, timeline, notifications) are produced in deterministic order (e.g. by `node_id` or by stage order).

---

# Testing and Validation

- **Unit tests** — Each module has dedicated tests under the corresponding `tests/` directory (e.g. `predictive_governance/tests/`, `governance_audit/tests/`, `federation_orchestration/tests/`). They cover type correctness, verification rules (PASS/WARNING/FAIL), stage ordering, timeline and notification generation, consensus state aggregation, and determinism (e.g. shuffled inputs yielding identical outputs).
- **Integration tests** — The file `src/tests/phase11_integration.test.ts` runs the full pipeline (Trust Engine → Eligibility → Certification → Predictive → Audit → Orchestration) with a fixed 5-node federation, and asserts counts, ordering, invariants (e.g. `certified_nodes ≤ trust_nodes`, `predictive_signals === trust_nodes`, `timeline.length === 5`), and determinism across shuffled input order.
- **Test suite status** — The complete test suite (including Phase 11F–11H and the Phase 11 integration tests) is run via `npm run test`; all tests pass with no modifications to existing modules beyond the additions for 11F, 11G, and 11H.
