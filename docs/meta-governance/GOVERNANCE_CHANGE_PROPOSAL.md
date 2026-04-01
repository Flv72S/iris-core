# Meta-Governance — Governance Change Proposal (GCP)

Formal, mandatory mechanism to propose changes to governance. Every future change to versioning, compatibility, change classification, breaking enforcement, deprecation, plugin governance, or CI gates must go through a GCP.

---

## What is a GCP

A **Governance Change Proposal** is a **formal proposal** to change governance rules. It is not a decision and not an implementation. It is the contract that must exist before any governance change can be considered.

---

## Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| id | Yes | Unique identifier (e.g. GCP-YYYY-NNN). |
| title | Yes | Short, non-empty title. |
| proposerRole | Yes | Role of the proposer (must be allowed to propose). |
| governanceVersionFrom | Yes | Governance version from which the change starts. |
| governanceVersionTo | Yes | Target governance version after the change. |
| scope | Yes | Which area of governance is affected. |
| rationale | Yes | Non-empty rationale. |
| riskAssessment | Yes | Non-empty risk assessment. |
| rollbackStrategy | Yes | Non-empty rollback strategy. |

Invariant: **governanceVersionFrom** < **governanceVersionTo**.

---

## States (Declarative Only)

For traceability, a GCP may be described as being in one of these states. State transitions are not implemented in H2.

- **DRAFT** — Proposal being prepared.
- **SUBMITTED** — Proposal submitted for review.
- **REVIEWED** — Review completed.
- **RATIFIED** — Approved; change may proceed.
- **REJECTED** — Rejected.

---

## Principles

- No governance change without a GCP.
- No GCP without a from-version and a to-version.
- No GCP without rationale, risk assessment, and rollback strategy.
- No GCP applied implicitly.

---

*Document version: 1.0. H2.*
