## IRIS — MVP v1.0 Post‑Release KPIs & SLO (Documento Operativo)

## 1. Scopo del documento

Questo documento definisce cosa significa **“IRIS sta funzionando bene”** dopo il rilascio MVP v1.0:
- quali segnali osservare in modo oggettivo;
- come interpretarli operativamente;
- quali segnali ignorare deliberatamente.

Chiarimenti vincolanti:
- **KPI ≠ feature**: un KPI misura qualità operativa, non aggiunge funzionalità.
- **SLO ≠ SLA**: gli SLO sono guardrail interni, non un contratto commerciale.
- **Nessuna metrica vanity**: ogni metrica deve avere un’azione associata o una decisione che abilita.

Fonti vincolanti:
- `IRIS_MVP_v1.0_Release_Playbook.md`
- `IRIS_MVP_v1.0_Incident_Playbook.md`
- STEP 5.x — Observability & Runtime Safety
- STEP 6.x — Deployment & Preview Hardening
- STEP 7.x — Feature Governance

Vincoli:
- non introdurre metriche non osservabili con l’architettura attuale;
- non introdurre strumenti esterni di monitoring.

---

## 2. Principi guida

1. **Poche metriche, ma affidabili**: meglio poche misure solide che molte e rumorose.
2. **Misurabile > interessante**: se non è misurabile con gli artefatti attuali, è fuori scope.
3. **Meglio lagging che rumorosa**: privilegiare segnali aggregabili su finestre (5m/1h/7d).
4. **SLO come guardrail**: gli SLO indicano deviazioni operative, non obiettivi di marketing.
5. **Nessun alert senza azione**: ogni soglia deve avere una procedura associata (monitor/incident/task).

---

## 3. Ambito MVP

### IN (monitorabile e vincolante)
- Core runtime (startup/shutdown deterministico)
- API HTTP (`/health`, `/ready`, endpoint funzionali)
- Persistence (memory/sqlite) come segnale operativo via readiness/log
- Feature flags (gating deterministico per‑endpoint)
- Deploy preview/production e separazione preview controls

### OUT (deliberatamente escluso)
- Business analytics
- User behavior avanzato
- Billing/growth
- Performance tuning spinto (micro‑ottimizzazioni)

---

## 4. KPI primari (livello sistema)

| KPI | Descrizione | Fonte | Frequenza |
|---|---|---|---|
| Startup success rate | % avvii senza errori | Log startup (`component=bootstrap/http`) | Per deploy |
| Uptime process | Processo vivo | `GET /health` | Continuo |
| Error rate | % richieste con esito errore | Log HTTP (`Request completed` + statusCode) | 5 min |
| Restart frequency | Riavvii inattesi | Log startup ripetuti / crash loop evidenze | Giornaliero |

Note operative:
- “Startup success rate” è **binario per deploy**: se un deploy genera startup failure, è incidente (vedi SLO).
- “Uptime process” è misurabile via probe `GET /health` (200/!200).

---

## 5. KPI operativi (livello API)

| KPI | Endpoint | Segnale osservabile |
|---|---|---|
| Request success rate | `/threads/*` | HTTP 2xx/4xx/5xx da log request completed |
| Request success rate | `/sync/*` | HTTP 2xx/4xx/5xx da log request completed |
| Request latency p95 (proxy) | `/sync/*` | `responseTime` nei log request completed (aggregazione esterna, senza tool imposto) |
| Feature gated hits | `/threads/*` | Log con `reason=feature_off` (feature guard) |
| Feature gated hits | `/sync/*` | Log con `reason=feature_off` (feature guard) |
| Preview auth failures | qualsiasi protetto | Log preview `reason=auth_fail` (solo se `PREVIEW_MODE=true`) |
| Preview rate limit hits | qualsiasi protetto | Log preview `reason=rate_limit` + 429 + `Retry-After` |
| Invalid config attempts | startup | Log startup failure (config/flag invalid ⇒ abort) |

Regola: questi KPI sono validi solo se i log sono strutturati e contengono correlationId (hardening 5.9A).

---

## 6. KPI di stabilità (degrado silenzioso)

Queste metriche indicano degrado che può non emergere come “down” immediato.

### 6.1 Incremento log error
- **Segnale**: aumento sostenuto di `level=error` nei log, soprattutto da component `http`/`bootstrap`.
- **Interpretazione**: potenziale regressione, misconfigurazione, eccezioni runtime non gestite.
- **Azione**: se supera soglia (sez. 9) ⇒ incident; altrimenti task backlog se ricorrente.

### 6.2 Readiness flapping
- **Segnale**: alternanza frequente di `/ready` tra 200 e 503.
- **Interpretazione**: instabilità operativa (persistence intermittente, startup incomplete, degradazioni).
- **Azione**: trattare come SEV‑2 se persistente (incident playbook).

### 6.3 Rate limit hits (preview)
- **Segnale**: aumento di `reason=rate_limit` e 429 in preview.
- **Interpretazione**: abuso accidentale o traffico superiore alle aspettative; rischio demo/stakeholder.
- **Azione**: aumentare RPM solo se autorizzato e tracciato; altrimenti contenere accessi.

### 6.4 Graceful shutdown timeout
- **Segnale**: log di timeout shutdown (“Shutdown timeout exceeded…”).
- **Interpretazione**: potenziale blocco risorse o handler non deterministici.
- **Azione**: incidente se ricorrente; altrimenti backlog con priorità MEDIUM/HIGH.

---

## 7. SLO — Service Level Objectives

Definire solo SLO realistici e verificabili con i segnali attuali.

| SLO | Target | Finestra |
|---|---:|---|
| API availability (liveness) | ≥ 99.5% | 7 giorni |
| Error rate (HTTP 5xx) | ≤ 1% | 1 ora |
| Startup failure | 0 | per deploy |
| Readiness false positive | 0 | continuo |

Definizioni operative:
- **API availability**: percentuale di tempo in cui `GET /health` restituisce 200.
- **Error rate**: percentuale di richieste con `statusCode >= 500` sui log “Request completed”.
- **Startup failure**: qualsiasi startup che termina con errore o abort di validazione.
- **Readiness false positive**: qualsiasi caso in cui `/ready`=200 mentre il sistema non è operativo secondo i criteri runtime (violazione invarianti/persistence non disponibile).

---

## 8. Error Budget (concettuale)

### 8.1 Definizione
L’error budget è la tolleranza di degradazione concessa dagli SLO all’interno di una finestra temporale.

### 8.2 Consumo
Il budget si consuma quando:
- `GET /health` non è 200 (riduce availability);
- le richieste 5xx aumentano oltre target;
- avviene un startup failure per deploy;
- readiness diventa instabile o produce false positive.

### 8.3 Conseguenza se budget esaurito
Se l’error budget è esaurito:
- **nessuna feature nuova** è autorizzata (governance STEP 7B);
- priorità assoluta a stabilità, rollback e hardening;
- le attivazioni flaggate devono essere ridotte (fail‑closed) se riducono rischio.

---

## 9. Soglie di intervento (azioni associate)

| Segnale | Azione |
|---|---|
| SLO violato | **Incident** (attiva `IRIS_MVP_v1.0_Incident_Playbook.md`) |
| KPI degradato ma SLO ok | **Monitor** (osservare finestra successiva, raccogliere evidenze) |
| Spike isolato | **Nessuna azione** (registrare come nota se utile) |
| Pattern ricorrente | **Task backlog** (azione preventiva con ownership) |

Regola: nessun alert operativo senza procedura associata.

---

## 10. Cosa NON monitorare (deliberatamente)

Questi segnali sono esclusi fino a quando non causano impatto su SLO/KPI:
- CPU/RAM “in assoluto” (si osservano solo se correlati a degradazione reale);
- micro‑ottimizzazioni di latenza per singola request;
- tracing per‑request completo (distributed tracing) non presente nell’architettura MVP;
- metriche vanity (es. “numero di log” senza relazione a errori o qualità).

---

## 11. Collegamento agli incidenti

Un KPI diventa incidente quando:
- viola uno SLO (sez. 7), oppure
- ricade in SEV‑1/SEV‑2 (definizione incident playbook).

Flusso operativo:
1. Rilevazione (SLO/KPI) → conferma con evidenza (health/ready/log)
2. Classificazione SEV
3. Mitigazione (rollback/disable flags/shutdown controllato)
4. PIR obbligatorio per SEV‑1/SEV‑2

---

## 12. Evoluzione futura (post‑MVP) — limitata

Se e solo se governato da STEP architetturali successivi (STEP 7B):
- metriche quantitative avanzate (es. metrics exporter) **solo** dopo definizione di superficie e rollback;
- alerting automatico **solo** se ogni alert ha azione associata;
- SLO per feature avanzate **solo** quando quelle feature entrano in tabella di attivazione.

---

## 13. Stato del documento

- **Versione**: v1.0
- **Stato**: OPERATIVO
- **Ambito**: produzione MVP
- **Uso**: riferimento unico per salute del sistema

