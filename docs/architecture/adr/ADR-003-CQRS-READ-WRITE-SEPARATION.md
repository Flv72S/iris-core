# ADR-003: CQRS e separazione Read / Write (Projection + Cache)

**Status:** Accepted  
**Data:** Consolidamento Fase 3 (Gate 3.5)  
**Contesto:** Chiusura formale Fase 3 — CQRS Consolidation

---

## Decisione

Adozione di una **separazione esplicita e irreversibile** tra:

1. **Write Side:** Use Case, Repository di dominio, entità; HTTP POST delegati ai use case; nessuna dipendenza da Query o Projection.
2. **Read Side:** Query Port (read-only), Read Models (DTO serializzabili), Projection (policy di lettura in Core), Cache (decoratore in-memory con invalidazione dal write path); HTTP GET dipendono solo da Projection (eventualmente cached).

La Cache è **trasparente** (stesso output con/senza cache), **decorativa** (wrappa la Projection), **opt-out** (il sistema funziona senza cache) e **invalidabile** solo dal wiring dopo write riuscito.

---

## Consequences

### Positive
- **Disaccoppiamento:** evoluzione indipendente del read side (modelli, proiezioni, cache) senza toccare il write side.
- **Read Models congelati:** DTO solo primitive/string/array; serializzabilità e stabilità dell’API di lettura.
- **Policy di lettura esplicite:** le Projection in Core rendono le policy di lettura verificabili e testabili.
- **Cache controllata:** invalidazione esplicita e deterministica; nessuna business logic in cache.
- **Enforcement:** test di isolamento (core/queries, core/projections), http-boundary-only, cache transparency e non-regression garantiscono il rispetto del modello.

### Negative
- **Complessità:** due percorsi (read/write), più componenti (Query Port, Projection, Cache, invalidating wiring).
- **Consistenza eventuale:** la cache può servire dati stantii fino all’invalidazione; l’invalidazione è legata al write path nel wiring.
- **Manutenzione gate:** allowlist e test di enforcement devono essere aggiornati quando si aggiunge wiring che importa da Core (es. Invalidating*Repository).

---

## Alternatives considered

- **Repository monolitico (read + write):** un unico repository che espone sia `save` sia `findAll`/`findById` per lettura. Scartato perché accoppia lettura e scrittura e impedisce Read Models indipendenti e cache trasparente.
- **Read/Write misto negli handler HTTP:** gli handler GET chiamano gli stessi use case o repository usati dai POST. Scartato perché non permette di congelare i Read Models e di introdurre cache e proiezioni senza toccare il write path.
- **Cache con TTL o invalidation automatica:** scartato in Fase 3 per mantenere il comportamento deterministico e l’invalidazione esplicita dal write path (Microstep 3.4.2).

---

## Link

- **Documento di consolidamento Fase 3:** [../PHASE_3_CQRS_CONSOLIDATION.md](../PHASE_3_CQRS_CONSOLIDATION.md)
- **Gate 3.5:** CQRS Consolidation — PASS (environment blockers acknowledged, no architectural regression)
