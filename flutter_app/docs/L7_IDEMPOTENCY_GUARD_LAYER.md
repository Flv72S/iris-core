# L7 — Idempotency Guard Layer

## Cos’è l’idempotenza deterministica

L’**idempotenza deterministica** in L7 impedisce che la **stessa operazione** (identificata dallo stesso `DeterministicExecutionContract`) venga considerata “nuova” più di una volta nello stesso contesto applicativo. Il guard non esegue l’operazione, non scrive su storage, non modifica l’orchestrator: tiene solo un registro in memoria degli hash già “visti” e risponde **alreadyExecuted** quando il contract è già stato registrato.

---

## Perché si basa su DeterministicExecutionContract

- **Identità stabile**: il contract ha `deterministicHash` derivato solo dai bytes canonici (L6); stesso contenuto → stesso hash → stessa identità.
- **Confronto affidabile**: non si confrontano payload o metadati a mano; si usa l’hash già calcolato sul canonical, allineato a firma e storage.
- **Nessuna ambiguità**: due envelope con stessi bytes canonici producono lo stesso contract e lo stesso hash; il guard tratta come “già eseguita” ogni ripetizione con lo stesso hash.

L7 riceve un `DeterministicExecutionContract` (costruito altrove a partire da envelope + canonical + hasher) e decide solo: **già registrato** → `alreadyExecuted: true`, altrimenti registra l’hash e restituisce `alreadyExecuted: false`.

---

## Differenza tra idempotenza applicativa e storage-level

| Aspetto | L7 (applicativa) | Storage-level |
|--------|-------------------|---------------|
| Dove | In memoria del processo | DB / distributed store |
| Cosa si registra | Hash del contract (int) | Chiave idempotenza (es. stringa/uuid) |
| Persistenza | No; si perde al riavvio | Sì |
| Scopo | Evitare doppia esecuzione nello stesso contesto | Evitare doppia scrittura tra richieste/ripetizioni |

L7 è **applicativa** e **in-memory**: adatta a un singolo contesto di esecuzione (es. una sessione, un worker). Un’idempotenza **distribuita** (multi-nodo, multi-request) richiederà un registro persistente o condiviso (futuro microstep), ma il **contratto** (DeterministicExecutionContract + hash) resta il riferimento comune.

---

## Limiti (in-memory only)

- **Nessuna persistenza**: al riavvio dell’applicazione il registro è vuoto; la stessa operazione può essere considerata “nuova” di nuovo.
- **Nessuna eviction**: il set degli hash non ha scadenza né limite di dimensione; in scenari long-lived potrebbe crescere (evoluzione futura).
- **Nessun timestamp**: nessuna TTL, nessuna scadenza; l’hash resta registrato fino a `clear()` (o fine processo).
- **Single-process**: non c’è coordinazione tra più processi o nodi; ogni istanza ha il proprio registro.

Questi limiti sono intenzionali per L7: il layer è deterministico, senza I/O, senza dipendenze da storage o rete.

---

## Evoluzione futura verso idempotenza distribuita

- **Registro persistente**: stesso `deterministicHash` come chiave in un store (DB, cache distribuita) per sopravvivere ai riavvii e essere condiviso tra istanze.
- **Integrazione con L3**: prima di chiamare l’orchestrator, costruire il contract (envelope + canonical + hasher), passare al guard; se `alreadyExecuted` → non eseguire (o restituire risultato cached).
- **TTL/eviction** (opzionale): politiche di scadenza per limitare la crescita del registro in contesti long-lived.

L7 fornisce il **contratto** e la **semantica** (check-and-register); la persistenza e la distribuzione sono responsabilità di layer successivi.

---

## Posizionamento nel flusso: L4 → L6 → L7 → L3

1. **L4 (Validation)**: valida la request; se non valida, non si procede.
2. **L6 (Contract)**: a partire da envelope + canonical (prodotti in L3 o altrove) si costruisce il `DeterministicExecutionContract` e il suo hash.
3. **L7 (Idempotency Guard)**: `checkAndRegister(contract)` → se già registrato, `alreadyExecuted: true`; altrimenti si registra e si restituisce `alreadyExecuted: false`.
4. **L3 (Service)**: se il guard restituisce `alreadyExecuted: false`, si può procedere con `execute` (build envelope, canonical, orchestrator); se `true`, il chiamante decide (skip, return cached, ecc.).

L’integrazione esplicita L7→L3 sarà fatta in un microstep successivo; L7 espone solo il guard e il risultato.

---

## Componenti

- **IdempotencyResult**: `alreadyExecuted` (bool); immutabile, nessuna logica.
- **IdempotencyRegistry**: `contains(deterministicHash)`, `register(deterministicHash)`, `clear()` (per test); implementazione con `Set<int>`; nessuna persistenza, eviction o timestamp.
- **IdempotencyGuard**: riceve il registry; `checkAndRegister(DeterministicExecutionContract)` → se l’hash è già nel registry restituisce `IdempotencyResult(alreadyExecuted: true)`, altrimenti registra l’hash e restituisce `IdempotencyResult(alreadyExecuted: false)`. Nessuna eccezione, nessun log, nessuna modifica del contract.

---

## Posizionamento

- **Percorso**: `lib/flow/application/idempotency/`
- **Dipendenze consentite**: DeterministicExecutionContract (L6), dart:core, dart:collection.
- **Vietato**: orchestrator (K), serializer (L2), retrieval (L5), validator (L4), storage, crypto, cloud, JSON.
