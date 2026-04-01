## IRIS — STEP 7 — Core Threads Completion Gate (pre Fase 1.2)

**Obiettivo**: eseguire un micro-check formale e bloccante per certificare che il sottodominio **Core Threads** è:
- semanticamente sufficiente per MVP,
- architetturalmente stabile,
- pronto per l’introduzione degli adapter HTTP (Fase 1.2),
senza introdurre nuove feature e senza modifiche semantiche.

**Scope**:
- READ-ONLY su `src/core/threads/**` (codice di dominio e use case)
- ammessa: documentazione + test architetturali di coerenza

---

## Stato attuale (evidenza tecnica)

### Artefatti Core Threads presenti

- **Entity**
  - `src/core/threads/Thread.ts`
- **Repository Contract**
  - `src/core/threads/ThreadRepository.ts`
  - Contract tests: `src/core/threads/tests/ThreadRepository.contract.test.ts`
- **Use case**
  - `src/core/threads/usecases/CreateThread.ts`
  - `src/core/threads/usecases/ListThreads.ts`
  - Tests: `src/core/threads/__tests__/CreateThread.test.ts`, `src/core/threads/__tests__/ListThreads.test.ts`
- **Isolamento (arch test)**
  - `src/core/threads/tests/core-threads-isolation.test.ts`

---

## Checklist di Allineamento (PASS/FAIL motivato)

### 1) Entity

| Check | Stato | Evidenza |
|---|---|---|
| `Thread` ha invarianti complete e autosufficienti | **PASS** | `Thread.ts`: `assertNonBlank(title/id)`, `updatedAt >= createdAt`, defensive copy su getter Date |
| Nessuna regola di business mancante per MVP | **PASS** | MVP threads richiede: create/rename/archive + invarianti. Nessuna persistenza, no policy aggiuntive, nessun auth |

Note (non bloccante): l’ID è generato dal Core (crypto.randomUUID se disponibile, fallback interno). Questo è coerente con “id generato dal Core” e non introduce dipendenze esterne.

---

### 2) Repository

| Check | Stato | Evidenza |
|---|---|---|
| `ThreadRepository` espone solo contratto, nessuna implementazione | **PASS** | `ThreadRepository.ts` contiene solo `export interface ThreadRepository` + doc vincolante |
| Contract tests coprono casi fondamentali | **PASS** | `ThreadRepository.contract.test.ts` verifica: null-on-miss, save+findById, upsert(no duplicati), delete idempotente, findAll array coerente |

---

### 3) Use case

| Check | Stato | Evidenza |
|---|---|---|
| `CreateThread` crea + salva una Thread valida | **PASS** | `CreateThread.ts`: `Thread.create` + `repo.save(thread)`; test verifica store |
| `ListThreads` delega correttamente al repository | **PASS** | `ListThreads.ts`: `return repo.findAll()`; test verifica call-count + contenuto |
| Nessun use case anticipa logiche future | **PASS** | Nessun sorting/paging/filtering; nessun retry/backoff; nessun coupling infra |

---

### 4) Isolamento

| Check | Stato | Evidenza |
|---|---|---|
| Il Core non importa nulla da altri layer | **PASS** | Tutti gli import in `src/core/threads/**` sono relativi e interni; enforced da test isolamento |
| Nessuna dipendenza da runtime/HTTP/DB/fs/env | **PASS** | Nessun riferimento in `Thread.ts`, `ThreadRepository.ts`, usecases. Il test isolamento blocca import non-relativi / escape path |

---

### 5) Test

| Check | Stato | Evidenza |
|---|---|---|
| Test deterministici | **PASS** | Assert su proprietà osservabili (id non vuoto, call-count). Nessun timing, nessun IO esterno |
| Nessun mock di entità | **PASS** | I test usano `Thread.create(...)` reale; repository fake inline |
| Nessun effetto collaterale | **PASS** | Solo memoria. Il test isolamento legge file sorgenti (analisi statica) senza mutare nulla |

---

## Dichiarazione vincolante di readiness

**PASS — Core Threads sufficienti per avvio adapter HTTP.**

Motivazione:
- Entity + invarianti + API pubblica definite e testate.
- Contratto repository formalizzato e coperto da contract test.
- Use case minimi (Create/List) presenti, senza logica futura.
- Isolamento garantito da test architetturale bloccante.

---

## Verdetto finale (bloccante)

**VERDETTO: PASS → Fase 1.2 AUTORIZZATA**

Condizioni di validità:
- Tutti i test sotto riportati devono essere PASS nel CI/local.

---

## Comandi di verifica (test)

Eseguire i test Core Threads:

```bash
npm test -- src/core/threads
```

Oppure singoli test:

```bash
npm test -- src/core/threads/tests/core-threads-isolation.test.ts
npm test -- src/core/threads/tests/ThreadRepository.contract.test.ts
npm test -- src/core/threads/__tests__/CreateThread.test.ts
npm test -- src/core/threads/__tests__/ListThreads.test.ts
```

