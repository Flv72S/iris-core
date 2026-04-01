# BLOCCO 6.1 — Event & Signal Layer

**Stato: CONGELATO (FREEZE)**  
Infrastruttura stabile e certificata. Nessun refactor, nessuna estensione, nessuna "piccola utilità" aggiunta a 6.1.

---

## Scopo del BLOCCO 6.1

Il BLOCCO 6.1 fornisce un **Event & Signal Layer** passivo e shadow per IRIS:

- **6.1.1** — Domain Event Abstraction: definizione base di eventi di dominio, append-only, senza logica.
- **6.1.2** — Event Dispatcher: distribuzione in-process, sincrona, a listener puramente osservativi.
- **6.1.3** — Event Store: persistenza shadow, append-only, retention limitata, usato solo come listener.

L’obiettivo è **osservazione, debug e validazione segnali**. Non è una feature: è infrastruttura di base che può essere disattivata senza impatto sull’MVP.

---

## Cosa NON fa (esplicitamente)

- **Non è Event Sourcing** — l’Event Store non è fonte di verità.
- **Non è letto dal dominio** — il dominio non dipende da dispatcher o store.
- **Non decide nulla** — nessun listener restituisce valori o modifica input/output del dominio.
- **Non espone query** — nessuna API di find, query, replay sull’Event Store.
- **Non introduce side-effect** — gli eventi non mutano stato dominio, non bloccano use case, non introducono dipendenze temporali.
- **Non abilita feature** — nessuna funzionalità utente dipende da 6.1.

---

## Perché è shadow

Il layer è **shadow** (in ombra) perché:

- Esiste solo per osservabilità e segnali.
- La perdita di eventi è tollerata: non rompe nulla.
- Può essere rimosso o disattivato (NoOp collector, NoOp store) senza cambiare il comportamento dell’applicazione.
- L’MVP funziona identicamente con 6.1 ON o OFF.

---

## Perché è append-only

- Gli eventi **descrivono ciò che è successo**; non vengono mai modificati o cancellati dopo la creazione.
- L’Event Store accetta solo `append(event)`; nessun update, delete, find, query, replay.
- Garantisce che il layer resti passivo e non diventi un sistema di gestione dati.

---

## Perché non espone query

- L’Event Store non è una fonte di verità e non deve essere usato per decisioni di dominio.
- Esporre query incoraggerebbe dipendenze dal dominio verso il layer eventi, violando l’isolamento.
- L’unica lettura ammessa è per test/observability (es. `getAllForTest`), non per il dominio.

---

## Regole per contributori futuri

1. **Se vuoi una feature** — NON è qui. Il BLOCCO 6.1 non aggiunge funzionalità all’utente.
2. **Se vuoi decisioni** — NON è qui. I listener non decidono, non restituiscono valori, non modificano il flusso.
3. **Se vuoi query o replay** — NON è qui. L’Event Store è append-only e senza API di lettura per il dominio.
4. **Se vuoi side-effect** — NON è qui. Gli eventi sono passivi; nessuna mutazione di stato, nessun blocco.
5. **Dopo il FREEZE** — nessun refactor, nessuna estensione, nessuna piccola utilità su 6.1. Il blocco è infrastruttura di base certificata.

---

## Vincoli architetturali (testati)

- **MVP invariato**: use case senza collector, con NoOpEventCollector, con DispatchingEventCollector + NoOpEventStore producono stesso output, stato e side-effect persistenti.
- **Event Layer non decide**: nessun listener restituisce valori; nessun listener modifica input/output del dominio.
- **API proibite**: DomainEventStore non espone update, delete, find, query, replay.
- **Disattivabilità totale**: con collector assente, NoOp collector o dispatcher + NoOp store, il sistema funziona senza errori e senza differenze funzionali.
- **Side-effect zero**: nessun evento cambia stato dominio, blocca un use case o introduce dipendenze temporali.

Test di congelamento: `src/core/events/tests/EventLayerFreeze.spec.ts`.
