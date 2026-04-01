# IRIS Protocol — Phase 13: Network Trust Intelligence

This document describes the **Network Trust Intelligence** architecture of the IRIS Protocol: a complete, deterministic trust intelligence layer for decentralized networks. Phase 13 introduces behavior-based trust evaluation, anomaly detection, recovery mechanisms, governance escalation, observability, and explainability—all without randomness and with reproducible results across nodes.

---

## 1 — Overview

### Purpose of Phase 13

Phase 13 provides the protocol with a **trust intelligence architecture** that turns raw node behavior into trust scores, anomaly signals, recovery states, and governance-ready events. The system answers: *who can be trusted, why, and what the network should do about untrusted or suspicious behavior.*

### Why Trust Intelligence in Decentralized Systems

In decentralized networks, participants are not centrally vetted. Trust must be derived from observable behavior and maintained over time. Traditional reputation systems often rely on:

- Centralized or opaque scoring
- Non-deterministic or non-auditable logic
- Weak links to governance and recovery

This makes it hard to audit decisions, reproduce results across nodes, or integrate trust with protocol governance.

### The IRIS Approach

Phase 13 uses **behavior-based, deterministic trust evaluation**:

- **Behavior** is recorded as events (e.g. action submissions, consensus votes, validations, governance participation).
- **Metrics** are normalized so that scores are comparable and resistant to inflation.
- **Reputation** is computed from normalized metrics with optional temporal decay.
- **Trust relationships** are modeled as a directed, weighted graph.
- **Anomalies** (outliers, consensus manipulation, collusion, Sybil-like patterns) are detected by fixed rules.
- **Recovery** (probation, cooldown, restriction, restoration) is applied via deterministic policies.
- **Governance** receives structured triggers (events), not direct state changes.
- **Observability** and **explainability** expose metrics and reasons for trust decisions.

The phase enables the network to:

- Monitor node behavior in a structured, append-only way
- Compute deterministic reputation scores
- Detect anomalies and suspicious patterns
- Apply recovery mechanisms (probation, cooldown, restriction) and allow gradual restoration
- Escalate risks to governance via the Trust Governance Bridge
- Provide network-wide observability (health, distribution, anomaly activity)
- Explain why a node has a given trust state, reputation, or recovery status

---

## 2 — Architectural Goals

The trust intelligence system is designed around the following principles.

| Principle | Description |
|-----------|-------------|
| **Determinism** | All outputs depend only on inputs; no randomness. Same inputs produce the same reputation, anomaly reports, recovery actions, and observability/explainability outputs on every node. |
| **Security-first** | Design supports Sybil resistance, consensus manipulation detection, trust graph collusion detection, and behavior outliers. Recovery and governance escalation limit impact of malicious or faulty nodes. |
| **Governance integration** | Trust intelligence does not execute governance; it produces **governance triggers** (events). Phase 12 remains the single authority for governance actions and state. |
| **Network self-regulation** | Recovery (probation, cooldown, restriction) and restoration are applied automatically from anomaly reports and policies, reducing need for manual intervention while avoiding permanent punishment. |
| **Explainability** | Structured explanations (reputation factors, anomaly sources, recovery reasons) make trust decisions auditable and debuggable without relying on natural language or hidden logic. |
| **Observability** | Centralized telemetry (health metrics, trust distribution, anomaly activity) supports monitoring, dashboards, and audit of the trust layer. |

---

## 3 — Phase 13 Pipeline

The trust intelligence pipeline is a linear flow from behavior capture to observability and explainability. Each stage consumes outputs from the previous one and produces inputs for the next.

```
Behavior Monitoring Engine (13C)
        ↓
Trust Data Normalization Layer (13F)
        ↓
Node Reputation Engine (13A)
        ↓
Trust Graph Engine (13B)
        ↓
Anomaly Detection Engine (13D)
        ↓
Trust Recovery Framework (13E)
        ↓
Trust Governance Bridge (13G)
        ↓
Network Trust Observatory (13H)
        ↓
Trust Explainability Engine (13I)
```

The pipeline transforms **network behavior** into **trust intelligence** (reputation, graph, anomalies, recovery) and then into **governance signals** (events), **observability reports**, and **explainability outputs**. No stage uses randomness; ordering and aggregation rules are fixed so that results are reproducible across nodes.

---

## 4 — Microstep Descriptions

### 13C — Behavior Monitoring Engine

- **Purpose:** Provide the behavioral data foundation for all downstream trust components. Every relevant node action is recorded as an event and aggregated into a behavior profile.
- **Responsibilities:** Track node activity; record behavioral events in an append-only store; compute behavior metrics (e.g. action count, consensus votes, validations, governance actions); maintain behavior history per node.
- **Data produced:** `NodeBehaviorEvent` (per observation), `NodeBehaviorProfile` (per node: total events and counts by category). Events are immutable; profiles are derived deterministically from event history.

### 13F — Trust Data Normalization Layer

- **Purpose:** Turn raw behavior metrics into normalized, comparable scores so that reputation and anomaly logic are fair and resistant to manipulation (e.g. activity inflation).
- **Responsibilities:** Compute a network-wide activity baseline; normalize activity, consensus, validation, and governance scores into a fixed range (e.g. 0–1); apply temporal smoothing when needed.
- **Data produced:** `NormalizedBehaviorMetrics` per node (normalized scores, baseline, timestamp). All scores are clamped and deterministically computed.

### 13A — Node Reputation Engine

- **Purpose:** Compute a single reputation score per node from normalized metrics, and support gradual decay when nodes become inactive.
- **Responsibilities:** Apply configurable weights to normalized metrics; compute weighted reputation score (clamped 0–1); apply reputation decay when inactivity is detected; support batch computation with deterministic ordering.
- **Data produced:** `NodeReputationProfile` (node_id, reputation_score, optional previous_score, last_updated). Used by the trust graph, anomaly logic, and recovery.

### 13B — Trust Graph Engine

- **Purpose:** Build and maintain a directed, weighted trust graph that represents who trusts whom and how strongly, and to support propagation and decay of trust.
- **Responsibilities:** Build nodes from reputation profiles; create edges with weights derived from reputation (e.g. average of source and target); apply propagation (e.g. A→B, B→C ⇒ A→C with attenuated weight); apply trust decay; enforce a maximum number of edges per node to avoid explosion.
- **Data produced:** `TrustGraph` (nodes, edges). Used by anomaly detection (e.g. collusion, Sybil) and by observability/explainability.

### 13D — Anomaly Detection Engine

- **Purpose:** Detect suspicious or abusive patterns so that recovery and governance can be triggered. No state is modified; only reports are produced.
- **Responsibilities:** Detect activity outliers (e.g. far above mean + 2× std); detect consensus manipulation (e.g. very high consensus ratio and above-median activity); detect trust graph collusion (e.g. clusters with mostly internal edges); detect Sybil-like patterns (similar metrics, similar reputation, mutual trust). Produce `AnomalyReport` per finding with type and score.
- **Data produced:** `AnomalyReport[]` (node_id, anomaly_type, anomaly_score, timestamp). Consumed by recovery and governance bridge.

### 13E — Trust Recovery Framework

- **Purpose:** Map anomaly reports and current trust state into recovery actions and updated node trust states (e.g. probation, cooldown, restriction) and allow restoration when conditions are met.
- **Responsibilities:** Evaluate deterministic recovery policy per anomaly type (e.g. activity outlier → probation, consensus manipulation → cooldown, collusion/Sybil → restriction); apply probation, cooldown, or restriction; support restoration from cooldown to probation and from probation to trusted when reputation is above threshold and no new anomalies are considered.
- **Data produced:** `RecoveryAction[]` and updated `NodeTrustState[]`. States are TRUSTED, PROBATION, COOLDOWN, RESTRICTED.

### 13G — Trust Governance Bridge

- **Purpose:** Turn trust intelligence (anomalies, trust states, reputations) into **governance triggers** (events) that the Phase 12 governance layer can consume. The bridge does not execute governance; it only produces structured events.
- **Responsibilities:** Evaluate escalation policies (e.g. Sybil pattern when >3 nodes, trust graph attack, consensus manipulation, reputation collapse); build `TrustGovernanceEvent` with deterministic event_id (e.g. hash of type + sorted nodes + timestamp); return events sorted for deterministic ordering.
- **Data produced:** `TrustGovernanceEvent[]` (event_id, event_type, affected_nodes, severity, timestamp). Event types include SYBIL_PATTERN, TRUST_GRAPH_ATTACK, CONSENSUS_MANIPULATION, REPUTATION_COLLAPSE, ANOMALY_CLUSTER.

### 13H — Network Trust Observatory

- **Purpose:** Provide read-only telemetry and analytics over the whole trust pipeline for monitoring, dashboards, and audit.
- **Responsibilities:** Compute network health (average reputation, trust concentration, anomaly rate, recovery activity rate, governance event rate); analyze trust distribution (min/max/median, high-trust and low-trust counts); analyze anomaly activity (counts by type, affected node count). All outputs are deterministic and sorted where applicable.
- **Data produced:** `NetworkHealthReport`, `TrustDistributionReport`, `AnomalyActivityReport`. No state is modified.

### 13I — Trust Explainability Engine

- **Purpose:** Explain why a node has a given reputation, anomaly flag, or recovery state in a structured, deterministic way for transparency and debugging.
- **Responsibilities:** Explain reputation (contributing factors, positive/negative signals from score and optional previous score); explain anomalies affecting a node (types, count, sources); explain recovery state (current state, reason, previous state when available). Produce a combined `TrustExplainabilityReport` per node.
- **Data produced:** `TrustExplainabilityReport` (reputation explanation, anomaly explanation, recovery explanation). Read-only; no state changes.

---

## 5 — Trust Intelligence Data Flow

Data flows through the pipeline as follows:

1. **Behavior events** — Recorded by the Behavior Monitoring Engine (13C) as immutable events and aggregated into `NodeBehaviorProfile` per node.
2. **Normalized metrics** — The Trust Data Normalization Layer (13F) computes baseline and normalized scores (0–1) from behavior profiles.
3. **Reputation computation** — The Node Reputation Engine (13A) turns normalized metrics into a single reputation score per node, with optional decay.
4. **Trust graph** — The Trust Graph Engine (13B) builds/updates the graph from reputations, applies propagation and decay, and enforces edge limits.
5. **Anomaly detection** — The Anomaly Detection Engine (13D) consumes behavior profiles, normalized metrics, reputations, and the trust graph to produce anomaly reports.
6. **Recovery actions** — The Trust Recovery Framework (13E) maps anomalies and current trust states to recovery actions and updated node states.
7. **Governance triggers** — The Trust Governance Bridge (13G) maps anomalies, trust states, and reputations into governance events (e.g. for Phase 12).
8. **Observability reports** — The Network Trust Observatory (13H) aggregates health, distribution, and anomaly activity into telemetry reports.
9. **Explainability outputs** — The Trust Explainability Engine (13I) produces per-node explanations (reputation, anomaly, recovery).

Deterministic processing is ensured by: fixed formulas, no randomness, explicit timestamps as parameters, and sorted outputs (e.g. by node_id, event_type, or timestamp) so that all nodes produce identical results for the same inputs.

---

## 6 — Integration with Governance (Phase 12)

Phase 13 does not execute governance; it produces **signals** that Phase 12 can use.

### Role of the Trust Governance Bridge (13G)

The Trust Governance Bridge turns trust intelligence into **governance triggers**:

- Anomaly clusters, Sybil patterns, consensus manipulation, trust graph attacks, and reputation collapse are mapped to `TrustGovernanceEvent` types.
- Each event carries: event_id, type, affected_nodes, severity, and timestamp.
- Downstream systems (e.g. Phase 12 Governance Action Model, Registry, or attestation) can consume these events to propose or trigger governance actions (e.g. restrict node set, temporary validator suspension).

### Boundaries

- **Trust intelligence does not directly change governance state.** It only produces events and reports.
- **Governance actions remain under the control of the Phase 12 governance layer.** Phase 13 informs that layer; it does not replace it.

This keeps a clear separation: trust intelligence is observational and advisory; governance execution stays in Phase 12.

---

## 7 — Security Implications

Phase 13 adds **active trust monitoring** to the protocol:

| Capability | Description |
|------------|-------------|
| **Sybil detection** | Nodes with nearly identical metrics and reputation and dense mutual trust can be flagged as SYBIL_INDICATOR and escalated (e.g. restriction or governance review). |
| **Consensus manipulation detection** | Unusually high consensus-to-activity ratio with high total activity can indicate consensus flooding; triggers cooldown and optionally governance events. |
| **Trust graph attack detection** | Clusters that trust mostly each other (high internal edge ratio) are flagged as TRUST_COLLUSION_CLUSTER and can be restricted. |
| **Behavior anomaly detection** | Activity outliers and other anomaly types provide early signals of abuse or malfunction. |
| **Network self-healing** | Recovery (probation, cooldown, restriction) and restoration (back to probation or trusted when conditions are met) allow the network to mitigate bad actors without permanent bans, while explainability and observability support audit. |

Together, these mechanisms improve the protocol’s ability to detect and respond to trust-related attacks and misbehavior in a deterministic, auditable way.

---

## 8 — Observability and Transparency

### Network Trust Observatory (13H)

The observatory provides **read-only telemetry** over the trust pipeline:

- **Network health:** Total nodes, average reputation, trust concentration index, anomaly rate, recovery activity rate, governance event rate.
- **Trust distribution:** Sorted reputation distribution, min/max/median, counts of high-trust and low-trust nodes.
- **Anomaly activity:** Total anomalies, counts by type (with deterministic key order), and number of affected nodes.

Outputs are deterministic and suitable for dashboards, monitoring, and long-term audit.

### Trust Explainability Engine (13I)

The explainability engine provides **structured explanations** of trust-related outcomes:

- **Reputation:** Which factors contributed (e.g. reputation_score, last_updated), and which positive or negative signals apply (e.g. above/below threshold, improved/declined).
- **Anomalies:** Which anomaly types affect a node, how many, and from which sources (e.g. type:score).
- **Recovery:** Current trust state, reason for that state (e.g. probation, cooldown, restriction), and previous state when available.

Together, the observatory and explainability engine support **network telemetry**, **trust distribution visibility**, **audit capability**, and **deterministic explanations** of trust decisions without modifying any trust or governance state.

---

## 9 — Deterministic Architecture

The entire Phase 13 trust intelligence system is **deterministic**:

- **No randomness** — No random number generators; all outputs are functions of inputs and fixed rules.
- **Sorted outputs** — Lists (e.g. events, reports, nodes) are sorted by stable keys (e.g. node_id, event_type, timestamp) so that order is reproducible.
- **Stable metrics** — Normalization, reputation, and severity use fixed formulas and clamped ranges (e.g. 0–1).
- **Reproducible results** — Given the same behavior data, reputations, trust states, and anomalies, every node produces the same reputation scores, anomaly reports, recovery actions, governance events, observability reports, and explainability outputs.

Determinism is critical in decentralized protocols so that:

- All participants can recompute and verify trust outcomes.
- Audits and debugging do not depend on non-reproducible behavior.
- Governance and recovery decisions are consistent across the network.

---

## 10 — Expected Outcomes

With Phase 13, the IRIS Protocol gains:

- **Behavior-aware decentralized trust** — Trust is derived from observable behavior and normalized metrics, not from opaque or centralized rules.
- **Automated anomaly detection** — Outliers, consensus manipulation, collusion, and Sybil-like patterns are detected by deterministic rules and reported for recovery and governance.
- **Trust-based network governance signals** — The Trust Governance Bridge turns trust intelligence into governance events that Phase 12 can use without blurring the boundary between observation and execution.
- **Network-wide trust observability** — Health, distribution, and anomaly activity are available for monitoring and audit.
- **Explainable trust decisions** — Per-node explanations make it clear why a node has a given reputation, anomaly flag, or recovery state.

The protocol therefore includes a **complete trust intelligence layer** that runs from behavior capture through reputation, graph, anomaly, recovery, governance triggers, observability, and explainability—all deterministic and auditable.

---

## 11 — Future Extensions

Possible future improvements (out of scope for the current specification) include:

- **Machine-learning assisted anomaly detection** — Additional signals from ML models while keeping core logic and governance triggers deterministic and auditable.
- **Cross-network trust federation** — Sharing or aligning trust signals across multiple IRIS networks or with other protocols.
- **Long-term trust history analysis** — Persisted history of reputation and recovery for trend analysis and forensics.
- **Visual trust dashboards** — UIs consuming observability and explainability outputs for operators and auditors.

The current Phase 13 system remains **fully deterministic** and does not depend on any of the above. Any future extension should preserve determinism and clear separation from governance execution.

---

*End of Phase 13 — Network Trust Intelligence architecture document.*
