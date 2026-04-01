# IRIS Governance — Authority Definition

Decision entities, authority per scope, permitted/forbidden actions, escalation. No authority may modify frozen Core, bypass compatibility, or introduce silent breaking changes.

---

## Decision Entities

| Entity | AuthorityId | Primary scope | Role |
|--------|-------------|---------------|------|
| Core Council | `core_council` | IRIS Core | Sole authority for Core evolution; approves versioned changes only. |
| Flow Maintainers | `flow_maintainers` | IRIS Flow | Own Flow codebase, manifest, seal; must respect Core interface and freeze. |
| Plugin Authors | `plugin_authors` | Flow Extensions | Own plugin code; must respect Flow extension contract. |
| UX Owners | `ux_owners` | UX & Interface | Own UI and UX; must not bypass Flow or Core contracts. |
| Platform / DevOps | `platform_devops` | Tooling & CI | Own pipelines, baseline storage, validator runs; read-only on Core/Flow behavior. |

---

## Authority per Scope

| Scope | Primary authority | Secondary / consultative |
|-------|--------------------|---------------------------|
| IRIS Core | Core Council | — |
| IRIS Flow | Flow Maintainers | Core Council (interface) |
| Flow Extensions | Plugin Authors | Flow Maintainers (contract) |
| UX & Interface | UX Owners | Flow Maintainers |
| Tooling & CI | Platform / DevOps | Flow Maintainers, Core Council |

Rule: **one primary authority per scope.** No scope has more than one primary.

---

## Permitted Actions (by authority)

- **Core Council**: Propose and approve Core version bumps; approve evolution protocol steps; publish compatibility expectations. Cannot change Core behavior without going through the protocol.
- **Flow Maintainers**: Change Flow code within compatibility rules; update Flow manifest and seal; add steps/policy/binding within freeze validator pass. Cannot modify Core; cannot break seal or introduce silent breaking changes.
- **Plugin Authors**: Publish and update plugins within extension points; extend steps/bindings as allowed by Flow contract. Cannot modify Flow core or Core.
- **UX Owners**: Change UI/UX; adjust presentation and navigation within Flow and Core consumption contracts. Cannot change Flow or Core behavior; cannot bypass policy.
- **Platform / DevOps**: Run validators; store baselines; fail or pass builds based on freeze result. Cannot alter Core or Flow logic; cannot grant compatibility without validator result.

---

## Forbidden Actions (all authorities)

- **Modify frozen Core** outside the formal evolution protocol.
- **Bypass compatibility** (ignore seal, behavioral hash, or manifest).
- **Introduce silent breaking changes** (any change that would not be detected by the freeze validator or equivalent).
- **Assign normative or legal meaning** to technical artifacts (governance is technical only).
- **Grant oneself permissions outside one’s scope.**

---

## Escalation Path

1. **Scope-level**: Disputes within a scope are resolved by the primary authority for that scope.
2. **Cross-scope (Flow ↔ Core)**: Flow Maintainers escalate to Core Council when interface or compatibility is in question.
3. **Cross-scope (Extensions / UX ↔ Flow)**: Plugin Authors or UX Owners escalate to Flow Maintainers when Flow contract or policy is in question.
4. **Tooling / baseline**: Platform / DevOps escalates to Flow Maintainers or Core Council when validator or baseline definition is in question.

No authority may override another authority’s primary scope; escalation is consultative and contract-based.

---

## Authority Identifiers (for code and tooling)

| Authority | AuthorityId |
|-----------|-------------|
| Core Council | `core_council` |
| Flow Maintainers | `flow_maintainers` |
| Plugin Authors | `plugin_authors` |
| UX Owners | `ux_owners` |
| Platform / DevOps | `platform_devops` |

---

*Document version: 1.0. Authority is declarative; no implicit authority.*
