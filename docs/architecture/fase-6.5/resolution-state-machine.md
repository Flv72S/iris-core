# Resolution State Machine (Fase 6.5)

**Status:** Engineering specification  
**Determinism:** Mandatory. No backtracking. Early termination.

---

## 1. Scopo

La macchina a stati di risoluzione determina un **ResolutionStatus** univoco a partire da una sequenza ordinata di **AuthorityDecision**. Non esegue azioni; produce solo status e metadati per audit e explainability.

---

## 2. Stati formali

Stati della macchina durante la scansione delle authority:

| Stato | Significato |
|-------|-------------|
| `PENDING` | Risoluzione iniziata; nessuna decisione non-ALLOWED ancora incontrata. |
| `BLOCKED` | Incontrata almeno una decisione BLOCKED; risoluzione terminata (terminal). |
| `FORCED` | Incontrata almeno una decisione FORCED; risoluzione terminata (terminal). |
| `SUSPENDED` | Incontrata almeno una decisione SUSPENDED; risoluzione terminata (terminal). |
| `ALLOWED` | Tutte le decisioni esaminate sono ALLOWED; risoluzione terminata (terminal). |

Stati **terminali**: `ALLOWED`, `BLOCKED`, `FORCED`, `SUSPENDED`. Una volta raggiunti, nessuna transizione successiva.

---

## 3. Eventi

Unico tipo di evento: **consumo della prossima AuthorityDecision** in ordine di indice.

```ts
type ResolutionEvent = {
  readonly type: 'AUTHORITY_DECISION';
  readonly index: number;
  readonly decision: AuthorityDecision;
};
```

La macchina non riceve eventi da fuori (no timer, no I/O). La “sequenza eventi” è l’iterazione ordinata su `context.authorityDecisions`.

---

## 4. Tabella di transizione

Stato corrente → evento (decision.status) → nuovo stato.

| Stato corrente | decision.status | Nuovo stato |
|----------------|------------------|-------------|
| PENDING        | ALLOWED          | PENDING (continua) o ALLOWED (se fine lista) |
| PENDING        | BLOCKED          | BLOCKED     |
| PENDING        | FORCED           | FORCED      |
| PENDING        | SUSPENDED        | SUSPENDED   |
| ALLOWED        | *                | (nessuna; già terminale) |
| BLOCKED        | *                | (nessuna)   |
| FORCED         | *                | (nessuna)   |
| SUSPENDED      | *                | (nessuna)   |

**Regola di precedenza:** il primo status non-ALLOWED (in ordine di authority) determina lo stato finale. Nessun override da decisioni successive.

---

## 5. Principi

- **Terminalità anticipata:** alla prima decisione BLOCKED/FORCED/SUSPENDED la macchina passa allo stato terminale corrispondente e non considera le restanti authority.
- **Assenza di backtracking:** nessuna revisione di decisioni già considerate; scansione strettamente sequenziale.
- **Precedenza gerarchica:** l’ordine delle authority è fissato da `AUTHORITY_SOURCE_ORDER`; la prima che “vince” (non-ALLOWED) è la winning authority.

---

## 6. Pseudocodice deterministico

```
function resolve(context: ResolutionContext): ResolutionResult
  decisions := context.authorityDecisions
  resolvedAt := context.now

  for i := 0 to length(decisions) - 1 do
    d := decisions[i]
    if d.status = BLOCKED then
      return buildResult(context, BLOCKED, d, i, resolvedAt)
    if d.status = FORCED then
      return buildResult(context, FORCED, d, i, resolvedAt)
    if d.status = SUSPENDED then
      return buildResult(context, SUSPENDED, d, i, resolvedAt)
    // d.status = ALLOWED: continue
  end for

  return buildResult(context, ALLOWED, null, null, resolvedAt)
end function
```

`buildResult` costruisce `ResolutionResult` con `winningAuthorityId` e `winningRuleId` dalla decisione `d` (o null se ALLOWED), e compila `ResolutionAuditEntry` incluso `decisionsSnapshot` e `payloadHash`.

---

## 7. Mapping decision.status → ResolutionStatus

| AuthorityDecision.status | ResolutionResult.status |
|--------------------------|-------------------------|
| ALLOWED                  | (nessun cambio; continua o finale ALLOWED) |
| BLOCKED                  | BLOCKED                 |
| FORCED                   | FORCED                  |
| SUSPENDED                | SUSPENDED               |

Se tutte le decisioni sono ALLOWED → ResolutionStatus = `ALLOWED`.

---

## 8. Esempi di trace

**Trace 1 — BLOCKED da WELLBEING (indice 0):**

- PENDING → legge decisions[0]: WELLBEING, BLOCKED → BLOCKED (terminale).
- winningAuthorityId = WELLBEING, winningRuleId = e.g. "wellbeing-protection".

**Trace 2 — ALLOWED:**

- PENDING → decisions[0..3] tutti ALLOWED → ALLOWED (terminale).
- winningAuthorityId = null, winningRuleId = null.

**Trace 3 — BLOCKED da USER_PREFERENCE (indice 3):**

- PENDING → decisions[0] ALLOWED → PENDING
- PENDING → decisions[1] ALLOWED → PENDING
- PENDING → decisions[2] ALLOWED → PENDING
- PENDING → decisions[3] BLOCKED → BLOCKED (terminale).
- winningAuthorityId = USER_PREFERENCE, winningRuleId = e.g. "feature-opt-out".

---

## 9. Proprietà verificabili

| Proprietà | Verifica |
|-----------|----------|
| **Test deterministici** | Per un `ResolutionContext` fissato (incluso `authorityDecisions` e `now`), `resolve(context)` è idempotente: N invocazioni → stesso `ResolutionResult` e stesso `payloadHash`. |
| **Replay** | Dato `ResolutionAuditEntry.decisionsSnapshot` e `resolutionId`/`featureId`/`resolvedAt`, si può ricostruire un contesto equivalente e ri-eseguire la risoluzione; il risultato deve coincidere. |
| **Audit post-mortem** | Ogni risoluzione produce esattamente una `ResolutionAuditEntry` append-only; `payloadHash` permette di validare integrità del payload. |

---

## 10. Riferimenti

- Data model: `resolution-engine-data-model.md`
- Authority order: `authority-hierarchy-spec.md`
- Audit e hashing: `resolution-audit-spec.md`
- Casi di test: `resolution-test-cases.md`
