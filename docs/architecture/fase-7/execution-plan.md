# Execution Plan — Fase 7.1a

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/execution-plan.ts`

---

## 1. Scopo

Traduce **ResolutionResult** (o uno snapshot) in una **lista ordinata di ActionIntent**. Nessuna logica cognitiva: solo regole deterministiche, priorità esplicite e batching sicuro.

---

## 2. Input

- **ResolutionResultSnapshot:** `resolutionId`, `status`, `executionRequestId` (opzionale). Estratto da ResolutionResult (Fase 6.5).
- **CandidateAction[]:** azioni candidate con `actionType`, `payload`, `sourceFeature`, `requestedAt`, `idempotencyKey?`, `priority?`.
- **ExecutionPlanOptions:** `maxIntents?` (default 64) per batching sicuro.

---

## 3. Ordine deterministico

1. **Filtro risoluzione:** Se `status` non è `ALLOWED` o `FORCED` → piano vuoto (`intents: []`).
2. **Priorità:** Per ogni candidato, priorità = `candidate.priority` se presente, altrimenti `DEFAULT_ACTION_TYPE_PRIORITY[actionType]`. Valori attuali: SEND_NOTIFICATION=10, SCHEDULE_EVENT=20, BLOCK_INPUT=30, DEFER_MESSAGE=40 (minore = prima).
3. **Ordinamento:** Ordine lessicografico su `(priority, sourceFeature, requestedAt, index)` così che stesso input produca sempre la stessa sequenza.
4. **Batching:** Si prendono al più `maxIntents` intent (default 64). Nessun overflow; lista limitata.

Stesso `resolution` + stesso `candidates` + stesse `options` → stesso `ExecutionPlan.intents` (determinismo).

---

## 4. Batching sicuro

- **maxIntents:** Limite superiore al numero di ActionIntent nel piano. Evita liste illimitate e carichi eccessivi.
- Nessun raggruppamento “intelligente”: solo troncamento dopo l’ordinamento. L’ordine è fissato dalle priorità esplicite.

---

## 5. Priorità esplicite

- Il caller può impostare `priority` su ogni **CandidateAction**. Se assente, si usa **DEFAULT_ACTION_TYPE_PRIORITY** per quel `actionType`.
- Nessuna inferenza: nessun adattamento dinamico, nessun learning. Solo valori forniti o costanti.

---

## 6. Formato output

**ExecutionPlan:** `{ readonly intents: readonly ActionIntent[] }`.

Ogni **ActionIntent** ha:
- `intentId` deterministico: `resolutionId:index:sourceFeature:requestedAt`
- `resolutionId`, `resolutionStatus` (ALLOWED o FORCED), `executionRequestId` dallo snapshot
- `actionType`, `payload`, `sourceFeature`, `requestedAt`, `idempotencyKey` dal candidato

---

## 7. Nessuna logica cognitiva

- Nessun punteggio, nessuna stima, nessun ML.
- Ordinamento solo su campi espliciti (priority, sourceFeature, requestedAt, index).
- Piano vuoto solo se lo status di risoluzione non è eseguibile.

---

## 8. Riferimenti

- ActionIntent: action-intent.ts
- Resolution: fase-6.5 (ResolutionResult)
- Execution engine: execution-engine.md
