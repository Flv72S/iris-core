# L5 — Retrieval & Verification Flow

## Differenza tra write path (L3) e read path (L5)

| Aspetto | Write path (L3) | Read path (L5) |
|--------|------------------|----------------|
| Direzione | Request → Envelope → Canonical → Persist | Persist → Canonical → Envelope → Verify |
| Scrittura | Sì: orchestrator scrive su storage | No: solo lettura |
| Lock | Sì: acquire prima, release dopo | No |
| Retry | Sì: delegato all’orchestrator | No |
| Firma | Prodotta dall’orchestrator sui bytes canonici | Verificata qui sui bytes canonici ricalcolati |
| Output | SignedOperationResult (envelope + persisted) | RetrievedOperationResult (envelope + signatureValid) |

L3 è il flusso di **esecuzione** di un’operazione firmata; L5 è il flusso di **lettura e verifica** di un’operazione già persistita.

---

## Perché la firma viene verificata qui

La firma è verificata in L5 perché:

1. **Read path**: i bytes persistiti devono essere considerati “veri” solo dopo aver verificato l’integrità. La verifica avviene sul **canonico ricalcolato** (serializzare l’envelope ricostruito) confrontato con la firma contenuta nell’envelope.
2. **Separazione responsabilità**: L3 non verifica la firma (delega tutto a K). L4 non tocca la firma (solo validazione strutturale). La **verifica crittografica** nel read path è di competenza del servizio che legge e restituisce un risultato applicativo (envelope + `signatureValid`).
3. **Nessuna eccezione su verifica fallita**: se la verifica fallisce, il servizio restituisce `RetrievedOperationResult(envelope, signatureValid: false)` senza lanciare; il chiamante decide come gestirlo (audit, alert, ecc.).

La verifica usa **esclusivamente** il `SignaturePort` (K) iniettato nel servizio; nessuna logica crittografica applicativa oltre alla chiamata al port.

---

## Perché L2 resta puro serializer

L2 espone solo **serializzazione** (envelope → bytes canonici). Non espone un deserializer pubblico perché:

- La **forma canonica** è il contratto stabile per firma/hash/audit; il parsing è un dettaglio del read path.
- Evitare un’API di parsing generica riduce il rischio di usi incoerenti e mantiene un solo “posto” dove il layout binario è interpretato (il parser interno L5).
- L2 non dipende da infrastructure; un deserializer potrebbe richiedere gestione errori o tipi infrastrutturali. Tenendo il parser **interno** a L5, L2 resta puro e L5 può dipendere da orchestrator e SignaturePort.

---

## Perché il parser è interno

Il parser canonico è **privato** in `OperationRetrievalService` (_parseCanonical) perché:

- È **simmetrico** al layout L2: stesso ordine (operationId, resourceId, payload, signature, metadata con chiavi ordinate), stesso encoding (length-prefixed UTF-8, uint32 big-endian).
- È usato **solo** per il read path: recupero bytes → envelope → ricalcolo canonico → verifica.
- Non è un’API di parsing generica: non viene esposto come deserializer pubblico, così il layout resta un dettaglio di implementazione condiviso tra L2 (serialize) e L5 (parse interno).

Determinismo e stabilità round-trip sono garantiti dai test (serialize → persist mock → retrieve → reserialize → bytes identici).

---

## Determinismo end-to-end

- **Recupero**: l’orchestrator restituisce i bytes così come persistiti; nessuna trasformazione.
- **Parsing**: algoritmo fisso, stesso ordine di L2; uso di `utf8.decode` (dart:convert) solo nel path di lettura, non nella serializzazione canonica.
- **Ricalcolo canonico**: stesso serializer L2; stesso input envelope → stessi bytes.
- **Verifica**: il SignaturePort è deterministico (stessi bytes + stessa firma → stesso esito).

Nessun uso di DateTime, Random, UUID, jsonEncode o reflection nel modulo retrieval; stesso payload e stessa versione chiave → stesso risultato.

---

## Preparazione per audit (L6 futuro)

L5 prepara un eventuale L6 (audit) perché:

- **Read path verificabile**: ogni operazione recuperata ha un esito di verifica (`signatureValid`) senza eccezioni; un layer di audit può registrare operazioni con firma invalida.
- **Forma canonica**: i bytes canonici sono la “verità” per hash e confronto; un audit trail può riferirsi a essi in modo deterministico.
- **Envelope immutabile**: l’envelope restituito è immutabile (L1/L1.1); nessuna modifica silente dopo la verifica.

---

## Componenti

- **RetrievedOperationResult**: envelope + `signatureValid`; immutabile, nessuna logica.
- **OperationRetrievalService**: dipende da `InfrastructureOrchestrator`, `OperationEnvelopeCanonicalSerializer`, `SignaturePort`. Metodo `retrieve(operationId, resourceId)` → recupera bytes, parse interno, ricalcolo canonico, verifica, ritorno risultato.

---

## Posizionamento

- **Percorso**: `lib/flow/application/retrieval/`
- **Dipendenze consentite**: OperationEnvelope (L1), OperationEnvelopeCanonicalSerializer (L2), InfrastructureOrchestrator (K), SignaturePort (K), dart:typed_data, dart:core (e dart:convert solo nel parser interno).
- **Vietato**: validation (L4), idempotency (L7), storage diretto, lock, retry, UI, cloud, JSON serializer pubblico.
