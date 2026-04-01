# Execution Audit Log — Fase 7.4

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/execution-audit.ts`

---

## 1. Scopo

Log **append-only** per ogni esecuzione (o tentativo) con: **trace del lifecycle**, **correlazione con la Resolution**, **snapshot before/after**. Ogni record è immutabile e serializzabile; nessuna cancellazione o riscrittura.

---

## 2. Struttura del record

**ExecutionAuditRecord** contiene:

- **Campi base (obbligatori):** `actionId`, `type`, `sourceFeature`, `requestedAt`, `result`, `recordedAt`.
- **Correlazione Resolution (opzionale):** `resolution`: `{ resolutionId, executionRequestId, resolutionStatus }` — collega l’esecuzione alla decisione di risoluzione (Fase 6.5).
- **Trace lifecycle (opzionale):** `lifecycleTrace`: sequenza di `ActionLifecycleAuditEntry` (fromState, toState, transitionedAt, reason) per quell’azione, **snapshot al momento dell’append**. Permette di ricostruire planned → executing → applied | failed senza dipendere da un altro store.
- **Snapshot before (opzionale):** `snapshotBefore`: stato/contesto prima dell’esecuzione (es. payload, feature flags, registry). Deve essere serializzabile (JSON-safe).
- **Snapshot after (opzionale):** `snapshotAfter`: stato/risultato dopo l’esecuzione (es. risultato dell’adapter, side-effect). Serializzabile.

---

## 3. Append e lettura

- **appendExecutionAuditRecord(input):** aggiunge un record. `ExecutionAuditRecordInput` ha i campi obbligatori più `recordedAt?`, `resolution?`, `lifecycleTrace?`, `snapshotBefore?`, `snapshotAfter?`. Se `recordedAt` è omesso, si usa il timestamp di append.
- **readExecutionAudit():** restituisce l’intero log in ordine di append (cronologico).
- **readExecutionAuditByActionId(actionId):** filtra per `actionId`.
- **readExecutionAuditByResolutionId(resolutionId):** filtra per `resolution.resolutionId` (tutte le azioni eseguite per quella resolution).

---

## 4. Trace lifecycle

- Il **lifecycle** (Fase 7.1b) gestisce gli stati: planned → executing → applied | reverted | failed.
- Ogni transizione può essere registrata in `ActionLifecycleStore` e in `appendLifecycleAudit`.
- Per il log di esecuzione, al momento dell’append del record si può passare un **snapshot** delle transizioni già avvenute per quell’`actionId` (es. filtrando `readLifecycleAudit()` per `actionId`). Così il record di execution-audit è **autocontenuto** e non dipende dall’ordine di lettura di un altro log.
- Utilizzo: debugging, replay, conformità (chi ha deciso, quando, con quale stato intermedio).

---

## 5. Correlazione Resolution

- **resolutionId:** identifica la Resolution (Fase 6.5) che ha prodotto ALLOWED/FORCED.
- **executionRequestId:** eventuale request id dell’esecuzione.
- **resolutionStatus:** ALLOWED | FORCED (o altro se esteso).
- Utilizzo: da una resolution si trovano tutte le azioni eseguite (`readExecutionAuditByResolutionId`); da un’azione si risale alla resolution (`record.resolution`).

---

## 6. Snapshot before/after

- **snapshotBefore:** il chiamante può registrare lo stato rilevante prima di eseguire (es. payload inviato, contesto kill-switch, flags). Non interpretato dal modulo; solo memorizzato.
- **snapshotAfter:** stato dopo (es. risposta adapter, nuovo stato). Utile per differenze e rollback logico.
- Entrambi devono essere **serializzabili** (JSON.stringify-safe) se il log viene persistito o inviato.

---

## 7. Relazione con ExecutionAuditLog

- Il modulo **audit/ExecutionAuditLog** (appendAudit, readAudit) resta il log “minimo” (actionId, type, sourceFeature, requestedAt, result) usato da ExecutionEngine e da getRecentEntries.
- **execution-audit** è il log **esteso** (stesso nucleo + lifecycle trace, resolution, snapshot). Si può:
  - usare solo execution-audit e derivare da esso il feed per getRecentEntries, oppure
  - scrivere su entrambi: appendAudit per compatibilità e appendExecutionAuditRecord per analisi e correlazione.

---

## 8. Riferimenti

- ExecutionResult: ExecutionResult.ts
- Action lifecycle: action-lifecycle.ts, ActionLifecycleAuditEntry
- Resolution: fase-6.5
- ExecutionAuditLog: audit/ExecutionAuditLog.ts
