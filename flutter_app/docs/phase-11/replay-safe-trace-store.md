# Phase 11.2.4 — Replay-Safe Trace Store

## Ruolo

Store locale in-memory per DecisionTrace validate. Accetta solo result.isValid; ordine per traceId; computeStoreHash deterministico; snapshot immutabile per audit e replay.

## Replay e audit

getAll() ordine traceId. getSnapshot() → ReplayStoreSnapshot (traces + storeHash). Stesso contenuto → stesso hash. Nessun DateTime/Random/I/O.

## Garanzie

Solo trace validate; duplicato incoerente → eccezione; nessuna logica decisionale. In-memory in fase 11 per certificazione deterministica.

## File

lib/bridge/replay_store/replay_trace_store.dart, replay_store_snapshot.dart, replay_store_exception.dart.
