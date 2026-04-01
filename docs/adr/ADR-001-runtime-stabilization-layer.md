# ADR-001 — Runtime Stabilization Layer (16F.X8.1)

## Status
Status: Accepted
Date: 2026-03-26

## Context
Dopo l'introduzione della Runtime Convergence Layer in `16F.X8`, l'IRIS Node ha una base funzionale per avviare componenti distribuiti (Secure Transport, Session/Identity, Gossip, CRDT e Distributed Sync) e per produrre snapshot di osservabilità.

In esercizio e in certificazione, sono emersi problemi che non potevano essere gestiti solo con hardening incrementale:

- Boot implicito: l'ordine effettivo e le dipendenze tra fasi non erano trattati come un execution contract deterministico; in caso di failure il sistema poteva trovarsi in stati parziali difficili da interpretare.
- Failure non strutturati: gli errori non erano sempre incapsulati con semantica “phase-aware”, impedendo un mapping deterministico tra fase fallita e causa effettiva.
- Observability non deterministica: snapshot e metriche runtime potevano risultare non coerenti tra start multipli, rendendo più difficile la validazione e indebolendo il valore dell'observabilità come strumento di audit.
- Cleanup non garantito: in scenari di errore e stress, la chiusura di risorse non risultava sempre simmetrica rispetto alla pipeline di avvio, aumentando il rischio di open handles e interferenze tra run.

Non era accettabile rimanere nello stato precedente perché l'affidabilità di un sistema enterprise non può dipendere da cammini condizionali o dalla “fortuna” dell'ordine di completamento: per certificare e per operare in modo ripetibile serve un execution contract verificabile.

## Decision
E' stata introdotta una runtime boot pipeline deterministica, phase-based, con failure isolation e observability stabilizzata come Execution Contract del sistema IRIS.

In particolare, la decisione include cinque pilastri vincolanti:

### 4.1 Runtime Execution Contract
La runtime deve rispettare le seguenti regole:

- Ordine delle fasi di boot definito e fisso.
- Obbligatorietà delle componenti: i componenti attesi dal profilo runtime sono considerati requisiti; se un requisito non è soddisfatto, l'avvio non procede.
- Fail-fast enforcement: un errore in una fase impedisce l'avvio delle fasi successive; non esistono fallback silenziosi.
- Assenza di stato “parzialmente avviato” osservabile: quando una fase fallisce, lo stato runtime converge in modo deterministico a `ERROR` e l'errore viene propagato con contesto.

Ordine canonico delle fasi:
```text
initConfiguration
initIdentity
initFederation
initTransport
initSessionControl
initGossip
initCRDT
initCRDTSync
initDistributedSync
initObservability
```

### 4.2 Phase-Based Initialization
L'inizializzazione è separata in funzioni `initX()` a confine di fase.

- Ogni `initX()` è responsabile della propria atomicità interna (configurazione, wiring, attivazione).
- La fase esegue `runInitPhase(...)` per logging per fase.
- La fase esegue `runInitPhase(...)` per misure di durata e conteggio fallimenti.
- La fase esegue `runInitPhase(...)` per mapping failure semantics.

### 4.3 Failure Semantics
La semantica di failure è definita esplicitamente:

- Introduzione di `RuntimeInitError`.
- `RuntimeInitError` contiene `phase` e preserva una `cause` per il root cause analysis.
- `runtime.state` viene impostato a `ERROR` quando una fase fallisce.
- La pipeline di stop non viene "best-effort" durante il boot; la chiusura seguente la failure deve mantenere simmetria e prevenire residue.
- Compatibilità con errori legacy: la propagazione deve preservare i codici e i tipi attesi dall'SDK (tramite un mapping/unwrapping controllato).

### 4.4 Deterministic Observability
L'osservabilità runtime è resa difendibile come execution contract.

- Snapshot ordinati e consistenti con l'ordine di boot.
- Invariants enforcement tramite validation centralizzata in `observability_invariants.ts`.
- La validation garantisce coerenza tra stato runtime e metriche runtime.
- La validation garantisce coerenza tra conteggi componenti attive e metriche runtime.
- La validation garantisce coerenza specifica delle metriche legate a CRDT (conteggi applicati/rifiutati e risoluzioni conflitti).
- Eliminazione delle variabili non deterministiche negli snapshot in modo che test e audit possano confrontare stati in modo ripetibile.

### 4.5 Lifecycle Symmetry
La pipeline di stop è simmetrica e inversa rispetto al boot pipeline.

- `stop()` esegue fasi di chiusura nell'ordine inverso controllato per ridurre rischio di resource leak.
- L'obiettivo operativo è rendere verificabile la chiusura delle risorse anche in presenza di failure e nei test di stress.
- Questa simmetria è un requisito di certificabilità (assenza di open handles).

## Alternatives Considered

### 5.1 Keep implicit runtime orchestration
Motivo scarto:
- non deterministico (cammini condizionali e ordine non contrattualizzato)
- difficile da debuggare (assenza di confine phase-aware)
- non auditabile (mancanza di execution contract ripetibile)

### 5.2 Partial stabilization (solo logging/metrics)
Motivo scarto:
- non risolve coupling tra fasi e failure-domain
- failure rimangono ambigui (manca un confine operativo tra successo/fallimento fase)
- non introduce un execution contract; migliora l'introspezione ma non garantisce comportamento verificabile

### 5.3 Soft-fail / best-effort runtime
Motivo scarto:
- introduce stati inconsistenti tra componenti (runtime "quasi avviata")
- incompatibile con sistemi distribuiti sicuri che richiedono failure deterministico
- difficile da certificare: la presenza di componenti in stato non definito invalida invariants e snapshot

## Consequences

### 6.1 Positive
- Determinismo del boot: ordine fisso, execution contract verificabile.
- Failure immediatamente localizzabile: `RuntimeInitError.phase` e `cause` rendono il root cause analysis riproducibile.
- Observability affidabile: snapshot stabilizzati e invariants rafforzati, utilizzabili come base di audit.
- Certificabilità operativa più robusta: riduzione del rischio di open handles e interferenze tra run.
- Base tecnica per multi-node reale: minore instabilità e maggiore ripetibilità delle condizioni di convergenza.

### 6.2 Negative / Trade-offs
- Maggiore rigidità runtime: meno flessibilità per esperimenti o configurazioni non conformi.
- Aumento della complessità interna: più funzioni e wrapper di orchestrazione.
- Configurazione più stringente: profili e flag devono essere coerenti con i vincoli del runtime execution contract.
- Riduzione della tolleranza in sviluppo: errori prima “mascherati” diventano failure esplicite e bloccanti.

## 7. Operational Consequences
- Boot prevedibile e ripetibile: un restart produce una pipeline equivalente, con snapshot comparabili.
- Errori immediatamente localizzabili: l'utente operativo può identificare la fase e la causa senza deduzioni.
- Impossibilità di runtime “parzialmente avviati” osservabili: quando fallisce una fase, l'avvio si ferma e la runtime converge a `ERROR`.
- Maggiore disciplina di configurazione: i profili runtime devono rispettare i requisiti di enforcement (trasporto, gossip, crdt e federation secondo contratto).

## 8. Debug & Failure Analysis Model
Modello operativo ufficiale:

```text
1. check runtime.state
2. inspect RuntimeInitError.phase
3. inspect cause
4. inspect active_components
5. inspect observability snapshot
```

## 9. Impact on System Properties
- determinism → HIGH
- reliability → HIGH
- debuggability → HIGH
- flexibility → REDUCED

## 10. Future Implications
Questa decisione costituisce una base architetturale per:
- multi-node runtime reale: convergenza e failure semantics più ripetibili.
- deployment orchestration (16M): boot/stop prevedibili per coordinare rollout e rollback senza stati ambigui.
- SLA & reliability layer (16O): misurazioni per fase e invariants come prerequisito di affidabilità.
- packaging (16H): comportamento runtime più standardizzato e verificabile tra ambienti.

## 11. Decision Summary (Short)
E' stato adottato un execution contract deterministico, phase-based, per la runtime stabilization (16F.X8.1).  
Gli errori sono incapsulati con semantica phase-aware (`RuntimeInitError`) e la runtime converge a `ERROR` senza fallback silenziosi.  
Observability e invariants sono stabilizzati per rendere snapshot confrontabili e auditabili.  
La simmetria start/stop riduce open handles e rende la certificazione operativamente difendibile.  
In cambio, la runtime diventa più rigida e richiede configurazioni più precise.

