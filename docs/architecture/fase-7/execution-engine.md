# Execution Engine Core — Fase 7.1

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/action-intent.ts`, `execution-engine-core.ts`, `domain-executors/`

---

## 1. ActionIntent formale

**ActionIntent** è l’unico input ammesso per l’esecuzione quando autorizzata dalla risoluzione.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| intentId | string | Identificatore univoco dell’intent |
| resolutionId | string | Id della risoluzione che ha autorizzato (correlazione Fase 6.5) |
| resolutionStatus | 'ALLOWED' \| 'FORCED' | Solo questi due valori abilitano l’esecuzione |
| executionRequestId | string \| null | Correlazione con richiesta di execution (Fase 7) |
| actionType | ExecutionActionType | SEND_NOTIFICATION \| SCHEDULE_EVENT \| BLOCK_INPUT \| DEFER_MESSAGE |
| payload | unknown | Payload immutabile per l’azione |
| sourceFeature | string | Feature che ha richiesto l’azione |
| requestedAt | number | Timestamp di richiesta |
| idempotencyKey | string \| null | Chiave per idempotenza e replay |

Regola: **ActionIntent va costruito solo quando ResolutionResult.status è ALLOWED o FORCED.** L’engine verifica di nuovo lo status e rifiuta l’esecuzione se non eseguibile.

---

## 2. Mapping Resolution → Execution

| ResolutionResult.status | Comportamento engine |
|------------------------|----------------------|
| ALLOWED | Esecuzione consentita; delega al domain executor |
| FORCED | Esecuzione consentita; delega al domain executor |
| BLOCKED | Nessuna esecuzione; risultato BLOCKED con reason da resolution |
| SUSPENDED | Nessuna esecuzione; risultato BLOCKED |

L’engine **non** decide in autonomia: accetta solo intent già autorizzati e al massimo verifica kill-switch e idempotenza.

---

## 3. Domain executors

Ogni **DomainExecutor** gestisce un solo `actionType` ed esegue un’**azione atomica**: esito EXECUTED / SKIPPED / BLOCKED senza stati intermedi osservabili.

- **NotificationDomainExecutor:** SEND_NOTIFICATION  
- **CalendarDomainExecutor:** SCHEDULE_EVENT  
- **BlockInputDomainExecutor:** BLOCK_INPUT  
- **DeferMessageDomainExecutor:** DEFER_MESSAGE  

L’executor riceve **ActionIntent** e **now**; restituisce **ExecutionResult**. Nessuna lettura di contesto esterno oltre quelli passati; stesso intent + stesso now → stesso result (determinismo).

---

## 4. Failure semantics

| Esito | Significato |
|-------|-------------|
| EXECUTED | Azione eseguita; executedAt registrato |
| SKIPPED | Non eseguita (es. idempotenza: già eseguita per quella idempotencyKey) |
| BLOCKED | Esecuzione non consentita (resolution, kill-switch, o nessun executor) |

Nessun retry automatico dall’engine. Eventuali retry devono essere deterministici e gestiti dal caller (stesso intent, stesso idempotencyKey).

---

## 5. Retry deterministico

- **IdempotencyKey:** Se presente, l’engine (con IdempotencyStore) considera l’intent già eseguito dopo il primo EXECUTED e le successive chiamate con la stessa key restituiscono SKIPPED ("Idempotency: already executed").
- **Replay:** Rieseguire con lo stesso ActionIntent (stesso intentId/idempotencyKey) e stesso now produce lo stesso ExecutionResult; con idempotency store la prima run può essere EXECUTED, le successive SKIPPED.
- Nessun backoff, nessun numero di tentativi dentro l’engine: il retry è esterno e deterministico.

---

## 6. Idempotenza obbligatoria

- L’engine supporta un **IdempotencyStore** opzionale: `has(key)`, `add(key)`.
- Dopo un esito EXECUTED, se `intent.idempotencyKey` è non null, viene registrato nello store. Le chiamate successive con la stessa key danno SKIPPED senza invocare l’executor.
- Per replay e certificazione (Fase 13) è necessario che stesso intent (stessa idempotencyKey) non venga eseguito più di una volta a meno che non si voglia “replay” (stesso risultato o SKIPPED).

---

## 7. Compatibilità audit (Fase 13)

- Ogni esecuzione (o rifiuto) produce una voce in **ExecutionAuditLog** (actionId, type, sourceFeature, requestedAt, result).
- resolutionId e executionRequestId sono nell’ActionIntent; possono essere inclusi in log o tracciabilità esterne per correlare Resolution (Fase 6.5) e Execution (Fase 7).
- Replay: stessi intent + stesso contesto (now, idempotency store) → stesso risultato e stesso flusso di audit.

---

## 8. Riferimenti

- Resolution: docs/architecture/fase-6.5 (resolution-engine-data-model, resolution-state-machine)
- ActionIntent: action-intent.ts
- Domain executors: domain-executors/
- Audit: audit/ExecutionAuditLog.ts
