# Execution Guardrails — Fase 7.2

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/execution-guardrails.ts`

---

## 1. Scopo

Formalizzare i controlli che **limitano o bloccano** l’esecuzione di azioni prima dell’invio agli adapter. Quattro concetti: **rate limits**, **cooldown**, **budget di azioni**, **abort conditions**. Config immutabili, check deterministici, integrazione con `ExecutionEngine` e `ExecutionContext`.

---

## 2. I quattro concetti

### 2.1 Rate limits

- **Definizione:** al più **N azioni** (richieste) in una **finestra temporale** (es. 10 minuti).
- **Effetto:** se nella finestra ci sono già ≥ N richieste → **BLOCKED** (non si conta l’azione corrente).
- **Config:** `RateLimitSpec`: `id`, `maxActions`, `windowMs`.
- **Mappatura:** corrisponde al guardrail esistente `MaxActionsPerWindowGuardrail`; la versione formalizzata è `checkRateLimit(spec, action, context)`.

### 2.2 Cooldown

- **Definizione:** la **stessa fonte** (es. `sourceFeature`) non può eseguire di nuovo prima di **X ms** dall’ultima esecuzione effettiva (EXECUTED).
- **Effetto:** se c’è già un’esecuzione della stessa fonte nella finestra di cooldown → **SKIPPED** (non BLOCKED, per permettere altre fonti).
- **Config:** `CooldownSpec`: `id`, `cooldownMs`.
- **Mappatura:** corrisponde a `CooldownPerFeatureGuardrail`; formalizzato in `checkCooldown(spec, action, context)`.

### 2.3 Budget di azioni

- **Definizione:** **tetto totale** di azioni **eseguite con successo** (EXECUTED) in una finestra (es. 100 azioni in 24 h).
- **Effetto:** se le esecuzioni nella finestra hanno già raggiunto il tetto → **BLOCKED**.
- **Config:** `ActionBudgetSpec`: `id`, `totalBudget`, `windowMs`.
- **Differenza da rate limit:** il rate limit conta tutte le richieste nella finestra; il budget conta solo le esecuzioni effettive (EXECUTED). Utile per “cap per sessione/giorno”.

### 2.4 Abort conditions

- **Definizione:** predicati sul **solo contesto** (nessun dato dell’azione). Se una condizione è vera → esecuzione **BLOCKED** con una reason fissa.
- **Effetto:** prima condizione vera blocca; ordine di valutazione definito dalla lista.
- **Config:** `AbortConditionSpec`: `id`, `check(context)`, `reason`.
- **Mappatura:** corrisponde a `WellbeingBlockGuardrail` (es. `context.wellbeingBlocked`). Formalizzato in `checkAbortConditions(conditions, context)`; condizione predefinita: `WELLBEING_ABORT_CONDITION`.

---

## 3. Integrazione nel flusso di esecuzione

- **ExecutionEngine** esegue una sequenza di **ExecutionGuardrail** prima di chiamare gli adapter.
- Ogni guardrail ha `check(action, context) → ExecutionResult | null`. Il primo risultato non null (BLOCKED o SKIPPED) viene restituito e auditatato; nessun adapter viene invocato.
- Il modulo `execution-guardrails.ts` fornisce:
  - **Spec immutabili** per rate limit, cooldown, budget, abort.
  - **Funzioni pure** `checkRateLimit`, `checkCooldown`, `checkActionBudget`, `checkAbortConditions`.
  - **createGuardrailFromSpecs(specs)** che costruisce un unico **ExecutionGuardrail** applicando in ordine: **abort → rate limit → cooldown → action budget** (prima restrizione vince).

Si può quindi:
- usare i guardrail esistenti (`WellbeingBlockGuardrail`, `MaxActionsPerWindowGuardrail`, `CooldownPerFeatureGuardrail`) come oggi, oppure
- sostituirli con un unico guardrail creato da `createGuardrailFromSpecs(ExecutionGuardrailSpecs)` con parametri configurabili.

---

## 4. ExecutionContext

I check usano solo:
- `context.now` (timestamp corrente)
- `context.getRecentEntries()` (azioni recenti con `actionId`, `sourceFeature`, `requestedAt`, `result.status`)
- `context.wellbeingBlocked` (per la condizione di abort wellbeing)

Nessuna modifica al contesto; nessun side-effect nelle funzioni di check.

---

## 5. Esiti (ExecutionResult)

- **BLOCKED:** l’azione non viene eseguita; motivo esplicito (rate limit, budget esaurito, abort condition).
- **SKIPPED:** l’azione non viene eseguita per policy “soft” (es. cooldown sulla stessa feature); motivo esplicito.
- **null:** nessuna restrizione; l’engine può procedere al guardrail successivo o all’adapter.

---

## 6. Default e estensibilità

- **Default spec** (valori di esempio): `DEFAULT_RATE_LIMIT_SPEC`, `DEFAULT_COOLDOWN_SPEC`, `DEFAULT_ACTION_BUDGET_SPEC`; abort: `WELLBEING_ABORT_CONDITION`.
- Nuove **AbortConditionSpec** possono essere aggiunte alla lista (es. kill-switch globale, flag di manutenzione) senza cambiare la firma del check; basta estendere `ExecutionGuardrailSpecs.abortConditions`.

---

## 7. Riferimenti

- ExecutionGuardrail: `guardrails/ExecutionGuardrail.ts`
- ExecutionEngine: `ExecutionEngine.ts`, `execution-engine.md`
- ExecutionContext: `ExecutionContext.ts`
- ExecutionResult: `ExecutionResult.ts`
