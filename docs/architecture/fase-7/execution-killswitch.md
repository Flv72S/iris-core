# Execution Kill-Switch — Fase 7.3

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/execution-killswitch.ts`

---

## 1. Scopo

Un unico **kill-switch** con tre livelli: **globale**, **per feature**, **per azione**. Un solo livello impostato su OFF blocca l’esecuzione per quella richiesta. Il registry resta unico (`ExecutionKillSwitchRegistry`); le chiavi seguono convenzioni per livello.

---

## 2. I tre livelli (ordine di valutazione)

### 2.1 Kill-switch globale

- **Chiave:** `GLOBAL_KILL_SWITCH_KEY` (= `EXECUTION_ENGINE`).
- **Effetto:** se `registry[EXECUTION_ENGINE] === false` → nessuna azione viene eseguita.
- **Uso:** emergenza, manutenzione, disabilitazione totale dell’engine.

### 2.2 Per feature

- **Chiave:** `FEATURE_KILL_SWITCH_PREFIX + sourceFeature` (es. `"feature:Wellbeing"`).
- **Effetto:** se per quella `sourceFeature` il valore è `false` → tutte le azioni di quella feature sono bloccate.
- **Uso:** disabilitare una singola feature (Wellbeing, Focus, …) senza toccare le altre.  
- **Helper:** `getFeatureKillSwitchKey(sourceFeature)`.

### 2.3 Per azione

Due varianti:

- **Per tipo di azione:** chiave = component ID (`SEND_NOTIFICATION`, `SCHEDULE_EVENT`, `BLOCK_INPUT`, `DEFER_MESSAGE`). Già presente nel registry; se `false` → tutte le azioni di quel tipo sono bloccate.  
- **Per istanza (id):** chiave `ACTION_ID_KILL_SWITCH_PREFIX + actionId` (es. `"actionId:abc-123"`). Se `false` → solo quell’azione è bloccata.  
- **Helper:** `getActionTypeKillSwitchKey(actionType)`, `getActionIdKillSwitchKey(actionId)`.

L’ordine di check unificato è: **globale → feature → tipo azione → id azione**. Il primo che risulta disabilitato blocca e (se si usa `getExecutionBlockReason`) fornisce il motivo.

---

## 3. API

- **isExecutionAllowedForAction(action, registry): boolean**  
  Verifica tutti e quattro i livelli (globale, feature, tipo, id). Restituisce `true` solo se tutti sono abilitati.

- **getExecutionBlockReason(action, registry): string | null**  
  Se l’esecuzione è bloccata, restituisce una reason testuale (es. "Execution engine disabled (global kill-switch)"); altrimenti `null`. Utile per audit e pre-execution validation.

- **Chiavi:** `getFeatureKillSwitchKey`, `getActionTypeKillSwitchKey`, `getActionIdKillSwitchKey` per costruire le chiavi del registry quando si imposta o si legge lo stato.

---

## 4. Registry

- **ExecutionKillSwitchRegistry** = `Record<string, boolean>`.
- Convenzione: `undefined` o assente = abilitato; `false` = disabilitato. Non è richiesto impostare `true` esplicitamente per ogni chiave.
- Il modulo re-esporta `isExecutionEnabled`, i component ID e il tipo `ExecutionKillSwitchRegistry` dal kill-switch esistente per uso unificato.

---

## 5. Integrazione

- **ExecutionEngine** e **preexecution-validator** oggi controllano engine + component ID. Possono essere allineati a `isExecutionAllowedForAction` e `getExecutionBlockReason` per usare un unico punto di verifica (globale + feature + tipo + id).
- Per bloccare una feature: `registry[getFeatureKillSwitchKey('Wellbeing')] = false`.
- Per bloccare un’azione singola: `registry[getActionIdKillSwitchKey(action.id)] = false`.

---

## 6. Riferimenti

- Registry e component ID: `kill-switch/ExecutionKillSwitch.ts`
- ExecutionAction: `ExecutionAction.ts`
- Pre-execution: `preexecution-validator.ts`
