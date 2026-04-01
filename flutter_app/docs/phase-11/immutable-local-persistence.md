# Phase 11.5.1 — Immutable Local Persistence

## Persistenza locale immutabile, replay-safe, audit-ready

Il layer di persistenza non decide, non interpreta, non normalizza: scrive e rilegge byte deterministici. Solo dati validati; nessuna mutazione post-write; replay = load + validate + rehydrate.

## Perché append-only

- Nessun update in place: ogni evento è un record aggiunto in coda. Lo storico non viene mai riscritto.
- Nessuna cancellazione selettiva: non si cancellano singoli record; clearAll è solo per test.
- Ordine garantito: l'ordine di append è l'ordine di replay. Stesso file, stesso ordine, stesso stato.
- Idempotenza: stesso record (stesso recordId e stesso contentHash) può essere appenduto senza duplicare; stesso recordId con contenuto diverso viene rifiutato.

## Differenza tra storage e state

- Storage (persistence): log append-only di record immutabili (TraceRecord, TimeContextRecord, SessionStartRecord). È la fonte di verità per il replay.
- State (ReplayTraceStore, TimeContext): stato in-memory derivato dal log. Si ricostruisce caricando i record, validandoli e applicandoli in ordine. Il rehydrator fa load, validate, rebuild.

La UI legge solo lo state; la persistenza è un canale di scrittura e di caricamento, senza logica decisionale.

## Valore regolatorio (forensic replay)

- Audit: il file di persistenza è un log immutabile. Per ogni sessione si può dimostrare la sequenza di trace e contesti temporali.
- Replay forense: dopo un restart (o kill app) si ricarica il file, si riapplicano i record in ordine e si ottiene lo stesso ReplayTraceStore e TimeContext. Stesso log, stesso stato, stessa UI.
- Offline: la persistenza è locale (file); nessun clock di sistema, nessuna chiave casuale. Funziona offline e in modo deterministico.

## Relazione con offline mode

Questo microstep introduce la base per la modalità offline: i dati validati vengono scritti in modo append-only e possono essere ricaricati dopo un restart. La Phase 11.5 successiva può estendere con strategie di sync o conflitto; qui si certifica solo la persistenza locale immutabile e il replay completo.

## Componenti

- PersistenceRecord (TraceRecord, TimeContextRecord, SessionStartRecord): immutabili, toJson, contentHash SHA-256 su JSON canonico.
- PersistenceStore: append, loadAll, clearAll. Append idempotente su stesso hash; rifiuta stesso ID con contenuto diverso.
- LocalFilePersistenceStore: backend file JSONL, una riga per record, UTF-8, nessun rewrite.
- PersistenceRehydrator: loadAll, validate ogni record, ricostruisce ReplayTraceStore, TimeContext, nextSessionNumber. Record invalido, fail deterministico, nessun silent skip.
- Integrazione: DecisionLoopController dopo commit trace append TraceRecord, aggiorna TimeContext, append TimeContextRecord, notify. TimeContextController.onSessionStart append SessionStartRecord.

## Vincoli non negoziabili

- Append-only; nessun update in place; nessuna cancellazione selettiva.
- Nessun DateTime.now, Random, clock di sistema.
- Replay = load + validate + rehydrate; nessuna logica decisionale nel layer di persistenza.
