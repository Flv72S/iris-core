# IRIS Governance — Scope Definition

Technical definition of governed scopes. One scope → one primary responsibility. No implicit authority.

---

## Governed Scopes

### 1. IRIS Core

| Attribute | Definition |
|-----------|------------|
| **Includes** | Data model, hashing, structural integrity, manifest versioning, freeze seal, Core ↔ external boundary contract. |
| **Excludes** | Flow runtime, UI, tooling, plugins, business logic above Core. |
| **Mutability** | IMMUTABLE (frozen). Changes only via explicit versioned evolution protocol. |
| **Boundaries** | Core does not depend on Flow or Extensions. Core exposes read-only consumption interface. |

### 2. IRIS Flow

| Attribute | Definition |
|-----------|------------|
| **Includes** | Flow runtime model, step graph, orchestration, context binding, policy/guardrails, telemetry, replay, freeze (behavioral hash, manifest, seal). |
| **Excludes** | Core data mutation, UI rendering, plugin implementation details, normative/legal logic. |
| **Mutability** | CONTROLLED. Changes require compatibility seal check and baseline comparison. |
| **Boundaries** | Flow consumes Core via defined interface only. Flow does not write to Core. |

### 3. Flow Extensions / Plugin

| Attribute | Definition |
|-----------|------------|
| **Includes** | Optional steps, optional bindings, plugin-provided behavior within Flow contract. |
| **Excludes** | Core, Flow core runtime, breaking changes to Flow public API. |
| **Mutability** | EVOLVABLE. Plugin authors may extend within declared extension points. |
| **Boundaries** | Extensions depend on Flow (and optionally Core consumption). No modification of Flow core. |

### 4. UX & Interface Layer

| Attribute | Definition |
|-----------|------------|
| **Includes** | Screens, navigation surface, presentation of Flow steps and Core-backed data. |
| **Excludes** | Core/Flow behavioral logic, certification, hashing, policy enforcement logic. |
| **Mutability** | EVOLVABLE. UX may change provided contracts with Flow and Core consumption are respected. |
| **Boundaries** | Depends on Flow (and Core consumption). No direct Core mutation; no bypass of Flow policy. |

### 5. Tooling & CI

| Attribute | Definition |
|-----------|------------|
| **Includes** | Build, tests, freeze validator runs, seal checks, compatibility baseline storage. |
| **Excludes** | Runtime behavior, Core/Flow data, production decisions. |
| **Mutability** | EVOLVABLE. Tooling may evolve to support new checks or pipelines. |
| **Boundaries** | Reads manifests and seals; may fail build on breaking change if configured. Does not alter Core or Flow behavior. |

---

## Relations Between Scopes

- **Core** is the root: no scope may modify Core outside the evolution protocol.
- **Flow** consumes Core; Flow is consumed by Extensions and UX.
- **Extensions** and **UX** are siblings: both depend on Flow (and optionally Core consumption).
- **Tooling** observes Core and Flow (manifests, seals); does not govern runtime.

---

## Non-Governable (Hard Limits)

- No scope may **modify frozen Core** except via the formal evolution protocol.
- No scope may **bypass compatibility** (seal, behavioral hash, manifest).
- No scope may **introduce silent breaking changes** (all changes must be detectable by freeze validator or equivalent).
- **Normative or legal interpretation** is not a governed scope: it remains outside Core/Flow technical governance.

---

## Scope Identifiers (for code and tooling)

| Scope | ScopeId |
|-------|---------|
| IRIS Core | `iris_core` |
| IRIS Flow | `iris_flow` |
| Flow Extensions | `flow_extensions` |
| UX & Interface | `ux_interface` |
| Tooling & CI | `tooling_ci` |

---

*Document version: 1.0. Governance scope is declarative; interpretation is out of scope.*
