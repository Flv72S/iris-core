# IRIS Protocol Governance Architecture

## Introduction

Governance in IRIS Protocol ensures that trust, participation, and compliance are evaluated and attested in a consistent, verifiable way across a federation of organizations and nodes. The protocol requires:

- **Federated trust evaluation** — Nodes from multiple organizations participate in a shared federation; governance must assess each node’s trustworthiness using both declared and observed behaviour and verified identity.
- **Deterministic governance decisions** — All evaluations must be reproducible: given the same inputs, every participant or auditor obtains the same trust indices, eligibility outcomes, certificates, and audit results.
- **Verifiable certification systems** — Certificates that encode trust and participation status must be integrity-protected (e.g. by hashes and optional signatures) so that their authenticity and binding to a trust snapshot can be verified.
- **Transparent audit mechanisms** — Third parties must be able to verify the integrity of trust snapshots, proofs, and reports without relying on a single authority.

IRIS governance is designed as a **deterministic distributed governance system**: it combines a layered architecture, immutable artifacts, and read-only intelligence and audit layers so that governance outcomes are transparent, reproducible, and independently verifiable across the federation.

---

# Governance Design Principles

The governance architecture is guided by the following principles.

**Deterministic execution** — Every governance computation (trust index, eligibility, certificate generation, predictive analysis, audit, orchestration) is deterministic. Same inputs produce identical outputs. There is no randomness in the evaluation or certification logic. This allows any node or auditor to recompute and verify results.

**Immutable governance artifacts** — Trust indices, certificates, proofs, reports, audit reports, and consensus snapshots are represented as immutable structures (readonly fields, frozen objects where appropriate). Artifacts are not altered after creation; new state is expressed by new artifacts. This supports caching, sharing, and audit trails.

**Verifiable trust evaluation** — Trust is computed from multiple components (declared, observed, verified) using a fixed formula. Proofs and report hashes are derived from canonical serializations of the evaluation payload. Anyone with the same inputs can recompute hashes and verify that a reported snapshot is consistent with the underlying data.

**Federated coordination** — Governance does not assume a single central authority. The node registry, trust engine, certification, predictive layer, audit, and orchestration all operate on data that can be supplied by multiple organizations. Execution stages and consensus summaries are defined so that federation-wide governance state can be agreed and verified across participants.

**Independent auditability** — The audit layer is read-only and does not modify protocol state. It verifies trust snapshots, certificates, proofs, and report consistency and produces a global audit report. Third parties can run the same verification logic on the same inputs to obtain the same audit outcome, enabling independent verification of governance integrity.

These principles are critical for distributed protocol governance: they ensure that participants and external observers can rely on consistent, tamper-evident, and reproducible governance outcomes without depending on a single trusted party.

---

# Governance Layered Architecture

The governance system is built as a **layered architecture**. Each layer has a well-defined responsibility and consumes or produces artifacts in a deterministic way. Phase 11 introduces the following layers:

**Layer 1 — Node Registry** — Maintains federated node identities, association with organizations and trust anchors, and node identity commitments. Supplies node metadata and optional node records for trust evaluation and attestation.

**Layer 2 — Governance Certificates** — Defines the governance certificate model used by the registry (and by attestation): certificate structure, hashing, and verification. Certificates represent trust recognition and participation status and support governance eligibility checks.

**Layer 3 — Trust Evaluation Engine** — Computes per-node trust indices by combining declared trust, observed trust (e.g. from SLA consensus), and verified trust (from certificate attestation). Produces trust proofs and federated trust reports with integrity hashes.

**Layer 4 — Trust Certification** — Evaluates certificate eligibility from trust levels and generates federated trust certificates (e.g. GOLD, SILVER, BRONZE) for eligible nodes. Ensures certificate hashes and optional signatures for integrity.

**Layer 5 — Predictive Governance Intelligence** — Analyzes historical trust evolution to produce stability status, risk levels, and federation-wide risk. Read-only and advisory; does not change protocol state.

**Layer 6 — Global Governance Audit** — Verifies trust snapshot integrity, certificate integrity, trust proof consistency, federated report consistency, and cross-node consistency. Produces a global audit report for third-party verification.

**Layer 7 — Federation Coordination & Consensus** — Orchestrates the governance pipeline: defines execution stages, builds federation timeline snapshots, generates notifications, and aggregates consensus state (trust nodes, certified nodes, predictive signals, audit results, systemic risk).

Lower layers (registry, certificates, trust engine, certification) produce the authoritative trust and certification state; upper layers (predictive, audit, orchestration) consume that state in a read-only way to provide intelligence, verification, and coordination.

---

# Federated Node Registry

The **Federated Node Registry** maintains the set of nodes that participate in the federation and their governance-related identity data.

**Responsibilities:**

- **Maintaining federated node identities** — Each node is registered with a unique node identifier, organization, protocol version, governance role, and status (e.g. active, revoked, suspended). Node records can include a governance certificate and a trust anchor reference.
- **Associating nodes with organizations** — Every node is linked to an organization identifier. The registry supports listing nodes by organization and listing trust anchors, so that cross-organization governance participation can be managed.
- **Enabling cross-organization governance participation** — The registry exposes node metadata (including node identity commitment) for use by the trust engine and consensus-related components. This allows the trust evaluation and certification layers to operate over a unified view of the federation.

**Node identity in governance** — Node identity is bound to a governance certificate, trust anchor, and a deterministic node identity commitment. The commitment ties the node_id to the certificate and trust anchor so that attestation can verify that a node’s claimed identity matches the registry and anchor. Governance decisions (e.g. eligibility, certification) are taken over the same node identities that the registry and trust engine use, ensuring a consistent basis for trust evaluation across the federation.

---

# Governance Certificates

The **governance certificate model** defines how trust recognition and participation status are represented and verified.

**Certificates represent:**

- **Trust recognition** — A node’s registration and linkage to a trust anchor and governance certificate indicate that the organization recognizes the node as a participant. Certificate hashes and optional signatures allow verification that the certificate has not been altered.
- **Participation status** — Certificate lifecycle (issued, valid, expired, revoked) and association with the registry determine whether a node is considered an active participant for attestation and trust evaluation.
- **Governance eligibility** — Downstream, the Trust Certification System (Layer 4) issues **federated trust certificates** (GOLD, SILVER, BRONZE) based on trust indices. Those certificates are distinct from registry governance certificates but rely on the same integrity mechanisms (hash, optional signature) for verification.

**Certificate classification and lifecycle** — Registry governance certificates carry identifiers, issuer, issued_to_node, validity window, and a certificate hash. The trust certification layer classifies nodes by trust level and eligibility and assigns a certificate level (GOLD/SILVER/BRONZE). Certificates are generated deterministically from trust indices and eligibility; their hashes are computed from a canonical payload so that any change to the payload changes the hash. Certificate lifecycle is managed through the registry (e.g. registration, update, revoke) and through the trust certification pipeline (eligibility evaluation and certificate generation at evaluation time).

---

# Inter-Organizational Trust Engine

The **Inter-Organizational Trust Engine** computes a single **trust index** per node in the range [0, 1] and a corresponding **trust level** used for eligibility and certification.

**Trust index components**

Trust is not based on a single source. The engine combines three components, each normalized to [0, 1]:

- **Declared trust** — Sourced from node trust scores (e.g. from SLA trust weighting). Represents the node’s or its organization’s declared trustworthiness. If no score is present, a default value is used so that declared trust alone cannot dominate the result.
- **Observed trust** — Derived from SLA consensus (e.g. whether the node is in good standing, missing SLA, or outside consensus). Reflects observed behaviour in the federation rather than self-declaration.
- **Verified trust** — Derived from certificate attestation results (e.g. whether the node’s certificate and identity commitment are valid and associated with a trust anchor). Reflects verified identity and binding to the registry.

**Deterministic trust index formula**

The trust index is a weighted combination, clamped to [0, 1]:

```
trust_index = clamp(0.5 × declared_trust + 0.3 × observed_trust + 0.2 × verified_trust)
```

Weights ensure that no single component alone determines the outcome. The result is deterministic: same inputs (node metadata, trust scores, SLA consensus, attestation results) always yield the same trust index per node.

**Trust levels**

Trust levels are derived from the trust index by fixed thresholds:

- **HIGH** — trust_index ≥ 0.8  
- **MEDIUM** — trust_index ≥ 0.6 and &lt; 0.8  
- **LOW** — trust_index ≥ 0.3 and &lt; 0.6  
- **UNTRUSTED** — trust_index &lt; 0.3  

**Role in governance**

The engine also produces attestation results, a **trust proof** (including a hash over the evaluation payload and a trust summary), and a **federated trust report** (with a report hash). Trust indices and levels feed into certificate eligibility (HIGH → ELIGIBLE, MEDIUM/LOW → PROBATION, UNTRUSTED → INELIGIBLE) and into the trust certification system. The proof and report allow anyone to verify that a given set of trust indices and attestations is consistent with the reported hash.

---

# Trust Certification System

The **Trust Certification System** issues **federated trust certificates** to nodes based on their trust index and eligibility. Certificates encode the node’s trust level and a certificate level (GOLD, SILVER, BRONZE) and carry a deterministic certificate hash (and optionally a signature) for integrity.

**Certification pipeline**

1. **Trust index** — Input: node trust indices from the Inter-Org Trust Engine (and thus from declared, observed, and verified trust).
2. **Eligibility evaluation** — For each node, eligibility is derived from trust level: HIGH → ELIGIBLE, MEDIUM/LOW → PROBATION, UNTRUSTED → INELIGIBLE. Results are produced in deterministic order (by node_id).
3. **Certificate classification** — Eligible and probation nodes receive a certificate level: ELIGIBLE with HIGH → GOLD; PROBATION with MEDIUM → SILVER; PROBATION with LOW → BRONZE. INELIGIBLE nodes receive no certificate.
4. **Certificate generation** — For each eligible/probation node, a certificate is built with node_id, organization_id, trust_index, trust_level, certificate_level, timestamp, and a **certificate_hash** computed from a canonical payload (e.g. stable stringify + SHA-256). Output is sorted by node_id.
5. **Certificate signing** — Optional: certificates can be signed (e.g. hash of certificate_hash and signing key). Verifiers can recompute the expected signature to confirm authenticity.

**Certificate integrity**

- Each certificate includes a **certificate_hash** over a deterministic payload. Any change to the payload produces a different hash, so tampering is detectable.
- Optional **signatures** bind the certificate to a key; verification uses the same signing procedure so that authenticity can be checked without secret data.
- The audit layer (Layer 6) verifies certificate integrity (hash present, signature when required, valid classification) as part of the global governance audit.

---

# Predictive Governance Intelligence

The **Predictive Governance Intelligence** layer analyzes historical trust evolution to detect instability, degradation, and federation-level risk. It is **read-only and advisory**: it does not modify protocol state, trust indices, or certificates.

**Responsibilities:**

- **Analyzing trust evolution** — Consumes a history of trust evolution points (node_id, organization_id, trust_index, trust_level, timestamp) per node. For each node, it computes trust delta (latest − earliest trust index) and volatility (e.g. standard deviation of trust_index over time).
- **Detecting instability** — High volatility with small net change is classified as VOLATILE; sustained decline is classified as DECLINING or CRITICAL depending on the magnitude of the drop. Otherwise the node is STABLE.
- **Identifying declining nodes** — Nodes with trust delta below a negative threshold are marked DECLINING or CRITICAL. These classifications feed into node-level risk levels (e.g. HIGH or SYSTEMIC).
- **Estimating systemic federation risk** — Node-level signals are aggregated into a federation risk report: counts of stable, volatile, declining, and critical nodes, and a **systemic_risk_level** (LOW, MODERATE, HIGH, SYSTEMIC) derived from the proportion of nodes in each stability category (e.g. a high fraction of critical nodes raises systemic risk).

**Volatility and trust evolution**

- **Volatility** is computed from the spread of trust_index values in the node’s history (e.g. standard deviation). High volatility can upgrade the node’s risk level (e.g. from MODERATE to HIGH) even when the base stability status would suggest a lower risk.
- **Trust evolution monitoring** uses time-ordered points; the same history always yields the same stability status, risk level, and federation risk. Outputs (predictive signals and federation risk report) are used by the orchestration layer to populate consensus state (e.g. systemic_risk_level) and are available for dashboards or alerts. They do not alter trust or certification outcomes.

---

# Global Governance Audit

The **Global Governance Audit** layer verifies the integrity of governance artifacts and produces a **global audit report** that supports **third-party verification**.

**Responsibilities:**

- **Verifying trust snapshots** — Checks that each trust index is in [0, 1] and that trust levels are valid (HIGH, MEDIUM, LOW, UNTRUSTED). Fails on out-of-range indices; warns on missing or invalid level.
- **Validating certificates** — Checks that each certificate has a non-empty certificate_hash and that, when a signature field is present, it is not empty. Warns on unknown certificate level (not GOLD/SILVER/BRONZE).
- **Verifying trust proofs** — Recomputes the proof hash from the same payload used by the proof generator (e.g. timestamp, evaluated_nodes, trust_summary, node_trust_indices, attestation_results). Fails if the recomputed hash does not match the stored trust_hash.
- **Validating federated reports** — Verifies the federated trust report hash (using the same logic as the report builder). Fails if the hash is invalid; warns if the number of nodes in the proof does not match the number of node trust indices.
- **Checking cross-node consistency** — Ensures every node that has a certificate also has a trust index (fail if not). Warns when a node has a trust index but no certificate.

**Third-party verification**

The audit layer does not modify any protocol state. Given the same inputs (trust indices, certificates, proofs, report), any party can run the same verification logic and obtain the same audit report: per-node results (snapshot_integrity, certificate_integrity, trust_proof_integrity), aggregate counts (passed_nodes, warning_nodes, failed_nodes), and cross_node_consistency status. This allows external auditors or other federation members to independently verify that governance artifacts are consistent and that no node is certified without a corresponding trust evaluation.

---

# Federation Coordination & Consensus

The **Federation Coordination & Consensus** layer is the **governance control plane**. It orchestrates the governance pipeline, produces timeline snapshots and notifications, and aggregates consensus state. It does not modify trust indices, certificates, proofs, or audit results.

**Responsibilities:**

- **Coordinating governance execution stages** — Defines a fixed sequence of stages and provides a function to advance from one stage to the next (or from null to the first stage). Stages are ordered and deterministic.
- **Building federation timeline snapshots** — For a given set of stages and timestamp, produces one snapshot per stage (stage name, status e.g. COMPLETED, timestamp). Snapshots are ordered by the canonical stage order and timestamps increase deterministically.
- **Generating federation notifications** — For each completed stage in the timeline, produces a notification (stage, message, timestamp) with fixed messages (e.g. “Trust evaluation completed”, “Certification stage completed”, “Global governance audit completed”, “Federation consensus finalized”). Notifications follow timeline order.
- **Producing consensus summaries** — Aggregates governance outputs into a **consensus state**: number of trust nodes, certified nodes, predictive signals, audit passed nodes, and systemic risk level (from the predictive layer). Together with the timeline and a finalized flag, this forms the **federation consensus snapshot**.

**Deterministic execution stages**

The pipeline is executed in this order:

1. **TRUST_EVALUATION** — Trust indices and federated trust report have been produced.
2. **CERTIFICATION** — Certificates have been generated for eligible nodes.
3. **PREDICTIVE_ANALYSIS** — Predictive signals and federation risk report have been computed.
4. **AUDIT** — Global governance audit has been run and the audit report is available.
5. **CONSENSUS_FINALIZATION** — All stages are complete; the orchestration produces the consensus snapshot and notifications.

**Reaching governance consensus**

Consensus here means that the federation has a single, deterministic view of the governance pipeline outcome: the same inputs (trust indices, certificates, predictive signals, audit report, timestamp) always produce the same timeline, consensus state, and notifications. The consensus snapshot (timeline + consensus_state + finalized + timestamp) is the authoritative summary of that run. It can be stored, shared, or used for downstream decisions (e.g. policy, alerts) without re-running the full pipeline, while remaining verifiable by re-running the orchestration with the same inputs.

---

# Governance Pipeline

The full governance pipeline is the ordered sequence of stages that transform node and federation inputs into trust evaluation, certification, predictive analysis, audit, and consensus output.

**End-to-end flow:**

1. **Trust evaluation** — The Inter-Org Trust Engine consumes node metadata, trust scores, optional SLA consensus, and optional node records and trust anchors. It produces node trust indices, attestation results, a trust proof, and a federated trust report. Trust indices and levels are deterministic and sorted by node_id.

2. **Certificate eligibility** — The eligibility engine (within the trust layer) evaluates each trust index and assigns an eligibility status (ELIGIBLE, PROBATION, INELIGIBLE) and reason. Results are in deterministic order by node_id.

3. **Trust certification** — The Trust Certification System takes trust indices and eligibility results and generates federated trust certificates for eligible and probation nodes. Certificate levels (GOLD, SILVER, BRONZE) are assigned from eligibility and trust level. Certificates carry a certificate_hash and optionally a signature.

4. **Predictive governance analysis** — The Predictive Governance layer takes trust evolution history per node and a timestamp. It produces predictive signals (stability status, risk level, trust delta, volatility) per node and a federation risk report (including systemic_risk_level). Outputs are deterministic and sorted by node_id.

5. **Global governance audit** — The audit layer takes trust indices, certificates, proofs, and the federated trust report. It verifies snapshot integrity, certificate integrity, proof hash, report hash and node count, and cross-node consistency. It produces a global audit report (per-node results and aggregate counts). The report is deterministic for the same inputs.

6. **Federation consensus orchestration** — The orchestration layer takes trust indices, certificates, predictive signals, the audit report, and a timestamp. It builds the full timeline (all five stages), builds consensus state (counts and systemic_risk_level), generates notifications, and returns the federation consensus snapshot and notifications. No inputs are modified.

Each stage consumes outputs from the previous one (and from the registry where applicable). Trust evaluation is the source of truth for trust indices and levels; certification, predictive, audit, and orchestration layers use that state in a read-only way to produce certificates, intelligence, verification, and coordination artifacts.

---

# Deterministic Governance Model

Deterministic execution is fundamental to IRIS governance. It ensures that every participant and every auditor can reproduce the same outcomes from the same inputs.

**Reproducible decisions** — All computations (trust index, eligibility, certificate level, certificate hash, predictive stability and risk, audit checks, timeline and consensus state) are pure functions of their inputs. There is no randomness and no dependence on wall-clock time inside the core formulas. Timestamps appear only as part of the input or as metadata in outputs (e.g. proof timestamp, audit_timestamp, snapshot timestamp).

**Identical results across nodes** — Any node or third party that has the same inputs (node metadata, trust scores, SLA consensus, attestation results, evolution history, etc.) and runs the same pipeline will obtain the same trust indices, eligibility, certificates, predictive signals, audit report, and consensus snapshot. Ordering is fixed (e.g. by node_id or by stage order), so even if inputs are supplied in a different order, the outputs are normalized to the same order and values.

**Verifiable governance outcomes** — Proofs and report hashes are computed from canonical serializations (e.g. stable stringify with sorted keys). Recomputation of hashes from the same payload yields the same value, so anyone can verify that a given proof or report matches the underlying data. Certificate hashes and optional signatures allow verification of certificate authenticity and integrity.

**Immutable data structures and deterministic ordering** — Governance artifacts use readonly fields and are frozen where appropriate. Arrays (e.g. trust indices, audit results, timeline) are produced in a deterministic order (e.g. node_id localeCompare, or stage order). This guarantees that hashing and comparison of artifacts are consistent across implementations and runs.

---

# Security and Integrity Guarantees

The governance architecture is designed to provide the following security and integrity properties.

**Integrity of trust evaluation** — The trust index is computed from multiple independent components (declared, observed, verified) with fixed weights. No single source can unilaterally set a high trust index. The formula and thresholds are public; recomputation is possible from the same inputs. The trust proof includes a hash over the full evaluation payload, so any change to indices or attestations invalidates the proof.

**Certificate authenticity** — Federated trust certificates carry a certificate_hash over a deterministic payload. Optional signing binds the certificate to a key. The audit layer verifies that hashes are present and that signatures (when present) are non-empty and can be verified. Certificates are generated only for nodes that have a trust index and eligibility; the certification pipeline does not create certificates for ineligible nodes.

**Proof verification** — The audit layer recomputes the trust proof hash using the same payload structure and hashing as the proof generator. A mismatch yields FAIL. This ensures that the stated proof corresponds to the stated trust indices and attestation results and has not been tampered with.

**Independent auditability** — The audit layer is read-only and does not modify protocol state. Third parties can run the same verification logic on the same inputs and obtain the same global audit report. Cross-node consistency checks ensure that no node is certified without a trust index, reducing the risk of inconsistent or manipulated governance state.

**Federated consensus validation** — The orchestration layer aggregates only existing outputs (trust indices, certificates, predictive signals, audit report). It does not invent or alter data. The consensus snapshot is a deterministic function of these inputs. Re-running the orchestration with the same inputs produces the same snapshot, so federation members can validate that a published consensus snapshot is consistent with the underlying governance outputs.

Together, these properties limit the ability of any single party to manipulate trust indices, certificates, or audit outcomes without detection, and allow the federation to rely on transparent and reproducible governance state.

---

# Governance Transparency and Verifiability

IRIS governance is designed so that decisions are transparent and outcomes are independently verifiable.

**Transparent governance decisions** — Trust levels, eligibility status, certificate levels, stability status, risk levels, and audit results are derived from public formulas and thresholds. There are no hidden or probabilistic steps. The pipeline (trust evaluation → eligibility → certification → predictive → audit → orchestration) is documented and implemented so that the path from inputs to outputs is clear.

**Reproducible trust evaluation** — Given node metadata, trust scores, SLA consensus, and attestation results, anyone can recompute trust indices and trust levels. Given the same inputs, the trust engine produces the same proof and report hashes. This allows participants and auditors to confirm that published trust indices and reports are consistent with the underlying data.

**Independently verifiable audit reports** — The global audit report is produced by a read-only verification layer. Third parties can run the same verifiers (snapshot, certificate, proof, report, cross-node consistency) on the same inputs and obtain the same report. No secret or privileged state is required. This supports external audits, compliance checks, and dispute resolution without relying on the entity that produced the original report.

**Importance for distributed protocol ecosystems** — In a federation of multiple organizations, no single party should be the sole source of truth for trust or certification. Transparent and verifiable governance allows every participant to check that evaluations and certificates are consistent, that audit results match the underlying artifacts, and that consensus snapshots reflect the actual pipeline outputs. This reduces reliance on trust in a central authority and supports accountability and fairness in the protocol.

---

# Conclusion

The IRIS Protocol governance system is a layered, deterministic architecture that combines:

- **Deterministic trust computation** — Multi-component trust indices and trust levels from the Inter-Org Trust Engine, with proofs and federated trust reports for verification.
- **Verifiable certification** — Eligibility derived from trust levels and federated trust certificates (GOLD, SILVER, BRONZE) with integrity hashes and optional signatures.
- **Predictive governance intelligence** — Read-only analysis of trust evolution, stability, and federation risk without modifying protocol state.
- **Independent audit** — Global verification of trust snapshots, certificates, proofs, reports, and cross-node consistency, producing a report that third parties can reproduce.
- **Federation-level orchestration** — Deterministic execution stages, timeline snapshots, notifications, and consensus state summarizing the full pipeline.

The architecture is designed so that governance outcomes are **transparent and reliable**: same inputs yield same outputs, artifacts are immutable and integrity-protected, and every layer that consumes governance state (predictive, audit, orchestration) does so in a read-only manner. Together, this enables **transparent and reliable federated governance** across organizations and nodes in the IRIS Protocol.
