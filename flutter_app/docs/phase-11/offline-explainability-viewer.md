# Phase 11.5.2 — Offline Explainability Viewer

## Visualizzazione deterministica e read-only del replay persistito

Il viewer è una **proiezione pura del log**: legge solo dal PersistenceStore, non modifica nulla, non contiene logica decisionale. Mostra la sequenza causale Session, LogicalTime, record, Navigation e permette replay step-by-step.

## Explainability non è debugging

- **Debugging:** strumenti che possono modificare stato, breakpoint, hot reload. Non certificabili.
- **Explainability:** lettura immutabile del log persistito. Ogni step è applicazione deterministica di N record. Nessun if semantico, nessun side-effect. Certificabile e auditabile.

Il viewer non interpreta il contenuto dei trace; mostra recordType, contentHash e payload JSON. L’ordine e il contenuto sono quelli del log.

## Valore regolatorio

- **Audit trail umano:** un revisore può aprire il viewer (anche offline), caricare il file di persistenza e percorrere la sequenza evento per evento. SessionId, LogicalTime, record e navigation stack sono visibili senza eseguire codice decisionale.
- **Riproducibilità:** stesso file, stesso step index → stesso stato e stessa UI. Golden test certificano stabilità pixel.

## Perché offline-first

- Il viewer non dipende da rete né da servizi esterni. Funziona con il solo file di persistenza locale.
- È utilizzabile in contesti dove la connessione non c’è o non è consentita (audit in sede, analisi forense).
- Nessun DateTime, Random o clock: tutto è derivato dal log. Determinismo preservato.

## Componenti

- **ExplainabilityState:** stato immutabile (lista record, indice corrente, TimeContext, store a quell’indice). Ogni step produce una nuova istanza.
- **ExplainabilityController:** load(), stepForward(), stepBackward(), jumpTo(index). Usa PersistenceRehydrator.rehydrateFromRecords(sublist) per calcolare lo stato a un dato indice. Nessuna scrittura.
- **ExplainabilityView:** mostra SessionId, LogicalTime, record corrente (via ExplainabilityRecordRenderer), navigation stack, progress. Solo step back, step forward, jump slider. Nessun bottone edit, nessun gesture che muta dati.
- **ExplainabilityRecordRenderer:** renderer puro per TraceRecord, TimeContextRecord, SessionStartRecord: recordType, contentHash, payload JSON indentato.

## Integrazione

Nessuna integrazione con DecisionLoopController. Il viewer vive in una debug route o in modalità offline inspection. Deve funzionare senza rete.

## Vincoli

- Read-only assoluto; nessuna scrittura; nessuna mutazione; nessun DateTime/Random; nessun side-effect. UI = pura proiezione del log.
