## IRIS — MVP v1.0 Monitoring Thresholds & Alerting (Documento Operativo)

## 1. Scopo del documento

Questo documento definisce, in modo operativo e vincolante:
- **quando una metrica diventa un segnale** (pattern significativo su finestra);
- **quando un segnale diventa un alert** (richiede azione immediata o monitoraggio strutturato);
- **quando un alert diventa un incidente** (attiva la gestione SEV e il relativo playbook).

Chiarimenti vincolanti:
- **alert ≠ logging**: i log sono evidenza; l’alert è una decisione di intervento.
- **alert ≠ osservazione**: un alert implica azione o escalation.
- **ogni alert ha un’azione associata** (runbook/step operativo).

Fonti vincolanti:
- `IRIS_MVP_v1.0_Post_Release_KPIs_and_SLO.md`
- `IRIS_MVP_v1.0_Incident_Playbook.md`
- STEP 5.x — Observability
- STEP 6.x — Deployment & Preview
- STEP 7.x — Feature Governance

Vincoli:
- **non** introdurre nuove metriche (solo quelle già definite);
- **non** introdurre strumenti specifici di monitoring/alerting.

---

## 2. Principi fondamentali

1. **Nessun alert senza runbook**: se non esiste azione, non esiste alert.
2. **Meglio un alert in meno che uno in più**: evitare rumore che degrada la risposta.
3. **Alert solo su SLO o rischio SLO**: soglie collegate a disponibilità, error rate, startup, readiness.
4. **Soglie stabili nel tempo**: evitare soglie “adattive” non governate.
5. **Spike isolati ≠ alert**: uno spike isolato è osservazione, non escalation.

---

## 3. Classificazione alert

| Livello | Significato |
|---|---|
| **INFO** | Osservazione: pattern da tracciare, nessuna azione immediata |
| **WARNING** | Degrado: rischio SLO, azione correttiva non urgente ma necessaria |
| **CRITICAL** | Incidente: impatto su SLO o rischio imminente; attiva incident handling |
| **BLOCKER** | Sistema non operativo o rilascio invalido; richiede stop/rollback immediato |

Regola: **CRITICAL/BLOCKER ⇒ Incident Playbook**.

---

## 4. Soglie per KPI primari

| KPI | Soglia | Livello |
|---|---:|---|
| Startup failure | > 0 per deploy | **BLOCKER** |
| API availability | < 99.5% su 7 giorni | **CRITICAL** |
| Error rate (HTTP 5xx) | > 1% per 5 min | **CRITICAL** |
| Restart frequency | > 3 / ora | **WARNING** |

Note operative:
- “Startup failure” include abort per config invalida o flag invalido (fail-fast).
- “Availability” è misurata via esito binario di `/health`.

---

## 5. Soglie per KPI API

| Segnale | Condizione | Livello |
|---|---|---|
| Latency p95 (proxy via responseTime) | > 2s per 10 min | **WARNING** |
| HTTP 5xx | > 0.5% su finestra operativa | **CRITICAL** |
| Feature_off spike | incremento anomalo rispetto al baseline (stesso deploy) | **INFO** |
| Rate limit hits (preview) | continuo su finestra 10 min | **WARNING** |

Note vincolanti:
- “Feature_off spike” non è incidente di per sé: è segnale che il gating sta bloccando traffico inatteso (richiede verifica config/flag).
- “Rate limit hits” è rilevante solo se `PREVIEW_MODE=true` (preview-only).

---

## 6. Alert di stabilità runtime

Questi alert sono direttamente collegati a readiness, shutdown deterministico e fail-fast.

### 6.1 Readiness flapping
- **Definizione**: alternanza frequente di `/ready` tra 200 e 503 su finestra 10 min.
- **Indicazione**: instabilità operativa (persistence intermittente o invarianti non stabili).
- **Livello**: **CRITICAL** se persistente; altrimenti WARNING.

### 6.2 Graceful shutdown timeout
- **Definizione**: presenza di log “Shutdown timeout exceeded…” su un arresto controllato.
- **Indicazione**: risorse bloccate o handler non deterministici.
- **Livello**: **WARNING** (CRITICAL se ricorrente su più shutdown).

### 6.3 Config validation abort (startup)
- **Definizione**: startup abortito per config invalida o flag invalido.
- **Indicazione**: misconfigurazione; rilascio non valido.
- **Livello**: **BLOCKER**.

### 6.4 Health OK ma Ready false
- **Definizione**: `/health` 200 ma `/ready` 503 oltre finestra di stabilizzazione.
- **Indicazione**: processo vivo ma non operativo; possibile degrado silenzioso.
- **Livello**: **CRITICAL**.

---

## 7. Azioni associate agli alert

| Alert | Azione |
|---|---|
| Startup failure (BLOCKER) | **Abort deploy** / stop immediato; correggere env; riprovare solo dopo evidenza |
| Availability drop (CRITICAL) | **Incident** (attiva Incident Playbook), valutare rollback immediato |
| Error spike 5xx (CRITICAL) | **Rollback** o disabilitazione flag (se isolabile) secondo Incident Playbook |
| Restart frequency (WARNING) | Monitor + raccolta evidenze; se persiste ⇒ CRITICAL |
| Readiness flapping (CRITICAL) | Incident; verificare persistence e invarianti; rollback se necessario |
| Shutdown timeout (WARNING) | Task backlog se isolato; incident se ricorrente |
| Rate limit abuse (WARNING, preview) | Investigate + containment (ridurre accesso / aumentare RPM solo se autorizzato) |
| Feature_off spike (INFO) | Verifica config/flag; confermare che gating è intenzionale |

Regola: nessuna azione “creative workaround”. Solo rollback, flag OFF (fail‑closed), o stop controllato.

---

## 8. Anti‑pattern espliciti (vietati)

- Alert su CPU/RAM senza impatto su SLO (rumore).
- Alert su singolo errore isolato (non significativo).
- Alert duplicati (stesso segnale con nomi diversi).
- Alert senza ownership (nessuno responsabile operativo).

---

## 9. Collegamento al Playbook

### 9.1 Attivazione Incident Playbook
- Ogni alert **CRITICAL** o **BLOCKER** attiva `IRIS_MVP_v1.0_Incident_Playbook.md`.
- La severità (SEV‑1..4) è determinata dall’impatto (health/ready/error rate) e dalla persistenza.

### 9.2 PIR (Post‑Incident Review)
- CRITICAL/BLOCKER che generano SEV‑1/SEV‑2 richiedono PIR obbligatorio.
- Gli alert e le soglie usate devono essere riportate come evidenza nel PIR.

### 9.3 Revisione soglie post‑incidente
- Dopo SEV‑1/SEV‑2: revisione soglie per ridurre falsi positivi e colmare gap operativi.
- È vietato alzare soglie per “nascondere” problemi: ogni modifica deve migliorare azionabilità.

---

## 10. Frequenza di revisione

- **Post‑incident**: revisione immediata dopo ogni SEV‑1/SEV‑2.
- **Post‑MVP**: revisione alla prima finestra di stabilizzazione successiva al rilascio.
- **Trimestrale**: revisione periodica per confermare stabilità delle soglie nel tempo.

---

## 11. Evoluzione futura (post‑MVP)

Consentito solo tramite governance (STEP 7B/7C), senza cambiare MVP v1.0 retroattivamente:
- alert predittivi (solo se azionabili e verificabili)
- anomaly detection (solo se riduce rumore e ha runbook)
- per‑feature SLO (solo dopo introduzione formale e auditabilità per feature)

---

## 12. Stato del documento

- **Versione**: v1.0
- **Stato**: OPERATIVO
- **Ambito**: produzione MVP
- **Uso**: riferimento unico per alerting

