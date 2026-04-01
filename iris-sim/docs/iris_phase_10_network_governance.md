# IRIS Phase 10 — Network Governance

## Architecture and System Documentation

---

## 1 — Introduction

**IRIS Network Governance** is the distributed governance layer introduced in Phase 10 of the IRIS project. It provides a **verifiable, audit-friendly, and federated** foundation for AI governance across multiple nodes. Prior phases established local governance state, certification, observability, and safety proofs; Phase 10 extends this into a **network-level** model where nodes have stable identities, maintain trust relationships, and can exchange and reconcile governance state without central authority.

Phase 10 addresses the architectural need for **multi-node coordination**: how nodes identify each other, how they represent and share trust, how they produce and consume governance snapshots, and how they prepare for future distributed consensus. Without this layer, IRIS would remain a single-node or ad-hoc system; with it, IRIS becomes an **AI governance network** capable of federated trust, export/import of governance packages, and a clear path to consensus in Phase 11.

This phase introduces:

- **Node identity** — Cryptographically stable identity per node (`node_id`), forming the basis of all cross-node operations.
- **Verifiable governance** — Governance state and certificates that can be stored, queried, and verified locally and across nodes.
- **Trust graph** — An explicit graph of trust relationships (nodes and edges) used for policy evaluation and federation.
- **Deterministic snapshots** — Canonical, hashable representations of governance state (trust graph, policy, decisions) for audit and replay.
- **Federation** — Merging trust graphs and governance data from multiple nodes into a unified view and federated snapshots.
- **Consensus preparation** — Structures for attestations, quorum definitions, governance proofs, and consensus context, without yet executing distributed consensus.

Together, these elements form the **IRIS Governance Network**: a system where governance is explicit, traceable, and shareable across nodes.

---

## 2 — Objectives of Phase 10

The main objectives of Phase 10 are:

1. **Build a verifiable governance system between IRIS nodes**  
   Nodes can prove their identity, store and retrieve governance certificates, and validate state produced by other nodes. Cross-node verification does not rely on a central server; it is based on hashes, signatures, and deterministic structures.

2. **Enable audit and deterministic replay**  
   Every material change to governance can be recorded in an append-only event log. From this log, any past state can be reconstructed in a deterministic way. Auditors and operators can verify that a given snapshot corresponds to a specific event history.

3. **Enable federation of trust**  
   Trust is not only local: nodes can merge trust graphs and policy outcomes from other nodes, compute federated trust scores, and produce federation snapshots. This supports multi-node coordination and shared policies without a single point of control.

4. **Prepare the network for distributed consensus**  
   A dedicated layer (Governance Consensus Preparation) introduces attestations, quorum definitions, governance proofs, consensus proposals, and consensus context. This layer does not run consensus; it produces the **inputs** that a future Phase 11 consensus layer will consume.

These objectives are essential for an **AI governance network**: identity and verification support accountability; audit and replay support compliance and forensics; federation supports scale and coordination; consensus preparation supports future multi-node agreement on governance decisions.

---

## 3 — Architectural Overview

Phase 10 is implemented as a **governance stack** of twelve logical modules (microsteps 10A–10L). Each module has a clear responsibility and well-defined interfaces; together they form the IRIS Node Governance Stack.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IRIS NODE GOVERNANCE STACK                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  10A  Node Identity Engine                                                   │
│  10B  Governance Certificate Registry                                        │
│  10C  Cross Node Verification Engine                                         │
│  10D  Governance Trust Graph Engine                                          │
│  10E  Governance Trust Policy Engine                                          │
│  10F  Governance Trust Snapshot Engine                                       │
│  10G  Governance Trust Event Log Engine                                       │
│  10H  Governance Trust State Replay Engine                                    │
│  10I  Governance Trust Export Engine                                          │
│  10J  Governance Trust Import & Validation Engine                             │
│  10K  Governance Trust Federation Engine                                      │
│  10L  Governance Consensus Preparation Layer                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Logical flow:** Identity (10A) is the root. Certificates (10B) and cross-node verification (10C) allow nodes to store and validate governance artifacts. The trust graph (10D) and policy engine (10E) represent and evaluate trust rules. Snapshots (10F) capture state at a point in time; the event log (10G) and replay engine (10H) provide event sourcing and audit. Export (10I) and import (10J) allow exchange of governance packages; federation (10K) merges trust and produces federated snapshots. The consensus preparation layer (10L) builds attestations, quorum, proofs, and context for future distributed consensus. There is no networking in Phase 10; all modules operate on local or in-memory data.

---

## 4 — Description of Microsteps

### 10A — Node Identity Engine

The **Node Identity Engine** establishes a stable, cryptographic identity for an IRIS node. It generates and exposes a **node_id** (and related identity material) that is deterministic from the node’s configuration and seed data. This identity is the foundation for all governance operations that refer to “this node” or “another node”: certificates, trust edges, attestations, and federation all key off node identity.

**Responsibilities:** Generate and expose node identity; produce deterministic identity hashes; support verification of identity integrity (including tamper detection).

**Main components:** Identity types, identity engine, identity hashing, identity verifier.

**Outputs:** Node identity object including `node_id`, metadata, and identity hash.

**Role:** Base layer for distributed governance; every reference to a node in the network stack ultimately ties back to this identity.

---

### 10B — Governance Certificate Registry

The **Governance Certificate Registry** is a local store for governance certificates. Certificates represent attested governance state (e.g. snapshots, compliance results) and can be stored, retrieved, and verified. The registry supports storage by certificate id, listing, and querying by organization or type.

**Responsibilities:** Store certificates; prevent duplicates; retrieve by id; list and query by organization/type; integrate with verification so that stored certificates can be validated.

**Main components:** Registry types, registry implementation (store, duplicate checks, queries).

**Outputs:** Persistent certificate storage and query results.

**Role:** Central place for governance artifacts that need to be reused or shared (e.g. for cross-node verification or export).

---

### 10C — Cross Node Verification Engine

The **Cross Node Verification Engine** provides the logic to **verify** governance artifacts that originate from another node or from an import. It validates structure, hashes, and (where applicable) signatures so that a node can trust or reject external governance data without relying on a central authority.

**Responsibilities:** Validate certificates and snapshots from other nodes; verify hashes and integrity; support trust decisions based on verification outcomes.

**Main components:** Cross-node verification types and verification procedures.

**Outputs:** Verification results (valid/invalid, optionally with reason).

**Role:** Bridge between “data from elsewhere” and “trusted input” for trust graph, policy, and federation.

---

### 10D — Governance Trust Graph Engine

The **Governance Trust Graph Engine** maintains the **trust graph**: a structure of **nodes** (identities) and **edges** (trust relationships with scores and metadata). The graph is built from certificates and other inputs; it is used by the policy engine to decide acceptance or rejection of nodes and by the federation engine to merge trust across nodes.

**Responsibilities:** Build and update the trust graph from certificates; maintain nodes and edges without duplicates; compute or expose trust scores; provide deterministic ordering for edges/nodes; support queries (e.g. trusted nodes, edges for a node).

**Main components:** Trust graph types, graph builder, trust graph engine, trust scoring, graph utilities, query API.

**Outputs:** Trust graph (nodes and edges), trust scores, query results.

**Role:** Single source of truth for “who trusts whom” and “how much”; input to policy and federation.

---

### 10E — Governance Trust Policy Engine

The **Governance Trust Policy Engine** applies **trust policies** to the trust graph. Policies define rules (e.g. minimum trust score, minimum attestations, blocklists) and the engine evaluates whether a given node is accepted or rejected. It supports configurable policy definitions and deterministic evaluation.

**Responsibilities:** Define and evaluate trust policies; produce accept/reject decisions per node; expose policy evaluation results; integrate with the trust graph for scores and attestation counts.

**Main components:** Policy types, policy definitions, policy engine, evaluator, decision engine, query API.

**Outputs:** Policy decisions (e.g. ACCEPT/REJECT), evaluation details.

**Role:** Translates trust graph and policy rules into explicit governance decisions used in snapshots and federation.

---

### 10F — Governance Trust Snapshot Engine

The **Governance Trust Snapshot Engine** produces **governance snapshots**: point-in-time, deterministic representations of the trust graph, policy, and decisions. Each snapshot has canonical hashes (e.g. for graph, policy, decisions, global hash) so that any change produces a different hash. Snapshots are the unit of export, import, and audit.

**Responsibilities:** Build snapshots from current graph and policy state; compute deterministic hashes; support audit (verify snapshot integrity); provide query API and deterministic serialization.

**Main components:** Snapshot types, snapshot builder, hash engine, audit engine, query API, utilities.

**Outputs:** Governance snapshot objects with hashes; audit results.

**Role:** Canonical, verifiable “state at time T” for replay, export, and federation.

---

### 10G — Governance Trust Event Log Engine

The **Governance Trust Event Log Engine** implements **event sourcing** for governance. It maintains an append-only **event log** (journal) where events such as verification, trust graph updates, policy decisions, and snapshot creation are recorded. Each event has a deterministic hash and ordering; the log is immutable (append-only).

**Responsibilities:** Create and append events; compute event hashes; support query by type and time range; guarantee append-only semantics; deterministic event ids and hashes.

**Main components:** Event types, event builder, event log engine, event hashing, event log query, utilities.

**Outputs:** Event log (sequence of events); query results (by type, time).

**Role:** Source of truth for “what happened” in governance; input to state replay and audit.

---

### 10H — Governance Trust State Replay Engine

The **Governance Trust State Replay Engine** **reconstructs** past governance state by replaying the event log. Given a log (or a segment of it), the engine applies events in order and rebuilds the trust graph and related state. Replay is deterministic: the same log always yields the same state. Replay can be verified (e.g. recomputed snapshot hash vs stored hash).

**Responsibilities:** Read event stream; process events in order; build trust state (graph, etc.); verify reconstructed state (e.g. snapshot verification); expose replayed state and replay metadata.

**Main components:** Replay types, event stream reader, replay processor, state builder, replay verification, query API.

**Outputs:** Reconstructed state at a point in time; verification result; replay metrics (e.g. events processed).

**Role:** Full audit trail: any historical state can be reproduced and verified from the log.

---

### 10I — Governance Trust Export Engine

The **Governance Trust Export Engine** **exports** governance state into **export packages**. A package typically includes snapshot, trust graph, policy, and metadata, with a deterministic package hash. Packages are self-contained and verifiable so that another node or the same node can validate and import them.

**Responsibilities:** Build export packages from current (or specified) state; compute deterministic export hash; generate metadata; validate package structure; provide query API; ensure deterministic serialization (e.g. normalized arrays).

**Main components:** Export types, package builder, hash engine, metadata engine, validation engine, query API.

**Outputs:** Export package (e.g. JSON-serializable) with hash and metadata.

**Role:** Enables sharing governance state between nodes or backups without runtime coupling.

---

### 10J — Governance Trust Import & Validation Engine

The **Governance Trust Import & Validation Engine** **imports** governance packages produced by the export engine (or compatible producers). It parses the package, validates structure and hashes (snapshot, policy, trust graph, package hash), and can place data into a **quarantine workspace** until the importer decides to accept it. Invalid or tampered packages are rejected.

**Responsibilities:** Parse import packages; validate hashes and structure (snapshot, policy, graph); manage quarantine workspace; support insertion of validated data into the local workspace; query imported packages; ensure deterministic import behavior.

**Main components:** Import types, package parser, hash validator, snapshot/policy/graph validators, quarantine workspace, import engine, query API.

**Outputs:** Parsed and validated package; quarantine workspace state; import result (success/failure with reason).

**Role:** Safe ingestion of external governance; validation and quarantine reduce risk of bad or malicious data.

---

### 10K — Governance Trust Federation Engine

The **Governance Trust Federation Engine** **federates** trust across multiple nodes. It takes trust graphs (and related data) from the local node and optionally from imported or other sources, merges them into a **federated trust graph**, applies **federation policy** (e.g. resolution rules when multiple nodes report on the same entity), and computes **federated trust scores**. It can produce a **federation snapshot** with a deterministic hash, representing the federated view at a point in time.

**Responsibilities:** Merge trust graphs; resolve conflicts via federation policy; compute federated trust scores; build federation snapshot; deterministic federation hash; query federated nodes and edges.

**Main components:** Federation types, federation graph builder, federation trust scoring, federation policy resolver, federation snapshot engine, federation engine, query API.

**Outputs:** Federated trust graph; federation snapshot (with hash); federated scores; query results.

**Role:** Multi-node view of trust; basis for coordination and for consensus preparation (10L) which consumes federation snapshots.

---

### 10L — Governance Consensus Preparation Layer

The **Governance Consensus Preparation Layer** prepares all **inputs** required for future **distributed consensus** (Phase 11). It does **not** run consensus or communicate over the network. It provides:

- **Attestation registry** — Collects governance attestations (node_id, snapshot_hash, timestamp) per snapshot; append-only; at most one attestation per node per snapshot.
- **Quorum definition** — From a federated trust graph, computes a **quorum definition** (e.g. required number of nodes, trust threshold) in a deterministic way.
- **Governance proof builder** — Aggregates attestations for a snapshot and produces a **governance proof** with a deterministic **proof hash** (from snapshot hash and sorted attestations).
- **Consensus proposal builder** — Builds a **consensus proposal** (proposal_id, federation_snapshot_hash, proof, timestamp) with deterministic proposal_id.
- **Consensus context builder** — Combines a proposal and a quorum definition into a **consensus context**: the full context that a future consensus layer will consume.

The **Consensus Preparation Engine** orchestrates the flow: given a federation snapshot and a set of attestations, it filters attestations by snapshot hash, registers them, computes quorum from the federation graph, builds the proof, creates the proposal, and builds the consensus context. The **Consensus Query API** provides read access to proposal, quorum, and proof from a consensus context.

**Responsibilities:** Attestation collection and registry; quorum computation; proof building; proposal creation; context building; no networking, no local governance mutation, no external dependencies.

**Main components:** Consensus types, attestation registry, quorum engine, governance proof builder, consensus proposal builder, consensus context builder, consensus preparation engine, consensus query API.

**Outputs:** Consensus context (proposal + quorum); attestations; governance proof; quorum definition.

**Role:** Bridge to Phase 11; ensures that consensus algorithms receive deterministic, verifiable, and audit-friendly inputs.

---

## 5 — Complete Governance Flow

The modules work together in a logical pipeline:

```
  node identity (10A)
         ↓
  certificate registry (10B)  ←───────────────────┐
         ↓                                          │
  cross node verification (10C)                     │
         ↓                                          │
  trust graph (10D)  ←── certificates / imports ────┘
         ↓
  policy evaluation (10E)
         ↓
  snapshot generation (10F)
         ↓
  event log (10G)  ←── append events
         ↓
  state replay (10H)  ←── read log, reconstruct state
         ↓
  export governance (10I)  ←── snapshot + graph + policy → package
         ↓
  import governance (10J)  ←── validate package, optional quarantine
         ↓
  trust federation (10K)  ←── merge graphs, federation snapshot
         ↓
  consensus preparation (10L)  ←── attestations, quorum, proof, proposal, context
```

- **Identity** is the root for all node-scoped data.
- **Certificates** and **cross-node verification** feed the **trust graph** and policy.
- **Trust graph** and **policy** feed **snapshots**; snapshots and other actions feed the **event log**.
- **Replay** consumes the event log for audit.
- **Export** packages current (or chosen) state; **import** and validation bring in external state.
- **Federation** merges trust and produces federation snapshots; **consensus preparation** turns federation snapshots and attestations into consensus context for Phase 11.

No step in this flow requires network I/O in Phase 10; integration with transport and consensus is left to later phases.

---

## 6 — Architectural Principles of IRIS Governance

Phase 10 is designed around six principles:

- **Determinism** — Same inputs (identity seed, graph, policy, event log, attestations) always produce the same outputs (hashes, snapshots, proposals, context). This is required for verification, replay, and consensus.

- **Auditability** — Every material change can be recorded in the event log; state can be replayed; snapshots and packages have hashes. Auditors can trace how a given state was reached.

- **Immutability** — Event log is append-only; attestation registry is append-only; past state is not rewritten. History is preserved.

- **Federation** — Trust and governance can be merged from multiple sources (local + imported) with explicit resolution rules. No single node is the sole authority.

- **Verifiability** — Artifacts (certificates, snapshots, packages, proofs) carry hashes and optional signatures. Any component can verify integrity and origin without trusting the channel.

- **Trust-graph-based governance** — Decisions (policy, federation, quorum) are grounded in an explicit trust graph and policies rather than ad-hoc rules. The graph is queryable and auditable.

These principles support compliance, forensics, and safe evolution toward distributed consensus.

---

## 7 — Code Structure

The Phase 10 implementation lives under a single parent directory, with one subdirectory per logical module:

```
src/network/
├── node_identity/           # 10A — Node Identity Engine
├── governance_registry/     # 10B — Governance Certificate Registry
├── cross_node_verification/ # 10C — Cross Node Verification Engine
├── trust_graph/             # 10D — Governance Trust Graph Engine
├── trust_policy/            # 10E — Governance Trust Policy Engine
├── trust_snapshot/          # 10F — Governance Trust Snapshot Engine
├── trust_event_log/         # 10G — Governance Trust Event Log Engine
├── trust_state_replay/      # 10H — Governance Trust State Replay Engine
├── trust_export/            # 10I — Governance Trust Export Engine
├── trust_import/            # 10J — Governance Trust Import & Validation Engine
├── trust_federation/        # 10K — Governance Trust Federation Engine
├── governance_consensus/    # 10L — Governance Consensus Preparation Layer
└── index.ts                 # Re-exports all Phase 10 modules
```

Each module typically contains types, one or more engines or builders, and query/utility code. The root `index.ts` re-exports the public API of all modules so that the rest of IRIS can depend on `network` as a single entry point for Phase 10.

---

## 8 — Result of Phase 10

At the end of Phase 10, IRIS has:

- **Stable node identity** — Every node has a deterministic `node_id` and identity material.
- **Governance state** — Certificates, trust graph, policy, and decisions are stored and queryable.
- **Trust graph** — Explicit nodes and edges with scores and metadata.
- **Policy evaluation** — Accept/reject and policy results derived from the graph.
- **Event sourcing** — Append-only event log for all material governance changes.
- **State replay** — Deterministic reconstruction and verification of past state.
- **Export/import of governance** — Verifiable packages and validated import with optional quarantine.
- **Federated trust network** — Merged trust graph, federated scores, and federation snapshots.
- **Consensus preparation layer** — Attestations, quorum, governance proofs, consensus proposals, and consensus context, ready for Phase 11.

Together, this constitutes an **infrastructure for distributed AI governance**: multi-node identity, verifiable state, explicit trust, audit trail, safe exchange of governance data, and a clear path to consensus without yet implementing consensus or network protocols in this phase.

---

## 9 — Preparation for Phase 11

Phase 10 explicitly prepares for **Phase 11 — Distributed Governance Consensus** by:

- **Distributed governance** — Identity, trust graph, and federation form the vocabulary and data structures that consensus will use (e.g. “which nodes”, “what trust”, “which snapshot”).
- **Multi-node decision making** — Consensus context carries proposal and quorum; the consensus layer will consume this to run agreement protocols.
- **Federated AI coordination** — Federation snapshots provide a shared view of trust; consensus can operate on the same snapshot hash and attestations.
- **Verifiable governance** — Proofs and hashes allow consensus participants to verify inputs and outcomes without trusting a single authority.

Phase 11 will add the **distributed consensus** logic (protocol, messaging, and decision rules). Phase 10 does not implement that; it only produces the **Consensus Context** and related structures that Phase 11 will use as input.

---

## 10 — Conclusion

Phase 10 establishes **IRIS Network Governance**: a **distributed, verifiable, and federated** governance layer for the IRIS AI governance network. It introduces node identity, certificate registry, cross-node verification, trust graph, policy engine, snapshots, event log, state replay, export/import, trust federation, and consensus preparation. All components are deterministic, audit-friendly, and free of network or external dependencies within this phase.

The result is a single, coherent **governance stack** that can be audited, onboarded, and extended. It provides the architectural and data foundation for Phase 11 and for any future use of IRIS as a multi-node AI governance network.

---

*Document: IRIS Phase 10 — Network Governance (Architecture).*  
*Version: 1.0. For audit, onboarding, and architectural reference.*
