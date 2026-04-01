# L8 — End-to-End Determinism Verification

## Perché L8 è necessario

La Fase L introduce sette layer applicativi (L1–L7) e un orchestrator infrastrutturale (K). Ogni layer è testato in isolamento, ma non esiste fino a L8 una **verifica di sistema** che componga l’intero flusso in un unico scenario end-to-end.

L8 **non introduce nuovi layer** e **non modifica lib/**. È un test di sistema che:

- Comprova che l’intera catena **L4 → L3 → L6 → L7 → L5** sia deterministica, componibile e priva di entropia runtime.
- Garantisce **simmetria write/read**: i bytes prodotti in L3 (e persistiti) sono identici a quelli ricalcolati in L5 dopo il retrieve.
- Verifica che **idempotenza** e **failure path** (firma invalida) si comportino in modo deterministico e senza eccezioni silenti.

Senza L8 resterebbe il dubbio che integrando i layer emergano comportamenti non deterministici (timestamp, ID generati, JSON non canonico, ecc.). L8 chiude formalmente la Fase L.

---

## Cosa garantisce L8

| Garanzia | Descrizione |
|----------|-------------|
| **Determinismo completo** | Stessa request → stessi canonical bytes → stesso deterministicHash → stesso esito. Lo scenario viene ripetuto due volte e si confrontano bytes e hash. |
| **Simmetria write/read** | I bytes “scritti” in L3 (tramite mock orchestrator) sono identici ai bytes “letti” e ricalcolati in L5. Round-trip canonico invariato. |
| **Idempotenza** | Prima esecuzione del contract → `alreadyExecuted: false`; seconda esecuzione (stesso contract) → `alreadyExecuted: true`. |
| **Failure path deterministico** | Firma invalida in L5 → `signatureValid: false`, nessuna eccezione; il flusso resta deterministico e prevedibile. |
| **Nessuna entropia nascosta** | Il test non usa DateTime, Random, UUID, jsonEncode né side-effect globali nel flusso sotto verifica; i layer L2–L7 sono progettati senza tali fonti. |

---

## Diagramma flusso completo

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     L8 E2E scenario                          │
                    └─────────────────────────────────────────────────────────────┘
                                                      │
     SignedOperationRequest                           ▼
     (operationId, resourceId, payload,               │
      signature, metadata)                            │
                                                      │
  ┌───────────────────────────────────────────────────┼───────────────────────────────────────────────────┐
  │                                                   ▼                                                   │
  │   ┌─────────────┐     isValid == true     ┌─────────────────┐     persist via mock    ┌──────────────┐  │
  │   │     L4      │ ────────────────────► │       L3        │ ──────────────────────► │  Orchestrator│  │
  │   │  Validator  │                        │ SignedOperation │     (canonical bytes    │  (K, mock)   │  │
  │   └─────────────┘                        │    Service      │      by resourceId)      └──────────────┘  │
  │                                          └────────┬────────┘                                │           │
  │                                                   │ envelope + canonical                    │           │
  │                                                   ▼                                          │           │
  │   ┌─────────────┐     contract          ┌─────────────────┐     checkAndRegister            │           │
  │   │     L6      │ ◄──────────────────── │  Deterministic   │ ◄───────────────────────────────┤           │
  │   │   Hasher    │  fromCanonical()      │ ExecutionContract│                                  │           │
  │   └─────────────┘                        └────────┬────────┘                                  │           │
  │                                                   │                                            │           │
  │                                                   ▼                                            │           │
  │   ┌─────────────┐  1st: alreadyExecuted   ┌─────────────────┐  2nd: alreadyExecuted            │           │
  │   │     L7      │      == false           │ IdempotencyGuard│      == true                     │           │
  │   │  Registry   │ ◄───────────────────── │                 │                                  │           │
  │   └─────────────┘                        └─────────────────┘                                  │           │
  │                                                                                                │           │
  │   retrieve(operationId, resourceId) ◄──────────────────────────────────────────────────────────┘           │
  │                                                   │                                                                  │
  │                                                   ▼                                                                  │
  │   ┌─────────────┐  bytes from mock        ┌─────────────────┐  signatureValid (mock port)  ┌──────────────┐          │
  │   │     L2      │ ◄───────────────────── │       L5        │ ◄─────────────────────────── │ SignaturePort│          │
  │   │ Serializer  │  re-serialize envelope  │ RetrievalService│                              │   (K, mock)  │          │
  │   └─────────────┘                        └─────────────────┘                              └──────────────┘          │
  │         │                                          │                                                                  │
  │         └──────────────────┬───────────────────────┘                                                                  │
  │                            ▼                                                                                          │
  │                   Round-trip: canonical bytes (L3) == canonical bytes (L5)                                             │
  └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Flusso in sequenza:

1. **L4** — Validazione della `SignedOperationRequest` → `isValid == true`.
2. **L3** — `execute(request)` → costruzione envelope, serializzazione canonica (L2), persistenza tramite orchestrator mock (canonical bytes salvati per `resourceId`).
3. **L6** — Costruzione `DeterministicExecutionContract` da envelope + canonical + hasher → `deterministicHash` stabile.
4. **L7** — `checkAndRegister(contract)`: prima chiamata → allowed (`alreadyExecuted: false`), seconda chiamata stesso contract → blocked (`alreadyExecuted: true`).
5. **L5** — `retrieve(operationId, resourceId)`: bytes dal mock, parsing a envelope, ricalcolo canonico, verifica firma (mock) → `signatureValid`; round-trip bytes identici a L3.

---

## Proprietà garantite

- **Determinismo**: stessa request e stesso flusso → stessi canonical bytes e stesso `deterministicHash`; ripetendo lo scenario due volte i risultati coincidono.
- **Simmetria write/read**: i bytes generati in L3 e persistiti sono uguali a quelli ricalcolati in L5 dopo il retrieve; nessuna alterazione nel round-trip.
- **Idempotenza**: il guard L7 impedisce di considerare “nuova” una seconda esecuzione con lo stesso contract (stesso hash).
- **Verificabilità**: in caso di firma invalida, L5 restituisce `signatureValid: false` senza lanciare; il comportamento è deterministico e auditabile.

---

## Posizionamento del test

- **Percorso**: `test/flow/application/e2e/deterministic_flow_e2e_test.dart`
- **Solo test**: nessuna modifica a `lib/`, nessun nuovo layer, nessun helper in produzione.
- **Mock**: orchestrator in-memory (store/retrieve canonical bytes per `resourceId`); SignaturePort mock (valid/invalid configurabile per happy path e failure path).

---

## Criteri di completamento L8

- Test E2E verde (tutti gli scenari passano).
- Scenario deterministico ripetibile (stessa request → stessi bytes e hash).
- Nessuna entropia runtime nel flusso sotto test (no DateTime, Random, UUID, jsonEncode, side-effect globale).
- Nessuna modifica ai layer esistenti in `lib/`.
- Documentazione presente (`docs/L8_END_TO_END_DETERMINISM.md`).

Con L8 la Fase L è formalmente chiusa: dal modello puro (L1) alla serializzazione canonica (L2), al service (L3), alla validazione (L4), al retrieval e verifica (L5), al contract (L6), all’idempotency guard (L7), fino alla verifica end-to-end (L8). IRIS è deterministico end-to-end nel layer applicativo.
