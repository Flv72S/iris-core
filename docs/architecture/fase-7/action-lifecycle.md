# Action Lifecycle Manager — Fase 7.1b

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/action-lifecycle.ts`

---

## 1. Stati del ciclo di vita

| Stato | Significato |
|-------|-------------|
| **planned** | Azione in piano (ExecutionPlan); non ancora avviata. |
| **executing** | Esecuzione in corso. |
| **applied** | Esecuzione completata con successo (effetto applicato). |
| **reverted** | Effetto annullato (reversibilità). Terminale. |
| **failed** | Esecuzione fallita. Terminale. |

---

## 2. Transizioni ammesse

| Da | A |
|----|---|
| planned | executing |
| executing | applied, failed |
| applied | reverted |
| reverted | — |
| failed | — |

Reversibilità obbligatoria: da **applied** è consentita solo la transizione a **reverted**. Nessuna transizione da reverted o failed.

---

## 3. Stato persistente

- **ActionLifecycleEntry:** per ogni actionId, un record con `state`, `transitionedAt`, `previousState`, `reason`. Serializzabile (JSON).
- **ActionLifecycleStore:** `get(actionId)`, `set(entry)`, `getAll()`, `toJSON()`, `fromJSON(json)`. Lo store può essere in-memory (InMemoryActionLifecycleStore) o implementato su persistenza esterna; il contratto è serializzabile e ripristinabile.

---

## 4. Audit completo

- **ActionLifecycleAuditEntry:** per ogni transizione si registra `actionId`, `fromState`, `toState`, `transitionedAt`, `reason`. Append-only.
- **appendLifecycleAudit(entry):** chiamata da `transitionAndPersist` a ogni transizione.
- **readLifecycleAudit():** lettura completa del log. Reset solo in test (`_resetLifecycleAuditForTest`).

---

## 5. API

- **createPlannedEntry(actionId, at):** crea la prima entry (stato planned).
- **getNextAllowedStates(current):** restituisce gli stati consentiti a partire da `current`.
- **canTransition(from, to):** true se la transizione è ammessa.
- **transition(entry, toState, reason, at):** funzione pura; restituisce la nuova entry o null se la transizione non è consentita.
- **transitionAndPersist(store, entry, toState, reason, at):** esegue la transizione, aggiorna lo store e appende una voce in audit; restituisce la nuova entry o null.

---

## 6. Reversibilità

- Dopo **applied**, l’unica transizione consentita è **reverted**.
- Il caller è responsabile di eseguire l’operazione di revert (rollback effettivo); il lifecycle manager registra solo il passaggio di stato e l’audit.
- Stati **reverted** e **failed** sono terminali: nessuna transizione successiva.

---

## 7. Riferimenti

- Execution plan: execution-plan.md
- Action intent: action-intent.ts
- Execution engine: execution-engine.md
