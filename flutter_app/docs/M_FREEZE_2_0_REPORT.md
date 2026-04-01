# Fase M — Report formale Freeze 2.0

**Enterprise Freeze 2.0 — Composizione deterministica del flusso**  
**Microstep:** M10 — Freeze della composizione e report di verifica formale  
**Vincolo:** Solo verifica e documentazione. Nessuna modifica a lib/, test/, configurazioni o dipendenze.

---

## 1. Verifica dello scope

### File introdotti in Fase M

**Composizione (lib/flow/composition/):**

| File | Microstep | Ruolo |
|------|-----------|--------|
| composite_hash_strategy.dart | M2 | Hash composito FNV-1a 32-bit; nessun side effect |
| composite_deterministic_contract.dart | M1 | Composito strutturale di DEC; immutabile |
| composable_deterministic_unit.dart | M7 | Astrazione per composizione annidata; DecUnit, CdcUnit |
| parallel_flow_composer.dart | M3/M4 | Composizione CDC invariante rispetto all’ordine |
| sequential_flow_composer.dart | M3 | Composizione CDC con ordine preservato |
| conditional_flow_composer.dart | M5 | Inclusione tramite predicato poi invariante all’ordine |
| conditional_parallel_flow_composer.dart | M6 | Filtro + composizione parallela |
| nested_composite_deterministic_contract.dart | M7 | Lista annidata di ComposableDeterministicUnit |
| nested_parallel_flow_composer.dart | M7 | Composizione annidata invariante all’ordine |
| composite_idempotency_registry.dart | M8 | Registry per istanza su deterministicHash |

**Grafo (lib/flow/graph/):**

| File | Microstep | Ruolo |
|------|-----------|--------|
| deterministic_flow_graph.dart | M9 | DAG immutabile; DeterministicFlowNode; layout canonico pre-order |
| deterministic_flow_graph_builder.dart | M9 | Costruzione DAG da ComposableDeterministicUnit; rilevamento cicli |

**Composer (M1–M6):**

- **M1:** CompositeDeterministicContract (composito strutturale).
- **M2:** CompositeHashStrategy (FNV-1a).
- **M3:** SequentialFlowComposer, ParallelFlowComposer (ordine preservato / invariante all’ordine).
- **M4:** Ordinamento canonico di ParallelFlowComposer (hash crescente, bytes lessicografico).
- **M5:** ConditionalFlowComposer.
- **M6:** ConditionalParallelFlowComposer.

**Composizione annidata (M7):** NestedCompositeDeterministicContract, NestedParallelFlowComposer, ComposableDeterministicUnit, DecUnit, CdcUnit.

**Idempotenza composita (M8):** CompositeIdempotencyRegistry (per istanza, solo hash).

**Builder DAG (M9):** DeterministicFlowGraph, DeterministicFlowNode, DeterministicFlowGraphBuilder.

**Suite di test di verifica:**

- test/flow/phase_m_verification/phase_m_determinism_test.dart  
- test/flow/phase_m_verification/phase_m_invariants_test.dart  
- test/flow/phase_m_verification/phase_m_stress_permutation_test.dart  
- test/flow/phase_m_verification/phase_m_regression_test.dart  

**Conferme:**

- Nessun file della Fase L (lib/flow/application/ contract, idempotency, ecc.) è stato modificato dai deliverable della Fase M.
- Nessuna nuova dipendenza runtime è stata introdotta dalla Fase M; sono utilizzate solo le dipendenze SDK e di progetto esistenti.

---

## 2. Certificazione del determinismo

### Proprietà di funzione pura di deterministicHash

- **DEC (L6):** `deterministicHash` è un campo immutabile impostato in costruzione dal valore fornito dal chiamante; nessuna ricalcolo in lettura.
- **CDC (M1–M2):** `compositeDeterministicHash` è calcolato una sola volta nel costruttore da `canonicalCompositeBytes` tramite `CompositeHashStrategy.compute`. Stessi bytes ⇒ stesso hash. Nessuno stato mutabile, nessun I/O.
- **NestedCompositeDeterministicContract (M7):** `deterministicHash` è calcolato una sola volta nel costruttore da `_buildCanonicalBytes()` e `CompositeHashStrategy.compute`. Stessa lista e contenuto di unità ⇒ stessi bytes ⇒ stesso hash.
- **DeterministicFlowGraph (M9):** L’hash del grafo è calcolato una sola volta nel costruttore dalla serializzazione pre-order del nodo radice tramite `CompositeHashStrategy.compute`. Stesso albero ⇒ stessi bytes ⇒ stesso hash.

In tutti i casi vale: stessi ingressi (bytes / struttura) ⇒ stesso hash in uscita; nessun side effect, nessun uso di tempo o casualità.

### Coerenza FNV-1a 32-bit

- **Implementazione:** `CompositeHashStrategy.compute(Uint8List)` usa costanti fisse: offset basis `0x811c9dc5`, primo `0x01000193`. Ciclo: `h ^= byte; h = (h * prime) & 0xffffffff`. Utilizzato per i bytes canonici di CDC, NestedCompositeDeterministicContract e DeterministicFlowGraph.
- **Proprietà:** La stessa sequenza di byte produce sempre lo stesso hash 32-bit. Sensibile all’ordine. Nessuna entropia. Nessun caching; il calcolo è deterministico e ripetibile.

### Bytes canonici deterministici

- **DEC:** Forniti in costruzione; memorizzati come copia non modificabile. Non ricalcolati dalla Fase M.
- **CDC:** Costruiti nel costruttore dalla lista ordinata di DEC: conteggio contratti (4 B big-endian), poi per contratto: hash (4 B), lunghezza (4 B), bytes. L’ordine di ingresso è fissato in costruzione.
- **NestedCompositeDeterministicContract:** Costruiti nel costruttore: conteggio unità (4 B), poi per unità: hash (4 B), lunghezza (4 B), bytes. La lista in ingresso è copiata e non mutata.
- **DeterministicFlowGraph:** Serializzazione pre-order: per nodo, hash (4 B), lunghezza (4 B), bytes, childCount (4 B); i figli sono visitati nell’ordine stabilito dal builder (ordinati per hash poi bytes).

Tutti i layout di bytes canonici sono fissati in costruzione e immutabili successivamente.

### Attraversamento DAG deterministico

- **Pre-order:** Per ogni nodo, la serializzazione del grafo emette il nodo e poi ricorre sui figli in ordine fissato.
- **Ordine dei figli:** DeterministicFlowGraphBuilder ordina i figli per chiave primaria `deterministicHash` crescente, chiave secondaria `canonicalBytes` lessicografica crescente. L’ordine di attraversamento è quindi univocamente determinato dal contenuto, non dall’ordine di ingresso o dall’identità.

### Ordinamento dei figli stabile

- **Composer (Parallel, NestedParallel, Conditional*):** I figli (DEC o unità) sono ordinati prima della costruzione del composito: primario `deterministicHash` crescente, secondario `canonicalBytes` lessicografico crescente. Stesso insieme di elementi ⇒ stesso ordine di sort ⇒ stessi bytes canonici e stesso hash.
- **Builder DAG:** Dopo la costruzione dei nodi figlio, la lista è ordinata con la stessa comparazione (hash, poi bytes). L’ordine dei figli è quindi stabile e deterministico.

**Proprietà matematiche verificate (da suite di test):**

- Build ripetute (es. 100×) con stessi ingressi producono hash identici per DEC, CDC, nested, conditional e DAG.
- Registry di idempotenza: registrazioni ripetute della stessa unità logica (stesso hash) lasciano invariata la size del registry e la semantica di duplicato.

---

## 3. Verifica dell’invarianza all’ordine

### Composer dichiarati invarianti all’ordine

- **ParallelFlowComposer:** Per ogni permutazione dello stesso insieme di DEC, dopo l’ordinamento interno (deterministicHash crescente, canonicalBytes lessicografico), il CDC risultante ha lo stesso `compositeDeterministicHash` e gli stessi `canonicalCompositeBytes`.
- **ConditionalFlowComposer:** Dopo il filtraggio per predicato, i DEC inclusi sono composti con la stessa logica invariante all’ordine di ParallelFlowComposer. Per predicato fissato e stesso insieme di DEC inclusi, l’ordine di ingresso non influenza il risultato.
- **ConditionalParallelFlowComposer:** Come sopra: filtro poi ordinamento e composizione invarianti all’ordine.
- **NestedParallelFlowComposer:** Per ogni permutazione dello stesso insieme di ComposableDeterministicUnit, dopo l’ordinamento interno (deterministicHash crescente, canonicalBytes lessicografico), il NestedCompositeDeterministicContract risultante ha lo stesso `deterministicHash` e gli stessi bytes canonici.

Verifica: la suite di test esegue tutte le 6 permutazioni di 3 elementi per ciascuno dei quattro composer e asserisce hash identico.

### Algoritmo di ordinamento

- **Chiave primaria:** `deterministicHash` crescente (confronto intero).
- **Chiave secondaria:** `canonicalBytes` lessicografica crescente (byte per byte come unsigned, poi lunghezza).

Il tie-break per bytes garantisce un ordine totale in caso di hash coincidenti; non è applicata alcuna ulteriore risoluzione di collisione oltre a questo ordinamento.

---

## 4. Dimostrazione della sensibilità strutturale

### (A+B)+C ≠ A+(B+C)

- **Nested CDC:**  
  - Sinistra: la radice ha due unità, U1 = (A+B) e U2 = C. Il layout canonico codifica conteggio unità 2, poi U1 (hash, lunghezza, bytes), poi U2.  
  - Destra: la radice ha due unità, U1' = A e U2' = (B+C). Il layout codifica 2, poi U1', poi U2'.  
  Le unità a livello radice differiscono (hash e bytes diversi); profondità e forma dell’annidamento differiscono. Quindi `canonicalBytes` e `deterministicHash` del composito radice differiscono. Verificato da test: sinistra e destra hanno hash diverso e sequenza di byte diversa.

- **DAG:**  
  - Grafo sinistro: la radice ha due figli, uno è il sottoalbero per (A+B) e uno per C.  
  - Grafo destro: la radice ha due figli, uno per A e uno per il sottoalbero (B+C).  
  La serializzazione pre-order dipende dalla forma; i due alberi producono sequenze di byte diverse e quindi hash di grafo diversi. Verificato da test: hash del grafo e canonicalBytes del grafo differiscono tra sinistra e destra.

### Significato semantico della struttura

- La composizione annidata non è associativa: il posizionamento delle parentesi definisce quali unità sono raggruppate in un unico composito. Tale raggruppamento influenza la rappresentazione canonica (numero di unità per livello, ordine delle unità, layout annidato).
- Il DAG è una rappresentazione strutturale dell’albero di composizione; alberi diversi producono grafi diversi. (A+B)+C e A+(B+C) sono quindi intenzionalmente distinti sia come compositi annidati sia come DAG. Il sistema non normalizza l’associatività; la struttura è parte della semantica.

---

## 5. Conferma del comportamento in caso di collisione

### Collisione di deterministicHash non risolta

- La Fase M non implementa risoluzione di collisione oltre all’ordinamento canonico. Due unità distinte (es. `canonicalBytes` diversi) con lo stesso `deterministicHash` non sono distinte dal solo hash.
- Ordinamento: quando due unità condividono lo stesso hash, sono ordinate per chiave secondaria, `canonicalBytes` lessicografica. L’ordine relativo è deterministico e stabile, ma entrambe mappano comunque allo stesso valore di hash.

### Coerenza con L10

- L10 (Contract Freeze) definisce identità del contratto e idempotenza in termini di hash deterministico e forma canonica. I registry e i composer della Fase M operano solo su `deterministicHash` per la rilevazione duplicati e sulla rappresentazione canonica completa per ordinamento e serializzazione. Non è introdotto alcuno schema di identità aggiuntivo; il comportamento è coerente con la semantica basata su hash.

### IdempotencyRegistry (L7) e CompositeIdempotencyRegistry (M8)

- **L7 IdempotencyRegistry:** Opera su DEC; rilevazione duplicati basata sull’identità del contratto (hash/canonical come da L10). Non modificato dalla Fase M.
- **M8 CompositeIdempotencyRegistry:** Opera su `ComposableDeterministicUnit`; `isDuplicate` e `register` usano solo `unit.deterministicHash`. Nessun confronto di `canonicalBytes`. Due unità con lo stesso hash sono considerate duplicate; è mantenuta una sola entry per hash. Nessuna risoluzione di collisione: un hash ⇒ una entry nel registry.

**Implicazioni:** Due compositi distinti con lo stesso hash FNV-1a sarebbero trattati come duplicati da CompositeIdempotencyRegistry. La probabilità è demandata allo spazio degli hash a 32 bit. Ordinamento e rappresentazione canonica restano ben definiti tramite i bytes quando gli hash collidono.

---

## 6. Certificazione del rilevamento cicli

### Il builder DAG impedisce i cicli

- **Meccanismo:** Durante la costruzione ricorsiva, il builder mantiene un insieme di valori `deterministicHash` per il percorso corrente dalla radice al nodo in elaborazione. Prima di elaborare un’unità, il builder verifica se il suo `deterministicHash` è già in tale insieme. In tal caso viene lanciato `StateError('Cycle detected')`. L’hash viene aggiunto all’insieme prima di ricorrere ai figli e rimosso in un blocco `finally` dopo la ricorsione (backtracking).
- **Risultato:** Nessun nodo può apparire due volte sullo stesso percorso; il grafo costruito è un DAG.

### StateError lanciato correttamente

- L’eccezione lanciata è `StateError` con messaggio `'Cycle detected'`. Verificato da test che usano un ciclo artificiale (es. A→B→A tramite override dei figli solo in test). Il test asserisce tipo e messaggio dell’eccezione.

### Nessun bypass

- La scoperta dei figli avviene tramite le regole built-in (DecUnit ⇒ nessun figlio, CdcUnit ⇒ contratti come DecUnit, NestedCompositeDeterministicContract ⇒ units) oppure un override opzionale per i test. Non esiste alcun percorso di codice che aggiunga un figlio al grafo senza passare dallo stesso controllo cicli. Self-loop e cicli (es. A→B→A) sono quindi sempre rilevati quando il ciclo è raggiungibile dalla radice.

---

## 7. Audit entropia

### Assenza di fonti di entropia

È stata verificata l’assenza dai file `.dart` in `lib/flow/composition/` e `lib/flow/graph/` di:

- **DateTime** (nessun uso di `DateTime.`).
- **Random** (nessun uso di `Random`).
- **UUID** (nessun uso di `UUID` o `uuid.`).
- **JSON encode/decode** (nessun uso di `jsonEncode`, `jsonDecode` o `dart:convert`).
- **async/await** (nessun metodo async né await nel codice lib della Fase M).
- **Future** (nessun uso di `Future`).
- **Timer** (nessun uso di `Timer.` o `Timer(`).
- **I/O:** Nessun I/O su file o rete nel codice di composizione o grafo.
- **Logging:** Nessuna chiamata di logging nel codice lib della Fase M.

Verifica: il test automatizzato in `phase_m_invariants_test.dart` scansiona le directory sopra per i pattern elencati e fallisce in caso di match. Esito: nessun match.

### Purezza e determinismo

- Tutto il codice di composizione e grafo della Fase M è sincrono, privo di side effect rispetto a tempo e casualità, e dipende solo dagli ingressi (e da dati immutabili). Le uscite (hash, bytes canonici, grafi) sono funzioni deterministiche degli ingressi. La fase è pura e deterministica nel senso richiesto per il freeze.

---

## 8. Validazione idempotenza

### Registry per istanza

- **CompositeIdempotencyRegistry:** Ogni istanza mantiene il proprio `Set<int>` di hash. Le istanze non condividono stato. Verificato da test: due registry, registrazione in uno solo; l’altro non vede l’unità come duplicato.

### Nessuno stato static

- Nessuno stato mutabile static o top-level è usato in `lib/flow/composition/` o `lib/flow/graph/`. Registry e builder sono basati su istanza; nessun registry o cache globale.

### Nessuna mutazione globale

- Nessuna variabile globale mutabile né singleton. I tipi di composizione e grafo sono immutabili dopo la costruzione; i registry mutano solo il proprio insieme di istanza.

### Nessun leak tra test

- I test creano le proprie istanze (composer, builder, registry). Nessuno stato mutabile condiviso tra test. L’isolamento è confermato dai test di isolamento memoria nella suite di verifica.

---

## 9. Conferma regressioni

### Test L + M1–M9 verdi

- **Esecuzione:** Il test di regressione esegue `flutter test` su:
  - test/flow/application/contract  
  - test/flow/application/idempotency  
  - test/flow/composition  
  - test/flow/graph  

- **Risultato:** Exit code 0. Tutti i test in tali directory passano. Non si osserva alcuna regressione su L (contract, idempotency) o M1–M9 (composition, graph).

### Conteggio test (riferimento)

- Le suite contract, idempotency, composition e graph costituiscono insieme l’insieme completo di test L + M1–M9. La suite di verifica della Fase M aggiunge 20 test (determinismo, invarianti, permutazioni stress, regressione). Il totale dei test verdi è la somma dei test nelle directory sopra indicate più la suite di verifica.

### Ambiente

- **SDK:** Dart >=3.0.0 <4.0.0 (da pubspec.yaml).  
- **Flutter:** Come fornito dall’SDK di progetto (flutter_test da SDK).  
- Nessuna modifica a dipendenze o configurazioni per M10.

---

## 10. Dichiarazione formale di freeze

### Proprietà certificate

- **Deterministica:** Tutti gli hash e le rappresentazioni canoniche nella Fase M sono funzioni deterministiche dei rispettivi ingressi. Nessun DateTime, Random, UUID, JSON, async, Future, Timer o I/O. Verificato da test e audit entropia.
- **Algebricamente chiusa:** Le operazioni di composizione (sequenziale, parallela, condizionale, annidata) e il builder DAG operano su e producono solo i tipi definiti (DEC, CDC, ComposableDeterministicUnit, DeterministicFlowGraph). Invarianza all’ordine e sensibilità strutturale sono definite e verificate.
- **Priva di entropia:** Il codice lib della Fase M non introduce fonti di entropia; audit e scansione automatizzata confermano.
- **Enterprise-ready:** Dati immutabili, nessuno stato mutabile static, registry per istanza, comportamento definito per collisioni e cicli, suite di verifica formale supportano audit e conformità.
- **Compatibile con Fase L:** La Fase M non modifica la Fase L. Utilizza DEC e contratti L come specificato; CompositeIdempotencyRegistry è allineato alla semantica hash di L10. I test L restano verdi.
- **Pronta per i layer superiori:** L’algebra di composizione e la rappresentazione DAG sono stabili e documentate; possono essere utilizzate da orchestrazione o da layer di flusso di livello superiore senza ulteriori modifiche alla superficie congelata.

### Versione

- **Versione proposta:** 2.0.0  

**La Fase M (Algebra di composizione deterministica) è con la presente formalmente congelata come Enterprise Freeze 2.0.0.**

---

**Documento:** M_FREEZE_2_0_REPORT.md  
**Fase:** M — Composizione deterministica del flusso  
**Freeze:** 2.0.0
