# L2 — Operation Serialization Layer

## Cos’è la serializzazione ibrida

Il layer L2 introduce un modello **ibrido** per la rappresentazione di `OperationEnvelope`:

- **Forma canonica**: bytes deterministici, orientati al byte, con ordinamento fisso. È la sola “verità” usata per firma, hash, confronto e audit.
- **Forma view**: rappresentazione leggibile (stringhe, base64, mappe) per logging, debug e test. Non è usata per firma o hash e non è garantita stabile nel tempo.

La serializzazione **canonica** è l’unica fonte di verità; la **view** è solo un’interpretazione leggibile.

---

## Differenza tra forma canonica e view

| Aspetto | Forma canonica | Forma view |
|--------|-----------------|------------|
| Tipo | `OperationEnvelopeCanonical` (Uint8List) | `OperationEnvelopeView` (stringhe, liste, mappe) |
| Uso | Firma, hash, confronto, audit, idempotenza | Logging, debug, ispezione |
| Determinismo | Garantito (stesso envelope → stessi bytes) | Non garantito nel tempo |
| Encoding | Binario (length-prefixed, big-endian) | Base64 per la firma, UTF-8 per stringhe |
| Modificabilità | Bytes immutabili (copia difensiva) | Snapshot immutabile |

---

## Perché JSON non è verità

JSON non è usato per la forma canonica perché:

- L’ordine delle chiavi negli oggetti non è garantito, quindi due rappresentazioni equivalenti possono dare bytes diversi.
- Numeri e stringhe possono avere più rappresentazioni (es. `1` vs `1.0`), con rischio di ambiguità.
- L’encoding è testuale e ridondante; per firma e hash serve una forma binaria univoca.

La forma canonica è **binaria**, con **ordinamento esplicito** e **nessun campo opzionale/implicito**, così che lo stesso envelope produca sempre gli stessi bytes.

---

## Layout binario campo per campo

La serializzazione canonica segue **esattamente** questo ordine:

1. **operationId**  
   - 4 bytes (big-endian): lunghezza in bytes UTF-8  
   - N bytes: UTF-8 di `operationId`

2. **resourceId**  
   - 4 bytes (big-endian): lunghezza in bytes UTF-8  
   - N bytes: UTF-8 di `resourceId`

3. **Payload**  
   - 4 bytes (big-endian): lunghezza del payload  
   - N bytes: payload (raw bytes)

4. **Signature bytes**  
   - 4 bytes (big-endian): lunghezza della firma  
   - N bytes: bytes della firma

5. **Metadata attributes**  
   - 4 bytes (big-endian): numero di coppie (key, value)  
   - Per ogni coppia, in ordine **lessicografico della chiave**:  
     - 4 bytes (big-endian): lunghezza della chiave UTF-8  
     - N bytes: UTF-8 della chiave  
     - 4 bytes (big-endian): lunghezza del valore UTF-8  
     - N bytes: UTF-8 del valore  

Nessun timestamp, padding o campo implicito. Nessuna reflection; l’ordinamento è hard-coded nel serializer.

---

## Garanzie di determinismo

- Stesso `OperationEnvelope` (stessi valori di tutti i campi) → stessi bytes canonici.
- Metadata con stesse coppie in ordine di chiave diverso → stessi bytes (chiavi ordinate lessicograficamente).
- Payload e lista originale passata al costruttore sono copiati in modo difensivo; mutazioni successive non cambiano i bytes canonici.
- Il canonical serializer **non** usa `DateTime`, `Random`, `UUID` né `jsonEncode`; solo `dart:typed_data` e encoding UTF-8 manuale (no `dart:convert` nel path canonico).

---

## Implicazioni per firma, hash, audit

- **Firma**: si firmano i bytes restituiti da `OperationEnvelopeCanonical.bytes` (o equivalentemente il risultato di `OperationEnvelopeCanonicalSerializer.serialize(envelope).bytes`).
- **Hash**: l’hash per idempotenza, deduplica o audit va calcolato sui bytes canonici.
- **Audit**: la traccia immutabile e verificabile è la forma canonica; la view serve solo per lettura umana.
- **Confronto**: due envelope sono considerati uguali (per idempotenza/verifica) se e solo se i loro bytes canonici sono identici.

---

## Compatibilità con L3–L7

- **L3 (Application Flow)**: può usare il canonical serializer per ottenere i bytes da firmare o da persistere.
- **L4 (Validation)**: può confrontare bytes canonici o verificare la firma sui bytes prodotti da L2.
- **L5 (Retrieval & Verification)**: può ricalcolare i bytes canonici e confrontarli con quanto persistito o ricevuto.
- **L7 (Idempotency Guard)**: può usare i bytes canonici (o il loro hash) come chiave idempotente.
- **Fase M (Audit & Integrity)**: la forma canonica è il riferimento per integrità e audit trail.

Una violazione del determinismo o del layout in L2 compromette firma, hash, idempotenza e audit in tutti questi livelli.

---

## Componenti

- **OperationEnvelopeCanonical**: valore immutabile che espone `bytes` (Uint8List non modificabile, copia difensiva).
- **OperationEnvelopeCanonicalSerializer**: `serialize(OperationEnvelope)` → `OperationEnvelopeCanonical`; nessuna dipendenza da infrastructure, storage, lock, retry, UI, Core.
- **OperationEnvelopeView** / **toView**: solo per debug/log/test; non usati dal path canonico e non garantiti stabili.
