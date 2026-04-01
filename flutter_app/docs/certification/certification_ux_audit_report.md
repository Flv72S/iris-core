# IRIS Trust UX — Audit Report

**Version:** 12.8  
**Document type:** Static, technical, non-interpretative.  
**Purpose:** Describe what the Trust UX shows, what it deliberately does not show, and the separation between technical capability exposure and legal or regulatory assessment.

---

## 1. Scope

This document covers only the **Trust UX** layer of the IRIS system: the user-facing surfaces that display technical capability indicators derived from the status model (Phase 12.1–12.7).

This document does **not** represent:

- Formal legal attestation of the system or its outputs.
- Regulatory endorsement by any authority.
- A statement of adherence to any regulation or standard.

The language used here is purely descriptive. No normative or evaluative claim is made.

---

## 2. Architectural Separation

The Trust UX is built on a strict separation between:

1. **Technical capability exposure** — The system exposes a fixed, declarative list of technical capabilities (e.g. deterministic replay, immutable persistence, forensic export). These are observable, implementable features.
2. **Legal or regulatory assessment** — Any judgment about whether the system or its use satisfies law, regulation, or standard is outside the scope of this layer.

The UI:

- Renders technical state and capability labels.
- Does not interpret or assign normative meaning to that state.
- Does not display pass/fail, valid/invalid, or any semantic status colour or icon.

---

## 3. Exposed Technical Capabilities

The following technical capabilities are exposed in a deterministic, read-only manner. This list is an index of what the system can do from a technical perspective; it is not an assessment of sufficiency or adequacy.

- **deterministic_replay** — The system supports deterministic replay of execution traces.
- **immutable_persistence** — Append-only, immutable event storage is present.
- **offline_replay** — Replay is possible without an active runtime.
- **forensic_export** — Export of audit artefacts in a structured format is supported.
- **forensic_import_verification** — Integrity verification of imported forensic data is supported.
- **compliance_mapping_present** — A static mapping of technical capabilities is present (descriptive only; no legal claim).

---

## 4. Trust Indicator Rendering Model

The Trust UX uses a deterministic, presentational model:

1. **Deterministic ViewModel** — The status ViewModel is a pure projection from the status type. Same input always yields same output. No runtime state or time source is used to compute it.
2. **Passive rendering** — The UI widget displays title, subtitle, and a list of capability labels and descriptions. It does not react to user gestures or external events for the purpose of changing normative meaning.
3. **Absence of semantic signalling** — The UI deliberately omits:
   - Semantic colours (e.g. green for “good”, red for “bad”).
   - Validation or status icons (e.g. check, warning, error).
   - User actions that suggest approval or rejection.
   - Scores, levels, or “ok / not ok” state.

---

## 5. Provenance Transparency

Each indicator shown in the Trust UX is tied to identifiable technical sources:

- Capability labels and descriptions are derived from the closed capability enumeration.
- Provenance copy (Phase 12.6) describes the technical origin of each capability (e.g. ReplayTraceStore, append-only storage) without inferring or stating normative conclusions.
- No legal or regulatory inference is performed by the system based on these indicators.

---

## 6. Explicit Non-Goals

The Trust UX and this report explicitly do **not**:

- Declare that the system or its use satisfies any law, regulation, or standard.
- Guarantee adherence to any normative or regulatory requirement.
- Replace or substitute for formal legal or regulatory audit.
- Provide or imply official attestation by any body.

These non-goals are by design. The system provides a technical, descriptive index only.

---

## 7. Determinism and Immutability Guarantees

The Trust UX layer is designed for auditability and reproducibility:

- **Immutable DTOs** — Status, status ViewModel, and related types use final fields and const constructors where possible. No in-place mutation.
- **Read-only snapshot** — The status provider exposes a single, immutable snapshot. No setters or mutating methods.
- **No time or runtime state** — Status and ViewModel are computed without time sources, randomness, or timers. No dependency on external time or nondeterministic state.
- **Forbidden Claim Guard** — A static list and test (Phase 12.7) ensure that normative or status-claiming terms are not introduced into the guarded code and copy. Violations cause the test suite to fail.

---

## 8. Intended Audit Usage

This document and the associated Trust UX implementation are intended for:

- **Technical review** — Auditors can see which capabilities are exposed and how they are rendered, without the system making legal or regulatory claims.
- **Traceability** — Each capability can be traced to its technical source (e.g. replay store, persistence layer) via the provenance model.
- **Informational base** — The documentation and UI serve as an informational base for any external assessment (legal, regulatory, or otherwise). They do not perform that assessment.

---

*End of report. No normative claim is made by this document or by the Trust UX it describes.*
