# Resolution Engine — Specifica implementativa (Microstep 6.5.2)

**Status:** Engineering specification  
**Implementazione:** `src/core/resolution/resolution-engine.ts` + `resolution-context.ts`

---

## 1. Invarianti formali

| Invariante | Definizione |
|------------|-------------|
| **Ordine** | `context.authorityDecisions` è ordinato secondo `AUTHORITY_SOURCE_ORDER`. Il motore non riordina; il caller garantisce l'ordine. |
| **Unicità** | Per ogni `ResolutionContext` C, `resolve(C)` produce un unico `ResolutionResult` R (determinismo). |
| **Terminalità** | La prima decisione con `status !== ALLOWED` determina `R.status` e `R.winningAuthorityId`; le decisioni successive non sono lette. |
| **Immutabilità** | Nessuna mutazione di `context` o delle decisioni; nessuna mutazione di stato globale. |
| **No clock** | Il valore `resolvedAt` è esclusivamente `context.now`. Nessuna lettura di `Date.now()` o altro clock runtime. |

---

## 2. Proprietà di purezza

- **Funzione pura:** `resolve(context)` dipende solo da `context`. Stesso input (per valore) → stesso output. Nessun I/O, nessun servizio esterno, nessun LLM.
- **Input snapshot immutabili:** `ResolutionContext` e `authorityDecisions` sono tipi read-only; il contratto richiede che il caller passi snapshot immutabili (es. `Object.freeze`).
- **Output immutabile:** `ResolutionResult` e `ResolutionAuditEntry` sono restituiti come oggetti congelati; nessun riferimento mutabile esposto.
- **Idempotenza:** N invocazioni `resolve(C)` con lo stesso C producono N risultati identici (stesso `status`, stesso `payloadHash`).

---

## 3. Replay deterministico

- **Input per replay:** `ResolutionAuditEntry.decisionsSnapshot` + `resolutionId` + `featureId` + `resolvedAt` (e opzionalmente `executionRequestId`) consentono di ricostruire un `ResolutionContext` equivalente (stesse decisioni, stesso now).
- **Verifica:** Rieseguendo `resolve(C_replay)` con tale contesto si deve ottenere lo stesso `ResolutionResult.status`, `winningAuthorityId`, `winningRuleId` e lo stesso `auditEntry.payloadHash` (a parità di algoritmo di hash).
- **Hash:** `payloadHash` è calcolato su un payload canonico (chiavi ordinate, assenza di `payloadHash` dal payload stesso). Stesso payload → stesso hash. Utilizzo: Fase 13 (Determinism Certification), integrità audit.

---

## 4. Integrazione con Explainability (Fase 10)

La spiegazione di una risoluzione è **solo dati strutturati**; nessuna generazione narrativa.

- **Fonte:** `ResolutionResult.winningAuthorityId`, `ResolutionResult.winningRuleId`, `ResolutionResult.reason`.
- **Uso:** Il modulo Explainability (Fase 10) legge questi campi e li mappa su rappresentazioni utente (es. label, messaggio predefinito). Non genera testo da LLM; non inventa cause.
- **Tracciabilità:** `auditEntry.decisionsSnapshot` fornisce l’intera sequenza di decisioni in ordine; per ogni step è noto chi ha deciso e con quale rule/reason.

---

## 5. Integrazione con Fase 7 (Execution Runtime)

- **Input:** Execution Runtime riceve `ResolutionResult` (o almeno `result.status`).
- **Regola:** Solo `status === 'ALLOWED'` o `status === 'FORCED'` abilitano l’esecuzione dell’azione. `BLOCKED` e `SUSPENDED` impediscono l’esecuzione.
- **Correlazione:** `resolutionId` e `executionRequestId` (se presenti) consentono di collegare audit di risoluzione e audit di execution.

---

## 6. Riferimenti

- Data model: `resolution-engine-data-model.md`
- State machine: `resolution-state-machine.md`
- Authority order: `authority-hierarchy.md`, `authority-sources.ts`
- Audit e hashing: `resolution-audit-spec.md`
