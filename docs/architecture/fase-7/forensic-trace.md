# Forensic Execution Trace — Fase 7.4a

**Status:** Engineering specification  
**Implementazione:** `src/core/execution/forensic-trace.ts`

---

## 1. Scopo

Costruire un **replay verificabile completo**: una traccia immutabile per ogni esecuzione che contiene **input completo**, **output** e **fingerprint** per l’integrità. Da una trace si può riprodurre l’esecuzione (replay) e verificare che il risultato coincida; il fingerprint permette di accorgersi di alterazioni del record.

---

## 2. Contenuto della trace

**ForensicTraceEntry** è un record immutabile con:

- **traceId:** identificatore univoco della traccia (es. intentId + timestamp o UUID).
- **intent:** `ActionIntent` completo (intentId, resolutionId, resolutionStatus, executionRequestId, actionType, payload, sourceFeature, requestedAt, idempotencyKey). È l’**input** necessario per rieseguire.
- **resolutionSnapshot:** `ResolutionResultSnapshot` (resolutionId, status, executionRequestId) — provenienza della decisione (Fase 6.5).
- **contextSnapshot:** `ForensicContextSnapshot` (now, registry, wellbeingBlocked) — stato del contesto al momento dell’esecuzione, serializzabile, per **replay deterministico** (stesso contesto → stesso comportamento atteso).
- **lifecycleTrace:** opzionale; sequenza di transizioni di lifecycle (planned → executing → …) al momento del record.
- **result:** `ExecutionResult` — **output** dell’esecuzione (EXECUTED | SKIPPED | BLOCKED).
- **snapshotBefore / snapshotAfter:** opzionali; snapshot stato prima/dopo (serializzabili).
- **recordedAt:** timestamp di registrazione.
- **traceFingerprint:** opzionale; hash/codice del payload canonico (senza questo campo), per **verifica integrità**.

---

## 3. Replay verificabile

- **Replay:** dato una `ForensicTraceEntry`, si può:
  1. Usare `intent` e `contextSnapshot` come input a un esecutore (stesso engine/executor e stesse guardrail).
  2. Eseguire e ottenere un `ExecutionResult`.
  3. Confrontare il risultato con `entry.result` (stesso status e, se EXECUTED, stesso executedAt o invarianti rilevanti).
- **Determinismo:** con stesso intent e stesso contextSnapshot, l’esecuzione dovrebbe produrre lo stesso result; la trace fissa intent e contesto così che il replay sia riproducibile.

---

## 4. Verifica integrità (fingerprint)

- **Payload canonico:** `canonicalPayloadForVerification(entry)` restituisce un oggetto con tutti i campi della trace **eccetto** `traceFingerprint`. Serializzando questo oggetto in modo deterministico (es. `JSON.stringify` con chiavi ordinate), si ottiene un payload su cui calcolare un hash (es. SHA-256).
- **All’append:** il chiamante può calcolare `fingerprint = hash(JSON.stringify(canonicalPayloadForVerification(entry)))`, assegnarlo a `entry.traceFingerprint` e poi chiamare `appendForensicTrace(entry)`.
- **In verifica:** si rilegge la trace, si ricalcola il fingerprint dal payload canonico; `verifyTraceIntegrity(entry, expectedFingerprint)` confronta `entry.traceFingerprint` con il fingerprint atteso. Se `traceFingerprint` non è presente, la funzione ritorna true (nessuna verifica richiesta).

---

## 5. API

- **appendForensicTrace(entry):** aggiunge una `ForensicTraceEntryInput` al log (append-only, record frozen).
- **readForensicTrace():** restituisce tutte le tracce in ordine di append.
- **readForensicTraceByIntentId(intentId):** restituisce la prima trace con quell’intentId, o null.
- **readForensicTraceByResolutionId(resolutionId):** restituisce tutte le tracce per quella resolution.
- **readForensicTraceByTraceId(traceId):** restituisce la trace con quel traceId, o null.
- **canonicalPayloadForVerification(entry):** payload senza fingerprint per calcolo hash.
- **verifyTraceIntegrity(entry, expectedFingerprint):** true se non c’è fingerprint o se coincide con expectedFingerprint.

---

## 6. Relazione con Execution Audit

- **execution-audit** (Fase 7.4) registra record di audit con resolution, lifecycle, snapshot; è orientato a “chi ha fatto cosa e quando”.
- **forensic-trace** è orientato a **replay e verifica**: input completo (intent + contextSnapshot), output (result), e fingerprint. Una stessa esecuzione può essere registrata sia in execution-audit sia in forensic-trace; la trace può essere costruita a partire da dati già presenti nell’audit (intent, result, snapshot) arricchiti con resolutionSnapshot e contextSnapshot.

---

## 7. Riferimenti

- ActionIntent: action-intent.ts
- ExecutionPlan / ResolutionResultSnapshot: execution-plan.ts
- ExecutionResult: ExecutionResult.ts
- LifecycleTrace: execution-audit.ts
- Execution Audit: execution-audit.md
