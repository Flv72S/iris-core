# IRIS Protocol — Phase 11 Architecture Diagrams

This document contains C4-style and protocol-flow architecture diagrams for the **Trust Governance Layer** (Phase 11), reflecting the implementation in `src/network/inter_org_trust/` and `src/network/trust_certification/`.

---

## 1 — System Context Diagram (C4 Level 1)

Global context: Federated Organizations and IRIS Nodes supply inputs to the IRIS Trust Governance Layer; the layer produces Trust Reports, Trust Proofs, and Trust Certificates consumed by External Audit Systems.

```mermaid
flowchart LR
    subgraph Actors
        OrgA[Federated Organization A]
        OrgB[Federated Organization B]
        Node[IRIS Node]
    end

    subgraph System["IRIS Trust Governance Layer"]
        TrustLayer[Trust Governance Layer]
    end

    Audit[External Audit System]

    OrgA -->|node metadata, trust scores, SLA signals| Node
    OrgB -->|node metadata, trust scores, SLA signals| Node
    Node -->|node metadata, trust scores, SLA consensus, node records, trust anchors| TrustLayer
    TrustLayer -->|FederatedTrustReport, TrustProof, FederatedTrustCertificate[]| Audit
```

---

## 2 — Container Diagram (C4 Level 2)

Major subsystems of Phase 11 and data flow between them.

```mermaid
flowchart TB
    subgraph InterOrgTrust["inter_org_trust"]
        Engine[inter_org_trust_engine]
        TrustIdx[Trust Index Engine]
        Attest[Certificate Attestation Verifier]
        Proof[Trust Proof Generator]
        Report[Federated Trust Report Builder]
        Elig[Eligibility Engine]
    end

    subgraph TrustCert["trust_certification"]
        CertEngine[Trust Certification Engine]
        Classifier[Certificate Classification Engine]
        CertGen[Trust Certificate Generator]
        Signer[Certificate Signer]
        Verifier[Certificate Verifier]
    end

    Engine --> TrustIdx
    Engine --> Attest
    TrustIdx --> Engine
    Attest --> Engine
    Engine --> Proof
    Engine --> Report
    Engine --> Elig

    TrustIdx --> Elig
    Elig --> CertEngine
    TrustIdx --> CertEngine
    CertEngine --> Classifier
    CertEngine --> CertGen
    CertGen --> Signer
    Signer --> Verifier
```

---

## 3 — Component Diagram (C4 Level 3)

Components inside `src/network/inter_org_trust/` and their interactions.

```mermaid
flowchart TB
    subgraph Inputs
        Meta[node metadata<br/>NodeMetadataWithCommitment[]]
        Scores[trust scores<br/>NodeTrustScore[]]
        SLA[SLA consensus<br/>SLAConsensusCheckResult]
        Records[node records<br/>FederatedNodeRecord[]]
        Anchors[trust anchors<br/>TrustAnchor[]]
    end

    subgraph inter_org_trust
        Engine[inter_org_trust_engine]
        TrustIdx[trust_index_engine]
        Attest[certificate_attestation_verifier]
        Proof[trust_proof_generator]
        Report[federated_trust_report_builder]
    end

    subgraph Outputs
        Indices[node_trust_indices<br/>NodeTrustIndex[]]
        ProofOut[TrustProof]
        ReportOut[FederatedTrustReport]
    end

    Meta --> Engine
    Scores --> Engine
    SLA --> Engine
    Records --> Engine
    Anchors --> Engine

    Engine --> Attest
    Attest --> Engine
    Engine --> TrustIdx
    TrustIdx --> Indices
    Engine --> Proof
    Indices --> Proof
    Proof --> ProofOut
    Engine --> Report
    Indices --> Report
    ProofOut --> Report
    Report --> ReportOut
```

---

## 4 — Trust Index Computation Flow

Protocol flow for trust index calculation (declared → observed → verified → formula → level).

```mermaid
flowchart TB
    A[Node Metadata Input] --> B[Declared Trust Extraction<br/>NodeTrustScore lookup or 0.5]
    B --> C[Observed Trust Calculation<br/>SLAConsensusCheckResult]
    C --> D{Node in consensus lists?}
    D -->|nodes_outside_consensus| E[observed = 0.1]
    D -->|nodes_missing_sla| F[observed = 0.25]
    D -->|none| G[observed = 1]
    D -->|no consensus| H[observed = 0.75]
    E --> I[Verified Trust Calculation<br/>CertificateAttestationResult]
    F --> I
    G --> I
    H --> I
    I --> J{Attestation result?}
    J -->|valid + anchor| K[verified = 1]
    J -->|valid, no anchor| L[verified = 0.4]
    J -->|invalid| M[verified = 0]
    J -->|no attestation| N[verified = 0.5]
    K --> O[Trust Index Formula]
    L --> O
    M --> O
    N --> O
    O --> P["0.5 × declared + 0.3 × observed + 0.2 × verified<br/>clamp to [0, 1]"]
    P --> Q[Trust Level Classification]
    Q --> R{score}
    R -->|≥ 0.8| S[HIGH]
    R -->|≥ 0.6| T[MEDIUM]
    R -->|≥ 0.3| U[LOW]
    R -->|< 0.3| V[UNTRUSTED]
```

---

## 5 — Certificate Eligibility Flow

Eligibility process from trust indices to status and reason.

```mermaid
flowchart TB
    A[Trust Indices<br/>NodeTrustIndex[]] --> B[Eligibility Engine<br/>evaluateCertificateEligibility]
    B --> C[Sort by node_id]
    C --> D[Map trust_level to status]
    D --> E{Eligibility Status}
    E -->|HIGH trust| F[ELIGIBLE<br/>reason: TRUST_HIGH]
    E -->|MEDIUM trust| G[PROBATION<br/>reason: TRUST_MEDIUM]
    E -->|LOW trust| H[PROBATION<br/>reason: TRUST_LOW]
    E -->|UNTRUSTED| I[INELIGIBLE<br/>reason: NODE_UNTRUSTED]
    F --> J[NodeCertificateEligibility[]]
    G --> J
    H --> J
    I --> J
```

---

## 6 — Trust Certification Flow

End-to-end flow in `src/network/trust_certification/`: indices + eligibility → classification → generation → hash → signing.

```mermaid
flowchart TB
    A[Trust Indices] --> B[Eligibility Results]
    B --> C[Trust Certification Engine<br/>runTrustCertificationEngine]
    C --> D[Certificate Classification Engine<br/>classifyTrustCertificate]
    D --> E{Eligibility + Trust Level}
    E -->|ELIGIBLE + HIGH| F[GOLD]
    E -->|PROBATION + MEDIUM| G[SILVER]
    E -->|PROBATION + LOW| H[BRONZE]
    E -->|INELIGIBLE| I[null - no certificate]
    F --> J[Trust Certificate Generator<br/>generateTrustCertificates]
    G --> J
    H --> J
    J --> K[Build payload: node_id, organization_id,<br/>trust_index, trust_level, certificate_level, timestamp]
    K --> L[Certificate Hash<br/>sha256Hex stableStringify payload]
    L --> M[FederatedTrustCertificate]
    M --> N[Certificate Signer<br/>signTrustCertificate]
    N --> O[signature = sha256 certificate_hash + signingKey]
    O --> P[Signed Certificate + Signature]
```

---

## 7 — Certificate Verification Flow

Verification steps: recompute hash, recompute signature, compare.

```mermaid
flowchart TB
    A[Certificate Input<br/>FederatedTrustCertificate] --> B[Recompute Certificate Hash<br/>computeCertificateHashPayload]
    B --> C[Payload: node_id, organization_id,<br/>trust_index, trust_level,<br/>certificate_level, certificate_timestamp]
    C --> D{expectedHash ===<br/>certificate.certificate_hash?}
    D -->|No| E[INVALID]
    D -->|Yes| F[Recompute Signature<br/>signTrustCertificate cert signingKey]
    F --> G{expectedSignature ===<br/>signature?}
    G -->|No| E
    G -->|Yes| H[VALID]
```

---

## 8 — Deterministic Trust Proof Chain

How trust proof and report hashes are produced deterministically.

```mermaid
flowchart TB
    A[Trust Indices<br/>NodeTrustIndex[]] --> B[Attestation Results]
    B --> C[Trust Proof Generator<br/>generateTrustProof]
    C --> D[Trust Summary<br/>total_nodes, average_trust_index,<br/>highest_trust_node, lowest_trust_node,<br/>verified_node_count, untrusted_node_count]
    D --> E[Payload: timestamp, evaluated_nodes,<br/>trust_summary, node_trust_indices,<br/>attestation_results]
    E --> F[Stable Serialization<br/>stableStringify - sorted keys]
    F --> G[SHA-256 Hash]
    G --> H[Trust Proof<br/>trust_hash, timestamp, evaluated_nodes, trust_summary]
    H --> I[Federated Trust Report Builder<br/>buildFederatedTrustReport]
    I --> J[Payload: node_trust_indices,<br/>attestation_results, trust_proof]
    J --> K[Stable Serialization]
    K --> L[SHA-256 Hash]
    L --> M[Report Hash]
    M --> N[FederatedTrustReport<br/>report_hash]
```
