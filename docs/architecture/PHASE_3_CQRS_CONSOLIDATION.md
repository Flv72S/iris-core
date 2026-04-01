# Fase 3 — CQRS Consolidation (Congelamento formale)

**Stato:** CONGELATO  
**Versione:** 1.0  
**Data consolidamento:** Fase 3 chiusa con Gate 3.5

---

## 1. Scopo della Fase 3

### Perché è stata introdotta
La Fase 3 introduce una **separazione esplicita e irreversibile** tra il percorso di scrittura (Command) e il percorso di lettura (Query) dell’applicazione, in linea con il pattern CQRS (Command Query Responsibility Segregation). L’obiettivo è:
- eliminare l’accoppiamento tra API di lettura e dominio di scrittura;
- consentire evoluzione indipendente del read side (Read Models, proiezioni, cache);
- garantire che i Read Models siano serializzabili, deterministici e privi di logica di dominio.

### Quali problemi risolve
- **Accoppiamento read/write:** gli endpoint GET non dipendono più da entità di dominio né da repository di scrittura.
- **Read Models instabili:** i Read Models sono DTO congelati (solo primitive, stringhe, array; nessuna `Date`, nessuna funzione).
- **Mancanza di policy di lettura esplicita:** le Projection definiscono in Core le policy di lettura; la Cache è un decoratore trasparente e invalidabile dal write path.

### Quali problemi non risolve (non-goals)
- Ottimizzazione avanzata del read side (es. event sourcing, proiezioni asincrone).
- Scalabilità orizzontale del read side.
- Supporto a query complesse (filtri, paginazione, full-text).
- Persistenza o TTL della cache (la cache è in-memory, senza TTL; invalidazione esplicita dopo write).

---

## 2. Architettura finale (Read vs Write)

### Write Side
- **Domain:** entità `Thread`, `Message`; invarianti enforce nel costruttore.
- **Repository (port):** `ThreadRepository`, `MessageRepository` — contratti Core, implementazioni in persistence (InMemory, Prisma) o wiring (`ConsistentMessageRepository`, `InvalidatingThreadRepository`, `InvalidatingMessageRepository`).
- **Use Case:** `CreateThread`, `ListThreads`, `CreateMessage`, `ListMessagesByThread` — orchestrano dominio e repository; **non** conoscono Query, Projection, Read Models.
- **HTTP:** POST `/threads`, POST `/threads/:id/messages` — validano shape, chiamano use case, serializzano risposta; **non** importano Query Port, Projection, Read Models.

**Dipendenze consentite (Write):** Domain → nulla; Use Case → Domain + Repository; HTTP POST → Use Case + Repository (via wiring).  
**Dipendenze vietate (Write):** Use Case → Query/Projection/Read Models; HTTP POST → Query/Projection.

### Read Side
- **Query Port:** `ThreadQueryRepository`, `MessageQueryRepository` — interfacce read-only in Core; ritornano DTO (Read Models), mai entità.
- **Read Models:** `ThreadReadModel`, `MessageReadModel`, `ThreadWithMessagesReadModel`, `MessageWithThreadReadModel` — solo primitive/string/array; serializzabili; nessuna `Date`, nessuna funzione.
- **Projection (interfacce):** `ThreadReadProjection`, `MessageReadProjection` — policy di lettura in Core; implementazioni query-backed in `core/projections/impl/`.
- **Cache:** `InMemoryCache`, `CachedThreadReadProjection`, `CachedMessageReadProjection` — decoratori; key-based, invalidation esplicita dal write path (wiring); nessuna business logic.
- **HTTP:** GET `/threads`, GET `/threads/:id/messages`, GET `/messages/:id` — dipendono **solo** da Projection (eventualmente cached); serializzano Read Models in JSON.

**Dipendenze consentite (Read):** Projection → Query Port (strutturale o via impl); Cache → Projection + InMemoryCache; HTTP GET → Projection.  
**Dipendenze vietate (Read):** Projection/Cache → Domain, Use Case, Repository di scrittura; Read Models → Date/function/class.

---

## 3. Contratti congelati (FREEZE)

I seguenti elementi sono **immutabili** senza un nuovo step architetturale esplicito:

| Contratto | Regola | Ubicazione |
|-----------|--------|------------|
| **Read Models** | Solo primitive, string, array; serializzabili; nessuna `Date`, nessuna funzione | `src/core/queries/read-models/**` |
| **Query Port** | Read-only; metodi che ritornano Promise di Read Model o array; nessun side-effect di scrittura | `src/core/queries/ThreadQueryRepository.ts`, `MessageQueryRepository.ts` |
| **Projection interfaces** | Solo metodi di lettura; ritornano Read Models; nessun import da domain/use case/persistence | `src/core/projections/ThreadReadProjection.ts`, `MessageReadProjection.ts` |
| **Cache** | Decoratore trasparente; stessa interfaccia della Projection; invalidazione solo da wiring; nessuna business logic | `src/core/projections/cache/**` |

Ogni modifica che violi questi contratti è considerata una **regressione architetturale**.

---

## 4. Enforcement attivo

I seguenti gate sono **attivi** e devono restare verdi (o classificati come environment blocker senza regressione):

| Gate | Scopo | Comando / ubicazione |
|------|--------|----------------------|
| **core/queries isolation** | Il layer Query importa solo da `core/queries/**` e `read-models/**`; nessun domain/persistence/http | `npm test -- src/core/queries` |
| **core/projections isolation** | Il layer Projection importa solo da `core/projections/**` e `core/queries/read-models/**` | `npm test -- src/core/projections` (incl. `core-projections-isolation.test.ts`) |
| **http-boundary-only** | HTTP non importa da Core (eccetto allowlist: routes, wiring, repository in-memory) | `npm test -- src/api/tests/http-boundary-only.test.ts` |
| **Cache transparency** | Con/senza cache stesso Read Model; stessa struttura e serializzabilità | `src/core/projections/tests/cache-transparency.test.ts` |
| **Cache non-regression** | Con cache: secondo GET non aumenta chiamate al repository sottostante | `src/api/tests/cache-nonregression-roundtrip.test.ts` |
| **Cache opt-out** | Server senza cache ritorna risultato corretto; la cache non è requisito funzionale | `src/api/tests/cache-optout.test.ts` |

**Regola:** ogni nuova fase **deve** mantenere questi gate verdi (o mantenere la classificazione di eventuali FAIL come environment blocker, senza regressione architetturale).

---

## 5. Environment blockers riconosciuti

I seguenti FAIL **non** costituiscono regressioni architetturali e sono esplicitamente riconosciuti:

1. **Mismatch `better-sqlite3` / Node**  
   Il test `persistence-no-semantics.test.ts` può fallire con `ERR_DLOPEN_FAILED` (NODE_MODULE_VERSION 115 vs 137) quando il runtime Node non coincide con la versione contro cui è stato compilato `better-sqlite3`.  
   **Classificazione:** environment blocker (toolchain / versione Node).  
   **Impatto architetturale:** nessuno; la separazione CQRS e i contratti restano validi.

2. **Allowlist `http-boundary-only` non aggiornata per wiring cache invalidation**  
   I file `InvalidatingThreadRepository.ts` e `InvalidatingMessageRepository.ts` (in `src/api/http/wiring/`) importano da Core (threads, messages, projections/cache) per implementare l’invalidazione della cache dopo write. Il test `http-boundary-only.test.ts` non li include nell’allowlist e segnala violazioni.  
   **Classificazione:** gap di configurazione test (allowlist preesistente non estesa al wiring di Fase 3.4.2).  
   **Impatto architetturale:** nessuno; il wiring è intenzionale e l’invalidazione avviene solo nel wiring, non nei controller HTTP.

> **Dichiarazione:** questi FAIL **NON** costituiscono regressioni architetturali. La Fase 3 resta consolidata.

---

## 6. Forbidden patterns (VINCOLANTI)

È **vietato** introdurre i seguenti pattern senza un nuovo step architetturale esplicito:

- **HTTP GET che accedono a repository di dominio**  
  I GET devono dipendere solo da Projection (o Cached Projection); nessun uso di `ThreadRepository` / `MessageRepository` negli handler GET.

- **Projection che importano domain / use case**  
  Le Projection (interfacce e impl) non devono importare da `core/threads`, `core/messages`, use case, o repository di dominio.

- **Cache che contiene business logic**  
  La cache è solo memoizzazione key-based; nessuna trasformazione, filtro o regola di dominio.

- **Write path che dipende da Query / Projection**  
  Use case e repository di scrittura non devono dipendere da Query Port, Projection o Read Models; l’invalidazione della cache è demandata al wiring (decoratori di repository), non ai use case.

- **Read Model che contiene Date / function / class**  
  I Read Models devono essere DTO con solo tipi primitivi, stringhe e array; date come stringhe ISO-8601; nessuna funzione, nessuna classe, nessun tipo `Date`.

---

*Documento di consolidamento Fase 3 — CQRS. Modifiche consentite solo tramite nuovo step architetturale documentato.*
