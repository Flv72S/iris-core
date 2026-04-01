# L9 — Failure Matrix Hardening

## Perché la failure matrix è necessaria

L8 verifica il flusso end-to-end in condizioni di **happy path** e un singolo failure path (firma invalida). Resta da dimostrare che l’intera Fase L sia:

- **Robusta ai failure path**: bytes corrotti, payload troncati, metadata incoerenti, eccezioni dall’orchestrator non producono crash non controllati né mutazioni globali.
- **Deterministica sotto stress**: stesso input ripetuto molte volte continua a produrre stesso hash e stessi canonical bytes; nessuna crescita di stato osservabile.
- **Immutabile e isolata**: il contract L6 non viene alterato da mutazioni esterne ai bytes; i registry L7 non condividono stato tra test o tra esecuzioni.
- **Priva di leak di stato**: nessuna contaminazione tra run, nessuna partial reconstruction che lasci il sistema in uno stato inconsistente.

L9 **non introduce nuovi layer** e **non modifica lib/**. È un microstep di **hardening formale** tramite una matrice di test che copre in modo esplicito ogni tipologia di failure richiesta.

Senza L9 non sarebbe formale l’affermazione che i failure path sono deterministici e che limiti noti (es. hash collision) sono documentati e circoscritti.

---

## Tipologie di failure coperte

| Scenario | Layer | Comportamento atteso | Verifica nel test |
|----------|--------|----------------------|-------------------|
| **Canonical bytes corrotti** | L5 | Eccezione deterministica (RangeError/StateError) | Un byte modificato; length prefix incoerente → `throwsA(anyOf(isA<RangeError>(), ...))` |
| **Payload troncato** | L5 | Parsing fallisce in modo prevedibile | Bytes tagliati a metà → stessa tipologia di eccezione |
| **Metadata length inconsistency** | L5 | Errore deterministico; nessuna partial reconstruction | attrCount dichiarato ≠ numero reale attributi → eccezione |
| **Hash collision simulata** | L7 | Comportamento coerente: decisione solo su hash | Due contract stesso hash, bytes diversi → secondo `alreadyExecuted == true` (limite consapevole) |
| **Contract bytes mutati esternamente** | L6 | Isolamento garantito | Dopo creazione contract, mutazione dell’array originale → `canonicalBytes` del contract invariato |
| **Orchestrator failure (execute)** | L3 | Propagazione invariata; nessuna registrazione idempotency | Mock lancia su execute → eccezione propagata; registry non contiene hash |
| **Orchestrator failure (retrieve)** | L5 | Propagazione invariata | Mock lancia su retrieve → eccezione propagata |
| **Registry leak tra test** | L7 | Nessuna contaminazione | Due registry distinti; registro in uno non visibile nell’altro; clear() azzera stato |
| **Determinism stress loop** | L4/L3/L6/L7 | Hash e canonical invariati; nessuna crescita memoria | 100 iterazioni stessa request → stesso hash e stessi bytes; idempotency coerente |

---

## Limiti consapevoli (hash collision)

- **L7 basa la decisione solo su `deterministicHash`** (int). Due contract con **stesso hash** ma **canonical bytes diversi** (collisione) sono considerati la stessa esecuzione: il secondo riceve `alreadyExecuted: true`.
- Questo è un **limite consapevole** e documentato: l’hash FNV-1a 32-bit ha spazio limitato; collisioni sono rare ma possibili. L7 non ha accesso ai bytes nel guard, solo all’hash.
- **Comportamento atteso in caso di collisione**: il secondo contract (diverso contenuto, stesso hash) viene trattato come “già eseguito”. Il test simula questo con due contract costruiti manualmente con lo stesso `deterministicHash` e bytes diversi, e verifica che il secondo restituisca `alreadyExecuted: true`.
- Evoluzioni future (es. registro persistente con chiave composita hash+length o hash+fingerprint) possono mitigare; per L9 il comportamento è formalizzato e testato.

---

## Proprietà garantite dopo L9

- **Failure path deterministici**: bytes corrotti, troncati o con metadata incoerenti producono eccezioni prevedibili (RangeError/StateError), mai crash non controllati né mutazioni globali.
- **Isolamento del contract**: i `canonicalBytes` nel `DeterministicExecutionContract` sono una copia non modificabile; mutare l’array passato al costruttore non altera il contract.
- **Propagazione pulita**: eccezioni dall’orchestrator (execute o retrieve) si propagano senza essere inghiottite; nessuna registrazione idempotency se L3 non completa con successo.
- **Assenza di leak di stato**: ogni test usa registry (e orchestrator) indipendenti; nessuna contaminazione globale; clear() ripristina lo stato del registry.
- **Stabilità sotto stress**: 100 iterazioni dello stesso flusso con stessa request mantengono hash e canonical bytes invariati; l’idempotency guard resta coerente (prima esecuzione allowed, successive blocked).

---

## Stato finale Fase L dopo hardening

Dopo L9 possiamo affermare che:

- Il **layer applicativo IRIS** è **deterministicamente stabile** anche sotto input corrotti e sotto stress ripetuto.
- I **failure path** sono **formalmente controllati**: ogni voce della failure matrix ha un test dedicato e un comportamento atteso documentato.
- Le **collisioni hash** sono **note e circoscritte**: il comportamento in caso di collisione è definito e testato (secondo contract → alreadyExecuted true).
- **Non esistono leak di stato** tra esecuzioni o tra test: registry e mock sono isolati.
- La **Fase L** è **robusta a dati corrotti**, a eccezioni infrastrutturali e a ripetizione massiva dello stesso flusso.

L9 chiude la Fase L in **modalità hardened**: nessuna modifica ai layer in `lib/`, nessun fix silente, nessun logging o try/catch aggiunto nei layer; solo test e documentazione.

---

## Posizionamento del test

- **Percorso**: `test/flow/application/failure/deterministic_failure_matrix_test.dart`
- **Solo test**: nessuna modifica a `lib/`, nessun helper in produzione.
- **Mock**: orchestrator con bytes configurabili e opzione throw su execute/retrieve; no storage reale, no package esterni.

---

## Criteri di completamento L9

- Tutti i failure test sono verdi (11 test).
- Nessuna modifica ai layer in `lib/`.
- Tutti i failure path sono deterministici (eccezioni prevedibili o risultato coerente).
- Nessuna entropia runtime introdotta nei test (no DateTime, Random, UUID nel flusso sotto verifica).
- Documentazione presente (`docs/L9_FAILURE_MATRIX_HARDENING.md`).
