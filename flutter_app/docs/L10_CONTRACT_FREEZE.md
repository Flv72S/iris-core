# L10 — Contract Freeze
## Formal Freeze of Application Deterministic Contract

---

## 1. Executive Summary

### Cosa garantisce la FASE L

La Fase L garantisce che il **layer applicativo** IRIS sia:

- **Deterministico end-to-end**: stessa `SignedOperationRequest` → stessi canonical bytes (L2) → stesso deterministicHash (L6) → stesso esito; nessun uso di DateTime, Random, UUID o JSON nel path canonico.
- **Simmetrico write/read**: i bytes prodotti in L3 e persistiti tramite orchestrator sono identici a quelli ricalcolati in L5 dopo il retrieve; il layout binario L2 è l’unica fonte di verità per firma, hash e confronto.
- **Idempotente localmente**: L7 (Idempotency Guard) impedisce che la stessa identità di esecuzione (stesso deterministicHash) sia considerata “nuova” più di una volta nello stesso contesto; prima esecuzione → allowed, ripetizione → alreadyExecuted.
- **Robusto ai failure path**: bytes corrotti, payload troncati, metadata incoerenti e eccezioni dall’orchestrator producono eccezioni deterministiche (RangeError/StateError) o propagazione invariata; nessun crash non controllato, nessuna mutazione globale.
- **Isolato**: i canonical bytes nel DeterministicExecutionContract (L6) sono copia difensiva non modificabile; i registry L7 non condividono stato tra istanze; nessun accesso diretto allo storage nel layer applicativo.

### Cosa NON garantisce la FASE L

- **Validazione della firma crittografica**: L4 verifica solo integrità strutturale (campi non vuoti, coerenza sintattica); la verifica crittografica della firma è delegata all’infrastruttura (K) o al read path (L5).
- **Idempotenza distribuita**: L7 è in-memory; al riavvio il registro è vuoto; non c’è coordinazione tra processi o nodi.
- **Protezione contro collisioni hash**: l’hash FNV-1a 32-bit può collisionare; due contract con bytes diversi e stesso hash sono trattati come la stessa esecuzione (alreadyExecuted per il secondo).
- **Versioning automatico** del layout binario o dell’algoritmo hash: non esiste; ogni modifica richiede una nuova major version esplicita.
- **Validazione di business rule**: formato UUID, schema JSON, autorizzazioni, policy non sono in scope L4.
- **Replay persistente** o audit trail persistente: non fa parte del contratto L1–L9.

### Perché è deterministicamente stabile

- **Nessuna entropia runtime** nel path canonico: nessun DateTime, Random, UUID, jsonEncode; solo layout binario fisso (L2) e hash FNV-1a 32-bit (L6).
- **Ordine di validazione fisso** (L4) e **ordine di serializzazione fisso** (L2); stessi input → stessi bytes → stesso hash.
- **Failure path formalmente testati** (L9): corrupted bytes, truncated payload, metadata inconsistency, orchestrator failure, registry isolation e stress loop sono coperti da test con comportamento atteso documentato.
- **Contratto congelato**: layout L2, algoritmo hash L6, semantica L7 e regole di propagazione L3/L5 sono definiti e non modificabili senza breaking change.

---

## 2. Layer Map Ufficiale

```
L1 → Modello puro
     OperationEnvelope (operationId, resourceId, payload, signature, metadata).
     Immutabile; nessuna serializzazione, nessuna logica; solo dati.

L2 → Serializzazione canonica
     OperationEnvelopeCanonicalSerializer, OperationEnvelopeCanonical.
     Envelope → bytes deterministici (length-prefixed, big-endian, metadata ordinati lessicograficamente).
     Nessun JSON, nessuna entropia; unica fonte di verità per firma/hash/audit.

L3 → Application flow service
     SignedOperationService: request → envelope → canonical → orchestrator (K).
     Nessuna validazione firma, nessun accesso a storage/lock/retry; eccezioni propagano.

L4 → Validation layer
     SignedOperationValidator: validazione strutturale pre-esecuzione (campi non vuoti, coerenza).
     Ordine fisso: operationId → resourceId → payload → signature → metadata.
     Nessuna eccezione; ValidationResult (valid / invalid con lista errori).

L5 → Retrieval & signature verification
     OperationRetrievalService: retrieve(bytes) → parse canonico → envelope → re-serialize → verify(signaturePort).
     Firma verificata sui bytes canonici; signatureValid in risultato; nessuna eccezione su verifica fallita.

L6 → Deterministic execution contract
     DeterministicExecutionContract (operationId, resourceId, canonicalBytes, deterministicHash).
     Hash FNV-1a 32-bit sui canonical bytes; canonicalBytes copia difensiva non modificabile.
     Nessuna esecuzione, nessuna infrastruttura.

L7 → Idempotency guard
     IdempotencyGuard + IdempotencyRegistry: checkAndRegister(contract) → alreadyExecuted (bool).
     Decisione solo su deterministicHash; in-memory; nessuna persistenza.

L8 → End-to-end verification
     Test di sistema: L4 → L3 → L6 → L7 → L5 in un unico scenario; determinismo, simmetria write/read, idempotenza.

L9 → Failure matrix hardening
     Test su corrupted bytes, truncated payload, metadata inconsistency, hash collision, contract isolation,
     orchestrator failure, registry isolation, determinism stress loop.
```

**Confini**: L1–L7 sono layer in `lib/`; L8 e L9 sono verifiche (solo test). L3 e L5 dipendono dall’orchestrator (K); L4, L2, L6, L7 non dipendono da K. Nessun layer applicativo accede direttamente allo storage.

---

## 3. Invarianti Garantite

- **Determinismo end-to-end**: stessa request e stesso flusso → stessi canonical bytes e stesso deterministicHash; ripetizione dello scenario produce risultati identici.
- **Assenza di entropia runtime**: nel path canonico (L2, L6, L4, L7) non sono usati DateTime, Random, UUID, jsonEncode né generazione automatica di ID.
- **Purezza del dominio**: L1 è solo dati immutabili; L4 e L6 non eseguono operazioni né accedono a infrastruttura; L7 non modifica il contract né lancia eccezioni.
- **Simmetria write/read**: bytes persistiti in L3 (canonical) sono uguali ai bytes ricalcolati in L5 dopo retrieve e re-serializzazione; stesso layout L2 in entrambe le direzioni.
- **Idempotenza locale**: stesso DeterministicExecutionContract (stesso hash) registrato una seconda volta → alreadyExecuted true; nessuna doppia esecuzione nello stesso contesto.
- **Isolamento dei canonical bytes**: DeterministicExecutionContract conserva una copia non modificabile dei bytes; mutazione dell’array passato al costruttore non altera il contract.
- **Propagazione errori invariata**: eccezioni dall’orchestrator (execute o retrieve) propagano al chiamante senza essere catturate o trasformate da L3/L5; L5 restituisce signatureValid false senza lanciare.
- **Assenza di side effect globali**: il validator non modifica la request; il guard non modifica il contract; nessun registro condiviso tra contesti non esplicitamente condivisi.

---

## 4. Limiti Consapevoli

- **Hash FNV-1a 32-bit**: spazio limitato; collisioni possibili. Due contract con canonical bytes diversi e stesso hash sono considerati la stessa esecuzione da L7 (secondo → alreadyExecuted true). Comportamento documentato e testato (L9).
- **Idempotenza solo in-memory**: il registry L7 non persiste; al riavvio lo stato è vuoto; la stessa operazione può essere considerata nuova dopo restart.
- **Nessuna protezione distribuita**: nessun accordo tra nodi, nessun lock distribuito, nessuna garanzia multi-processo oltre al singolo contesto.
- **Nessun versioning automatico**: il layout binario L2 e l’algoritmo hash L6 non hanno campo versione; ogni modifica incompatibile richiede una nuova baseline documentata (es. major version).
- **Nessuna validazione business rule**: L4 non verifica UUID, schema JSON, autorizzazioni, policy, lunghezze massime di dominio; solo integrità strutturale.
- **Nessun replay persistente**: non esiste audit trail persistente o meccanismo di replay persistente nel contratto L1–L9.

---

## 5. Contract Surface

Gli elementi seguenti costituiscono il **contratto congelato**. Modificarli in modo incompatibile richiede una **nuova major version** della baseline applicativa.

- **Layout binario L2**: ordine e formato dei campi (operationId length+bytes, resourceId length+bytes, payload length+bytes, signature length+bytes, attrCount, poi per ogni attributo key length+bytes, value length+bytes con chiavi ordinate lessicograficamente). Big-endian uint32 per tutte le lunghezze; UTF-8 per stringhe. Nessun timestamp, padding o campo implicito.
- **Algoritmo hash L6**: FNV-1a 32-bit (offset basis 0x811c9dc5, prime 0x01000193) applicato ai canonical bytes. Stessi bytes → stesso int. Nessun altro input (es. operationId) nel calcolo dell’hash del contract.
- **Ordine di validazione L4**: operationId → resourceId → payload → signature (signatureBytes, algorithm) → metadata (chiavi non vuote). Lista errori in quest’ordine; nessuna eccezione.
- **Semantica L7**: checkAndRegister(contract): se registry.contains(contract.deterministicHash) → IdempotencyResult(alreadyExecuted: true); altrimenti registry.register(hash) e IdempotencyResult(alreadyExecuted: false). Nessuna eccezione; nessuna modifica del contract.
- **Regole di propagazione errori**: L3 execute: eccezioni dall’orchestrator propagano al chiamante; nessuna registrazione idempotency se execute non completa. L5 retrieve: eccezioni da retrievePersistedPayload propagano; verifica firma fallita → signatureValid false nel risultato, nessuna eccezione. Parsing canonico fallito (bytes corrotti/truncati) → eccezione deterministica (RangeError/StateError).

---

## 6. Determinism Guarantees Checklist

- [x] Nessun DateTime nel path canonico o nei layer L2, L4, L6, L7.
- [x] Nessun Random nel path canonico o nei layer L2, L4, L6, L7.
- [x] Nessun UUID generato nel layer applicativo (L1–L7).
- [x] Nessuna serializzazione JSON nel canonical path (L2 usa solo layout binario).
- [x] Nessuna generazione automatica di ID (operationId, resourceId forniti dalla request).
- [x] Nessuna dipendenza circolare tra L1–L7 (L3/L5 dipendono da K, non il contrario; L4, L2, L6, L7 non dipendono da K).
- [x] Nessun accesso diretto a storage nel layer applicativo (L3 e L5 delegano all’orchestrator).

---

## 7. Version Declaration

**FASE L — APPLICATION DETERMINISTIC BASELINE**  
**Versione:** 1.0.0-freeze  
**Stato:** Hardened & Frozen  

Il layer applicativo IRIS (L1–L7), con verifiche end-to-end (L8) e failure matrix (L9), è formalmente congelato. Il contratto è stabile, versionabile e auditabile.
