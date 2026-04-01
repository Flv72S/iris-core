# Resolution Audit (Fase 6.5)

**Status:** Engineering specification  
**Purpose:** Append-only format, deterministic hashing, correlation with Execution ID.

---

## 1. Formato append-only

Ogni risoluzione produce **esattamente una** entry di audit. Le entry sono append-only: nessuna modifica o cancellazione dopo l'append. L'ordine di append corrisponde all'ordine temporale di risoluzione (ordinamento per `resolvedAt` e/o `resolutionId` se necessario).

---

## 2. Struttura entry

Ogni entry è un **ResolutionAuditEntry** (vedi resolution-engine-data-model.md):

- resolutionId
- featureId
- executionRequestId (null se non correlata a una richiesta di execution)
- status (ALLOWED | BLOCKED | FORCED | SUSPENDED)
- winningAuthorityId
- winningRuleId
- reason
- resolvedAt
- decisionsSnapshot (array ordinato di AuthorityDecisionSnapshot)
- payloadHash

---

## 3. Hashing deterministico

- **Algoritmo:** SHA-256 (o altro algoritmo deterministico fissato).
- **Input:** JSON canonico dell'entry. Canonical = chiavi in ordine lessicografico, nessuno spazio superfluo, encoding UTF-8.
- **Output:** payloadHash (stringa esadecimale 64 caratteri).

Lo stesso payload produce sempre lo stesso hash. Utilizzo: integrità, replay, certificazione determinismo (Fase 13).

---

## 4. Correlazione con Execution ID

- Se la risoluzione è richiesta nel contesto di una **Execution Request** (Fase 7), il caller deve fornire `executionRequestId` nel ResolutionContext.
- `executionRequestId` è copiato in ResolutionResult.auditEntry.executionRequestId.
- Permette: trace da execution → resolution e da resolution → execution; audit post-mortem correlato.

---

## 5. Nessuna aggregazione

L'audit non prevede aggregazioni (conteggi, medie, rollup) a livello di specifica. Solo append di entry atomiche. Eventuali report aggregati sono fuori scope del Resolution Engine e vanno definiti a parte (es. Fase 10 Explainability o tooling di analisi).

---

## 6. Reset

Nessun reset in produzione. Reset consentito **solo** in contesto test (es. _resetResolutionAuditForTest()) per isolare test e replay.

---

## 7. Riferimenti

- Data model: resolution-engine-data-model.md
- Test e replay: resolution-test-cases.md
