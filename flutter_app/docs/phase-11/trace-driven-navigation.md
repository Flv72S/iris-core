# Phase 11.3.3 — Trace-Driven Navigation

## Routing auditabile IRIS

La navigazione non è più decisa dalla UI ma **derivata dai trace salvati** nel ReplayTraceStore. Stessi trace → stesso stack di route → stesso flusso visivo. Replay deterministico dell’esperienza utente.

## Separazione decisione / navigazione

- **Core / store:** producono e conservano trace validati.
- **Client:** legge lo store, calcola lo stack (TraceNavigationController), costruisce le pagine (buildPagesFromTraces) e le mostra (TraceNavigationHost con Navigator.pages). Nessuna logica decisionale: solo lettura e mapping dichiarativo.

## Componenti

- **TraceNavigationController(store):** computeRouteStack(), computeTopRoute(), canPop() da trace in store.
- **mapTraceToRoute(trace):** mapping statico (es. resolution == "explainability" → "explainability", altrimenti "unknown_trace").
- **buildPagesFromTraces(traces):** una Page per trace; route explainability → DeterministicExplainabilityScreen con ViewModel da trace.
- **TraceNavigationHost(store):** Navigator(pages: ...) determinato dallo store; onPopPage per back coerente.

## Implicazioni regolatorie

Flusso formalmente riproducibile: stesso store → stesso stack e stesse pagine. Nessun DateTime.now/Random/Navigator.push; golden test per stack 1 e 3 trace. Auditabilità ex-post del percorso utente.
