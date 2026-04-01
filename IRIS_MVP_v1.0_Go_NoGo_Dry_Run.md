## IRIS — MVP v1.0 GO / NO-GO Dry Run (Documento Operativo)

## 1. Scopo del Dry Run

Questo Dry Run:
- **non rilascia nulla**;
- simula il **release day** seguendo il playbook operativo;
- verifica **processi e controlli**, non introduce nuove feature;
- produce una decisione formale **GO / NO-GO** basata sui criteri esistenti.

Fonti vincolanti:
- `IRIS_MVP_v1.0_Release_Criteria.md`
- `IRIS_MVP_v1.0_Release_Playbook.md`
- `IRIS_MVP_v1.0_Roadmap.md`
- STEP 6A / 6B / 6C — Deployment & Preview
- STEP 7A / 7B / 7C — Governance & Activation

Regola: questo documento **non introduce nuove regole**. Formalizza ed esegue quelle sopra.

---

## 2. Quando eseguire il Dry Run

### 2.1 Finestra consigliata
- Eseguire il Dry Run in finestra **T‑7 giorni** rispetto al primo rilascio pubblico.

### 2.2 Condizioni minime per avviarlo
- Build riproducibile disponibile (artefatti di deploy già definiti).
- Accesso all’ambiente target (preview / staging) garantito.
- Variabili di ambiente complete e validate (fail‑fast attivo).

### 2.3 Prerequisiti obbligatori
- `IRIS_MVP_v1.0_Release_Criteria.md` disponibile e compilabile.
- `IRIS_MVP_v1.0_Release_Playbook.md` disponibile (questa simulazione lo ripercorre integralmente).
- Feature flags e preview controls configurabili via env (nessuna mutazione runtime).
- Log strutturati in stdout e correlazione attiva.

---

## 3. Ruoli coinvolti

### 3.1 Dry Run Owner
- Approva lo scope del Dry Run e la configurazione.
- Conduce la decisione **GO / NO-GO** del Dry Run.
- Garantisce coerenza con Release Criteria e Roadmap.

### 3.2 Technical Executor
- Esegue le azioni simulate del playbook (build/deploy/check/rollback).
- Raccoglie evidenze (output comandi, health/readiness, log).
- Non modifica codice o semantica durante il Dry Run.

### 3.3 Observer / Notetaker
- Monitora log e segnali runtime.
- Registra timeline e anomalie.
- Produce la sezione “Problemi riscontrati” e la matrice decisionale.

Regola: le responsabilità non si sovrappongono anche se il ruolo è svolto dalla stessa persona.

---

## 4. Setup iniziale

### 4.1 Ambiente target
Selezionare uno e uno solo:
- [ ] Preview
- [ ] Staging

### 4.2 Checklist di preparazione

| Item | Stato (PASS/FAIL) | Evidenza (link / output / nota) |
|---|---|---|
| Ambiente target disponibile | FAIL | |
| Env file / env runtime completi | FAIL | |
| Config validation fail‑fast attiva | FAIL | |
| Preview mode configurata correttamente | FAIL | |
| Preview access token disponibile (se preview) | FAIL | |
| Feature flags impostati come da MVP v1.0 | FAIL | |
| Logging strutturato attivo | FAIL | |
| correlationId presente nei log | FAIL | |
| `/health` risponde 200 | FAIL | |
| `/ready` risponde secondo stato atteso | FAIL | |

Note vincolanti:
- In ambiente non‑preview, `PREVIEW_MODE` deve essere **false**.
- I flag devono essere **espliciti** (nessuna assunzione implicita).

---

## 5. Simulazione del Release Playbook

Questa sezione ripercorre **tutti** gli step del playbook operativo e registra esito atteso vs reale.

### 5.1 Tabella simulazione step-by-step

| Step | Azione simulata | Esito atteso | Esito reale | Problemi riscontrati / note |
|---|---|---|---|---|
| 1 | Tag versione (simulato) | Tag definito e tracciabile | | |
| 2 | Build immagine (simulato) | Build OK, artefatto disponibile | | |
| 3 | Deploy (simulato) | Servizio avviato senza errori | | |
| 4 | Health check | `/health` = 200 | | |
| 5 | Readiness check | `/ready` = 200 quando pronto | | |
| 6 | Smoke test funzionale minimo | Endpoint coerenti con flag ON/OFF | | |
| 7 | Attivazione feature flaggate (se previsto) | ON ⇒ pass-through; OFF ⇒ 404 | | |
| 8 | Post-release validation (T+15m) | Nessun crash loop; log OK | | |
| 9 | Post-release validation (T+1h) | Stabilità mantenuta | | |
| 10 | Rollback (simulato o eseguito) | Procedura deterministica, verificabile | | |

### 5.2 Evidenze da allegare (obbligatorie)
Compilare con riferimenti reali (log/output):
- Output `/health`:
  - Evidenza: ________________________________
- Output `/ready`:
  - Evidenza: ________________________________
- Estratti log strutturati (startup + 2 richieste + 1 errore):
  - Evidenza: ________________________________
- Snapshot configurazione (env / flags):
  - Evidenza: ________________________________
- Verifica gating feature (404 per OFF):
  - Evidenza: ________________________________

---

## 6. Punti di decisione

### 6.1 Definizione gravità (coerente con Release Criteria)
- **Bloccante**: viola un criterio BLOCCANTE (qualsiasi FAIL ⇒ NO-GO).
- **Accettabile**: rientra in criteri NON bloccanti e non degrada stabilità/semantica/observability.
- **Differibile**: non bloccante ma richiede action item prima del rilascio pubblico.

### 6.2 Matrice problemi e decisione

| Problema | Gravità (BLOCCANTE/ACCETTABILE/DIFFERIBILE) | Decisione (STOP/CONTINUE) | Evidenza | Note |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

Regola: qualsiasi item “BLOCCANTE” ⇒ decisione Dry Run **NO-GO**.

---

## 7. Verdetto GO / NO-GO (Dry Run)

### 7.1 Decisione finale (selezionare una)
- [ ] GO (Dry Run)
- [ ] NO-GO (Dry Run)
- [ ] GO condizionato (Dry Run)

### 7.2 Motivazione tecnica (obbligatoria)
Riassumere solo fatti verificabili e riferimenti a evidenze:

Motivazione:  
____________________________________________________________________________  
____________________________________________________________________________

### 7.3 Condizioni per eventuale GO differito (solo se GO condizionato)
Elencare condizioni misurabili e verificabili:
- Condizione 1: ________________________________
- Condizione 2: ________________________________
- Condizione 3: ________________________________

### 7.4 Firma
- Dry Run Owner: ________________________________
- Data: ________________________________

---

## 8. Action items post Dry Run

Se NO-GO o GO condizionato, ogni azione è **bloccante** finché non completata.

| Azione | Owner | Priorità (HIGH/MEDIUM/LOW) | Blocco rilascio (YES/NO) | Evidenza completamento |
|---|---|---|---|---|
| | | | YES | |
| | | | YES | |
| | | | YES | |

Regola: nessun rilascio pubblico finché le azioni con “Blocco rilascio = YES” non sono completate e verificate.

---

## 9. Chiusura del Dry Run

Checklist finale:

| Item | Stato (PASS/FAIL) | Evidenza |
|---|---|---|
| Documento archiviato | FAIL | |
| Evidenze raccolte e linkate | FAIL | |
| Decisione comunicata internamente | FAIL | |
| Piano e finestra release aggiornati | FAIL | |

---

## 10. Stato del documento

- **Versione**: v1.0
- **Stato**: OPERATIVO
- **Ambito**: MVP Release
- **Uso**: obbligatorio prima del primo rilascio pubblico

