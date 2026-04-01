# Phase 8 — Safety Checklist

## 1. Scopo della Safety Checklist

La **Safety Checklist** è un meccanismo di **certificazione tecnica** per la Phase 8 (Feedback Loop). Serve a attestare **ex-ante** e **ex-post** che ogni microstep della Phase 8:

- non viola i confini di Phase 7
- non introduce learning implicito
- non muta stato globale, preferenze o Signal Layer
- rimane deterministico, auditabile e reversibile
- rispetta i requisiti di isolamento architetturale

La checklist **non blocca l’esecuzione** (non è un guardrail runtime), **non modifica codice esistente** e **non introduce dipendenze** con Phase 7 o Phase 9. È **senza side-effect**: riceve input espliciti (report, metadati) e restituisce un risultato immutabile e deterministico.

---

## 2. Differenza tra i concetti

| Concetto | Ruolo | Quando |
|--------|--------|--------|
| **Guardrail (runtime)** | Controllo attivo che può bloccare o correggere l’esecuzione. | Durante l’esecuzione. |
| **Boundary Attestation (Phase 7)** | Verifica che il runtime Phase 7 non scriva su Signal Layer, non muti preferenze e non attivi learning. Produce un **report** (Phase7BoundaryReport). | Dopo un run rappresentativo del runtime Phase 7 (es. in test o in staging). |
| **Safety Checklist (Phase 8)** | Certificazione che i dati e i metadati usati in Phase 8 rispettano i vincoli di sicurezza. **Non** modifica l’esecuzione; valida report e metadati già prodotti. | Prima/dopo microstep Phase 8; può consumare il report Phase 7.F e metadati di esecuzione/replay. |

In sintesi: il **Guardrail** agisce a runtime; la **Boundary Attestation** certifica Phase 7 e produce un report; la **Safety Checklist** certifica che Phase 8 rispetta i vincoli usando quel report e i metadati di esecuzione.

---

## 3. Come usarla nei microstep futuri

- **Input:**  
  - `checklistVersion`, `timestamp` (iniettati, no `Date.now()`).  
  - `boundaryReport`: oggetto che rispetta il contratto `Phase7BoundaryReport` (es. output della Boundary Attestation Phase 7.F).  
  - `executionMetadata`: `Phase8ExecutionMetadata` (determinismo e stato).  
  - `replayResult` (opzionale): esito di un eventuale replay.

- **Chiamata:**  
  `runSafetyChecklist({ checklistVersion, timestamp, boundaryReport, executionMetadata, replayResult })`

- **Output:**  
  `SafetyChecklistResult` (readonly, frozen) con `results` (una entry per ogni check) e `fullySafe`.

- **Sintesi:**  
  `summarizeSafetyChecklist(result)` restituisce `{ fullySafe, failedChecks }`.

Nei microstep successivi della Phase 8 (persistence, aggregation, policy): dopo aver ottenuto o simulato boundary report e metadati, eseguire la checklist e usare `fullySafe` e `failedChecks` per certificazione o audit, senza usare la checklist per bloccare il flusso.

---

## 4. Significato tecnico di `fullySafe === true`

`fullySafe === true` significa che **tutte** le check della checklist sono passate:

- **NO_SIGNAL_LAYER_WRITE** — Nessuna scrittura sulla Signal Layer (da boundary report).
- **NO_PREFERENCE_MUTATION** — Nessuna mutazione delle preferenze (da boundary report).
- **NO_IMPLICIT_LEARNING** — Nessun learning implicito attivato (da boundary report).
- **DETERMINISTIC_OUTPUT** — Esecuzione Phase 8 considerata deterministica (da execution metadata).
- **REPLAY_SAFE** — Se è stato fornito un replay, è andato a buon fine e il match è deterministico; altrimenti la check è considerata non applicabile e passa.
- **STATE_ISOLATED** — Nessuna mutazione di stato globale (stateMutations === 0).
- **PHASE_7_BOUNDARY_PRESERVED** — Il boundary report Phase 7 attesta che Phase 7 è fully certified.

È una **certificazione tecnica** sull’input fornito alla checklist, non una garanzia sul comportamento del sistema in ogni possibile contesto. Per un’attestazione completa vanno combinati Boundary Attestation (Phase 7), Safety Checklist (Phase 8) e processi di rilascio e audit.
