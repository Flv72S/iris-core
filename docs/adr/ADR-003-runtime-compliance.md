# ADR-003 — Runtime Compliance & Traceability Model (Formal Verification Layer)

## 1. Overview

### Scope di ADR-003
`ADR-003` definisce un modello di **Runtime Compliance** formalizzato come proprieta verificabile.

Definizione chiave:
Compliance = capacita' del runtime di dimostrare che ogni stato **osservabile** rispetta il contratto architetturale di `ADR-002` (principi non negoziabili), secondo la realizzazione verificabile in `ADR-001`.

Differenza rispetto ad altri ADR:

- `ADR-001` descrive la decisione implementativa (execution pipeline) e la sua stabilizzazione.
- `ADR-002` definisce i principi astratti e i confini non negoziabili.
- `ADR-003` introduce una layer di **collegamento e prova**: come trasformare principi in requisiti verificabili e come valutare compliance in modo deterministico su snapshot e failure semantics reali.

### Non duplicazione
ADR-003 non definisce nuove scelte di runtime. Definisce invece:
1. un **contratto di verifica** (quali invariants/controlli sono considerati vincolanti)
2. una **traceability matrix** principio -> requirement -> codice -> verifica -> failure mode
3. un algoritmo di valutazione compliance su snapshot osservabili
4. un modello di audit ripetibile

## 2. Compliance Model

## 2.1 Runtime Compliance
Un runtime e' **compliant** se e solo se valgono contemporaneamente:

1. Invariants di osservabilita' soddisfatti (nessuna violation non rilevata).
2. Stato osservabile deterministico rispetto ai vincoli di execution contract.
3. Assenza di stati parziali mascherati: `runtime.state = RUNNING` implica completezza componenti attive coerente con il modello di boot.

Questa compliance e' valutabile tramite:
- `validateObservabilitySnapshot(...)` in `iris-sim/src/observability/observability_invariants.ts`
- semantica di `runtime.state` e `runtime.activeComponents` derivata da `iris-sim/src/sdk/iris_node.ts`
- controllo coerenza CRDT metrics (es. `crdt.conflictsResolved` vs `crdt.operationsApplied + crdt.operationsRejected`) realizzato in `observability_invariants.ts`
- evidenza di determinismo e failure isolation tramite test `iris-sim/src/runtime/tests/runtime_convergence.test.ts` (e impiegata dalla certificazione `test:certify`)

## 2.2 Compliance States
Stati compliance:

- `COMPLIANT`
- `NON_COMPLIANT`
- `UNKNOWN` (solo se una prova non e' accessibile in modo giustificato: es. snapshot mancante o non validabile per assenza di input, non per omissione o errore di tooling)

Regole di stato:

1. `runtime.state = 'RUNNING'` => risultato deve essere `COMPLIANT`.
2. `runtime.state = 'ERROR'` => risultato puo' essere `NON_COMPLIANT`, ma deve essere **spiegabile** (es. errori e completezza componenti coerenti con una failure phase; nessuna ambiguita' su cosa sia successo).

## 3. Compliance Matrix (Principles -> Verifiche)

| Principle (ADR-002) | Requirement | Implementation | Verification | Failure Mode |
|---|---|---|---|---|
| Deterministic Execution | Snapshot osservabile deterministico (es. ordine e contenuto coerenti) | `buildObservabilitySnapshot()` applica `sortMetricKeys()`; sorting spans con `compareSpanModels()`; persistenza sanitizza e ordina (`sanitizeSnapshotForJson()` + `sortRecord()`) | `runtime_convergence.test.ts` scenario `deterministic boot state across multiple starts` confronta snapshot normalizzati | Snapshot non confrontabile => audit e comparazione regressioni impossibili |
| No Partial State | Se `runtime.state = RUNNING`, allora completezza componenti attive e' garantita | `iris-sim/src/sdk/iris_node.ts` imposta `runtimeState = 'RUNNING'` solo dopo la fase `observability` e dopo `activeComponents.add('observability')`; gauge `runtime.active_components` e `runtime.component.count` derivano da `activeComponents.size` | Valutazione compliance su snapshot: `runtime.state='RUNNING' => runtime.activeComponents >= 6` (derivato da union `RuntimeComponent` e da attivazioni in start) | `RUNNING` con stato parziale => comportamento non affidabile e non auditabile |
| Fail-Fast Semantics | Una failure in una fase impedisce esecuzione di fasi successive e rende lo stato invalido/localizzabile | `start()` esegue `runInitPhase(phase, ...)` in sequenza tramite `await`; `runInitPhase` mappa qualunque errore in `RuntimeInitError` con `phase` e `cause`; il catch in `start()` imposta `runtimeState = 'ERROR'` | `failure isolation` test `invalid phase configs fail fast with runtime error state` valida `start()` rejection e `getRuntimeState() = 'ERROR'` | Avvio continua dopo errore => stati incoerenti e ghost-symptoms |
| Phase-Based Lifecycle | Transizione tra stati rispetta ordering canonico (init/stop inversione) | Fasi di init definite da chiamate `runInitPhase`: `configuration`, `identity`, `federation`, `transport`, `session_control`, `gossip`, `crdt`, `crdt_sync`, `distributed_sync`, `observability`. Stop esegue ordine inverso: `stopObservability` -> `stopDistributedSync` -> `stopCRDT` -> `stopGossip` -> `stopTransport` | Verifica su snapshot e stato: `stop()` porta `runtimeState='STOPPED'` e pulisce `activeComponents`; assenza di residue nei test di certificazione (no open handles) | Resource leak, snapshot inconsistente, failure non riproducibile |
| Observability as Source of Truth | Ogni snapshot persistita/valutata rispetta contract formale di shape e metriche | `writeObservabilitySnapshot()` valida con `validateObservabilitySnapshot()` e rifiuta snapshot invalidi; `observability_invariants.ts` valida runtime state, valori numeric finite/non-negative e coerenza CRDT (`conflictsResolved` <= `operationsApplied + operationsRejected`) | Compliance evaluation include `validateObservabilitySnapshot(snapshot)`; certificazione richiede stabilita e assenza di open handles (e implicitamente quindi snapshots validi) | Snapshot incoerente => compliance falsa positiva o audit non affidabile |

Ogni riga e' verificabile nel codice reale:
- invariants e coerenza metriche: `iris-sim/src/observability/observability_invariants.ts`
- semantica runtimeState/activeComponents: `iris-sim/src/sdk/iris_node.ts`
- determinismo: sorting/sanitizzazione + test deep equality su snapshot normalizzati
- fail-fast: `await` sequenziale e catch che forza `runtimeState='ERROR'`

## 4. Formal Invariants (Pseudo-matematica, legate al codice)

Gli invariants sotto sono progettati per essere **non teorici**: ciascuno puo' essere valutato tramite snapshot e/o mapping deterministico alle regole implementate.

### 4.1 Runtime State Consistency

```text
AllowedRuntimeStates :=
  {'INITIALIZING','RUNNING','STOPPING','STOPPED','ERROR'}

Invariant 1 (type-validity):
  snapshot.runtime.state ∈ AllowedRuntimeStates
```

Questo invariant e' verificato da `validateObservabilitySnapshot()`:
- check `s.runtime.state` con set esplicito in `observability_invariants.ts`

### 4.2 No Partial State

Nel contratto operativo, i componenti attivi appartenengono a:
`RuntimeComponent = { identity, transport, gossip, crdt, federation, observability }` (union definita in `iris-sim/src/sdk/iris_node.ts`).

```text
RequiredComponents := 6

Invariant 2 (RUNNING implies completeness):
  IF snapshot.runtime.state = 'RUNNING'
  THEN snapshot.runtime.activeComponents >= RequiredComponents
```

Derivazione verificabile:
- `snapshot.runtime.activeComponents` e' `this.activeComponents.size` in `buildObservabilitySnapshot()`.
- `activeComponents.add(...)` viene eseguito in fasi `identity`, `federation`, `transport`, `gossip`, `crdt`, `observability`.
- `runtimeState` viene impostato a `'RUNNING'` solo nel caso in cui tutte quelle fasi siano terminate senza eccezioni.

### 4.3 Fail-Fast Guarantee (Phase Abort)

Definiamo `ActivationCount(p)` come numero massimo di `activeComponents.add(...)` raggiungibile quando una fase fallisce in `p`.

Mapping deterministico (derivato da `start()`):
- `configuration` fallita => 0
- `identity` fallita => 0
- `federation` fallita => 1
- `transport` fallita => 2
- `gossip` fallita => 3
- `crdt` fallita => 4
- `observability` fallita => 5

```text
Invariant 3 (no post-phase observable activation):
  IF snapshot.runtime.state = 'ERROR'
  THEN snapshot.runtime.activeComponents <= 5
```

Questa formula e' verificabile usando snapshot. E' la conseguenza osservabile diretta della sequenza `await runInitPhase(...)` e dell'assenza di esecuzione di `activeComponents.add('observability')` quando la pipeline fallisce prima dell'ultima fase.

### 4.4 Observability Consistency

```text
Invariant 4 (snapshot shape-validity):
  validateObservabilitySnapshot(snapshot) = ok
```

La funzione `validateObservabilitySnapshot` verifica:
- runtime.state nel set ammesso
- `runtime.updatedAt` string non vuota
- `runtime.errors` finite e non negative
- `runtime.activeComponents` finite e non negative
- metriche numeric finite e nel range previsto

### 4.5 CRDT Consistency

```text
Invariant 5 (CRDT conflicts coherence):
  snapshot.crdt.conflictsResolved <=
    snapshot.crdt.operationsApplied + snapshot.crdt.operationsRejected
```

Questo invariant e' implementato in `observability_invariants.ts` con check:
`if (s.crdt.conflictsResolved > s.crdt.operationsApplied + s.crdt.operationsRejected) errors.push(...)`

## 5. Failure Proofs (Dimostrazioni ancorate al codice)

### 5.1 Non puo' entrare in stato invalido silenzioso
Dimostrazione:
- la persistence dello snapshot valida prima di scrivere: `writeObservabilitySnapshot` chiama `validateObservabilitySnapshot` e lancia errore se non ok.
- la lettura valida: `readObservabilitySnapshot` restituisce `null` se `validateObservabilitySnapshot(raw)` non e' ok.

Quindi una violazione formale non puo' propagarsi come snapshot "ritenuto valido".

### 5.2 Non puo' restare in stato parziale quando `runtime.state = RUNNING`
Dimostrazione:
- `runtimeState = 'RUNNING'` viene impostato solo dopo l'esecuzione della fase `observability` e dopo `activeComponents.add('observability')`.
- se una fase fallisce, `runInitPhase` lancia `RuntimeInitError` e `start()` entra in catch impostando `runtimeState = 'ERROR'`.

Di conseguenza, `snapshot.runtime.activeComponents` raggiunge la completezza necessaria quando e solo quando lo stato e' 'RUNNING'.

### 5.3 Non puo' produrre snapshot incoerenti senza detection
Dimostrazione:
- `validateObservabilitySnapshot` verifica:
- finitezza e range non negativita' delle metriche
- coerenza CRDT tra `conflictsResolved` e `operationsApplied + operationsRejected`
- validita di `runtime.state` e campi runtime.

Pertanto, una incoerenza formale viene rilevata deterministically e produce `NON_COMPLIANT` (o snapshot non persistito).

### 5.4 Non puo' propagare errori senza contesto
Dimostrazione (traceability level deterministica):
- `runInitPhase(phase, fn)` produce `RuntimeInitError(phase, ..., cause)`; la `phase` e' parte della struttura dell'errore.
- anche nei casi in cui `start()` unwrappa l'errore legacy (`throw e.cause;` oppure mappature `TransportError` -> `IrisError INVALID_CONFIG`), la pipeline non prosegue e lo stato diventa `'ERROR'`.

Il contesto operativamente verificabile e ricostruibile da:
- `snapshot.runtime.state = 'ERROR'`
- `snapshot.runtime.activeComponents` (boundary dell'ultimo blocco di attivazione completato)

## 6. Audit Model

### 6.1 Audit Inputs
- `snapshot.runtime.state`
- `snapshot.runtime.errors`
- `snapshot.runtime.activeComponents`
- `snapshot.metrics` e sottosezioni `transport`, `gossip`, `gossipConsistency`, `crdt`
- segnali di fase dai log:
- `RUNTIME_INIT_START`
- `RUNTIME_INIT_SUCCESS`
- `RUNTIME_INIT_FAILURE`

### 6.2 Audit Procedure
1. Check `snapshot.runtime.state`.
2. Run `validateObservabilitySnapshot(snapshot)`; se non ok => `NON_COMPLIANT` (violation non rilevate non accettate).
3. Inspect `snapshot.runtime.errors` (coerenza con transizioni verso `ERROR`).
4. Verify component completeness:
 - `RUNNING => runtime.activeComponents >= 6`
 - `ERROR => runtime.activeComponents <= 5`
5. Correlate logs con il confine di fase:
 - `RUNTIME_INIT_FAILURE` indica una failure di fase nell'esecuzione canonica
 - la fase precisa puo' essere ricostruita come boundary deterministica tramite `activeComponents` (quando legacy mapping non preserva l'oggetto `RuntimeInitError` all'esterno).

### 6.3 Audit Guarantees
- ogni failure e' localizzabile rispetto a un boundary deterministico (non "ghost")
- ogni stato osservabile e' spiegabile o rifiutato da invariants/sanitizzazione
- nessuna ambiguita' operativa tra "success" e "degraded"

## 7. Runtime Compliance Evaluation

Funzione formale proposta (pseudo-algoritmo) basata su controlli reali:

```text
evaluateRuntimeCompliance(snapshot):
  if snapshot.runtime is missing => UNKNOWN (giustificato: proof non disponibile)
  v := validateObservabilitySnapshot(snapshot)
  if v.ok = false => NON_COMPLIANT
  if snapshot.runtime.state = 'RUNNING':
    if snapshot.runtime.activeComponents < 6 => NON_COMPLIANT
    else => COMPLIANT
  if snapshot.runtime.state = 'ERROR':
    if snapshot.runtime.activeComponents <= 5 and snapshot.runtime.errors > 0 => NON_COMPLIANT (but explainable)
    else => UNKNOWN or NON_COMPLIANT (a seconda della violation formale)
  otherwise:
    => UNKNOWN (state transizionale; proof incompleta per definition)
```

Razionale:
- `validateObservabilitySnapshot` e' l'ancora formale di coerenza.
- `runtime.state` e `runtime.activeComponents` sono l'ancora per eliminare partial state.
- per transizioni intermedie (es. `INITIALIZING`) l'osservabilita' non e' una prova finale => stato `UNKNOWN` e' ammesso solo per definizione e per evitare falsi negativi.

## 8. Integration with Certification

Collegamento:
- `test:certify` include scenari che validano:
- boot deterministico e snapshot confrontabili (`runtime_convergence.test.ts`)
- failure isolation (assert `getRuntimeState() = 'ERROR'` su config non conforme)
- assenza di open handles (garantita da lifecycle symmetry e cleanup deterministici)

Perche' certification implica compliance:
- la certificazione tratta snapshot instabili o con violazioni formali come regressioni bloccanti
- il modello compliance riduce l'insieme dei comportamenti ammessi a stati validati da invariants

Limiti della certificazione attuale:
- certification valida determinismo su casi rappresentativi; non esaurisce l'intero spazio di input.
- `UNKNOWN` e' esplicitamente previsto nel modello per casi in cui la prova non e' disponibile (es. snapshot assente).

## 9. Architectural Impact

1. Trasformazione del sistema:
   da "working" => a "provably correct" rispetto a invariants di snapshot (`validateObservabilitySnapshot`), gating runtime/state e completezza componenti (`runtime.state` + `activeComponents`), e coerenza CRDT metrics (es. `conflictsResolved`).

2. Benefici operativi:
   audit: ogni stato osservabile puo' essere classificato (COMPLIANT/NON_COMPLIANT/UNKNOWN) con regole verificabili; SLA: misure deterministiche per fasi e stabilita snapshot; incident analysis: failure boundary ricostruibile dal modello (attivazioni completate + error count).

## 10. Decision Summary
ADR-003 rende il runtime verificabile tramite:
- invariants di osservabilita' come contratto formale (`validateObservabilitySnapshot`)
- gating di validita' stato con completezza componenti (runtime.state + activeComponents)
- traceability deterministica tra principio e prova (compliance matrix + audit model)

Compliance diventa proprieta misurabile: o e' dimostrabile, o viene rifiutata/contrassegnata come UNKNOWN con motivazione giustificata.

