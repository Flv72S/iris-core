# Kill-Switch Propagation Model — Fase 7.3a

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/killswitch-propagation.ts`

---

## 1. Scopo

Garantire **stop atomico cross-executor**: quando il kill-switch globale viene attivato, tutti gli executor (engine, domain executors, adapter path) devono osservare lo stop in modo coerente, senza esecuzioni “in fuga” che proseguono dopo il trigger.

---

## 2. Modello di propagazione

### 2.1 Registry condiviso (un solo riferimento)

- **Regola:** tutti i percorsi di esecuzione devono ricevere **lo stesso riferimento** a `ExecutionKillSwitchRegistry`.
- **Creazione:** `createSharedRegistry(initial?)` restituisce un registry **mutabile** pensato per essere condiviso. Il chiamante passa questo oggetto a ogni `ExecutionContext`, `ExecutionEngine`, `executeFromResolution`.
- **Effetto:** una modifica al registry (es. `triggerGlobalStop(registry)`) è visibile a ogni consumer al **prossimo** accesso a `context.registry`, senza meccanismi aggiuntivi in ambiente single-thread sincrono.

### 2.2 Check a inizio di ogni esecuzione

- **Regola:** ogni punto che può eseguire un’azione (ExecutionEngine.execute, executeFromResolution) deve **leggere il registry all’ingresso** e, se il globale (o il livello pertinente) è OFF, restituire BLOCKED senza invocare l’executor/adapter.
- **Stato attuale:** ExecutionEngine e executeFromResolution già controllano `isExecutionEnabled(context.registry, EXECUTION_ENGINE_COMPONENT_ID)` all’inizio. Nessuna esecuzione parte se il globale è disabilitato.

### 2.3 Nessuno snapshot stale

- **Regola:** non si deve trattenere una **copia immutabile** del registry tra una chiamata e l’altra (es. non fare `context = { ...context, registry: Object.freeze({ ...context.registry }) }` e poi riusare quel context per esecuzioni successive). Usare sempre il riferimento condiviso così che ogni lettura veda lo stato aggiornato.

---

## 3. API

- **createSharedRegistry(initial?): ExecutionKillSwitchRegistry**  
  Crea un registry mutabile da passare a tutti gli executor. Opzionale `initial` per valori iniziali (es. engine ON, alcune feature OFF).

- **triggerGlobalStop(registry): void**  
  Imposta lo stop globale (`registry[GLOBAL_KILL_SWITCH_KEY] = false`). Il registry deve essere mutabile. Dopo la chiamata, ogni successivo check sul **medesimo** registry vedrà l’engine disabilitato.

- **isGlobalStopActive(registry): boolean**  
  Restituisce true se lo stop globale è attivo su questo registry.

- **clearGlobalStop(registry): void**  
  Riabilita l’engine (`registry[GLOBAL_KILL_SWITCH_KEY] = true`). Registry deve essere mutabile.

- **PROPAGATION_CONTRACT**  
  Oggetto read-only che riassume le tre regole (sharedRegistry, checkAtEntry, noStaleSnapshot) per documentazione e conformance.

---

## 4. Stop atomico cross-executor

- **Single-thread, sync:** con registry condiviso e check a inizio di ogni `execute`, un solo `triggerGlobalStop(registry)` è sufficiente: nessun executor può aver già superato il check “prima” del trigger e poi eseguire dopo, perché non c’è await tra check e esecuzione. Il prossimo executor che parte farà il check dopo il trigger e vedrà OFF.
- **Batch di intent:** se si esegue una sequenza di intent (es. loop che chiama executeFromResolution per ogni intent), passare **lo stesso** `context` (con lo stesso `context.registry`) a ogni chiamata. Se in mezzo al batch si chiama `triggerGlobalStop(context.registry)`, la successiva iterazione vedrà lo stop e non eseguirà.
- **Async:** se in futuro l’esecuzione diventasse asincrona (await tra check e chiamata all’adapter), per mantenere lo stop atomico andrebbe effettuato un **re-check** del registry subito prima di invocare l’adapter (dopo l’await), e in caso di stop restituire BLOCKED senza eseguire.

---

## 5. Integrazione

- **Pipeline / orchestrazione:** creare una volta `const registry = createSharedRegistry()` e iniettarlo in ogni `ExecutionContext`. Per emergenza o manutenzione: `triggerGlobalStop(registry)`.
- **ExecutionEngine / executeFromResolution:** già conformi se ricevono `context.registry` come riferimento condiviso e fanno il check all’ingresso. Nessuna modifica obbligatoria; il modulo killswitch-propagation formalizza il contratto e fornisce createSharedRegistry e triggerGlobalStop.

---

## 6. Riferimenti

- Kill-switch: `execution-killswitch.ts`, `kill-switch/ExecutionKillSwitch.ts`
- ExecutionContext: `ExecutionContext.ts`
- ExecutionEngine: `ExecutionEngine.ts`
- executeFromResolution: `execution-engine-core.ts`
