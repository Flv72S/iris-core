# K4 — Distributed Lock Design

## Scopo

Implementare un adapter concreto per **DistributedLockPort** (K1), fornendo il primo elemento di coordinazione distribuita nell’infrastruttura IRIS Flow. L’implementazione è **InMemoryDistributedLockAdapter** (K4.1): lock in-memory, **FIFO**, **ownership-safe**, **event-driven**, senza persistenza né distribuzione reale.

- **Posizione**: `lib/flow/infrastructure/adapter/lock/distributed_lock_adapter.dart`
- **Port**: `DistributedLockPort` (acquireLock, releaseLock, tryAcquireLock)
- **Comportamento**: lock puramente infrastrutturale; non influenza contenuto record, hash, replay; non espone timestamp nel dominio.

---

## K4 vs K4.1

| Aspetto | K4 (precedente) | K4.1 (attuale) |
|--------|------------------|-----------------|
| Struttura | `Set<String> _lockedKeys` | `Map<String, _LockState> _locks` con owner + coda |
| Fairness | Nessuna garanzia ordine | **FIFO**: coda di attesa, primo arrivato = primo servito |
| Attesa | Busy polling (loop con `Future.delayed`) | **Event-driven**: `Completer` completato al release |
| Ownership | Solo “key presente” | **ownerId** per chiave; rilascio “pulisce” o passa al prossimo |
| Timeout | Polling fino a scadenza | `Future.any([completer.future, Future.delayed(timeout)])`; su timeout waiter rimosso dalla coda |
| Identità | Nessuna | Contatore interno (int → String); in K6 sostituibile con NodeIdentityProvider |

**Motivazione eliminazione busy polling**: il loop con `Future.delayed(step)` consumava risorse e introduceva latenza non deterministica. Con **Completer** l’attesa è reattiva: il thread che rilascia completa il completer del primo waiter, che si risveglia immediatamente senza polling.

---

## Fairness (FIFO)

- **Coda di attesa**: per ogni `lockKey` è presente una `waitQueue` (lista FIFO) di **waiter**.
- **Ordine di acquisizione**: il primo che chiama `tryAcquireLock` quando il lock è occupato è il primo in coda; al `releaseLock`, solo il primo della coda riceve il lock (il suo `Completer` viene completato).
- **Nessuna starvation**: ogni waiter viene servito in ordine; non ci sono priorità o “salti”.

---

## Ownership model

- Ogni lock attivo ha un **ownerId** (String), generato con contatore incrementale (nessun UUID/Random).
- **acquireLock**: se la key non esiste, viene creata una `_LockState` con l’ownerId corrente.
- **releaseLock**: se la key non esiste → **LockException**. Se esiste e la coda è vuota → rimozione dalla map. Se la coda non è vuota → si estrae il primo waiter (FIFO), si imposta il suo `ownerId` come owner corrente e si completa il suo `Completer`.
- **Doppio release**: dopo un release che rimuove la key (coda vuota), un secondo `releaseLock(key)` fallisce con **LockException** (key non presente).

---

## Diagramma flusso acquisizione

```
tryAcquireLock(lockKey, timeout)
         │
         ▼
   lockKey in _locks?
    │         │
   NO        YES
    │         │
    ▼         ▼
 Crea state   Crea _LockWaiter(ownerId), aggiungi a waitQueue
 con ownerId  await Future.any([ waiter.completer.future, Future.delayed(timeout) ])
    │         │
    ▼         ├─ completer completato → return true
 return true  └─ timeout → rimuovi waiter da waitQueue → return false
```

**releaseLock(lockKey)**:

```
releaseLock(lockKey)
         │
         ▼
   lockKey in _locks?  NO → LockException
         │ YES
         ▼
   waitQueue.isEmpty?
    │         │
   YES        NO
    │         │
    ▼         ▼
 Rimuovi key  Estrai primo waiter (FIFO)
 da _locks    state.ownerId = waiter.ownerId
              waiter.completer.complete()
```

---

## Limitazioni (in-memory, non distribuito reale)

- **In-memory**: lo stato dei lock vive solo nel processo; nessuna persistenza, nessun backend esterno.
- **Non distribuito**: non è possibile coordinare più istanze o più nodi; un solo adapter per processo.
- **Nessun retry**: acquireLock non ritenta se il lock è occupato; lancia LockException.
- **OwnerId**: K4.1 usa un contatore interno (int → String); in K6 sarà sostituibile con NodeIdentityProvider.

Evoluzioni future (non in K4/K4.1): adapter basati su Redis, DynamoDB o altri backend distribuiti.

---

## Garanzie deterministiche

- **Dominio**: il lock non modifica dati di dominio, hash o replay; è solo coordinazione esterna.
- **Nessuna entropia nel dominio**: nessun timestamp esposto, nessun UUID, nessun Random; uso di tempo solo interno per timeout (`Future.delayed`).
- **Errori mappati**: qualsiasi errore è tradotto in **LockException**; non si espongono StateError, ConcurrentModificationError, NullError.
- **tryAcquireLock su timeout**: restituisce `false` e rimuove il waiter dalla coda; nessuna eccezione su scadenza timeout.
- **Nessun isolate, nessun threading manuale**: solo strutture in memoria e Completer/Future.

---

## Comportamento (K4.1)

| Metodo | Condizione | Effetto |
|--------|------------|---------|
| **acquireLock(key)** | Lock libero | Crea _LockState con ownerId, inserisce in map. |
| **acquireLock(key)** | Lock già presente | Lancia **LockException** (non attende). |
| **releaseLock(key)** | Key non in map | Lancia **LockException**. |
| **releaseLock(key)** | Key in map, coda vuota | Rimuove key da map. |
| **releaseLock(key)** | Key in map, coda non vuota | Assegna lock al primo waiter (FIFO), completa il suo completer. |
| **tryAcquireLock(key, timeout)** | Lock libero | Acquisisce e restituisce **true**. |
| **tryAcquireLock(key, timeout)** | Lock occupato, completer completato in tempo | Restituisce **true**. |
| **tryAcquireLock(key, timeout)** | Lock occupato, timeout scaduto | Rimuove waiter dalla coda, restituisce **false**. |

Implementazione: `Map<String, _LockState>`, `_LockState` = ownerId + `List<_LockWaiter>` (FIFO); ogni waiter ha un `Completer<void>` completato al release. Nessun busy loop, nessun Timer globale.

---

## Preparazione per backend distribuito

L’adapter K4.1 mantiene il contratto **DistributedLockPort** e la semantica FIFO/ownership in memoria. Per un futuro backend distribuito (Redis, DynamoDB, ecc.):

- Stesso port: `acquireLock`, `releaseLock`, `tryAcquireLock(lockKey, timeout)`.
- Stesse regole di errore: tutto mappato in **LockException**.
- Nessuna entropia esposta nel dominio; eventuale TTL/identità nodo gestiti nell’adapter.
- La logica “owner + coda” in K4.1 è un modello di riferimento per ordinamento e timeout (es. “waiter” = richiesta registrata lato server con timeout).

---

## Test

- **test/flow/infrastructure/lock/distributed_lock_adapter_test.dart**:
  - K4: Acquire & Release, Double Acquire (LockException), Release senza acquire (LockException), tryAcquireLock success, tryAcquireLock timeout (false), Deterministic Isolation (nessun import core/persistence/replay/hash).
  - **K4.1**: FIFO Fairness (3 tryAcquireLock concorrenti → ordine 1→2→3), Ownership Safety (doppio release → LockException), Timeout Removal (waiter rimosso dopo timeout), Parallel TryAcquire Stress (10 concorrenti, ordine e assenza deadlock), Deterministic Isolation (no UUID/Random/isolate).

K4.1 è completo con adapter in-memory FIFO/ownership/event-driven, test passanti e documentazione aggiornata.
