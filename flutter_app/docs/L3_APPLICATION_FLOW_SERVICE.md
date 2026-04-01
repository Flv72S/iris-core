# L3 — Application Flow Service

## Scopo del servizio

**SignedOperationService** è il primo servizio applicativo reale di IRIS. Realizza il **flusso applicativo minimo** che:

1. Riceve un payload applicativo tramite **SignedOperationRequest**
2. Costruisce un **OperationEnvelope** (L1) usando esclusivamente i dati della request
3. Serializza l’envelope in **forma canonica** (L2)
4. Invoca l’**InfrastructureOrchestrator** (Fase K) passando solo i bytes canonici
5. Restituisce un **SignedOperationResult** deterministico

Non introduce logica di dominio, non genera `operationId`, non introduce entropia a runtime.

---

## Separazione applicativo vs infrastrutturale

| Livello   | Responsabilità |
|----------|----------------|
| **L3 (Application)** | Costruire envelope dalla request, serializzare in canonico, chiamare l’orchestrator, restituire il risultato. Nessuna validazione firma, nessun accesso a storage/lock/retry. |
| **K (Infrastructure)** | Lock, retry, firma del payload (bytes canonici), upload su storage, release lock. Comportamento “black box” per L3. |

Il servizio **non** interpreta errori, non rilancia eccezioni custom, non altera metadata né payload. L’orchestrator è invocato con contesto e provider dei bytes canonici; eventuali eccezioni propagano al chiamante.

---

## Flusso end-to-end

1. **Input**: `SignedOperationRequest` (operationId, resourceId, payload, signature, metadata) — tutti i campi obbligatori, nessuna generazione interna.
2. **Envelope**: `OperationEnvelope` costruito con gli stessi campi della request (copia difensiva del payload in L1).
3. **Canonical**: `OperationEnvelopeCanonicalSerializer.serialize(envelope)` → bytes deterministici.
4. **Orchestrator**: `executeSignedStorageOperation(context, payloadProvider)` dove `payloadProvider` restituisce i bytes canonici; il contesto usa `operationId` e `resourceId` della request.
5. **Output**: `SignedOperationResult(envelope: envelope, persisted: true)` se l’orchestrator completa senza eccezione; altrimenti l’eccezione propaga.

---

## Responsabilità delegate a K

- **Firma**: l’orchestrator firma i bytes canonici (non il servizio L3).
- **Persistenza**: upload su storage gestito dall’orchestrator.
- **Lock**: acquisizione e rilascio del lock sulla risorsa gestiti dall’orchestrator.
- **Retry**: politica di retry applicata dall’orchestrator al payload provider.

L3 non valida la firma, non accede allo storage, non gestisce retry né lock.

---

## Perché non esiste logica di dominio

L3 è un **ponte** tra modello applicativo (L1), serializzazione canonica (L2) e infrastruttura (K). Non decide “cosa” sia un’operazione valida dal punto di vista di dominio (es. regole business, autorizzazioni): si limita a:

- assemblare l’envelope dai dati ricevuti,
- produrre la forma canonica,
- delegare all’orchestrator.

Validazione semantica, idempotenza e retrieval sono demandati a L4, L5, L7.

---

## Preparazione per L4 / L5 / L7

- **L4 (Validation)**: potrà validare la request o l’envelope prima/dopo l’invocazione di L3; L3 non valida.
- **L5 (Retrieval & Verification)**: userà la stessa forma canonica e l’orchestrator per verificare/recuperare; L3 si occupa solo del flusso “execute”.
- **L7 (Idempotency Guard)**: userà i bytes canonici (o un hash) come chiave idempotente; L3 non gestisce idempotenza.

L3 resta minimale e deterministico; ogni estensione (validazione, retrieval, idempotenza) vive nei rispettivi layer.

---

## Componenti

- **SignedOperationRequest**: modello immutabile con operationId, resourceId, payload, signature, metadata (tutti required).
- **SignedOperationResult**: envelope + flag `persisted` (true se l’orchestrator ha completato senza eccezione).
- **SignedOperationService**: dipende da `InfrastructureOrchestrator` e `OperationEnvelopeCanonicalSerializer`; metodo `Future<SignedOperationResult> execute(SignedOperationRequest request)`.

---

## Posizionamento

- **Percorso**: `lib/flow/application/service/`
- **Dipendenze ammesse**: modelli L1, serializer L2, InfrastructureOrchestrator e InfrastructureOperationContext (Fase K), SignedPayload/SignatureMetadata.
- **Nessuna dipendenza da**: storage, lock, retry, adapter, cloud, UI, Core, serializer JSON.
