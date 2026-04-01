# Pre-Execution Validation Pipeline — Fase 7.2a

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/preexecution-validator.ts`

---

## 1. Scopo

Eseguire **tutti i controlli prima dell’esecuzione** in un unico punto: kill-switch, guardrail e coerenza dello stato. La pipeline è **deterministica** e **ordinata**: la prima condizione che fallisce blocca e restituisce fase e motivo; nessun adapter viene invocato.

---

## 2. I tre controlli (ordine)

### 2.1 Kill-switch attivo

- **Cosa:** verifica che l’engine globale e il componente per il tipo di azione siano abilitati nel registry.
- **Fonte:** `context.registry`; `isExecutionEnabled(registry, EXECUTION_ENGINE_COMPONENT_ID)` e `isExecutionEnabled(registry, componentId)` per il tipo (SEND_NOTIFICATION, SCHEDULE_EVENT, …).
- **Effetto:** se uno dei due è disabilitato → **allowed: false**, **phase: KILL_SWITCH**, **reason** testuale (es. "Execution engine disabled", "Action type X disabled").

### 2.2 Guardrail violati

- **Cosa:** esecuzione in sequenza di tutti i **ExecutionGuardrail** configurati; ogni guardrail ha `check(action, context) → ExecutionResult | null`.
- **Effetto:** al primo risultato non null (BLOCKED o SKIPPED) → **allowed: false**, **phase: GUARDRAIL**, **reason** = `result.reason`. Se tutti restituiscono null, si prosegue.

### 2.3 Stato incoerente

- **Cosa:** esecuzione in sequenza di **PreExecutionStateChecker** opzionali: `(action, context) → string | null`. Null = ok; string = motivo di incoerenza.
- **Effetto:** al primo checker che restituisce una stringa → **allowed: false**, **phase: STATE**, **reason** = quella stringa. Utile per validare id, timestamp, campi obbligatori o invarianti di dominio.

---

## 3. Output

**PreExecutionValidationResult:**

- `{ allowed: true }` — tutti i controlli passati; il chiamante può procedere con l’esecuzione (adapter).
- `{ allowed: false, reason: string, phase: PreExecutionBlockPhase }` — blocco con motivo e fase (KILL_SWITCH | GUARDRAIL | STATE).

---

## 4. Integrazione con ExecutionEngine

- L’**ExecutionEngine** oggi applica kill-switch e guardrail al suo interno. La pipeline di pre-validazione **non li sostituisce** obbligatoriamente: può essere usata **a monte** (es. da una pipeline che vuole “solo validare” senza eseguire) o i suoi stessi controlli possono essere **allineati** a quelli dell’engine (stessa logica kill-switch e stessi guardrail).
- Per **unificare**: si può far eseguire all’engine prima `validatePreExecution`; se `allowed: false`, l’engine restituisce un unico `ExecutionResult` BLOCKED con quella reason e audita, senza invocare guardrail né adapter (evitando doppie valutazioni). In alternativa, la pipeline resta uno strumento standalone per “pre-check” e l’engine mantiene la sua sequenza interna.

---

## 5. State checker di default

- **defaultStateCheckers**: lista di checker di base fornita dal modulo.
  - Action `id` non assente e non vuoto.
  - `requestedAt <= context.now` (nessuna azione “nel futuro”).
- Il chiamante può passare **stateCheckers** aggiuntivi (o sostitutivi) in **PreExecutionValidatorOptions** (`stateCheckers` opzionale).

---

## 6. Riferimenti

- Kill-switch: `kill-switch/ExecutionKillSwitch.ts`
- Guardrail: `guardrails/ExecutionGuardrail.ts`, `execution-guardrails.ts`
- ExecutionEngine: `ExecutionEngine.ts`
- ExecutionContext: `ExecutionContext.ts`
