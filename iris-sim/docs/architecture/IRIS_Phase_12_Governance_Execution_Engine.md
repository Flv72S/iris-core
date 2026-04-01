# IRIS Protocol — Phase 12: Governance Execution Engine

**Architectural Reference Document**

This document describes the complete implementation of **Phase 12 — Governance Execution Engine**, the execution layer that transforms governance consensus into executable, auditable, and cryptographically attested actions.

---

## 1 — Phase 12 Overview

Phase 12 implements the **execution layer of the governance system** within the IRIS Protocol. Its purpose is to take outcomes from governance consensus and turn them into concrete, traceable operations that can be authorized, executed, recorded, and attested in a deterministic way.

**Core objectives:**

- **Transformation of governance consensus into executable actions** — Decisions produced by earlier governance phases are represented as structured *governance actions* with stable identity and metadata.
- **Deterministic governance execution** — Execution outcomes are reproducible from the same inputs; no randomness or non-deterministic behaviour is used.
- **Authorization enforcement** — Every action is checked for roles, policy, and scope before execution; unauthorized actions are rejected.
- **Execution traceability** — Every action and its lifecycle (authorization, execution, or rejection) are stored in an immutable, append-only registry.
- **Cryptographic attestation** — Execution results can be signed and verified, enabling independent audit and cross-node verification.

Phase 12 does not define *how* consensus is reached (that belongs to earlier phases); it defines *how* the result of that consensus is executed, recorded, and proven.

---

## 2 — Architectural Role in IRIS Protocol

Phase 12 sits on top of the governance model and architecture defined in Phase 10 and Phase 11. It consumes the *output* of governance consensus (e.g. approved proposals, parameter changes, node operations) and implements the pipeline that turns them into executed, auditable operations.

**Relationships:**

- **Phase 10 — Governance Model** — Defines governance concepts, roles, and policies. Phase 12 uses these concepts to define action types, authorization rules, and execution semantics.
- **Phase 11 — Governance Architecture** — Defines the overall governance architecture and components. Phase 12 implements the *execution* part of that architecture.

**End-to-end pipeline:**

```
Governance Proposal
        ↓
Governance Consensus
        ↓
Governance Action Model (12A)
        ↓
Authorization Layer (12C)
        ↓
Execution Engine (12B)
        ↓
Action Registry (12D)
        ↓
Execution Attestation (12E)
```

Phase 12 introduces **deterministic governance execution**: the same governance decision, expressed as the same action and context, always yields the same authorization result, execution result, and registry/attestation records.

---

## 3 — Governance Execution Pipeline

The lifecycle of a governance action follows five conceptual stages:

1. **Action definition** — The outcome of consensus is represented as a `GovernanceAction`: a frozen structure with `action_id`, `initiator_id`, `action_type`, `metadata`, `status`, and `timestamp`. This gives the action a stable, hashable identity (12A).

2. **Authorization verification** — Before execution, the action is passed to the Authorization Layer (12C). Roles, policies, and scope are evaluated. The result is a `GovernanceAuthorizationResult` (e.g. AUTHORIZED, UNAUTHORIZED, SCOPE_VIOLATION, ROLE_VIOLATION). Only authorized actions proceed to execution.

3. **Execution** — The Execution Engine (12B) validates the action (e.g. status must be AUTHORIZED) and either executes it or explicitly rejects it. The outcome is a `GovernanceExecutionResult` with status EXECUTION_ACCEPTED, EXECUTION_REJECTED, or EXECUTION_FAILED.

4. **Registry recording** — The action is stored in the Governance Action Registry (12D) via `storeAction`. Authorization and execution results can be attached with `attachAuthorizationResult` and `attachExecutionResult`. The registry is append-only and indexed by a deterministic `action_hash`.

5. **Cryptographic attestation** — From a registry record that has an `execution_result`, an attestation can be produced (12E): a proof (including a deterministic result hash) is generated and signed. Third parties can verify the signature to confirm that an execution result was produced and not altered.

---

## 4 — Microstep 12A — Governance Action Model

The **Governance Action Model** provides a canonical, immutable representation of a governance operation. It ensures that every action has a **stable identity** and **hash determinism**, which are required for replay protection, integrity checks, and registry indexing.

**Purpose:**

- Define the structure and allowed types of governance actions.
- Support deterministic serialization and hashing.
- Enable integrity verification and duplicate detection in the registry.

**Action structure:**

- **action_id** — Unique identifier for the action instance.
- **initiator_id** — Identifier of the entity that initiated the action.
- **action_type** — Type of governance operation (see below).
- **metadata** — Immutable parameters (`GovernanceActionMetadata`: `parameters` as a readonly record).
- **status** — Lifecycle state: PENDING, AUTHORIZED, REJECTED, EXECUTED, FAILED.
- **timestamp** — Numeric timestamp (supplied as parameter; no `Date.now()`).

**Action types (ActionType):**

- NODE_TRUST_REVOCATION, NODE_TRUST_RESTORE  
- NODE_BLACKLIST, NODE_WHITELIST  
- POLICY_UPDATE, PROTOCOL_PARAMETER_UPDATE  
- FEDERATION_ALERT, GOVERNANCE_METADATA_UPDATE  

**Deterministic hashing:**

- Actions are serialized in a canonical way (stable key order).
- `computeGovernanceActionHash(action)` returns a SHA-256-based hash of that serialization.
- The same action always yields the same hash.

**Core interfaces and functions:**

| Element | Description |
|--------|-------------|
| `GovernanceAction` | Primary action structure; all fields readonly. |
| `GovernanceActionMetadata` | Immutable `parameters` record. |
| `ActionType` | Union of governance operation type literals. |
| `ActionStatus` | PENDING \| AUTHORIZED \| REJECTED \| EXECUTED \| FAILED. |
| `createGovernanceAction(...)` | Creates a valid, frozen action (e.g. status PENDING). |
| `validateGovernanceAction(action)` | Validates structure and allowed values. |
| `computeGovernanceActionHash(action)` | Deterministic hash for the action. |

**Why stable identity and hash determinism matter:**

- **Replay protection** — The registry rejects duplicate `action_hash`; the same logical action cannot be recorded twice.
- **Integrity verification** — Stored records can be checked by recomputing the hash from the action and comparing to `action_hash`.
- **Registry indexing** — Lookup by `action_hash` and deterministic ordering (e.g. by `recorded_timestamp` then `action_hash`) support reproducible queries and audit trails.

---

## 5 — Microstep 12B — Governance Execution Engine

The **Governance Execution Engine** is responsible for executing (or explicitly rejecting) authorized governance actions and producing deterministic execution results.

**Action execution workflow:**

1. **Validation** — The action is checked (e.g. structure, status). Only actions in an appropriate state (e.g. AUTHORIZED) are eligible for execution.
2. **Execution** — If validation passes, the engine performs the execution path and produces a result (e.g. EXECUTION_ACCEPTED with metadata).
3. **Rejection** — If the action must not be executed, the engine can produce an explicit EXECUTION_REJECTED (or EXECUTION_FAILED) result with reason metadata.

**Core functions:**

| Function | Purpose |
|----------|---------|
| `validateAction(action)` | Returns whether the action is in a valid state for execution (e.g. must be AUTHORIZED). |
| `executeAction(action, executor_id, execution_timestamp, ...)` | Executes the action and returns a `GovernanceExecutionResult` (e.g. EXECUTION_ACCEPTED). |
| `rejectAction(action_id, executor_id, execution_timestamp, reason, ...)` | Produces a `GovernanceExecutionResult` with EXECUTION_REJECTED. |
| `sortActionsForExecution(actions)` | Returns actions in a deterministic order (e.g. for replay or batch processing). |

**Deterministic execution results:**

- Same inputs (action, executor, timestamp, etc.) produce the same `GovernanceExecutionResult`.
- No randomness; timestamps and identifiers are supplied as parameters.

**GovernanceExecutionResult:**

- **action_id**, **executor_id** — Identifiers.
- **status** — EXECUTION_ACCEPTED | EXECUTION_REJECTED | EXECUTION_FAILED.
- **execution_timestamp** — When the execution/rejection occurred.
- **result_metadata** — Immutable record for outcome details (e.g. executed flag, rejection reason).

**Status semantics:**

- **EXECUTION_ACCEPTED** — Action was accepted and executed.
- **EXECUTION_REJECTED** — Action was explicitly rejected (e.g. policy or business rule).
- **EXECUTION_FAILED** — Execution was attempted but failed.

---

## 6 — Microstep 12C — Action Authorization Layer

The **Action Authorization Layer** validates whether a governance action is allowed before it is executed. Authorization is performed **before** execution (12B); only authorized actions should be executed.

**Validation dimensions:**

- **Role validation** — The initiator (or executor) must have a role (e.g. ADMIN, GOVERNOR, OBSERVER) that is allowed to perform the given action type.
- **Policy validation** — Policies define which action types are allowed for which roles (e.g. NODE_BLACKLIST only for ADMIN).
- **Scope validation** — For certain action types (e.g. NODE_*), the scope (e.g. NODE, GLOBAL, ORGANIZATION) is checked; invalid scope yields SCOPE_VIOLATION.

**GovernanceAuthorizationResult:**

- **action_id**, **initiator_id** — Identifiers.
- **status** — AUTHORIZED | UNAUTHORIZED | SCOPE_VIOLATION | ROLE_VIOLATION.
- **evaluated_timestamp** — When the authorization was evaluated.
- **metadata** — Optional evaluation details.

**Core functions:**

- `authorizeAction(action, role, scope, ...)` — Returns a `GovernanceAuthorizationResult`.
- `isActionAuthorized(result)` — Returns true iff result.status is AUTHORIZED.
- `validateScope(action, scope)` — Returns whether the scope is valid for the action.
- `evaluatePolicy(actionType, role)` — Returns whether the role is allowed to perform the action type.

**Security role:**

- **Unauthorized actions** — Actions that do not satisfy role or policy are not authorized and should not be executed.
- **Privilege escalation** — Role and policy checks prevent lower-privilege roles from performing sensitive operations.
- **Scope violations** — Scope checks ensure that node-level or federation-level actions are only allowed in the correct scope.

---

## 7 — Microstep 12D — Governance Action Registry

The **Governance Action Registry** is an immutable, append-only store that records governance actions and their full lifecycle: action, optional authorization result, and optional execution result.

**Properties:**

- **Append-only** — New records are added; existing records are not modified in place. Attach operations (authorization/execution result) replace the logical record by creating a new frozen record; the previous reference remains unchanged.
- **Lifecycle tracking** — Each record can hold the action, its hash, and optionally authorization_result and execution_result.
- **Audit trail** — By `action_hash`, the full record (action + authorization + execution) can be retrieved for audit.

**GovernanceActionRecord:**

| Field | Description |
|-------|-------------|
| `action` | The stored `GovernanceAction`. |
| `action_hash` | Deterministic hash from `computeGovernanceActionHash(action)`; used for deduplication and lookup. |
| `authorization_result` | Optional `GovernanceAuthorizationResult` attached once. |
| `execution_result` | Optional `GovernanceExecutionResult` attached once. |
| `recorded_timestamp` | When the action was recorded in the registry. |

**Registry operations:**

| Function | Description |
|----------|-------------|
| `storeAction(action, recorded_timestamp)` | Computes `action_hash`, rejects if hash already exists, appends new record. Returns the new record. |
| `attachAuthorizationResult(action_hash, result)` | Attaches authorization result to the record with that hash; fails if record not found or already has authorization_result. |
| `attachExecutionResult(action_hash, result)` | Attaches execution result; fails if record not found or already has execution_result. |
| `queryActions(filter?)` | Returns records matching optional filter (action_type, initiator_id, status); status derived from execution_result, then authorization_result, then action.status. Returns list sorted by `recorded_timestamp` then `action_hash`. |
| `getActionByHash(action_hash)` | Returns the record for that hash, or undefined. |
| `getAuditTrail(action_hash)` | Same as getActionByHash; returns the full record for audit. |

**Helpers:**

- `verifyRecordIntegrity(record)` — Recomputes hash from `record.action` and checks it equals `record.action_hash`.
- `sortRegistryRecords(records)` — Sorts by `recorded_timestamp` ascending, then by `action_hash` (e.g. localeCompare) for deterministic ordering.

**Determinism:**

- No randomness; timestamps are parameters.
- Query and sort order are deterministic for reproducible audits.

---

## 8 — Microstep 12E — Execution Result Attestation

The **Execution Result Attestation** layer produces verifiable, cryptographic proof that a governance action was executed (or rejected) and that the result has not been altered. It supports **auditability** and **cross-node verification**.

**Topics:**

- **Execution proof generation** — A digest of the execution result is computed and packaged into an `ExecutionProof`.
- **Deterministic result hashing** — The result is serialized in a stable way and hashed (e.g. SHA-256) so the same result always yields the same hash.
- **Execution signatures** — The proof’s result hash (and optional signer context) is signed with a key; the signature is stored in an `ExecutionAttestation`.
- **Verification** — A verifier recomputes the signature and compares it to the attestation’s signature; tampering or wrong key yields false.

**Structures:**

**ExecutionProof:**

- **action_id**, **executor_id** — Identifiers.
- **execution_timestamp** — When the execution occurred.
- **execution_status** — Status string (e.g. EXECUTION_ACCEPTED).
- **result_hash** — Deterministic hash of the full `GovernanceExecutionResult`.

**ExecutionAttestation:**

- **proof** — The `ExecutionProof`.
- **signature** — Deterministic signature (e.g. `sha256Hex(proof.result_hash + signing_key)`).
- **signer_id** — Identifier of the signer.

**How attestation supports:**

- **Auditability** — Auditors can verify that an execution result was produced and signed by a known signer.
- **Cross-node verification** — Any node with the signing key (or equivalent verification material) can verify the attestation.
- **Tamper detection** — Changing the proof (e.g. result_hash) or using the wrong key makes verification fail.

**Functions:**

| Function | Description |
|----------|-------------|
| `computeExecutionResultHash(result)` | Deterministic hash of the execution result (e.g. sha256Hex(stableStringify(result))). |
| `generateExecutionProof(result)` | Builds an `ExecutionProof` from a `GovernanceExecutionResult` (including result_hash). |
| `signExecutionProof(proof, signing_key, signer_id)` | Produces an `ExecutionAttestation` with signature = sha256Hex(proof.result_hash + signing_key). |
| `verifyExecutionAttestation(attestation, signing_key)` | Recomputes signature and returns true only if it matches attestation.signature. |
| `createAttestationFromRecord(record, signing_key, signer_id)` | Requires record.execution_result; generates proof from it, signs, and returns `ExecutionAttestation`. |

---

## 9 — Determinism Principles

Phase 12 applies strict determinism so that behaviour is reproducible and verifiable across nodes and over time.

**Rules:**

- **No randomness** — No random number generators; no non-deterministic system calls for decision-making.
- **No implicit time** — Timestamps (action timestamp, recorded_timestamp, execution_timestamp, evaluated_timestamp) are supplied as parameters; no `Date.now()` in core logic.
- **Deterministic hashing** — All hashes (action hash, result hash) are computed from a canonical serialization (e.g. stable key order) and a fixed algorithm (e.g. SHA-256).
- **Stable serialization** — Structures are serialized with deterministic key order (e.g. `stableStringify`) so the same logical value always produces the same bytes and thus the same hash.
- **Append-only records** — The registry does not mutate or delete existing records; “updates” are represented by new frozen records (e.g. with attachment fields set).

**Why determinism matters:**

- **Distributed verification** — Different nodes can recompute hashes and signatures and get the same result, enabling agreement on execution and attestation validity.
- **Auditability** — Auditors can reproduce hashes and verify integrity without relying on hidden state or randomness.
- **Governance replay protection** — Replay of the same action yields the same hash and is rejected as duplicate by the registry; deterministic ordering ensures consistent audit trails.

---

## 10 — Security Considerations

Phase 12 introduces several security properties that protect the governance execution pipeline.

**Mechanisms:**

- **Governance authorization enforcement** — The Authorization Layer (12C) ensures that only allowed roles, policies, and scopes can lead to execution. Unauthorized actions receive a non-AUTHORIZED result and should not be executed.
- **Immutable audit trail** — The registry is append-only; once recorded, actions and their attachments are not altered or deleted. This preserves a consistent history for forensics and compliance.
- **Tamper-evident execution results** — Execution results are stored in immutable records and can be hashed and signed. Altering a result changes its hash and breaks signature verification.
- **Cryptographic attestation** — Signing the execution proof (e.g. result_hash) binds the attestation to the exact result and signer; verification detects tampering or wrong keys.

**Mitigations:**

- **Unauthorized governance actions** — Blocked by authorization checks before execution; unauthorized attempts are recorded with a non-AUTHORIZED result.
- **Execution manipulation** — Deterministic execution and immutable registry records make it possible to detect inconsistencies; attestation verification catches altered proofs.
- **Historical record alteration** — Append-only registry and integrity checks (e.g. `verifyRecordIntegrity`) ensure that existing records are not silently modified; recomputing action_hash detects tampering.

---

## 11 — Testing Strategy

Test coverage for Phase 12 is implemented per microstep and validates both behaviour and determinism.

**Action Model (12A):**

- Action creation, validation (valid and invalid cases: empty ids, invalid type/status/timestamp).
- Deterministic hash: identical actions produce identical hash; stable serialization is key-order independent.
- Throws on invalid inputs where specified.

**Execution Engine (12B):**

- Valid execution produces EXECUTION_ACCEPTED with expected fields.
- Invalid or malformed actions produce EXECUTION_REJECTED.
- Rejection path and metadata (e.g. rejection reason).
- Deterministic ordering of actions; deterministic execution results for same input.

**Authorization (12C):**

- Authorized path (e.g. ADMIN, NODE_BLACKLIST) yields AUTHORIZED.
- Role violation (e.g. OBSERVER for restricted action) yields ROLE_VIOLATION.
- Scope violation and valid scope cases.
- Policy evaluation for different action types and roles.
- Determinism: same inputs produce identical authorization results.

**Registry (12D):**

- Store action: hash computed, registry count increases.
- Duplicate prevention: same action stored twice fails with “already exists”.
- Attach authorization/execution: immutability of original record, no overwrite, getActionByHash returns updated record; duplicate attach fails.
- Integrity: tampered record fails `verifyRecordIntegrity`; intact record passes.
- Query and filtering by action_type, initiator_id, status; combined filters; deterministic ordering.
- Edge cases: missing auth/exec result, same timestamp ordering by action_hash, attach on non-existent record fails.
- Integration: multiple actions, attach auth and exec, getAuditTrail, combined query, verifyRecordIntegrity on all.

**Attestation (12E):**

- Result hash determinism: same result → same hash.
- Proof generation: result_hash and execution_status correct.
- Signature generation and verification: valid attestation verifies true.
- Tampered proof (e.g. wrong result_hash or wrong key) verifies false.
- Registry integration: createAttestationFromRecord from record with execution_result; attestation.proof.action_id matches record.action.action_id.

**Reproducibility:**

- Tests use fixed inputs and timestamps; no randomness. This keeps test runs reproducible and ensures that determinism requirements are enforced in practice.

---

## 12 — Phase 12 Architectural Summary

Phase 12 transforms governance decisions into **executable actions**, **auditable records**, and **verifiable results**.

- **Executable actions** — The Action Model (12A) and Execution Engine (12B) define how consensus outcomes become concrete operations with deterministic outcomes.
- **Auditable records** — The Registry (12D) stores every action and its authorization and execution results in an immutable, queryable, and integrity-checkable form.
- **Verifiable results** — Attestation (12E) adds cryptographic proof and verification so that execution results can be trusted across nodes and by external auditors.

Together, the five microsteps 12A–12E form the **operational governance layer** of the IRIS Protocol: the layer that executes what governance has decided and leaves a permanent, provable trace.

---

## 13 — Future Extensions

Phase 12 is defined and implemented as specified. Future work may extend the system in directions such as:

- **Distributed governance nodes** — Multiple nodes producing and verifying attestations; consensus on which attestations are accepted.
- **External AI integration** — Interfaces for AI-assisted governance proposals or analysis of execution and attestation data.
- **Governance federation** — Cross-domain or cross-organization governance with shared action types and attestation verification.
- **Cross-system governance interoperability** — Standard formats and APIs for actions, results, and attestations to integrate with other governance or audit systems.

These extensions are out of scope for the current Phase 12 specification and are not part of the implemented modules.

---

*End of Phase 12 Architectural Reference.*
