# L6 — Deterministic Execution Contract

## Cos’è un execution contract

Un **DeterministicExecutionContract** è una struttura che **congela** un’esecuzione applicativa in forma verificabile: identifica in modo deterministico l’operazione tramite `operationId`, `resourceId`, i **bytes canonici** (forma binaria stabile) e un **hash deterministico** derivato solo da tali bytes.

L6 **non** esegue operazioni, **non** accede a infrastruttura, **non** serializza l’envelope: riceve envelope e forma canonica già prodotti (L1/L2) e costruisce un contratto congelato e hashabile.

---

## Differenza tra envelope e contract

| Aspetto | OperationEnvelope (L1) | DeterministicExecutionContract (L6) |
|--------|------------------------|-------------------------------------|
| Contenuto | operationId, resourceId, payload, signature, metadata | operationId, resourceId, canonicalBytes, deterministicHash |
| Scopo | Rappresentare l’operazione completa da eseguire o già eseguita | Identità deterministica per confronto, idempotenza, audit |
| Hash | Non esposto | deterministicHash derivato solo dai canonicalBytes |
| Forma | Oggetto in memoria | Bytes canonici + hash congelati |

L’envelope è il **dato** dell’operazione; il contract è l’**identità deterministica** dell’esecuzione, adatta a confronto bit-level e a chiavi idempotenti.

---

## Perché l’hash è calcolato sui canonical bytes

- **Unicità**: la forma canonica (L2) è univoca per un dato envelope; stesso envelope → stessi bytes → stesso hash.
- **Indipendenza dalla rappresentazione**: non dipende da come l’envelope è costruito in memoria, ma solo dalla sua forma serializzata.
- **Allineamento con firma e storage**: la firma e il persist sono sui bytes canonici; l’hash del contract è sulla stessa “verità” binaria.
- **Determinismo**: nessun timestamp, nessun Random; stessi bytes → stesso hash a ogni run.

L’hash **non** include operationId/resourceId come input del calcolo: sono parte del contract ma l’**identità numerica** (deterministicHash) è solo sui bytes canonici, così due contract con stessi bytes sono considerati la stessa esecuzione a livello di contenuto.

---

## Ruolo in audit e replay

- **Audit**: un contract può essere registrato come riferimento di un’esecuzione; l’hash permette di verificare che i bytes non siano cambiati.
- **Replay**: confrontando i bytes (o l’hash) di un’esecuzione con un contract congelato si può stabilire se un’operazione è stata ripetuta in modo identico.
- **Consenso distribuito (futuro)**: l’identità deterministica dell’esecuzione è il candidato naturale per accordo tra nodi (stesso hash = stessa operazione).

---

## Preparazione per L7 (idempotency deterministica)

L7 (Idempotency Guard) potrà usare il contract (o il solo deterministicHash) come **chiave idempotente**: stessa operazione (stessi bytes canonici) → stesso hash → stessa chiave → riconoscimento di duplicati senza eseguire due volte. L6 fornisce il tipo e l’hash stabile; L7 deciderà come e dove persistere/consultare le chiavi.

---

## Perché non usiamo SHA esterno in questo layer

- **Vincolo architetturale**: il modulo contract non deve dipendere da package crypto esterni; deve restare solo dart:typed_data e dart:core (più L1/L2 per i tipi).
- **Determinismo e testabilità**: un hash semplice (es. FNV-1a 32-bit) è deterministico, senza side effect, facile da testare e da riprodurre.
- **Scopo**: l’hash qui serve a **identità** e **confronto** (idempotenza, audit), non a sicurezza crittografica; la firma resta responsabilità di K.
- **Evoluzione**: in futuro un layer di sicurezza può introdurre hash crittografici (es. SHA-256) per audit o notarizzazione; L6 resta il contratto “identità deterministica” con hash interno stabile.

---

## Componenti

- **ExecutionContractHasher**: `int hash(Uint8List bytes)`. Implementazione FNV-1a 32-bit; nessuna entropia, nessuna libreria esterna.
- **DeterministicExecutionContract**: operationId, resourceId, canonicalBytes (copia difensiva non modificabile), deterministicHash. Factory `fromCanonical(envelope, canonical, hasher)` che calcola l’hash dai canonical.bytes e costruisce il contract senza ricalcolare il canonical né verificare la firma.

---

## Posizionamento

- **Percorso**: `lib/flow/application/contract/`
- **Dipendenze consentite**: OperationEnvelope (L1), OperationEnvelopeCanonical (L2), dart:typed_data, dart:core.
- **Vietato**: orchestrator (K), validator (L4), retrieval (L5), idempotency (L7), storage, crypto concreto (no package SHA esterni).
