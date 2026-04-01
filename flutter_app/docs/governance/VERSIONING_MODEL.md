# IRIS Governance — Versioning Model

Formal versioning for Core, Flow, and Plugin. Deterministic; semantically verifiable; automatable in CI.

---

## 1. Core Versioning

| Rule | Definition |
|------|------------|
| **Format** | `X.0.0` (major only; minor and patch must be 0). |
| **Increment** | MAJOR only. No MINOR or PATCH for Core. |
| **Breaking change** | Any breaking or non-breaking change → new MAJOR required. |
| **Compatibility** | Same MAJOR only. No cross-major compatibility. |

Core is structurally stable; version reflects a single canonical state per major.

---

## 2. Flow Versioning

| Rule | Definition |
|------|------------|
| **Format** | `MAJOR.MINOR.PATCH` (full SemVer). |
| **MAJOR** | Breaking change declared; compatibility seal / behavioral hash change. |
| **MINOR** | Backward-compatible feature. |
| **PATCH** | Fix; deterministic; no behavioral hash change. |
| **Compatibility** | Same MAJOR = compatible. MINOR/PATCH within same MAJOR = compatible. |

Flow evolves in a controlled way; full SemVer applies.

---

## 3. Plugin Versioning

| Rule | Definition |
|------|------------|
| **Format** | Full SemVer: `MAJOR.MINOR.PATCH`. |
| **Declaration** | Plugin must declare: |
| | - **Flow compatibility range** (e.g. Flow `>=1.0.0 <2.0.0`). |
| | - **Core compatibility range** (e.g. Core `>=1.0.0 <2.0.0`). |
| **Semantics** | Standard SemVer: MAJOR = breaking, MINOR = feature, PATCH = fix. |

Compatibility is explicit; no implicit range.

---

## 4. Pre-release

| Rule | Definition |
|------|------------|
| **Form** | Optional suffix: `-alpha`, `-beta`, `-rc` (or other identifiers). |
| **Precedence** | Pre-release < release. Same numeric version: `1.0.0-alpha` < `1.0.0`. |
| **Ordering** | When major.minor.patch are equal: release > rc > beta > alpha (by identifier). |
| **Validation** | Pre-release string must be valid identifier (alphanumeric, hyphen). |

No interpretation: precedence is defined by the comparator and must be deterministic.

---

## 5. Grammar (for parsing)

- **Release**: `MAJOR.MINOR.PATCH` where each is a non-negative integer.
- **Pre-release**: `-` followed by one or more dot-separated identifiers (alphanumeric + hyphen).
- **Invalid**: Missing segments (e.g. `1`, `1.0`), extra segments (e.g. `1.0.0.0`), non-numeric (e.g. `a.b.c`).

No tolerance for invalid format.

---

## 6. Scope vs version policy

| Scope | Policy | Valid example | Invalid example |
|-------|--------|----------------|-----------------|
| Core | Major only (minor=0, patch=0) | `2.0.0` | `1.1.0`, `2.0.1` |
| Flow | Full SemVer | `1.2.3` | (any valid SemVer is valid) |
| Plugin | Full SemVer | `1.0.0` | (any valid SemVer is valid) |

---

*Document version: 1.0. Versioning model is declarative; no implicit increment.*
