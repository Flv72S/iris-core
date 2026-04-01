# Phase 11.2.2 — Execution Intent Channel

## STATUS: COMPLETED

| Criterio | Esito |
|----------|--------|
| Idempotency | VERIFIED |
| Determinism | VERIFIED |
| Decision Logic in Client | NONE |
| Intent Serialization | PASS |
| Tests | PASS (60/60; 10 bridge_intents) |

---

## Deliverable

1. **lib/bridge/intents/**
   - `action_intent.dart` — intentId, actionType, parameters (Map read-only), timestamp. Immutable, fromJson/toJson, ==/hashCode.
   - `mode_change_intent.dart` — intentId, targetModeId, timestamp. Stesse garanzie.

2. **lib/bridge/channel/**
   - `intent_channel.dart` — abstract class con `sendAction(ActionIntent)` e `sendModeChange(ModeChangeIntent)` → `Future<DecisionTraceDto>`.
   - `stub_intent_channel.dart` — implementazione stub che restituisce sempre lo stesso DecisionTraceDto deterministico (nessun tempo/random).

3. **lib/bridge/mappers/intent_serialization.dart**
   - `serializeActionIntent(ActionIntent)` e `serializeModeIntent(ModeChangeIntent)` con ordine chiavi stabile, compatibili con hash SHA-256.

4. **test/bridge_intents/**
   - `intent_serialization_test.dart` — round-trip intent → json → intent identico; hash stabile per ActionIntent e ModeChangeIntent.
   - `intent_channel_idempotency_test.dart` — stesso intent → stessa DecisionTraceDto; multi-call stesso risultato.
   - `forbidden_logic_test.dart` — stub trace fisso; assenza di DateTime.now() e Random() nel codice bridge.

5. **docs/phase-11/execution-intent-channel.md** — Ruolo intent, separazione comando/esecuzione, idempotenza/replay, sicurezza client-side, strategia connessione Core reale.

---

## Verifica

- `flutter test` — **60 passed** (10 bridge_intents + 14 bridge + 36 esistenti).
- Nessuna logica decisionale nel client; solo intent tipizzati e channel astratto/stub.
