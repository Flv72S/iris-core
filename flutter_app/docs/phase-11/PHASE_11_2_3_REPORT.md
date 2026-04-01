# Phase 11.2.3 — Deterministic Trace Reception & Validation Layer

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Trace Validation | VERIFIED |
| Determinism | VERIFIED |
| Client Decision Logic | NONE |
| Tests | PASS |

---

## Deliverable

1. **lib/bridge/validation/**
   - **trace_validator.dart** — validateStructure(DecisionTraceDto), validateStructureFromMap(Map), validateHash(trace, expectedHash?), validateContractVersion(version?), validateAll(...) → ValidatedTraceResult; throwOnInvalid → TraceValidationException.
   - **validated_trace_result.dart** — DTO immutabile: trace, isValid, errors; == e hashCode.
   - **trace_validation_exception.dart** — Eccezione con messaggio deterministico, opzionale trace.

2. **test/bridge_validation/**
   - **trace_structure_test.dart** — Trace valido PASS; map valido PASS; campo mancante FAIL; tipo errato FAIL; validateAll valido; throwOnInvalid lancia eccezione.
   - **trace_hash_validation_test.dart** — Stesso payload → hash valido; payload alterato FAIL; expectedHash null → nessun errore.
   - **contract_version_test.dart** — "1.0.0" compatibile; versione diversa errore; null errore.
   - **determinism_test.dart** — Stessi input → stesso risultato; uguaglianza ValidatedTraceResult; assenza DateTime.now() e Random() nel codice validation.

3. **docs/phase-11/trace-validation-layer.md** — Ruolo, sicurezza formale, separazione da Core, auditabilità.
4. **docs/phase-11/PHASE_11_2_3_REPORT.md** — Questo report.

---

## Verifica

- TraceValidator puramente formale (nessun DateTime, Random, business logic).
- Hash verificato con computeDeterministicHash esistente.
- Contract version confrontata con irisBridgeContractVersion.
- flutter test completamente verde (inclusi test/bridge_validation).
