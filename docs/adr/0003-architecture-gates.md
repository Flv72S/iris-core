# ADR-0003 — Architecture Gates & Non-Degrading Architecture

## Status
Accepted

## Context
Le architetture tendono a degradare nel tempo. Regole conosciute ma non enforceabili vengono ignorate sotto pressione. Le review manuali non bastano a impedire regressioni strutturali. Serve un meccanismo che blocchi il build quando i confini architetturali vengono violati.

## Decision
Introduzione di Architecture Gates automatici. Regole statiche (CQRS, layering) applicate al grafo degli import. Il gate è eseguito in CI e localmente; in presenza di violazioni il build fallisce. Le violazioni attuali sono note e accettate temporaneamente come stato transitorio, da ridurre con refactor progressivo.

## Consequences

### Positive
- Architettura stabile: nessuna nuova violazione passa inosservata.
- Governance reale: le regole sono nel pipeline, non solo in documenti.
- Sicurezza evolutiva: i confini restano difesi nel tempo.

### Negative
- Refactor progressivo richiesto per eliminare le violazioni esistenti.
- Attrito iniziale per chi introduce import che violano le regole.

### Trade-offs accettati
- Attrito iniziale e lavoro di allineamento in cambio di sostenibilità e non-degradazione dell’architettura a lungo termine.
