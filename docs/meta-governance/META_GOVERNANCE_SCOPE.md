# Meta-Governance — Scope & Authority

Governance of governance. H0 defines who may modify the rules of FASE G.

---

## Responsibility Levels

| Level | Description |
|-------|-------------|
| IMPLEMENTER | Writes code; does not modify governance rules. |
| GOVERNANCE_MAINTAINER | Proposes governance changes (future H2); cannot self-ratify. |
| META_GOVERNOR | Evaluates governance proposals; does not implement code. |
| RATIFIER | Final approval; must be separate from proposer. |

---

## Responsibilities by Level

**IMPLEMENTER**
- Implements features and fixes.
- Does not change versioning, compatibility, change classification, breaking, deprecation, plugin, or CI governance rules.

**GOVERNANCE_MAINTAINER**
- Proposes changes to governance (e.g. via future Governance Change Proposal).
- Cannot approve or ratify own proposals.

**META_GOVERNOR**
- Reviews governance proposals.
- Does not implement application or tooling code in the same context.

**RATIFIER**
- Approves or rejects governance changes.
- Must be distinct from the proposer (no self-ratification).

---

## Hard Boundaries

- No author may self-approve governance changes.
- Implementer and Ratifier are separated.
- Meta-governance is structural only; no runtime dependency.
- Authorities are explicit and auditable.

---

*Document version: 1.0. H0.*
