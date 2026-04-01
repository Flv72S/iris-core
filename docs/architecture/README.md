# Architettura IRIS

Documentazione architetturale e decision record per il progetto IRIS.

---

## Mappa delle fasi

| Fase | Contenuto | Stato |
|------|-----------|--------|
| **Fase 1** | Thread (Core, Repository, Use Case, HTTP Adapter) | Completata |
| **Fase 2** | Message (Core, Repository, Use Case, HTTP Adapter, consistenza Thread ↔ Message) | Completata |
| **Fase 3** | CQRS: Query Port, Read Models, Projection, Cache, invalidazione Write → Read | **Congelata** (Gate 3.5) |

**Da qui in avanti → Fase 4** (scaling, async, evoluzione proiezioni, ecc.), nel rispetto dei contratti e dei gate documentati in Fase 3.

---

## Documenti principali

- **[PHASE_3_CQRS_CONSOLIDATION.md](./PHASE_3_CQRS_CONSOLIDATION.md)** — Congelamento formale Fase 3 (CQRS): architettura read/write, contratti, enforcement, environment blockers, forbidden patterns.
- **[adr/ADR-003-CQRS-READ-WRITE-SEPARATION.md](./adr/ADR-003-CQRS-READ-WRITE-SEPARATION.md)** — Decision record: separazione CQRS + Projection + Cache.

---

## Regola di evoluzione

Ogni nuova fase deve:
- mantenere verdi i gate indicati in PHASE_3_CQRS_CONSOLIDATION.md (o mantenere la classificazione di eventuali FAIL come environment blocker);
- rispettare i contratti congelati (Read Models, Query Port, Projection interfaces, Cache come decoratore);
- non introdurre i forbidden patterns ivi elencati senza un nuovo step architetturale documentato.
