# Phase 11.3.1 — Explainability Surface Contract

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Explainability Contract | VERIFIED |
| Determinism | VERIFIED |
| UI Decision Logic | NONE |
| Auditability | VERIFIED |
| Tests | PASS |

---

## Deliverable

1. **lib/ui/explainability_contract/**
   - **explainability_view_model.dart** — DTO immutabile (traceId, state, resolution, outcomeStatus, outcomeEffects, explanationTitle/Summary/Details, safetyLevel, timestamp); const, ==, hashCode.
   - **explainability_mapper.dart** — mapTraceToExplainability(DecisionTraceDto, ExplanationDto) puro; 1-to-1; traceId mismatch → ArgumentError.
   - **explainability_contract_validator.dart** — validateExplainabilityViewModel(vm) → ExplainabilityValidationResult (isValid, errors); controlli formali su campi non vuoti.
   - **explainability_validation_result.dart** — DTO immutabile isValid + errors.

2. **test/ui_explainability_contract/** — mapper_purity_test, immutability_test, validator_test, determinism_test.

3. **docs/phase-11/explainability-surface-contract.md**, **PHASE_11_3_1_REPORT.md**.

---

## Verifica

- ViewModel e mapper senza logica decisionale; validator solo controlli formali.
- Stessi input → stesso ViewModel; nessun DateTime.now()/Random() nel contratto.
- flutter test verde.
