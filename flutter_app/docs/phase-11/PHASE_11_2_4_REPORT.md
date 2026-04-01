# Phase 11.2.4 — Replay-Safe Trace Store

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Replay Safety | VERIFIED |
| Determinism | VERIFIED |
| Auditability | VERIFIED |
| Client Decision Logic | NONE |
| Tests | PASS |

---

## Deliverable

1. **lib/bridge/replay_store/**
   - **replay_trace_store.dart** — save(ValidatedTraceResult) solo se isValid; getAll() ordinato per traceId; getByTraceId; computeStoreHash(); getSnapshot(); clear(). In-memory, no DateTime/Random/I/O.
   - **replay_store_snapshot.dart** — DTO immutabile: traces (lista non modificabile), storeHash; == e hashCode.
   - **replay_store_exception.dart** — Eccezione per trace non valido, traceId duplicato incoerente.

2. **test/bridge_replay_store/**
   - save_and_retrieve_test, ordering_determinism_test, store_hash_test, replay_snapshot_test, determinism_guard_test.

3. **docs/phase-11/replay-safe-trace-store.md**, **PHASE_11_2_4_REPORT.md**.

---

## Verifica

- Salvataggio solo per trace validate; traceId duplicato incoerente → eccezione.
- Ordinamento lessicografico per traceId; stesso contenuto → stesso hash indipendentemente dall’ordine di inserimento.
- Snapshot immutabile; nessun DateTime.now()/Random() nel codice replay_store.
- flutter test completamente verde.
