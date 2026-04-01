# Phase 11.3.2 — Deterministic Explainability Screen

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Deterministic Screen | VERIFIED |
| UI Decision Logic | NONE |
| Golden Stability | VERIFIED |
| Determinism | VERIFIED |
| Auditability | VERIFIED |
| Tests | PASS |

---

## Deliverable

1. **lib/ui/explainability_screen/**
   - **deterministic_explainability_screen.dart** — StatelessWidget con viewModel (solo contratto); Scaffold, AppBar(explanationTitle), Body con Padding e Column a ordine fisso.
   - **explainability_sections.dart** — SafetyBadgeSection (string→colore), StateResolutionSection, OutcomeSection, DetailsSection (altezza fissa + SingleChildScrollView), TimestampFooter.

2. **test/ui_deterministic_screen/** — rendering_structure_test, golden_test (neutral/caution/block), determinism_test, contract_usage_test (no bridge/replay/intent, usa contract).

3. **docs/phase-11/deterministic-explainability-screen.md**, **PHASE_11_3_2_REPORT.md**.

---

## Verifica

- Solo ViewModel certificato; nessuna logica decisionale; golden stabili; nessun DateTime/Random in explainability_screen; separazione da bridge/replay/intent.
- flutter test verde (inclusi ui_deterministic_screen).
