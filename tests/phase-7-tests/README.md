# Phase 7 Runtime Test Execution & Determinism Certification

Verifica formale che il Execution Runtime (Fase 7.1–7.4) sia:

- **deterministico** — stesso input → stesso output e hash
- **controllato** — guardrail e kill-switch rispettati
- **reversibile** — rollback deterministico (action lifecycle)
- **auditabile** — log append-only, hash stabile, manomissione rilevata
- **arrestabile** — kill-switch globale/feature/azione
- **riproducibile** — replay produce stesso stato e hash

## Struttura

- **7T.1** `deterministic/` — Deterministic Runtime Tests
- **7T.2** `guardrails/` — Guardrail Enforcement Tests
- **7T.3** `kill-switch/` — Kill-Switch Safety Tests
- **7T.4** `rollback/` — Reversibility & Rollback Tests
- **7T.5** `audit/` — Execution Audit Integrity Tests
- **7T.6** `replay/` — Forensic Replay Certification
- **7T.7** `golden-scenarios/` — Golden Scenario End-to-End
- **fixtures/** — Snapshot JSON deterministici

## Esecuzione

```bash
# Tutti i test Phase 7
npx vitest run tests/phase-7-tests

# Report di certificazione (script)
bash tests/phase-7-tests/run_phase7_tests.sh
```

## Criterio di successo

La Fase 7 è **CERTIFICATA** solo se **tutti** i test risultano PASS.

In caso di FAIL: identificare il punto di non-determinismo o violazione e bloccare l’avanzamento alla Fase 8.
