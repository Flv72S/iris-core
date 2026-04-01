# Phase 11.2.1 — Type-Safe Bridge IRIS → Flutter

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Determinism | VERIFIED |
| Decision Logic in Client | NONE |
| DTO Integrity | PASS |
| Hash Consistency | PASS |
| Tests | PASS (50/50, including 14 bridge tests) |

---

## Deliverable

1. **lib/bridge/dto/** — DTO immutabili
   - `decision_trace_dto.dart` (traceId, signals, state, resolution, execution, outcome, timestamp)
   - `explanation_dto.dart` (title, summary, details, safetyLevel, traceId)
   - `mode_dto.dart` (modeId, label)
   - `outcome_dto.dart` (status, effects)
   - Tutti: `final`, `fromJson`/`toJson`, `==` e `hashCode` deterministici.

2. **lib/bridge/contracts/bridge_contract.dart**
   - `irisBridgeContractVersion = "1.0.0"`
   - Documentazione compatibilità forward/backward.

3. **lib/bridge/mappers/hash_utils.dart**
   - `computeDeterministicHash(Map<String, dynamic> json)` — ordinamento chiavi stabile, UTF-8, SHA-256.

4. **lib/bridge/mappers/dto_mappers.dart**
   - `mapDecisionTrace`, `mapExplanation`, `mapMode`, `mapOutcome` — puri, errore esplicito su campo mancante/tipo errato, nessun default.

5. **test/bridge/**
   - `dto_serialization_test.dart` — json → dto → json identico.
   - `hash_determinism_test.dart` — stesso json → stesso hash; ordine chiavi diverso → stesso hash.
   - `mapper_validation_test.dart` — errore su campo mancante, su tipo errato, nessun default silenzioso.

6. **docs/phase-11/bridge-type-safety.md** — Ruolo bridge, separazione UI/Core, determinismo, versioning, audit.

---

## Verifica

- `flutter test` — **50 passed** (14 bridge + 36 esistenti).
- Nessuna logica decisionale nel bridge; solo validazione di tipo e mapping 1-a-1.
