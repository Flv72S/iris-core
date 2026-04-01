# K5 — Retry Policy Design

## Scopo

Implementare un adapter concreto per **RetryPolicyPort** (K1), fornendo un layer di retry infrastrutturale **deterministico**, **componibile** e **indipendente** da Core, Storage e Lock. Il retry gestisce solo il ripetersi dell’operazione in caso di errore; non modifica payload, hash, replay né introduce entropia nel dominio.

- **Posizione**: `lib/flow/infrastructure/adapter/retry/retry_policy_adapter.dart`
- **Port**: `RetryPolicyPort` (executeWithRetry)
- **Implementazione**: `ExponentialBackoffRetryPolicyAdapter`

---

## Configurazione

Parametri del costruttore (nessun default hardcoded; tutti esplicitati nei test):

| Parametro       | Tipo                        | Descrizione                                      |
|-----------------|-----------------------------|--------------------------------------------------|
| maxAttempts      | int                         | Numero massimo di tentativi (incluso il primo).  |
| initialDelay     | Duration                    | Delay prima del secondo tentativo.               |
| backoffFactor    | double                      | Moltiplicatore: delay_n = initialDelay * factor^(n-1). |
| maxDelay         | Duration?                   | Cap opzionale sul delay tra un tentativo e l’altro. |
| retryOn          | bool Function(Exception e)? | Predicato opzionale: se presente e ritorna false, non si fa retry e si rilancia l’eccezione. |

Esempio:

```dart
final adapter = ExponentialBackoffRetryPolicyAdapter(
  maxAttempts: 5,
  initialDelay: Duration(milliseconds: 100),
  backoffFactor: 2.0,
  maxDelay: Duration(seconds: 2),
  retryOn: (e) => e is TimeoutException,
);
```

---

## Formula backoff

Backoff esponenziale puro, senza jitter:

- **delay_n** = `initialDelay * (backoffFactor ^ (attempt - 1))`
- `attempt` è 1-based (primo tentativo = attempt 1; il delay dopo il primo fallimento è per il secondo tentativo).
- Se è presente **maxDelay**, il delay calcolato viene limitato a `min(delay_n, maxDelay)`.

Metodo esposto per test deterministici: `Duration computeDelay(int attempt)`.

---

## Assenza jitter

- Non viene usato **Random**.
- Non viene usato alcun jitter sul delay.
- Il comportamento è **deterministico** a parità di configurazione e di esito dell’operazione.

---

## Motivazione determinismo

- **Test**: con `Duration.zero` come `initialDelay` (e opzionale `maxDelay` null) i test non dipendono dal tempo reale e sono veloci e ripetibili.
- **Dominio**: il retry non introduce timestamp, UUID o altri valori casuali nel dominio; è solo ripetizione dell’operazione con attesa fissa tra un tentativo e l’altro.
- **Replay / hash**: il layer non altera payload, hash o logica di replay.

---

## Comportamento executeWithRetry

1. **Tentativo iniziale**: esecuzione di `operation()`.
2. **Successo**: il risultato viene restituito senza modifiche.
3. **Fallimento**:
   - Se `attempt >= maxAttempts` → viene lanciata **RetryException** con l’ultima eccezione come `cause`.
   - Se è presente **retryOn** e `retryOn(e)` è false → viene rilanciata l’eccezione originale (nessun retry).
   - Altrimenti: si attende il delay corrente (`computeDelay`), si ripete l’operazione e si aggiorna il delay per il prossimo tentativo (backoff * factor, con cap `maxDelay`).

Per operazioni **async**: passare una closure che restituisce `Future<T>`; il tipo di ritorno va usato come `dynamic` (o compatibile) per evitare problemi di generics con la port attuale.

---

## Interazione con Lock e Storage

- Il retry **non dipende** da DistributedLockPort né da CloudStoragePort.
- È pensato per essere usato **attorno** a operazioni che possono usare lock o storage: ad esempio si può eseguire “con retry” una chiamata che internamente usa storage o lock.
- Nessun import verso Core, storage, lock, replay o hash.

---

## Error handling

- **Max attempts superato**: **RetryException** con messaggio e `cause` = ultima eccezione; non si propaga l’eccezione originale.
- **retryOn blocca il retry**: si rilancia l’eccezione originale (nessuna RetryException).

---

## Test

- **test/flow/infrastructure/retry/retry_policy_adapter_test.dart**:
  - Success without retry (una sola esecuzione).
  - Success after retries (fallimenti poi successo; numero tentativi e risultato).
  - Max attempts exceeded (RetryException, cause, numero tentativi = maxAttempts).
  - retryOn: eccezione non retryable → nessun retry, eccezione originale; eccezione retryable → retry fino a successo.
  - Backoff: test su `computeDelay` (crescita con backoffFactor, rispetto di maxDelay, attempt 0 → zero).
  - Isolamento: nessun import/dipendenza da core, storage, lock, replay, hash.

---

## Esempi di configurazione

- **Retry veloce (test)**: `maxAttempts: 3`, `initialDelay: Duration.zero`, `backoffFactor: 2.0` — nessun attesa reale.
- **Retry operativo**: `maxAttempts: 5`, `initialDelay: Duration(milliseconds: 200)`, `backoffFactor: 2.0`, `maxDelay: Duration(seconds: 5)`.
- **Solo errori specifici**: `retryOn: (e) => e is SocketException || e is TimeoutException`.

K5 è completo con adapter configurabile, backoff deterministico, test passanti e documentazione.
