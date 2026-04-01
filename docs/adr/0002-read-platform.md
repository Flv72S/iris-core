# ADR-0002 — Read Platform Dedicated Architecture

## Status
Accepted

## Context
La read side ha esigenze proprie: proiezioni, replay, recovery, migrazioni degli schemi. Evolvere gli schemi di lettura senza downtime richiede una read side pensata per versioning, DLQ e replay deterministici. Trattare la read side come “query sul write model” non è sufficiente né resiliente.

## Decision
Introduzione di una Read Platform dedicata. Versioning esplicito delle proiezioni. Supporto nativo a replay, recovery e migrazione. Separazione netta dalla write side e dal domain core. La Read Platform è un sottosistema architetturale distinto, con confini e regole di layering propri.

## Consequences

### Positive
- Resilienza: recovery e replay senza impattare la write side.
- Backward compatibility: evoluzione degli schemi in modo controllato.
- Osservabilità: confini chiari per monitoraggio e debugging.

### Negative
- Maggiore infrastruttura concettuale da comprendere e mantenere.

### Trade-offs accettati
- Più complessità strutturale in cambio di evoluzione a zero-downtime e comportamento prevedibile sotto carico e in failure.
