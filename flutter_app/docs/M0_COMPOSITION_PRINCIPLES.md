# M0 — Composition Principles & Invariants
## Deterministic Flow Composition Specification

---

## 1. Executive Overview

### Perché esiste la Fase M

La Fase L congela il layer applicativo come **atomi** deterministici: un singolo `DeterministicExecutionContract` (DEC) rappresenta un’esecuzione identificata da canonical bytes e hash. Per gestire flussi che coinvolgono **più operazioni** come un’unica identità deterministica (batch, pipeline, grafi di operazioni) serve un livello che **componga** DEC senza eseguirli né modificarli: la Fase M.

### Il ruolo della composizione sopra L

La composizione sopra L definisce **strutture** che aggregano uno o più DEC in una nuova entità immutabile, con propri canonical bytes compositi e hash composito deterministico. Non sostituisce L né ne altera il contratto; opera **sopra** i DEC prodotti da L.

### Differenza tra Execution Contract (L) e Composite Contract (M)

| Aspetto | DeterministicExecutionContract (L) | Composite Deterministic Contract (M) |
|--------|------------------------------------|--------------------------------------|
| Contenuto | Un’operazione: operationId, resourceId, canonicalBytes, deterministicHash | Uno o più DEC (o CDC annidati) in struttura ordinata |
| Origine | Prodotto da L (envelope + canonical + hasher) | Prodotto da M (composizione pura di DEC/CDC) |
| Identità | deterministicHash su canonical bytes singoli | compositeDeterministicHash su canonical bytes compositi |
| Ruolo | Unità atomica di esecuzione verificabile | Unità strutturale composita verificabile |

L fornisce **atomi**; M fornisce **algebra strutturale** su tali atomi.

### Principio: “L rimane atomico, M è algebra strutturale”

- **L** produce e consuma DEC come elementi indivisibili; il freeze 1.0.0-freeze di L non viene toccato.
- **M** definisce operazioni di composizione (sequenziale, parallela, condizionale, annidata) che, date strutture di DEC (e eventualmente CDC annidati), producono una nuova struttura immutabile con canonical bytes e hash compositi. M non esegue flussi, non valida, non accede a I/O; è puramente strutturale.

---

## 2. Definizione Formale di Composizione Deterministica

**Composizione deterministica** è una **funzione pura** che:

1. **Accetta** uno o più `DeterministicExecutionContract` (e, dove previsto, strutture composite annidate).
2. **Produce** una nuova struttura immutabile (Composite Deterministic Contract, CDC).
3. **Genera** canonical bytes compositi a partire unicamente dai canonical bytes degli input, secondo un layout stabile e dichiarato.
4. **Genera** un hash composito deterministico derivato esclusivamente dai canonical bytes compositi (o da regole di folding dichiarate).
5. **Non introduce** entropia runtime (nessun DateTime, Random, UUID, né altra fonte non deterministica).
6. **Non modifica** gli input: i DEC (e eventuali CDC) in ingresso restano immutabili; la composizione non muta né clona in modo mutabile.

Specifiche aggiuntive:

- La composizione è **puramente strutturale**: combina riferimenti o copie immutabili di DEC/CDC secondo regole fisse.
- **Non esegue** flussi: non invoca orchestrator, non avvia operazioni, non attende I/O.
- **Non effettua** validazione: né L4 né validazione business; non interpreta il contenuto semantico dei DEC.
- **Non accede** a I/O: nessuno storage, rete, filesystem, clock.

---

## 3. Invarianti Fondamentali della Fase M

- **Immutabilità assoluta**: ogni struttura prodotta dalla composizione (CDC) è immutabile; nessun campo modificabile dopo la costruzione.
- **Nessuna mutazione dei DEC originali**: i DEC in input non vengono alterati né in-place né tramite copie mutabili; se la composizione conserva riferimenti, gli oggetti restano invariati.
- **Determinismo totale**: stessi DEC (e stesso tipo di composizione, stesso ordine e stessi parametri strutturali) → stessi canonical composite bytes e stesso composite deterministic hash.
- **Assenza di entropia runtime**: nessun uso di DateTime, Random, UUID, clock, identificatori generati a runtime, né di qualsiasi fonte non deterministica.
- **Assenza di effetti collaterali**: la composizione non scrive su storage, non invia su rete, non modifica stato globale, non registra log applicativo che influenzi il risultato.
- **Separazione netta da L**: M non modifica codice L, non estende tipi L per aggiungere comportamento, non accede a dettagli interni di L oltre l’API pubblica del DEC (operationId, resourceId, canonicalBytes, deterministicHash).
- **Hash composito derivato solo da canonical bytes dei DEC**: il composite deterministic hash dipende esclusivamente dai canonical bytes degli atomi (e dal layout composito); nessun altro fattore (timestamp, nodo, contesto) entra nel calcolo.
- **Nessun riordino implicito**: l’ordine dei DEC nella composizione è esplicito e stabile; salvo il caso di composizione parallela formalmente definita (dove l’invarianza all’ordine è parte della specifica), l’ordine non può cambiare in modo non dichiarato.
- **Canonical layout stabile**: il formato dei canonical composite bytes è definito e non dipende da configurazione runtime né da fattori esterni; stesso grafo di composizione → stesso layout.

---

## 4. Modello Concettuale del Composite Deterministic Contract (CDC)

**Composite Deterministic Contract (CDC)** è una struttura immutabile che contiene:

- una **lista ordinata** di `DeterministicExecutionContract`, oppure
- **strutture composite annidate** (CDC che a loro volta contengono DEC o CDC), secondo regole di composizione definite.

Proprietà obbligatorie del CDC:

- **canonicalCompositeBytes**: rappresentazione binaria deterministica dell’intera struttura composita (layout stabile: ordine dei DEC, eventuale nesting, lunghezze e separatori definiti).
- **compositeDeterministicHash**: hash deterministico derivato esclusivamente da canonicalCompositeBytes (o da regole di folding dichiarate su tali bytes).

Il CDC:

- **Non conosce** l’orchestrator: nessuna dipendenza da InfrastructureOrchestrator né da contesti di esecuzione.
- **Non conosce** lo storage: nessun accesso a CloudStoragePort né a persistenza.
- **Non conosce** validazione: nessuna dipendenza da SignedOperationValidator né da regole di business.
- **Non conosce** idempotency di L: nessuna dipendenza da IdempotencyGuard né IdempotencyRegistry.

Il CDC è **solo struttura**: contenitore immutabile di DEC (e/o CDC) con canonical composite bytes e composite hash; nessuna logica di esecuzione, validazione o I/O.

---

## 5. Tipologie di Composizione Previste

Definizioni **solo semantiche** (senza implementazione).

- **Sequential Composition**: un CDC che rappresenta una sequenza ordinata di DEC. L’ordine è significativo: stesso insieme di DEC in ordine diverso produce canonical bytes e hash compositi diversi. Semantica: “A poi B poi C”.
- **Parallel Deterministic Composition**: un CDC che rappresenta un insieme di DEC senza ordine significativo tra loro (es. batch indipendenti). Il composite hash è invariante rispetto al riordino degli stessi DEC. Semantica: “A, B, C” dove l’ordine di serializzazione nel canonical layout è fissato (es. lessicografico per identità) per garantire determinismo.
- **Conditional Structural Composition**: un CDC che contiene due (o più) rami strutturali (es. “then” e “else”), ciascuno a sua volta DEC o CDC; la scelta del ramo non è eseguita da M ma è parte della struttura (es. predicato puro su identificatori). Semantica: “se condizione strutturale X allora CDC_A altrimenti CDC_B”, dove la condizione è espressa in modo deterministico (es. chiave, tipo) senza I/O.
- **Nested Composition**: un CDC che contiene altri CDC (e DEC) in gerarchia. Esempio: un CDC sequenziale i cui elementi sono a loro volta CDC paralleli. Semantica: composizione ricorsiva con layout canonical stabile per ogni livello.

Nessuna di queste tipologie implica esecuzione, validazione o I/O; sono solo forme strutturali di aggregazione.

---

## 6. Composite Hash Principles

- **Hash folding deterministico**: l’hash composito è ottenuto da una funzione deterministica applicata ai canonical bytes (compositi o ai singoli DEC secondo regole fisse). Stessi input → stesso hash; nessun seed esterno.
- **Sensibilità all’ordine (sequenziale)**: nella composizione sequenziale, l’ordine dei DEC influenza i canonical composite bytes e quindi il composite hash. Scambiare l’ordine di due DEC produce hash diverso.
- **Invarianza all’ordine (parallelo)**: nella composizione parallela formalmente definita, il composite hash è invariante rispetto al riordino degli stessi DEC; il canonical layout deve definire un ordinamento canonico (es. per deterministicHash o per identità) così che la rappresentazione sia unica.
- **Derivazione esclusiva da canonical bytes**: né timestamp, né nodeId, né contesto runtime entrano nel calcolo dell’hash composito; solo i bytes canonici (dei DEC e/o del layout composito).
- **Nessun uso di fattori esterni**: nessuna chiamata a servizi esterni, nessun lettore di configurazione, nessun ambiente; il calcolo è funzione pura degli input strutturali.

Non si specifica qui l’algoritmo (es. FNV-1a, concatenazione+hash); solo i principi che ogni algoritmo di hash composito dovrà rispettare.

---

## 7. Divieti Architetturali Assoluti

La Fase M **NON** può:

- **Modificare L**: nessuna modifica a lib/ L1–L7, nessuna estensione di tipi L che alteri il comportamento congelato, nessuna violazione del freeze 1.0.0-freeze.
- **Accedere a storage**: nessuna lettura/scrittura su filesystem, database, object store; nessuna dipendenza da CloudStoragePort o equivalente.
- **Accedere a rete**: nessuna chiamata HTTP, socket, messaggeria.
- **Usare DateTime**: nessun accesso a orologio di sistema o timestamp.
- **Usare Random**: nessun generatore di numeri casuali né fonte di entropia.
- **Generare UUID**: nessuna generazione di identificatori univoci a runtime.
- **Effettuare I/O**: nessun input/output oltre gli argomenti della funzione di composizione.
- **Effettuare validazione business**: nessuna regola di dominio (autorizzazioni, schema, policy); M è solo struttura.
- **Effettuare signature verification**: nessuna verifica crittografica; la firma resta responsabilità di L/K.
- **Conoscere dettagli interni di L oltre il contract pubblico**: M può usare solo ciò che è esposto dal DEC (operationId, resourceId, canonicalBytes, deterministicHash) e dai tipi pubblici di L; nessun accesso a implementazioni, registry, validator, serializer interno.

Questa sezione è **vincolante** per ogni microstep M1–M10.

---

## 8. Boundary con la Fase L

- **L produce DEC**: i DeterministicExecutionContract sono creati nel contesto di L (envelope + canonical + hasher); L resta l’unica fonte di DEC.
- **M consuma DEC**: la composizione M accetta DEC già prodotti come input; non ne crea di nuovi né ne altera il contenuto.
- **L non conosce M**: nessun riferimento da lib/ L1–L7 alla Fase M; nessun tipo M in L.
- **M non altera L**: nessuna modifica a file L, nessuna estensione che cambi il contratto L; il codice L resta identico dopo l’introduzione di M.
- **Il freeze 1.0.0-freeze rimane intatto**: il documento L10 e il report di Freeze Review restano validi; la baseline L è congelata e non viene toccata dalla Fase M.

---

## 9. Determinism Guarantee Checklist (M-Level)

- [ ] Nessuna entropia runtime (no DateTime, Random, UUID, clock, ID generati).
- [ ] Nessuna mutazione degli input (DEC e CDC in ingresso immutabili).
- [ ] Nessun side effect (no I/O, no storage, no rete, no stato globale modificato).
- [ ] Nessun accesso a clock (nessun timestamp nel calcolo di canonical o hash).
- [ ] Nessuna dipendenza da ordine non dichiarato (ordine sequenziale o regola di ordinamento canonico per parallelo esplicita).
- [ ] Canonical layout definito (formato dei canonical composite bytes stabile e documentato).

---

## 10. Stato del Documento

**FASE M — COMPOSITION SPECIFICATION**  
**Versione:** 0.1.0-spec  
**Stato:** Drafted & Binding  

- Questo documento è **vincolante** per i microstep M1–M10.
- Ogni implementazione della Fase M dovrà rispettare le invarianti, i divieti e i confini qui definiti.
- Le definizioni contenute in questo documento costituiscono la specifica architetturale della composizione deterministica sopra la Fase L.
