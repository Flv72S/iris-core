# Phase 11.4.2 — Deterministic Time and Session Model

## Tempo e sessione come input espliciti

Per audit, replay forense e certificazione regolatoria il **tempo non può essere implicito**. In IRIS il tempo è un **metadato deterministico** derivato dal log, non dall'orologio di sistema.

## Distinzione wall-clock vs logical time

- **Wall-clock:** ora di sistema, non deterministica, non replayabile. Vietata in tutto il layer UI/time_model.
- **Logical time:** sequenza di tick incrementali (0, 1, 2, …) derivata esclusivamente da eventi espliciti: session start e trace committed. Stessa sequenza di eventi → stessa sequenza di tick. Completamente replayabile.

Il tempo logico non influenza decisioni né UI; serve solo a ordinare e a delimitare sessioni in modo auditabile.

## Componenti

- **LogicalTime:** tick (int) + origin (String). Immutabile. `next({String? origin})` restituisce un nuovo LogicalTime con tick+1. Nessun riferimento a DateTime, Stopwatch, Timer.
- **SessionId:** valore stringa deterministico (es. `session-0`, `session-1`). Generato solo su evento esplicito (onSessionStart). Non casuale, non basato su timestamp.
- **TimeContext:** contesto immutabile (SessionId + LogicalTime). Passivo: usato da decision loop, navigation replay, explainability come metadato.
- **TimeContextController:** mantiene il TimeContext corrente. Aggiorna il logical time **solo** quando un trace è stato committato (dopo save). Aggiorna la sessionId **solo** su onSessionStart. Nessuna inferenza automatica, nessuna logica temporale semantica.

## Integrazione con il Decision Loop

Il DecisionLoopController accetta un TimeContextController opzionale. Dopo aver salvato un trace valido (dopo notifyAfterSave), chiama `timeContextController?.onTraceCommitted(trace)`. Mai prima del save, mai in caso di fallimento di validazione. **Il tempo segue il trace, non l'intent.**

## Valore forense e regolatorio

- **Replay:** stesso log (stessi intent, stessi trace, stesso store) → stessa sequenza temporale logica. Lo stato dell'app (incluso il tempo logico) è riproducibile.
- **Audit:** ordine temporale e confini di sessione sono derivabili solo da trace e da eventi espliciti. Nessuna ambiguità legata all'orologio.
- **Explainability:** il contesto temporale può essere esposto come metadato senza introdurre variabili esterne non controllabili.

## Perché il tempo non deve essere implicito

Se il tempo fosse implicito (DateTime.now, clock di sistema):

- Replay e regression test non sarebbero deterministici.
- Audit e analisi forense non potrebbero riprodurre esattamente lo stesso stato.
- La certificazione di idempotenza e replay sarebbe compromessa.

Con il modello deterministico: **(log + tempo logico) → stesso stato → stessa UI**. Questo è il prerequisito per Phase 11.5 (Offline Mode & Persistence) e 11.8 (UI Certification & Compliance Gate).

## Vincoli non negoziabili

- Vietato DateTime, DateTime.now(), Stopwatch, Timer, clock esterni in `lib/ui/time_model/`.
- Il tempo non influenza decisioni né UI logic né branching semantico.
- SessionId e LogicalTime sono derivati solo da eventi espliciti e dalla sequenza di trace committati.
