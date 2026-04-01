# IRIS Governance — Deprecation Policy

Progressive evolution with structured notice and planned removal. No implicit deprecation; every deprecation has a sunset.

---

## What is a deprecation

A **deprecation** is an element that is still functioning but **scheduled for removal** at a future version (sunset). It allows gradual transition and clear communication.

---

## Deprecable elements

- Flow API (steps, transitions, hooks)
- Plugin interfaces
- Policy rules
- Step definitions
- Event types

(Technical identifiers; no normative classification.)

---

## Required fields

| Field | Required | Description |
|-------|----------|-------------|
| identifier | Yes | Unique technical id of the deprecated element. |
| scope | Yes | CORE \| FLOW \| PLUGIN. |
| startVersion | Yes | Version at which the deprecation is introduced. |
| sunsetVersion | Yes | Version at which the element is removed. |
| rationale | Yes | Technical reason (non-empty). |
| replacement | No | Recommended replacement (optional but encouraged). |

---

## Sunset rules

- **sunsetVersion > startVersion** (strict).
- **sunsetVersion** must respect the versioning policy (G1) for the scope:
  - **CORE**: sunset only with major increment (sunsetVersion must be X.0.0).
  - **FLOW / PLUGIN**: full SemVer allowed.
- No deprecation without a defined sunset (no indefinite deprecation).
- Deprecations are versionable and traceable; enforcement is deterministic.

---

## Enforcement

- **DeprecationValidator**: validates each descriptor (identifier, rationale, start < sunset, sunset valid for scope).
- **DeprecationEnforcer**: in CI, `enforceSunset(currentVersion, registry)` fails if currentVersion >= any registered sunsetVersion (element must be removed by then).

---

*Document version: 1.0.*
