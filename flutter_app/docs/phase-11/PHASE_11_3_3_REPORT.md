# Phase 11.3.3 — Trace-Driven Navigation

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Trace-Driven Navigation | VERIFIED |
| Determinism | VERIFIED |
| Replay Consistency | VERIFIED |
| UI Decision Logic | NONE |
| Golden Stability | VERIFIED |
| Auditability | VERIFIED |
| Tests | PASS |

---

## Deliverable

1. **lib/ui/trace_navigation/**
   - **trace_route_mapper.dart** — mapTraceToRoute(DecisionTraceDto): resolution == "explainability" → "explainability", else "unknown_trace".
   - **trace_navigation_controller.dart** — TraceNavigationController(store); computeRouteStack(), computeTopRoute(), canPop() da store.getAll().
   - **trace_pages_factory.dart** — buildPagesFromTraces(traces); una Page per trace; explainability → DeterministicExplainabilityScreen con ViewModel da trace (+ ExplanationDto sintetico); unknown → Scaffold placeholder.
   - **trace_navigation_host.dart** — TraceNavigationHost(store); StatefulWidget con Navigator(pages, onPopPage); stack = traces.sublist(0, currentIndex+1).

2. **test/ui_trace_navigation/** — route_stack_determinism_test, replay_navigation_test, forbidden_logic_test (no DateTime/Random/Navigator.push), golden_navigation_test (1 trace, 3 traces).

3. **docs/phase-11/trace-driven-navigation.md**, **PHASE_11_3_3_REPORT.md**.

---

## Verifica

- Controller e mapping puri; Navigator.pages senza push imperativo; store guida lo stack; test determinismo e golden passano; flutter test verde.
