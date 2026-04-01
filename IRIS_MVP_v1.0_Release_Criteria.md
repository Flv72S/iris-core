## IRIS — MVP v1.0 Release Criteria (Documento Operativo)

## 1. Scopo del documento

Questo documento stabilisce **quando IRIS è rilasciabile** come **v1.0**.
È progettato per abilitare una decisione **GO / NO-GO** basata su criteri **binari e verificabili**.

Questo documento è **vincolante** per team, stakeholder e release manager.

---

## 2. Definizione di “Release v1.0”

IRIS v1.0 è rilasciabile **solo se**:
- tutte le condizioni **T0 — MVP Core** della roadmap sono soddisfatte;
- **nessun criterio bloccante** è violato;
- il sistema risulta **deployabile, osservabile e reversibile** secondo gli STEP di hardening e preview controls.

Fonti normative (vincolanti):
- `IRIS_MVP_v1.0_Roadmap.md`
- `IRIS_STEP7B_Feature_Governance_Rules.md`
- `IRIS_STEP7C_Feature_Activation_Sequence.md`
- STEP 5.9A / 5.9B — MVP Hardening (observability, error discipline, runtime safety)
- STEP 6A / 6B / 6C — Deployment & Preview Controls (preview runtime, access control, feature flags)

---

## 3. Criteri BLOCCANTI (GO / NO-GO)

Regola: **anche 1 solo FAIL ⇒ NO-GO**.

**Uso**: i valori di `Stato` vanno impostati manualmente su PASS/FAIL al momento della release. Per default, ogni criterio è considerato **FAIL finché non verificato**.

| ID | Criterio | Evidenza richiesta (verificabile) | Stato (PASS/FAIL) |
|---|---|---|---|
| B-01 | Avvio deterministico fail-fast | Config invalida ⇒ abort startup (evidenza: test config validation + log errore) | FAIL |
| B-02 | Config dichiarata e verificata | Presenza schema/validator e uso a startup (evidenza: file runtime config + test) | FAIL |
| B-03 | Startup invariants enforcement | Violazioni ⇒ abort immediato (evidenza: test startup invariants) | FAIL |
| B-04 | HTTP bind & lifecycle controllato | Start/stop deterministici (evidenza: test bootstrap / lifecycle) | FAIL |
| B-05 | Graceful shutdown con timeout | Shutdown con timeout applicato (evidenza: test graceful shutdown) | FAIL |
| B-06 | Liveness disponibile | `/health` ritorna 200 se processo vivo (evidenza: test health + runtime check) | FAIL |
| B-07 | Readiness corretta | `/ready` 200 solo se sistema pronto (evidenza: readiness tests + startup readiness state) | FAIL |
| B-08 | Core semantic invariants protetti | Nessuna modifica al Core/contratti; invarianti coperte da test (evidenza: test invariants + contract freeze) | FAIL |
| B-09 | Boundary isolation | Nessun branching di flag nel Boundary; accesso al Core solo via Boundary (evidenza: test boundary-only + governance) | FAIL |
| B-10 | Persistence safety (swap deterministico) | Memory↔SQLite swap senza semantica nuova (evidenza: repository-swap + persistence-no-semantics) | FAIL |
| B-11 | SQLite invariants/idempotency | Vincoli base garantiti (evidenza: sqlite-invariants + sqlite-idempotency) | FAIL |
| B-12 | Observability: structured logging | Output JSON con campi obbligatori (evidenza: logging-structure.test) | FAIL |
| B-13 | Observability: correlationId | correlationId presente end-to-end nei log (evidenza: logging-structure + request hooks) | FAIL |
| B-14 | Error discipline: policy visibilità | INTERNAL/CLIENT coerente; nessuno stacktrace al client (evidenza: error-logging.test + policy doc) | FAIL |
| B-15 | Error handling centralizzato | Unico punto di gestione errori, logging strutturato errori (evidenza: error handler + tests) | FAIL |
| B-16 | No console logging non strutturato | Nessun `console.log/error` diretto fuori eccezioni strutturate (evidenza: no-console-log.test) | FAIL |
| B-17 | Feature activation correctness (fail-closed) | Flag mancante ⇒ OFF; invalido ⇒ abort (evidenza: feature-flag-* tests) | FAIL |
| B-18 | Feature guard 404 per feature OFF | Endpoint protetto non raggiungibile (404) se OFF (evidenza: feature-flag-off.test) | FAIL |
| B-19 | Feature ON comportamento invariato | Endpoint protetto pass-through se ON (evidenza: feature-flag-on.test) | FAIL |
| B-20 | Preview/prod safety separation | PREVIEW controls disattivati quando `PREVIEW_MODE=false` (evidenza: preview-guard.test + config) | FAIL |
| B-21 | Preview access control in preview | In preview: token richiesto, health/ready esclusi (evidenza: preview-auth/guard tests) | FAIL |
| B-22 | Preview anti-abuse | Rate limit 429 + Retry-After (evidenza: preview-rate-limit.test) | FAIL |
| B-23 | Preview identification | Header `X-IRIS-Mode: PREVIEW` presente solo in preview mode (evidenza: preview-guard.test) | FAIL |
| B-24 | Deployability minima ripetibile | Esecuzione ripetibile (container/preview packaging) con health/readiness verificabili (evidenza: deployment-preview.test + docs) | FAIL |

---

## 4. Criteri NON bloccanti (accettabili)

Questi criteri possono essere imperfetti **senza bloccare** la release v1.0, purché non violino i criteri bloccanti.

| ID | Criterio | Rischio accettato | Mitigazione prevista (operativa, non promessa) |
|---|---|---|---|
| N-01 | Performance non ottimizzate | Latenza/throughput sub‑ottimali | Monitorare via log strutturati e limitare traffico in preview |
| N-02 | Tooling manuale | Operazioni ripetitive | Runbook/documentazione esistente (preview scripts e rollback docs) |
| N-03 | Assenza APM/metrics avanzate | Meno visibilità quantitativa | Log strutturati + correlationId come baseline |
| N-04 | Assenza UI di amministrazione | Operazioni via API/scripts | Deploy preview controllato e access control operativo |
| N-05 | Feature POST_MVP/DEFERRED non disponibili | Minor valore percepito | Feature esplicitamente escluse (con governance STEP 7B/7C) |

---

## 5. Feature readiness checklist (MVP Core — T0)

Questa tabella copre le feature T0 definite in `IRIS_MVP_v1.0_Roadmap.md` (sezione T0).

Regola: per T0, lo stato atteso è **ON (ALWAYS_ON)**.

| Feature ID | Stato (ON / FLAGGED / DISABLED) | Test coverage presente | Logging presente | Error handling conforme | Decisione finale (PASS/FAIL) |
|---|---|---|---|---|---|
| F-01 Structured logging (JSON) | ON | Sì | Sì | N/A | FAIL |
| F-02 Correlation ID end‑to‑end | ON | Sì | Sì | N/A | FAIL |
| F-03 Error handling centralizzato | ON | Sì | Sì | Sì | FAIL |
| F-04 Error visibility policy | ON | Sì | Sì | Sì | FAIL |
| F-05 Logging enforcement (no-console) | ON | Sì | N/A | N/A | FAIL |
| F-06 Config validation fail‑fast | ON | Sì | Sì | N/A | FAIL |
| F-07 Startup invariants enforcement | ON | Sì | Sì | N/A | FAIL |
| F-08 Graceful shutdown (timeout) | ON | Sì | Sì | N/A | FAIL |
| F-09 /health liveness | ON | Sì | Sì | N/A | FAIL |
| F-10 /ready readiness | ON | Sì | Sì | N/A | FAIL |
| F-11 Readiness state esplicito | ON | Sì | Sì | N/A | FAIL |
| F-18 Feature flag registry (audit) | ON | Sì | Sì | N/A | FAIL |
| F-19 Feature flag loader (immutabile) | ON | Sì | Sì | N/A | FAIL |
| F-20 Feature guard middleware | ON | Sì | Sì | N/A | FAIL |
| F-32 In‑memory persistence | ON | Sì | N/A | N/A | FAIL |
| F-33 Composition root deterministico | ON | Sì | Sì | N/A | FAIL |
| F-34 HTTP server lifecycle controllato | ON | Sì | Sì | Sì | FAIL |

---

## 6. Config & Environment readiness

### 6.1 Env example aggiornati
- `.env.example` include tutte le variabili richieste e i default documentati.
- `.env.preview.example` include separazione preview (token, rate limit, flags).

### 6.2 Separazione preview vs prod
- `PREVIEW_MODE=false` deve disattivare completamente i controlli preview.
- In preview: `PREVIEW_MODE=true` richiede `PREVIEW_ACCESS_TOKEN` (fail-fast se mancante).

### 6.3 Fail-fast su config invalida
- Config invalida (range/enum/required) ⇒ abort startup esplicito.
- Feature flag invalida ⇒ abort startup esplicito.

### 6.4 Secret handling minimale
- `PREVIEW_ACCESS_TOKEN` è un secret operativo: non deve essere hardcoded, non deve essere loggato.
- Nessun secret nel Dockerfile/compose; i secret devono passare via env/runtime.

---

## 7. Deployment & Rollback readiness

Criteri minimi (operativi):
- Deploy ripetibile (almeno in preview) con packaging definito e healthcheck verificabili.
- Rollback documentato (failure modes e ripristino controllato).
- Health/readiness verificabili con script o comando manuale deterministico.
- Graceful shutdown funzionante (timeout, ordine, log).

Evidenza tipica:
- test “deployment preview”
- documentazione rollback/failure modes
- endpoint `/health` e `/ready` verificati

---

## 8. Decisione finale (da compilare manualmente)

- **Data decisione**: ______________________
- **Stato**: GO / NO-GO
- **Firma responsabile tecnico**: ______________________
- **Note finali**: _____________________________________

---

## 9. Regole di modifica

1. Questo documento può essere modificato **solo prima del GO**.
2. Dopo GO, il documento diventa **storico** e non è modificabile retroattivamente.
3. È vietato aggiungere criteri non derivati dalle fonti normative elencate nel contesto.

---

## 10. Stato del documento

- **Versione**: v1.0
- **Stato**: APPROVATO
- **Natura**: OPERATIVA
- **Effetto**: Bloccante per rilascio (GO/NO-GO)

